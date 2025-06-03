from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, false, func
from datetime import datetime, date, timedelta, time
from typing import Optional, List
import logging

import models
import schemas
from dependencies.database import get_db, get_read_db
from dependencies.auth import get_current_user_for_write, get_current_user, requires_any_role
from dependencies.access_control import admin_get_appointment
from utils.email_notifications import notify_appointment_creation, notify_appointment_update
from utils.calendar_sync import check_and_sync_appointment, check_and_sync_updated_appointment
from utils.utils import convert_to_datetime_with_tz

logger = logging.getLogger(__name__)

router = APIRouter()

def create_timezone_aware_datetime(appointment_date: date, appointment_time: str, location_id: int, db: Session) -> datetime:
    """Create timezone-aware datetime for CalendarEvent using sophisticated timezone logic"""
    
    # Get location information for timezone determination
    location = None
    if location_id:
        location = db.query(models.Location).filter(models.Location.id == location_id).first()
    
    # Convert date to string format expected by convert_to_datetime_with_tz
    date_str = appointment_date.isoformat()
    
    # Use the sophisticated timezone conversion logic
    return convert_to_datetime_with_tz(date_str, appointment_time, location)

def create_calendar_event_for_admin_appointment(
    appointment_data: schemas.AppointmentCreateEnhanced,
    appointment_date: date,
    appointment_time: str,
    duration: int,
    location_id: int,
    meeting_place_id: Optional[int],
    max_capacity: Optional[int],
    is_open_for_booking: Optional[bool],
    current_user: models.User,
    db: Session
) -> models.CalendarEvent:
    """Create a calendar event for an admin appointment with timezone-aware datetime"""
    
    # Use mapping from enums instead of inline mapping
    from models.enums import EVENT_TYPE_TO_REQUEST_TYPE_MAPPING
    event_type = EVENT_TYPE_TO_REQUEST_TYPE_MAPPING.get(
        appointment_data.request_type, 
        models.EventType.OTHER
    )
    
    # Create timezone-aware datetime using sophisticated timezone logic
    start_datetime = create_timezone_aware_datetime(appointment_date, appointment_time, location_id, db)
    
    # Create the calendar event
    db_event = models.CalendarEvent(
        event_type=event_type,
        title=f"{event_type.value} - {appointment_data.purpose[:50]}",
        description=appointment_data.purpose,
        start_datetime=start_datetime,  # Timezone-aware calculated datetime
        start_date=appointment_date,    # Original user input date
        start_time=appointment_time,    # Original user input time string
        duration=duration,
        location_id=location_id,
        meeting_place_id=meeting_place_id,
        max_capacity=max_capacity,
        is_open_for_booking=is_open_for_booking if is_open_for_booking is not None else True,
        status=models.EventStatus.CONFIRMED,  # Admin appointments are confirmed immediately
        creation_context=models.CalendarCreationContext.APPOINTMENT,
        creation_context_id=str(current_user.id),
        created_by=current_user.id,
        updated_by=current_user.id
    )
    
    db.add(db_event)
    db.flush()  # Get the ID without committing
    return db_event

