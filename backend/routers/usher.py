from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, false
from typing import List, Optional
from datetime import datetime, timedelta
import logging

# Import our dependencies
from dependencies.database import get_db, get_read_db
from dependencies.auth import requires_any_role, get_current_user, get_current_user_for_write

# Import models and schemas
import models
import schemas

# Get logger
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/appointments", response_model=List[schemas.AppointmentUsherView])
@requires_any_role([models.UserRole.USHER, models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_usher_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    date: Optional[str] = None,
):
    """
    Get appointments for USHER role with access control restrictions.
    By default, returns appointments for today and the next two days.
    If date parameter is provided, returns appointments for that specific date.
    """
    # If specific date is provided, use that
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # USHER can only view appointments for the previous 3 days and the next 3 days
        if target_date < datetime.now().date()-timedelta(days=3) or target_date > datetime.now().date()+timedelta(days=3):
            raise HTTPException(status_code=400, detail="Date beyond allowed range")

        start_date = target_date
        end_date = target_date
    else:
        # Default: today and next two days
        today = datetime.now().date()
        start_date = today
        end_date = today + timedelta(days=2)
   
    # Start building the query with date range filter using calendar_event data
    query = db.query(models.Appointment).join(models.CalendarEvent).filter(
        models.CalendarEvent.start_date >= start_date,
        models.CalendarEvent.start_date <= end_date
    )
    
    # USHER specific filters - apply to all roles using this endpoint
    # Only show confirmed appointments for the usher view
    query = query.filter(
        models.Appointment.status == models.AppointmentStatus.APPROVED,
        models.Appointment.sub_status == models.AppointmentSubStatus.SCHEDULED,
    )
    
    # ADMIN role has full access to all appointments within the date range
    if current_user.role != models.UserRole.ADMIN:
        # Non-ADMIN roles need access control checks
        # Get active access records for the SECRETARIAT user
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # Only consider records that grant access to appointments
            or_(
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT,
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT_AND_DIGNITARY
            )
        ).all()
        
        if not user_access:
            # If no valid access records exist, return empty list
            return []
        
        # Create access filters based on country and location
        access_filters = []
        # Start with a "false" condition
        access_filters.append(false())
        
        for access in user_access:
            # If a specific location is specified in the access record
            if access.location_id:
                access_filters.append(
                    and_(
                        models.Appointment.location_id == access.location_id,
                        models.Location.country_code == access.country_code
                    )
                )
            else:
                # Access to all locations in the country
                access_filters.append(
                    models.Location.country_code == access.country_code
                )
        
        # Join to locations table and apply the country and location filters
        query = query.join(models.Location)
        query = query.filter(or_(*access_filters))
    
    # Add eager loading and ordering
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.appointment_contacts).joinedload(models.AppointmentContact.contact),
        joinedload(models.Appointment.calendar_event),
        joinedload(models.Appointment.requester),
        joinedload(models.Appointment.location)
    ).order_by(
        models.CalendarEvent.start_date,
        models.CalendarEvent.start_time
    )
    
    appointments = query.all()
    
    # Transform appointments to use calendar event data only
    usher_appointments = []
    for appointment in appointments:
        # All appointments in usher view must have calendar events (since we filter by approved+scheduled)
        if not appointment.calendar_event:
            logger.warning(f"Approved+scheduled appointment {appointment.id} missing calendar event - skipping")
            continue
            
        # Use calendar event data exclusively
        appointment_date = appointment.calendar_event.start_date
        appointment_time = appointment.calendar_event.start_time
        location = appointment.calendar_event.location or appointment.location  # Calendar event location takes precedence
        
        # Convert appointment_contacts to proper usher view format
        appointment_users_usher = []
        if appointment.appointment_contacts:
            for ac in appointment.appointment_contacts:
                # Merge AppointmentContact and UserContact data for usher view (limited fields only)
                user_usher_data = {
                    'id': ac.id,
                    'created_at': ac.created_at,
                    'attendance_status': ac.attendance_status,
                    'checked_in_at': ac.checked_in_at,
                    **{k: v for k, v in ac.contact.__dict__.items() if k in ['first_name', 'last_name']}  # Ushers only get names
                }
                appointment_users_usher.append(schemas.AppointmentUserUsherView(**user_usher_data))

        # Create usher view with calendar event data
        usher_appointment = schemas.AppointmentUsherView(
            id=appointment.id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            requester=appointment.requester,
            location=location,
            appointment_dignitaries=appointment.appointment_dignitaries,
            appointment_users=appointment_users_usher
        )
        usher_appointments.append(usher_appointment)
    
    return usher_appointments

