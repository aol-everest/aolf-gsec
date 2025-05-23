from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import os
import tempfile
import io
import base64
import logging

# Import our dependencies
from dependencies.database import get_db, get_read_db
from dependencies.auth import get_current_user, get_current_user_for_write
from dependencies.access_control import admin_check_appointment_for_access_level

# Import models and schemas
import models
import schemas

# Import utilities
from utils.s3 import upload_file, get_file
from utils.business_card import extract_business_card_info, BusinessCardExtractionError

# Get logger
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/appointments/{appointment_id}/attachments", response_model=schemas.AppointmentAttachment)
async def upload_appointment_attachment(
    appointment_id: int,
    file: UploadFile = File(...),
    attachment_type: str = Form(models.AttachmentType.GENERAL),
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Upload an attachment for an appointment"""
    # Check if appointment exists and user has access
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=appointment_id,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to upload attachments for this appointment")

    # Upload file to S3
    file_content = await file.read()
    upload_result = upload_file(
        file_data=file_content,
        file_name=f"{appointment_id}/{file.filename}",
        content_type=file.content_type,
        entity_type="appointments"
    )

    # Create attachment record
    attachment = models.AppointmentAttachment(
        appointment_id=appointment_id,
        file_name=file.filename,
        file_path=upload_result['s3_path'],
        file_type=file.content_type,
        is_image=upload_result.get('is_image', False),
        thumbnail_path=upload_result.get('thumbnail_path'),
        uploaded_by=current_user.id,
        attachment_type=attachment_type
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return attachment

@router.post("/appointments/{appointment_id}/attachments/business-card", response_model=schemas.AppointmentBusinessCardExtractionResponse)
async def upload_business_card_attachment(
    appointment_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Upload a business card attachment and extract information from it"""
    # Check if appointment exists and user has access
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=appointment_id,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to upload attachments for this appointment")

    # Upload file to S3
    file_content = await file.read()
    upload_result = upload_file(
        file_data=file_content,
        file_name=f"{appointment_id}/{file.filename}",
        content_type=file.content_type,
        entity_type="appointments"
    )

    # Create attachment record
    attachment = models.AppointmentAttachment(
        appointment_id=appointment_id,
        file_name=file.filename,
        file_path=upload_result['s3_path'],
        file_type=file.content_type,
        is_image=upload_result.get('is_image', False),
        thumbnail_path=upload_result.get('thumbnail_path'),
        uploaded_by=current_user.id,
        attachment_type=models.AttachmentType.BUSINESS_CARD
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    # Check if business card extraction is enabled
    enable_extraction = os.environ.get("ENABLE_BUSINESS_CARD_EXTRACTION", "true").lower() == "true"
    
    if not enable_extraction:
        # If extraction is disabled, return a response with empty extraction data
        return schemas.AppointmentBusinessCardExtractionResponse(
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
            attachment_id=attachment.id,
            appointment_id=appointment_id
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
        
        # Clean up the temporary file
        os.unlink(temp_file_path)
        
        # Return the extraction result
        return schemas.AppointmentBusinessCardExtractionResponse(
            extraction=extraction_result,
            attachment_id=attachment.id,
            appointment_id=appointment_id
        )
    except BusinessCardExtractionError as e:
        # If extraction fails, still keep the attachment but return an error
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        # For any other error, return a 500 error
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.post("/appointments/{appointment_id}/business-card/create-dignitary", response_model=schemas.Dignitary)
async def create_dignitary_from_business_card(
    appointment_id: int,
    extraction: schemas.BusinessCardExtraction,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a dignitary record from business card extraction"""
    # Check if appointment exists and user has access
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=appointment_id,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to create dignitaries for this appointment")

    # Get the attachment if provided
    attachment = None
    if extraction.attachment_id:
        attachment = db.query(models.AppointmentAttachment).filter(
            models.AppointmentAttachment.id == extraction.attachment_id,
            models.AppointmentAttachment.appointment_id == appointment_id
        ).first()
        
        if not attachment:
            logger.warning(f"Attachment with ID {extraction.attachment_id} not found for appointment {appointment_id}")

    # Create dignitary record
    try:
        # Try to determine honorific title
        honorific_title = None
        for _honorific_title in models.HonorificTitle:
            if extraction.honorific_title and _honorific_title.value.lower() in extraction.honorific_title.lower():
                honorific_title = _honorific_title
                break
        
        # Default to Mr. if no title found
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

      
        # Debug logging
        logger.info(f"Creating dignitary with source={models.DignitarySource.BUSINESS_CARD}")
        logger.info(f"Appointment dignitary country: {appointment.dignitary.country if appointment.dignitary else 'None'}")
        
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
            bio_summary=(
                f"Bio extracted from business card: {extraction.bio or 'N/A'}"
            ),
            linked_in_or_website=extraction.website,
            country=extraction.country if extraction.country else None,
            state=extraction.state if extraction.state else None,
            city=extraction.city if extraction.city else None,
            has_dignitary_met_gurudev=True,  # Mark as met Gurudev
            gurudev_meeting_date=(appointment.appointment_date if appointment.appointment_date else appointment.preferred_date),  # Use appointment date
            gurudev_meeting_location=appointment.location.name if appointment.location else None,
            gurudev_meeting_notes=f"Met during appointment #{appointment_id}",
            source=models.DignitarySource.BUSINESS_CARD,
            source_appointment_id=appointment_id,
            social_media=extraction.social_media,
            additional_info=extraction.additional_info,
            created_by=current_user.id,
            # Add business card attachment details
            business_card_file_name=attachment.file_name if attachment else None,
            business_card_file_path=attachment.file_path if attachment else None,
            business_card_file_type=attachment.file_type if attachment else None,
            business_card_is_image=attachment.is_image if attachment else None,
            business_card_thumbnail_path=attachment.thumbnail_path if attachment else None,
        )
        db.add(dignitary)
        db.commit()
        db.refresh(dignitary)
        
        return dignitary
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Error creating dignitary: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to create dignitary: {str(e)}")

@router.get("/appointments/{appointment_id}/attachments", response_model=List[schemas.AppointmentAttachment])
async def get_appointment_attachments(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all attachments for an appointment"""
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=appointment_id,
            required_access_level=models.AccessLevel.READ
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to view attachments for this appointment")

    # Base query
    query = db.query(models.AppointmentAttachment).filter(
        models.AppointmentAttachment.appointment_id == appointment_id
    )
    
    # Add uploaded_by filter only for non-SECRETARIAT users
    if not current_user.role.is_general_role_type():
        query = query.filter(models.AppointmentAttachment.uploaded_by == current_user.id)
    
    attachments = query.all()
    return attachments

@router.get("/appointments/attachments/{attachment_id}")
async def get_attachment_file(
    attachment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific attachment file"""
    # Base query
    query = db.query(models.AppointmentAttachment).filter(
        models.AppointmentAttachment.id == attachment_id
    )
    
    # Add uploaded_by filter only for non-SECRETARIAT users
    if current_user.role.is_general_role_type():
        query = query.filter(models.AppointmentAttachment.uploaded_by == current_user.id)
        
    attachment = query.first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == attachment.appointment_id
    ).first()
    
    if appointment.requester_id != current_user.id:
        # Do admin check only if 1st level check fails
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=attachment.appointment_id,
            required_access_level=models.AccessLevel.READ
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to access this attachment")

    file_data = get_file(attachment.file_path)
    
    # Use the original filename from the database for the Content-Disposition header
    return StreamingResponse(
        io.BytesIO(file_data['file_data']),
        media_type=file_data['content_type'],
        headers={"Content-Disposition": f"attachment; filename={attachment.file_name}"}
    )

@router.get("/appointments/{appointment_id}/attachments/thumbnails", response_model=List[schemas.AdminAppointmentAttachmentThumbnail])
async def get_appointment_attachment_thumbnails(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all thumbnails for an appointment's attachments in a single request."""
    # First verify the appointment exists and user has access
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check user access (add check similar to get_attachment_thumbnail)
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=appointment_id,
            required_access_level=models.AccessLevel.READ
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to view attachments for this appointment")

    # Get all image attachments for this appointment
    query = db.query(models.AppointmentAttachment).filter(
        models.AppointmentAttachment.appointment_id == appointment_id,
        models.AppointmentAttachment.is_image == True,
        models.AppointmentAttachment.thumbnail_path != None  # Ensure thumbnail exists
    )

    # Add uploaded_by filter only for non-SECRETARIAT users
    if current_user.role.is_general_role_type():
        query = query.filter(models.AppointmentAttachment.uploaded_by == current_user.id)

    # Execute the query
    attachments = query.all()

    # Prepare the response
    thumbnails = []
    for attachment in attachments:
        try:
            # Get the thumbnail data from S3
            file_data = get_file(attachment.thumbnail_path)
            thumbnail_bytes = file_data['file_data']
            
            # Encode it as base64
            encoded_thumbnail = base64.b64encode(thumbnail_bytes).decode('utf-8')
                
            thumbnails.append({
                "id": attachment.id,
                "thumbnail": encoded_thumbnail
            })
        except Exception as e:
            logger.error(f"Error getting thumbnail for attachment {attachment.id} (path: {attachment.thumbnail_path}): {str(e)}")
            continue

    return thumbnails

@router.get("/appointments/attachments/{attachment_id}/thumbnail")
async def get_attachment_thumbnail(
    attachment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a thumbnail for an image attachment"""
    # Base query
    query = db.query(models.AppointmentAttachment).filter(
        models.AppointmentAttachment.id == attachment_id
    )
    
    # Add uploaded_by filter only for non-SECRETARIAT users
    if current_user.role.is_general_role_type():
        query = query.filter(models.AppointmentAttachment.uploaded_by == current_user.id)
        
    attachment = query.first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if not attachment.is_image:
        raise HTTPException(status_code=400, detail="Attachment is not an image")
        
    if not attachment.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not available")

    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == attachment.appointment_id
    ).first()
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=attachment.appointment_id,
            required_access_level=models.AccessLevel.READ
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to access this attachment")

    file_data = get_file(attachment.thumbnail_path)
    
    # Return the thumbnail without Content-Disposition header to display inline
    return StreamingResponse(
        io.BytesIO(file_data['file_data']),
        media_type=file_data['content_type']
    )

@router.delete("/appointments/attachments/{attachment_id}", status_code=204)
async def delete_attachment(
    attachment_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Delete an attachment"""
    # Get the attachment
    attachment = db.query(models.AppointmentAttachment).filter(models.AppointmentAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Check if user has permission to delete
    appointment = db.query(models.Appointment).filter(models.Appointment.id == attachment.appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.requester_id != current_user.id:
        admin_access_check = admin_check_appointment_for_access_level(
            current_user=current_user,
            db=db,
            appointment_id=attachment.appointment_id,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not admin_access_check:
            raise HTTPException(status_code=403, detail="Not authorized to delete this attachment")
    
    # Delete the attachment
    db.delete(attachment)
    db.commit()
    
    return None 