@router.post("/new", response_model=schemas.AdminAppointmentResponseEnhanced)
async def create_appointment(
    appointment: schemas.AppointmentCreateEnhanced,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new appointment (unified admin endpoint supporting both legacy and enhanced requests)"""
    start_time = datetime.utcnow()
    logger.info(f"Admin creating new {appointment.request_type.value} appointment for user {current_user.email} (ID: {current_user.id})")
    logger.debug(f"Appointment data: {appointment.dict()}")
    
    try:
        # Handle calendar event creation scenarios
        calendar_event = None
        
        if appointment.calendar_event_id:
            # Scenario 1: Link to existing calendar event
            calendar_event = db.query(models.CalendarEvent).filter(
                models.CalendarEvent.id == appointment.calendar_event_id
            ).first()
            if not calendar_event:
                raise HTTPException(status_code=404, detail="Calendar event not found")
            
            # Check availability
            current_capacity = db.query(func.sum(models.Appointment.number_of_attendees)).filter(
                models.Appointment.calendar_event_id == appointment.calendar_event_id,
                models.Appointment.status.notin_([
                    models.AppointmentStatus.CANCELLED,
                    models.AppointmentStatus.REJECTED
                ])
            ).scalar() or 0
            
            required_capacity = 0
            if appointment.dignitary_ids:
                required_capacity += len(appointment.dignitary_ids)
            if appointment.user_ids:
                required_capacity += len(appointment.user_ids)
            if required_capacity == 0:
                required_capacity = 1  # Default to 1 if nothing specified
            if current_capacity + required_capacity > calendar_event.max_capacity:
                raise HTTPException(status_code=400, detail="Calendar event is at full capacity")
                
        elif appointment.appointment_date and appointment.appointment_time:
            # Scenario 2: Admin specifying exact appointment details - create calendar event immediately
            calendar_event = create_calendar_event_for_admin_appointment(
                appointment, 
                appointment.appointment_date,
                appointment.appointment_time,
                appointment.duration,
                appointment.location_id,
                appointment.meeting_place_id,
                appointment.max_capacity,
                appointment.is_open_for_booking,
                current_user, 
                db
            )
        # Scenario 3: User preferred date - no calendar event creation (will be created on approval)
        # calendar_event remains None
        
        # Calculate number of attendees based on what's provided
        number_of_attendees = 0
        if appointment.dignitary_ids:
            number_of_attendees += len(appointment.dignitary_ids)
        if appointment.user_ids:
            number_of_attendees += len(appointment.user_ids)
        if number_of_attendees == 0:
            number_of_attendees = 1  # Default to 1 if nothing specified
        
        # Create appointment
        db_appointment = models.Appointment(
            created_by=current_user.id,
            last_updated_by=current_user.id,
            status=models.AppointmentStatus.PENDING,
            purpose=appointment.purpose,
            preferred_date=appointment.preferred_date,
            preferred_time_of_day=appointment.preferred_time_of_day,
            requester_notes_to_secretariat=appointment.requester_notes_to_secretariat,
            location_id=appointment.location_id or (calendar_event.location_id if calendar_event else None),
            calendar_event_id=calendar_event.id if calendar_event else None,
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
        
        # Handle user attendees if user_ids are provided
        if appointment.user_ids:
            for user_data in appointment.user_ids:
                appointment_user = models.AppointmentUser(
                    appointment_id=db_appointment.id,
                    user_id=current_user.id,  # Admin creating on behalf
                    first_name=user_data.first_name,
                    last_name=user_data.last_name,
                    email=user_data.email,
                    phone=user_data.phone,
                    relationship_to_requester=user_data.relationship_to_requester,
                    comments=user_data.comments,
                    created_by=current_user.id,
                    updated_by=current_user.id
                )
                db.add(appointment_user)
        
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
        logger.info(f"Admin appointment created successfully (ID: {db_appointment.id}) in {total_time:.2f}ms")
        
        # Prepare enhanced admin response
        return prepare_enhanced_admin_appointment_response(db_appointment, db)
        
    except Exception as e:
        logger.error(f"Error creating admin appointment: {str(e)}", exc_info=True)
        raise

def prepare_enhanced_admin_appointment_response(appointment: models.Appointment, db: Session) -> schemas.AdminAppointmentResponseEnhanced:
    """Prepare enhanced admin appointment response with all related data"""
    
    # Load related data
    appointment = db.query(models.Appointment).options(
        joinedload(models.Appointment.requester),
        joinedload(models.Appointment.calendar_event),
        joinedload(models.Appointment.location),
        joinedload(models.Appointment.meeting_place),
        joinedload(models.Appointment.created_by_user),
        joinedload(models.Appointment.last_updated_by_user),
        joinedload(models.Appointment.approved_by_user),
        joinedload(models.Appointment.appointment_dignitaries).joinedload(
            models.AppointmentDignitary.dignitary
        ),
        joinedload(models.Appointment.appointment_users)
    ).filter(models.Appointment.id == appointment.id).first()
    
    # Prepare calendar event basic info
    calendar_event_info = None
    if appointment.calendar_event:
        calendar_event_info = schemas.CalendarEventBasicInfo(
            **appointment.calendar_event.__dict__
        )
    
    # Prepare appointment users
    appointment_users = []
    if appointment.appointment_users:
        for au in appointment.appointment_users:
            appointment_users.append(schemas.AppointmentUserInfo(**au.__dict__))
    
    # Prepare appointment dignitaries
    appointment_dignitaries = []
    if appointment.appointment_dignitaries:
        for ad in appointment.appointment_dignitaries:
            appointment_dignitaries.append(schemas.AppointmentDignitaryWithDignitary(**ad.__dict__))
    
    # Prepare response
    response_data = {
        **appointment.__dict__,
        'calendar_event': calendar_event_info,
        'appointment_users': appointment_users if appointment_users else None,
        'appointment_dignitaries': appointment_dignitaries if appointment_dignitaries else None,
        # Legacy compatibility
        'appointment_date': appointment.calendar_event.start_date if appointment.calendar_event else appointment.preferred_date,
        'appointment_time': appointment.calendar_event.start_time if appointment.calendar_event else None,
    }
    
    return schemas.AdminAppointmentResponseEnhanced(**response_data)

@router.patch("/update/{appointment_id}", response_model=schemas.AdminAppointment)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_appointment(
    appointment_id: int,
    appointment_update: schemas.AdminAppointmentUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update an appointment with access control restrictions"""
    appointment = admin_get_appointment(
        current_user=current_user,
        db=db,
        appointment_id=appointment_id,
        required_access_level=models.AccessLevel.READ_WRITE
    )
    
    # Save old data for notifications
    old_data = {}
    for key, value in appointment_update.dict(exclude_unset=True).items():
        old_data[key] = getattr(appointment, key)
    
    if appointment.status != models.AppointmentStatus.APPROVED and appointment_update.status == models.AppointmentStatus.APPROVED:
        logger.info("Appointment is approved")
        appointment.approved_datetime = datetime.utcnow()
        appointment.approved_by = current_user.id

    # Update appointment with new data
    update_data = appointment_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(appointment, key, value)
    appointment.last_updated_by = current_user.id
    
    # Handle calendar event updates - always call if calendar event exists
    calendar_event_updated = False
    if appointment.calendar_event_id:
        calendar_event = db.query(models.CalendarEvent).filter(
            models.CalendarEvent.id == appointment.calendar_event_id
        ).first()
        if calendar_event:
            update_calendar_event_for_appointment(appointment, calendar_event, current_user, db)
            calendar_event_updated = True
    elif (appointment.status == models.AppointmentStatus.APPROVED and 
          appointment.sub_status == models.AppointmentSubStatus.SCHEDULED):
        # Create calendar event for newly approved+scheduled appointments without existing calendar events
        calendar_event = create_calendar_event_for_approved_appointment(appointment, current_user, db)
        if calendar_event:
            calendar_event_updated = True
            logger.info(f"Created calendar event {calendar_event.id} for approved appointment {appointment.id}")
    
    db.commit()
    db.refresh(appointment)

    if appointment_update.dignitary_ids:
        for dignitary_id in appointment_update.dignitary_ids:
            appointment_dignitary = models.AppointmentDignitary(
                appointment_id=appointment.id,
                dignitary_id=dignitary_id,
                created_by=current_user.id,
                updated_by=current_user.id
            )
            db.add(appointment_dignitary)
            
        db.commit()

    # Send email notifications about the update
    try:
        notify_appointment_update(db, appointment, old_data, update_data)
        if calendar_event_updated:
            logger.info(f"Calendar event operations completed for appointment {appointment.id}")
    except Exception as e:
        logger.error(f"Error sending email notifications: {str(e)}")
    
    # Handle calendar sync based on appointment status changes
    try:
        await check_and_sync_updated_appointment(appointment, old_data, update_data, db)
        logger.debug(f"Appointment status changes processed for calendar sync")
    except Exception as e:
        logger.error(f"Error handling appointment calendar sync based on status changes: {str(e)}")
    
    return appointment


@router.get("/all", response_model=List[schemas.AdminAppointment])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Get all appointments with optional status filter, restricted by user's access permissions"""
    query = db.query(models.Appointment).order_by(models.Appointment.id.asc())

    # Apply status filter if provided
    if status:
        query = query.filter(models.Appointment.status.in_(status.split(',')))
    # Apply start and end date filters if provided
    if start_date:
        query = query.filter(or_(models.Appointment.preferred_date >= start_date, models.Appointment.appointment_date >= start_date))
    if end_date:
        query = query.filter(or_(models.Appointment.preferred_date <= end_date, models.Appointment.appointment_date <= end_date))

    # ADMIN role has full access to all appointments
    if current_user.role != models.UserRole.ADMIN:
        # For non-ADMIN users, apply access control restrictions
        # Get all active access records for the current user
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
        # Start with a "false" condition that ensures no records are returned if no access is configured
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

    # Add options to eagerly load appointment_dignitaries and their associated dignitaries
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester)
    )

    appointments = query.all()
    logger.debug(f"Appointments: {appointments}")
    return appointments

