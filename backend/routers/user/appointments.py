from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, time
import logging
import os

# Import our dependencies
from dependencies.database import get_db, get_read_db
from dependencies.auth import get_current_user, get_current_user_for_write

# Import models and schemas
import models
import schemas

# Import utilities
from utils.email_notifications import notify_appointment_creation
from utils.calendar_sync import check_and_sync_appointment

# Get logger
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/appointments/new", response_model=schemas.Appointment)
async def create_appointment(
    appointment: schemas.AppointmentCreateEnhanced,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new appointment (unified endpoint supporting both legacy and enhanced requests)"""
    start_time = datetime.utcnow()
    logger.info(f"Creating new {appointment.request_type.value} appointment for user {current_user.email} (ID: {current_user.id})")
    logger.debug(f"Appointment data: {appointment.dict()}")
    
    try:
        # Users cannot assign calendar events - only secretariat can do this during approval
        # All user appointments start without calendar events
        
        # Calculate number of attendees based on what's provided
        number_of_attendees = 0
        if appointment.dignitary_ids:
            number_of_attendees += len(appointment.dignitary_ids)
        if appointment.contact_ids:
            number_of_attendees += len(appointment.contact_ids)
        if number_of_attendees == 0:
            number_of_attendees = 1  # Default to 1 if nothing specified
        
        # Create appointment (users only provide preferences)
        db_appointment = models.Appointment(
            requester_id=current_user.id,
            created_by=current_user.id,
            last_updated_by=current_user.id,
            status=models.AppointmentStatus.PENDING,
            purpose=appointment.purpose,
            preferred_date=appointment.preferred_date,
            preferred_time_of_day=appointment.preferred_time_of_day,
            requester_notes_to_secretariat=appointment.requester_notes_to_secretariat,
            location_id=appointment.location_id,
            request_type=appointment.request_type,
            number_of_attendees=number_of_attendees
        )
        db.add(db_appointment)
        db.flush()
        
        # Handle dignitary appointments if dignitary_ids are provided
        if appointment.dignitary_ids:
            for dignitary_id in appointment.dignitary_ids:
                appointment_dignitary = models.AppointmentDignitary(
                    appointment_id=db_appointment.id,
                    dignitary_id=dignitary_id,
                    created_by=current_user.id,
                    updated_by=current_user.id
                )
                db.add(appointment_dignitary)
        
        # Handle contact attendees if contact_ids are provided
        if appointment.contact_ids:
            for contact_id in appointment.contact_ids:
                # Verify the contact exists and belongs to the current user
                contact = db.query(models.UserContact).filter(
                    models.UserContact.id == contact_id,
                    models.UserContact.owner_user_id == current_user.id
                ).first()
                
                if not contact:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Contact with ID {contact_id} not found or not owned by current user"
                    )
                
                # Update contact usage statistics
                contact.appointment_usage_count += 1
                contact.last_used_at = datetime.utcnow()
                contact.updated_by = current_user.id
                
                # Create AppointmentContact link
                appointment_contact = models.AppointmentContact(
                    appointment_id=db_appointment.id,
                    contact_id=contact_id,
                    created_by=current_user.id,
                    updated_by=current_user.id
                )
                db.add(appointment_contact)
        
        db.commit()
        db.refresh(db_appointment)
        
        # Send email notifications
        try:
            notify_appointment_creation(db, db_appointment)
        except Exception as e:
            logger.error(f"Error sending email notifications: {str(e)}", exc_info=True)

        # Sync appointment to Google Calendar if it meets criteria
        try:
            await check_and_sync_appointment(db_appointment, db)
        except Exception as e:
            logger.error(f"Error processing appointment for Google Calendar sync: {str(e)}", exc_info=True)

        # Calculate total operation time
        total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info(f"Appointment created successfully (ID: {db_appointment.id}) in {total_time:.2f}ms")
        
        # Return the created appointment with relationships loaded
        db_appointment = db.query(models.Appointment).options(
            joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
            joinedload(models.Appointment.requester),
            joinedload(models.Appointment.calendar_event),
            joinedload(models.Appointment.location),
            joinedload(models.Appointment.meeting_place),
            joinedload(models.Appointment.appointment_contacts)
        ).filter(models.Appointment.id == db_appointment.id).first()
        
        return db_appointment
        
    except Exception as e:
        logger.error(f"Error creating appointment: {str(e)}", exc_info=True)
        raise

@router.get("/appointments/my", response_model=List[schemas.Appointment])
async def get_my_appointments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db),
    request_type: Optional[str] = None
):
    """Get all appointments requested by the current user with optional request type filter"""
    query = db.query(models.Appointment).filter(
        models.Appointment.requester_id == current_user.id
    )
    
    # Apply request type filter if provided
    if request_type:
        query = query.filter(models.Appointment.request_type.in_(request_type.split(',')))
    
    # Add options to eagerly load appointment_dignitaries and their associated dignitaries
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester),
        joinedload(models.Appointment.calendar_event),
        joinedload(models.Appointment.location),
        joinedload(models.Appointment.meeting_place),
        joinedload(models.Appointment.appointment_contacts)
    ).order_by(models.Appointment.id.desc())

    appointments = query.all()
    logger.debug(f"Appointments: {appointments}")
    return appointments

@router.get("/appointments/my/{dignitary_id}", response_model=List[schemas.Appointment])
async def get_my_appointments_for_dignitary(
    dignitary_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all appointments for a specific dignitary"""
    appointments = (
        db.query(models.Appointment)
        .join(models.AppointmentDignitary)
        .filter(
            models.AppointmentDignitary.dignitary_id == dignitary_id,
            models.Appointment.requester_id == current_user.id
        )
        .options(
            joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary)
        )
        .all()
    )
    logger.debug(f"Appointments: {appointments}")
    return appointments

