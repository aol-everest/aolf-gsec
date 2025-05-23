from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, false
from datetime import datetime, timedelta
from typing import List
import logging
import tempfile
import os
import uuid

import models
import schemas
from dependencies.database import get_db, get_read_db
from dependencies.auth import get_current_user_for_write, get_current_user, requires_any_role
from dependencies.access_control import admin_get_dignitary
from utils.s3 import upload_file
from utils.business_card import extract_business_card_info, BusinessCardExtractionError

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/new", response_model=schemas.AdminDignitary)
async def new_dignitary(
    dignitary: schemas.AdminDignitaryCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    # Create new dignitary
    new_dignitary = models.Dignitary(
        **dignitary.dict(),
        created_by=current_user.id
    )
    db.add(new_dignitary)
    db.commit()
    db.refresh(new_dignitary)

    return new_dignitary


@router.get("/all", response_model=List[schemas.AdminDignitary])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_dignitaries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    logger.debug(f"Getting all dignitaries for user {current_user.email}")
    """Get all dignitaries with access control restrictions based on user permissions"""
    # ADMIN role has full access to all dignitaries
    if current_user.role == models.UserRole.ADMIN:
        dignitaries = db.query(models.Dignitary).all()
        return dignitaries
    
    # For SECRETARIAT and other roles, apply access control restrictions
    # Get all active access records for the current user
    user_access = db.query(models.UserAccess).filter(
        models.UserAccess.user_id == current_user.id,
        models.UserAccess.is_active == True,
        # Only consider records that grant access to dignitaries
        models.UserAccess.entity_type == models.EntityType.APPOINTMENT_AND_DIGNITARY,
    ).all()
    
    if not user_access:
        # If no valid access records exist, return empty list
        return []
    
    # Create country filters based on user's access permissions
    country_filters = []
    # Start with a "false" condition that ensures no records are returned if no access is configured
    country_filters.append(false())
    
    # Create location filters based on user's access permissions
    location_filters = []
    
    for access in user_access:
        # If location-specific access exists, add to location filters
        if access.location_id is not None:
            location_filters.append(
                and_(
                    models.Appointment.location_id == access.location_id,
                )
            )
        else:
            # Add country filters for querying dignitaries
            country_filters.append(
                models.Dignitary.country_code == access.country_code
            )

            # Country-level access for appointments
            location_filters.append(
                models.Location.country_code == access.country_code
            )
    
    # Calculate date threshold for recent appointments (30 days ago)
    thirty_days_ago = datetime.now().date() - timedelta(days=30)
    
    # Find dignitaries associated with recent appointments the user has access to
    appointment_dignitary_query = db.query(
        models.AppointmentDignitary.dignitary_id
    ).join(
        models.Appointment, 
        models.AppointmentDignitary.appointment_id == models.Appointment.id,
    ).join(
        models.Location,
        models.Appointment.location_id == models.Location.id
    ).filter(
        or_(*location_filters),
        or_(
            models.Appointment.preferred_date >= thirty_days_ago,
            models.Appointment.appointment_date >= thirty_days_ago
        )
    ).distinct()
    
    # Get dignitary IDs from the subquery
    dignitary_ids_from_appointments = [row[0] for row in appointment_dignitary_query.all()]
    logger.debug(f"Dignitary IDs from appointments: {dignitary_ids_from_appointments}")
    
    if not dignitary_ids_from_appointments or len(dignitary_ids_from_appointments) == 0:
        # If there are no appointment-related dignitaries, get and combine all dignitaries from countries the user has access to
        dignitaries = db.query(models.Dignitary).filter(or_(*country_filters)).all()
    else:
        # If there are appointment-related dignitaries, get and combine them
        dignitaries = db.query(models.Dignitary).filter(
            or_(
                # Combine with appointment-related dignitaries
                models.Dignitary.id.in_(dignitary_ids_from_appointments),
                # Apply country filters to get dignitaries from countries the user has access to
                or_(*country_filters)
            )
        ).all()
    
    return dignitaries


@router.get("/{id}", response_model=schemas.AdminDignitaryWithAppointments)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_dignitary(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a dignitary by ID with access control restrictions based on user permissions"""
    # Use the helper function to get the dignitary with READ access check
    dignitary = admin_get_dignitary(
        current_user=current_user,
        db=db,
        dignitary_id=id,
        required_access_level=models.AccessLevel.READ
    )
    return dignitary


@router.patch("/update/{dignitary_id}", response_model=schemas.AdminDignitary)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_admin_dignitary(
    dignitary_id: int,
    dignitary_update: schemas.AdminDignitaryUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update dignitary information (Admin/Secretariat only)"""
    logger.info(f"User {current_user.email} attempting to update dignitary ID {dignitary_id}")
    
    # Use the helper function to get the dignitary and check for WRITE access
    dignitary = admin_get_dignitary(
        current_user=current_user,
        db=db,
        dignitary_id=dignitary_id,
        required_access_level=models.AccessLevel.READ_WRITE 
    )
    
    # NOTE: Not checking access to the new country as it's not a security risk
    # If trying to change country, check access to the new country as well
    # if current_user.role != models.UserRole.ADMIN and dignitary_update.country_code and dignitary_update.country_code != dignitary.country_code:
    #     admin_check_access_to_country(
    #         current_user=current_user,
    #         db=db,
    #         country_code=dignitary_update.country_code, 
    #         required_access_level=models.AccessLevel.READ_WRITE
    #     )
    
    # Update dignitary attributes
    update_data = dignitary_update.dict(exclude_unset=True)
    logger.debug(f"Applying update data for dignitary {dignitary_id}: {update_data}")
    
    # Handle special fields like social_media and additional_info
    if 'social_media' in update_data and isinstance(update_data['social_media'], str):
        try:
            # If it's a string, try to convert it to a dictionary
            if update_data['social_media'].startswith('{') and update_data['social_media'].endswith('}'):
                # Simple string parsing - assuming valid JSON-like format
                entries = update_data['social_media'][1:-1].split(',')
                social_media_dict = {}
                for entry in entries:
                    if ':' in entry:
                        k, v = entry.split(':', 1)
                        # Strip quotes and whitespace
                        k = k.strip().strip('"').strip("'")
                        v = v.strip().strip('"').strip("'")
                        social_media_dict[k] = v
                update_data['social_media'] = social_media_dict
        except Exception as e:
            logger.warning(f"Failed to parse social_media string: {e}", exc_info=True)
            # Keep original string if parsing fails
    
    if 'additional_info' in update_data and isinstance(update_data['additional_info'], str):
        try:
            # If it's a string, try to convert it to a dictionary
            if update_data['additional_info'].startswith('{') and update_data['additional_info'].endswith('}'):
                # Simple string parsing - assuming valid JSON-like format
                entries = update_data['additional_info'][1:-1].split(',')
                additional_info_dict = {}
                for entry in entries:
                    if ':' in entry:
                        k, v = entry.split(':', 1)
                        # Strip quotes and whitespace
                        k = k.strip().strip('"').strip("'")
                        v = v.strip().strip('"').strip("'")
                        additional_info_dict[k] = v
                update_data['additional_info'] = additional_info_dict
        except Exception as e:
            logger.warning(f"Failed to parse additional_info string: {e}", exc_info=True)
            # Keep original string if parsing fails
    
    try:
        for key, value in update_data.items():
            if key in ("id", "created_by", "created_at", "updated_at"):
                logger.debug(f"Skipping protected field: {key}")
                continue
                
            if hasattr(dignitary, key):
                setattr(dignitary, key, value)
            else:
                logger.warning(f"Field {key} not found in Dignitary model, skipping")
        
        # Set the last updated user
        dignitary.updated_by = current_user.id
        dignitary.updated_at = datetime.now()
        
        db.commit()
        db.refresh(dignitary)
        logger.info(f"Dignitary {dignitary_id} updated successfully by user {current_user.email}")
        return dignitary
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating dignitary {dignitary_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update dignitary: {str(e)}")


# Business card endpoints
@router.post("/business-card/upload", response_model=schemas.BusinessCardExtractionResponse)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def upload_business_card_admin(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Upload a business card and extract information from it (admin/secretariat only)"""
    try:
        # Generate a unique ID for this upload
        upload_uuid = str(uuid.uuid4())
        
        # Upload file to S3
        file_content = await file.read()
        upload_result = upload_file(
            file_data=file_content,
            file_name=f"business_cards/{upload_uuid}/{file.filename}",
            content_type=file.content_type,
            entity_type="dignitaries"
        )

        # Check if business card extraction is enabled
        enable_extraction = os.environ.get("ENABLE_BUSINESS_CARD_EXTRACTION", "true").lower() == "true"
        
        if not enable_extraction:
            # If extraction is disabled, return a response with empty extraction data
            return schemas.BusinessCardExtractionResponse(
                extraction=schemas.BusinessCardExtraction(
                    first_name="",
                    last_name="",
                    title=None,
                    company=None,
                    phone=None,
                    email=None,
                    website=None,
                    address=None
                ),
                attachment_uuid=upload_uuid
            )

        # Extract business card information
        try:
            # Save the file temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
                temp_file_path = temp_file.name
                # Reset file position
                await file.seek(0)
                # Write content to temp file
                temp_file.write(await file.read())
            
            # Extract information from the business card
            extraction_result = extract_business_card_info(temp_file_path)
            
            # Add file path information
            extraction_result.file_path = upload_result['s3_path']
            extraction_result.file_name = file.filename
            extraction_result.file_type = file.content_type
            extraction_result.is_image = upload_result.get('is_image', False)
            extraction_result.thumbnail_path = upload_result.get('thumbnail_path')
            extraction_result.attachment_uuid = upload_uuid
            
            # Clean up the temporary file
            os.unlink(temp_file_path)

            # logger.info(f"Extraction result: {extraction_result}")
            
            # Return the extraction result
            return schemas.BusinessCardExtractionResponse(
                extraction=extraction_result,
                attachment_uuid=upload_uuid
            )
        except BusinessCardExtractionError as e:
            # If extraction fails, still keep the attachment but return an error
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            # For any other error, return a 500 error
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
    except Exception as e:
        logger.error(f"Error uploading business card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading business card: {str(e)}")

@router.post("/business-card/create-dignitary", response_model=schemas.Dignitary)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_dignitary_from_business_card_admin(
    extraction: schemas.BusinessCardExtraction,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a dignitary record from business card extraction (admin/secretariat only)"""
    try:
        # Try to determine honorific title
        honorific_title = None
        for _honorific_title in models.HonorificTitle:
            if extraction.honorific_title and _honorific_title.value.lower() in extraction.honorific_title.lower():
                honorific_title = _honorific_title
                break
        
        # Default to NA if no title found
        if not honorific_title:
            honorific_title = models.HonorificTitle.NA
        
        # Determine primary domain
        primary_domain = None
        primary_domain_other = None
        if extraction.primary_domain:
            for _primary_domain in models.PrimaryDomain:
                if _primary_domain.value.lower() in extraction.primary_domain.lower():
                    primary_domain = _primary_domain
                    break
            if not primary_domain:
                primary_domain = models.PrimaryDomain.OTHER
                primary_domain_other = extraction.primary_domain + (f" ({extraction.primary_domain_other})" if extraction.primary_domain_other else "")
        elif extraction.primary_domain_other:
            primary_domain = models.PrimaryDomain.OTHER
            primary_domain_other = extraction.primary_domain_other or ''
        
        # Create dignitary
        dignitary = models.Dignitary(
            honorific_title=honorific_title,
            first_name=extraction.first_name or '',
            last_name=extraction.last_name or '',
            email=extraction.email,
            phone=extraction.phone,
            other_phone=extraction.other_phone,
            fax=extraction.fax,
            title_in_organization=extraction.title,
            organization=extraction.company,
            street_address=extraction.street_address,
            primary_domain=primary_domain,
            primary_domain_other=primary_domain_other,
            bio_summary=extraction.bio,
            linked_in_or_website=extraction.website,
            country=extraction.country if extraction.country else None,
            state=extraction.state if extraction.state else None,
            city=extraction.city if extraction.city else None,
            source=models.DignitarySource.BUSINESS_CARD,
            social_media=extraction.social_media,
            additional_info=extraction.additional_info,
            created_by=current_user.id,
            # Add business card attachment details
            business_card_file_name=extraction.file_name,
            business_card_file_path=extraction.file_path,
            business_card_file_type=extraction.file_type,
            business_card_is_image=extraction.is_image,
            business_card_thumbnail_path=extraction.thumbnail_path,
            has_dignitary_met_gurudev=extraction.has_dignitary_met_gurudev,
            gurudev_meeting_date=extraction.gurudev_meeting_date,
            gurudev_meeting_location=extraction.gurudev_meeting_location,
            gurudev_meeting_notes=extraction.gurudev_meeting_notes,
            secretariat_notes=extraction.secretariat_notes,
        )
        db.add(dignitary)
        db.commit()
        db.refresh(dignitary)
        
        return dignitary
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating dignitary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create dignitary: {str(e)}") 