@router.get("/upcoming", response_model=List[schemas.AdminAppointment])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_upcoming_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    status: Optional[str] = None
):
    """Get all upcoming appointments (future appointment_date, not NULL) with access control restrictions"""
    # Start with the filter for upcoming appointments
    upcoming_filter = and_(
        or_(
            models.Appointment.appointment_date == None,
            models.Appointment.appointment_date >= date.today()-timedelta(days=1),
        ),
        models.Appointment.status.notin_([
            models.AppointmentStatus.CANCELLED, 
            models.AppointmentStatus.REJECTED, 
            models.AppointmentStatus.COMPLETED,
        ])
    )
    
    # Base query with upcoming filter
    query = db.query(models.Appointment).filter(upcoming_filter)
    
    # Apply status filter if provided
    if status:
        query = query.filter(models.Appointment.status == status)

    # ADMIN role has full access to all appointments
    if current_user.role != models.UserRole.ADMIN:
        # For non-ADMIN users, apply access control restrictions
        # Get all active access records for the current user
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
        # Start with a "false" condition that ensures no records are returned if no access is configured
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

    # Add sorting
    query = query.order_by(models.Appointment.appointment_date.asc())

    # Add options to eagerly load appointment_dignitaries and their associated dignitaries
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester)
    )
    
    appointments = query.all()
    logger.debug(f"Upcoming appointments with access control: {len(appointments)}")
    return appointments