@router.patch("/dignitaries/checkin", response_model=schemas.AppointmentDignitary)
@requires_any_role([models.UserRole.USHER, models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_dignitary_checkin(
    data: schemas.AttendanceStatusUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """
    Update the attendance status of a dignitary for an appointment.
    Only users with appropriate access to the appointment's location can update the status.
    """
    if data.attendance_status not in [models.AttendanceStatus.CHECKED_IN, models.AttendanceStatus.PENDING]:
        logger.error(f"Invalid attendance status: {data.attendance_status}")
        raise HTTPException(status_code=400, detail="Usher can only check in or mark dignitaries as pending")
    
    # Check if the appointment dignitary exists
    appointment_dignitary = db.query(models.AppointmentDignitary).filter(
        models.AppointmentDignitary.id == data.appointment_dignitary_id
    ).first()
    
    if not appointment_dignitary:
        raise HTTPException(status_code=404, detail="Appointment dignitary not found")
    
    # Import access control function
    from dependencies.access_control import admin_get_appointment
    
    # Verify user has access to update this appointment's dignitary
    if current_user.role != models.UserRole.ADMIN:
        # For non-admin roles, check location-based access
        appointment = admin_get_appointment(
            db=db,
            appointment_id=appointment_dignitary.appointment_id,
            current_user=current_user,
            required_access_level=models.AccessLevel.READ_WRITE
        )

        if not appointment:
            raise HTTPException(status_code=404, detail="Unauthorized to update this appointment")

    # Update the attendance status
    appointment_dignitary.attendance_status = data.attendance_status
    appointment_dignitary.updated_by = current_user.id
    db.commit()
    db.refresh(appointment_dignitary)
    
    return appointment_dignitary

@router.patch("/appointment-contacts/{appointment_contact_id}/check-in", response_model=schemas.AppointmentUserUsherView)
@requires_any_role([models.UserRole.USHER, models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def check_in_appointment_contact(
    appointment_contact_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """
    Check in an individual darshan attendee.
    Only users with appropriate access to the appointment's location can check in users.
    """
    # Check if the appointment contact exists
    appointment_contact = db.query(models.AppointmentContact).filter(
        models.AppointmentContact.id == appointment_contact_id
    ).first()
    
    if not appointment_contact:
        raise HTTPException(status_code=404, detail="Appointment contact not found")
    
    # Import access control function
    from dependencies.access_control import admin_get_appointment
    
    # Verify user has access to update this appointment's user
    if current_user.role != models.UserRole.ADMIN:
        # For non-admin roles, check location-based access
        appointment = admin_get_appointment(
            db=db,
            appointment_id=appointment_contact.appointment_id,
            current_user=current_user,
            required_access_level=models.AccessLevel.READ_WRITE
        )

        if not appointment:
            raise HTTPException(status_code=404, detail="Unauthorized to update this appointment")

    # Update the attendance status
    appointment_contact.attendance_status = models.AttendanceStatus.CHECKED_IN
    appointment_contact.checked_in_at = datetime.utcnow()
    appointment_contact.updated_by = current_user.id
    db.commit()
    db.refresh(appointment_contact)
    
    # Return contact data in AppointmentUserUsherView format (limited data for ushers)
    contact_data = {
        'id': appointment_contact.id,
        'created_at': appointment_contact.created_at,
        'attendance_status': appointment_contact.attendance_status,
        'checked_in_at': appointment_contact.checked_in_at,
        **{k: v for k, v in appointment_contact.contact.__dict__.items() if k in ['first_name', 'last_name']}  # Ushers only get names
    }
    return schemas.AppointmentUserUsherView(**contact_data)

@router.post("/appointments/{appointment_id}/check-in-all", response_model=schemas.BulkCheckinResponse)
@requires_any_role([models.UserRole.USHER, models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def check_in_all_attendees(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """
    Check in all attendees (dignitaries and users) for an appointment.
    """
    # Import access control function
    from dependencies.access_control import admin_get_appointment
    
    # Verify user has access to this appointment
    if current_user.role != models.UserRole.ADMIN:
        appointment = admin_get_appointment(
            db=db,
            appointment_id=appointment_id,
            current_user=current_user,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not appointment:
            raise HTTPException(status_code=404, detail="Unauthorized to update this appointment")
    
    total_checked_in = 0
    already_checked_in = 0
    
    # Check in all dignitaries
    dignitaries = db.query(models.AppointmentDignitary).filter(
        models.AppointmentDignitary.appointment_id == appointment_id
    ).all()
    
    for dignitary in dignitaries:
        if dignitary.attendance_status == models.AttendanceStatus.CHECKED_IN:
            already_checked_in += 1
        else:
            dignitary.attendance_status = models.AttendanceStatus.CHECKED_IN
            dignitary.updated_by = current_user.id
            total_checked_in += 1
    
    # Check in all contacts
    contacts = db.query(models.AppointmentContact).filter(
        models.AppointmentContact.appointment_id == appointment_id
    ).all()
    
    for contact in contacts:
        if contact.attendance_status == models.AttendanceStatus.CHECKED_IN:
            already_checked_in += 1
        else:
            contact.attendance_status = models.AttendanceStatus.CHECKED_IN
            contact.checked_in_at = datetime.utcnow()
            contact.updated_by = current_user.id
            total_checked_in += 1
    
    db.commit()
    
    return schemas.BulkCheckinResponse(
        total_checked_in=total_checked_in,
        already_checked_in=already_checked_in
    )

@router.post("/appointments/{appointment_id}/check-in-all-contacts", response_model=schemas.BulkCheckinResponse)
@requires_any_role([models.UserRole.USHER, models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def check_in_all_contacts(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """
    Check in all darshan attendees (contacts) for an appointment.
    """
    # Import access control function
    from dependencies.access_control import admin_get_appointment
    
    # Verify user has access to this appointment
    if current_user.role != models.UserRole.ADMIN:
        appointment = admin_get_appointment(
            db=db,
            appointment_id=appointment_id,
            current_user=current_user,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not appointment:
            raise HTTPException(status_code=404, detail="Unauthorized to update this appointment")
    
    total_checked_in = 0
    already_checked_in = 0
    
    # Check in all contacts
    contacts = db.query(models.AppointmentContact).filter(
        models.AppointmentContact.appointment_id == appointment_id
    ).all()
    
    for contact in contacts:
        if contact.attendance_status == models.AttendanceStatus.CHECKED_IN:
            already_checked_in += 1
        else:
            contact.attendance_status = models.AttendanceStatus.CHECKED_IN
            contact.checked_in_at = datetime.utcnow()
            contact.updated_by = current_user.id
            total_checked_in += 1
    
    db.commit()
    
    return schemas.BulkCheckinResponse(
        total_checked_in=total_checked_in,
        already_checked_in=already_checked_in
    )

@router.post("/appointments/{appointment_id}/check-in-all-dignitaries", response_model=schemas.BulkCheckinResponse)
@requires_any_role([models.UserRole.USHER, models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def check_in_all_dignitaries(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """
    Check in all dignitaries for an appointment.
    """
    # Import access control function
    from dependencies.access_control import admin_get_appointment
    
    # Verify user has access to this appointment
    if current_user.role != models.UserRole.ADMIN:
        appointment = admin_get_appointment(
            db=db,
            appointment_id=appointment_id,
            current_user=current_user,
            required_access_level=models.AccessLevel.READ_WRITE
        )
        if not appointment:
            raise HTTPException(status_code=404, detail="Unauthorized to update this appointment")
    
    total_checked_in = 0
    already_checked_in = 0
    
    # Check in all dignitaries
    dignitaries = db.query(models.AppointmentDignitary).filter(
        models.AppointmentDignitary.appointment_id == appointment_id
    ).all()
    
    for dignitary in dignitaries:
        if dignitary.attendance_status == models.AttendanceStatus.CHECKED_IN:
            already_checked_in += 1
        else:
            dignitary.attendance_status = models.AttendanceStatus.CHECKED_IN
            dignitary.updated_by = current_user.id
            total_checked_in += 1
    
    db.commit()
    
    return schemas.BulkCheckinResponse(
        total_checked_in=total_checked_in,
        already_checked_in=already_checked_in
    ) 