@router.post("/appointments/{appointment_id}/dignitaries", response_model=List[schemas.AppointmentDignitary])
async def add_dignitaries_to_appointment(
    appointment_id: int,
    dignitary_ids: List[int],
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Add dignitaries to an existing appointment"""
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    for dignitary_id in dignitary_ids:
        # Check if the association already exists
        existing = (
            db.query(models.AppointmentDignitary)
            .filter(
                models.AppointmentDignitary.appointment_id == appointment_id,
                models.AppointmentDignitary.dignitary_id == dignitary_id
            )
            .first()
        )
        
        if not existing:
            appointment_dignitary = models.AppointmentDignitary(
                appointment_id=appointment_id,
                dignitary_id=dignitary_id,
                created_by=current_user.id,
                updated_by=current_user.id
            )
            db.add(appointment_dignitary)

    db.commit()

    # Retrieve the updated list of dignitaries for the appointment
    updated_dignitaries = db.query(models.AppointmentDignitary).filter(models.AppointmentDignitary.appointment_id == appointment_id).all()
    
    return updated_dignitaries

@router.delete("/appointments/{appointment_id}/dignitaries/{dignitary_id}", status_code=204)
async def remove_dignitary_from_appointment(
    appointment_id: int,
    dignitary_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user_for_write)
):
    """Remove a dignitary from an appointment"""
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check if the dignitary is associated with the appointment
    appointment_dignitary = (
        db.query(models.AppointmentDignitary)
        .filter(
            models.AppointmentDignitary.appointment_id == appointment_id,
            models.AppointmentDignitary.dignitary_id == dignitary_id
        )
        .first()
    )
    
    if not appointment_dignitary:
        raise HTTPException(status_code=404, detail="Dignitary not associated with this appointment")
    
    # Delete the association
    db.delete(appointment_dignitary)
    db.commit()
    
    return None

@router.get("/appointments/{appointment_id}/dignitaries", response_model=List[schemas.Dignitary])
async def get_appointment_dignitaries(
    appointment_id: int,
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all dignitaries associated with an appointment"""
    appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id,
        models.Appointment.requester_id == current_user.id,
    ).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Get all dignitaries associated with the appointment
    dignitaries = (
        db.query(models.Dignitary)
        .join(models.AppointmentDignitary)
        .filter(models.AppointmentDignitary.appointment_id == appointment_id)
        .all()
    )
    
    return dignitaries

@router.get("/appointments/business-card/extraction-status")
async def get_business_card_extraction_status(
    current_user: models.User = Depends(get_current_user)
):
    """Check if business card extraction is enabled"""
    enable_extraction = os.environ.get("ENABLE_BUSINESS_CARD_EXTRACTION", "true").lower() == "true"
    return {"enabled": enable_extraction} 