@router.get("/{appointment_id}", response_model=schemas.AdminAppointment)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_appointment(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific appointment with access control restrictions"""
    appointment = admin_get_appointment(
        current_user=current_user,
        db=db,
        appointment_id=appointment_id,
        required_access_level=models.AccessLevel.READ
    )
    return appointment

def create_calendar_event_for_approved_appointment(
    appointment: models.Appointment,
    current_user: models.User,
    db: Session
) -> Optional[models.CalendarEvent]:
    """Create a calendar event when an appointment is approved and scheduled"""
    
    # Only create if we have the necessary information
    if not appointment.appointment_date or not appointment.appointment_time:
        logger.warning(f"Cannot create calendar event for appointment {appointment.id}: missing date/time")
        return None
    
    # Use mapping from enums
    from models.enums import EVENT_TYPE_TO_REQUEST_TYPE_MAPPING
    event_type = EVENT_TYPE_TO_REQUEST_TYPE_MAPPING.get(
        appointment.request_type, 
        models.EventType.OTHER
    )
    
    # Create timezone-aware datetime using sophisticated timezone logic
    start_datetime = create_timezone_aware_datetime(appointment.appointment_date, appointment.appointment_time, appointment.location_id, db)
    
    # Create the calendar event
    db_event = models.CalendarEvent(
        event_type=event_type,
        title=f"{event_type.value} - {appointment.purpose[:50]}",
        description=appointment.purpose,
        start_datetime=start_datetime,        # Timezone-aware calculated datetime
        start_date=appointment.appointment_date,    # Original appointment date
        start_time=appointment.appointment_time,    # Original appointment time string
        duration=appointment.duration,
        location_id=appointment.location_id,
        meeting_place_id=appointment.meeting_place_id,
        max_capacity=None,  # Don't auto-set capacity
        is_open_for_booking=True,  # Default to open
        status=models.EventStatus.CONFIRMED,
        creation_context=models.CalendarCreationContext.APPOINTMENT,
        creation_context_id=str(appointment.id),
        created_by=current_user.id,
        updated_by=current_user.id
    )
    
    db.add(db_event)
    db.flush()  # Get the ID without committing
    
    # Link the appointment to the calendar event
    appointment.calendar_event_id = db_event.id
    
    return db_event

def update_calendar_event_for_appointment(
    appointment: models.Appointment,
    calendar_event: models.CalendarEvent,
    current_user: models.User,
    db: Session
) -> None:
    """Update calendar event to match appointment state - respects creation context"""
    
    updated_fields = []
    
    # Only update status and core fields for appointment-created events
    if calendar_event.creation_context == models.CalendarCreationContext.APPOINTMENT:
        # Determine appropriate calendar event status based on appointment state
        if appointment.status == models.AppointmentStatus.APPROVED and appointment.sub_status == models.AppointmentSubStatus.SCHEDULED:
            target_status = models.EventStatus.CONFIRMED
        elif appointment.status == models.AppointmentStatus.CANCELLED:
            target_status = models.EventStatus.CANCELLED
        elif appointment.status == models.AppointmentStatus.REJECTED:
            target_status = models.EventStatus.CANCELLED
        elif appointment.status == models.AppointmentStatus.COMPLETED:
            target_status = models.EventStatus.COMPLETED
        else:
            # For pending, need more info, need reschedule, etc.
            target_status = models.EventStatus.DRAFT
        
        # Update status if different
        if calendar_event.status != target_status:
            calendar_event.status = target_status
            updated_fields.append(f'status -> {target_status.value}')
        
        # Only update other fields if appointment is approved+scheduled
        if appointment.status == models.AppointmentStatus.APPROVED and appointment.sub_status == models.AppointmentSubStatus.SCHEDULED:
            # Update date/time fields if they exist and are different
            if appointment.appointment_date and appointment.appointment_time:
                # Create timezone-aware datetime using sophisticated timezone logic
                new_start_datetime = create_timezone_aware_datetime(appointment.appointment_date, appointment.appointment_time, appointment.location_id, db)
                
                # Update only if values are different - preserve original user input for start_date and start_time
                if calendar_event.start_datetime != new_start_datetime:
                    calendar_event.start_datetime = new_start_datetime
                    updated_fields.append('start_datetime')
                    
                if calendar_event.start_date != appointment.appointment_date:
                    calendar_event.start_date = appointment.appointment_date  # Original user input
                    updated_fields.append('start_date')
                    
                if calendar_event.start_time != appointment.appointment_time:
                    calendar_event.start_time = appointment.appointment_time  # Original user input
                    updated_fields.append('start_time')
            
            # Update duration if different
            if appointment.duration and calendar_event.duration != appointment.duration:
                calendar_event.duration = appointment.duration
                updated_fields.append('duration')
                
            # Update location if different
            if appointment.location_id and calendar_event.location_id != appointment.location_id:
                calendar_event.location_id = appointment.location_id
                updated_fields.append('location_id')
                
            # Update meeting place if different
            if appointment.meeting_place_id and calendar_event.meeting_place_id != appointment.meeting_place_id:
                calendar_event.meeting_place_id = appointment.meeting_place_id
                updated_fields.append('meeting_place_id')
    else:
        # For admin-created or imported events, don't update status or core fields
        logger.debug(f"Skipping status/core field updates for {calendar_event.creation_context.value}-created calendar event {calendar_event.id}")
    
    # Always check and update description and title if purpose changed (for all creation contexts)
    new_description = appointment.purpose
    new_title = f"{calendar_event.event_type.value} - {appointment.purpose[:50]}"
    
    if calendar_event.description != new_description:
        calendar_event.description = new_description
        updated_fields.append('description')
        
    if calendar_event.title != new_title:
        calendar_event.title = new_title
        updated_fields.append('title')
    
    # Only update metadata if there were actual changes
    if updated_fields:
        calendar_event.updated_by = current_user.id
        logger.info(f"Updated calendar event {calendar_event.id} fields: {', '.join(updated_fields)} for appointment {appointment.id}")
    else:
        logger.debug(f"No calendar event updates needed for appointment {appointment.id}") 