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
from models.enums import RequestType, EVENT_TYPE_TO_REQUEST_TYPE_EXPLICIT

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
    logger.info(f"Admin creating new appointment for user {current_user.email} (ID: {current_user.id})")
    logger.debug(f"Appointment data: {appointment.dict()}")
    logger.debug(f"event_type: {getattr(appointment, 'event_type', None)}, request_type: {getattr(appointment, 'request_type', None)}")
    
    try:
        # Use explicit mapping from event_type to request_type
        if getattr(appointment, 'event_type', None) and not getattr(appointment, 'request_type', None):
            event_type = appointment.event_type
            event_type_value = event_type.value if hasattr(event_type, 'value') else str(event_type)
            # Try to get the enum member from the value if needed
            event_type_enum = None
            try:
                from models.enums import EventType
                event_type_enum = EventType(event_type_value)
            except Exception:
                pass
            request_type = None
            if event_type_enum and event_type_enum in EVENT_TYPE_TO_REQUEST_TYPE_EXPLICIT:
                request_type = EVENT_TYPE_TO_REQUEST_TYPE_EXPLICIT[event_type_enum]
            elif event_type_value in [et.value for et in EVENT_TYPE_TO_REQUEST_TYPE_EXPLICIT.keys()]:
                # fallback: match by value
                for et, rt in EVENT_TYPE_TO_REQUEST_TYPE_EXPLICIT.items():
                    if et.value == event_type_value:
                        request_type = rt
                        break
            if request_type:
                appointment.request_type = request_type
            else:
                logger.warning(f"Unrecognized event_type '{event_type_value}' for mapping to request_type.")
        
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
            if appointment.contact_ids:
                required_capacity += len(appointment.contact_ids)
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
        if appointment.contact_ids:
            number_of_attendees += len(appointment.contact_ids)
        if number_of_attendees == 0:
            number_of_attendees = 1  # Default to 1 if nothing specified
        
        # Create appointment
        db_appointment = models.Appointment(
            created_by=current_user.id,
            last_updated_by=current_user.id,
            status=appointment.status or models.AppointmentStatus.PENDING,
            sub_status=appointment.sub_status,
            appointment_type=appointment.appointment_type,
            purpose=appointment.purpose,
            preferred_date=appointment.preferred_date,  # For dignitary appointments only
            preferred_start_date=appointment.preferred_start_date,  # For non-dignitary appointments
            preferred_end_date=appointment.preferred_end_date,      # For non-dignitary appointments
            preferred_time_of_day=appointment.preferred_time_of_day,
            requester_notes_to_secretariat=appointment.requester_notes_to_secretariat,
            secretariat_meeting_notes=appointment.secretariat_meeting_notes,
            secretariat_follow_up_actions=appointment.secretariat_follow_up_actions,
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
        
        # Handle contact attendees if contact_ids are provided
        if appointment.contact_ids:
            for contact_id in appointment.contact_ids:
                # Verify the contact exists and get the owner
                contact = db.query(models.UserContact).filter(
                    models.UserContact.id == contact_id
                ).first()
                
                if not contact:
                    raise HTTPException(
                        status_code=404, 
                        detail=f"Contact with ID {contact_id} not found"
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
        joinedload(models.Appointment.appointment_contacts).joinedload(models.AppointmentContact.contact)
    ).filter(models.Appointment.id == appointment.id).first()
    
    # Prepare calendar event basic info
    calendar_event_info = None
    if appointment.calendar_event:
        calendar_event_info = schemas.CalendarEventBasicInfo(
            **appointment.calendar_event.__dict__
        )
    
    # Prepare appointment contacts - no field mapping needed since we use UserContact directly
    appointment_contacts = []
    if appointment.appointment_contacts:
        for ac in appointment.appointment_contacts:
            appointment_contacts.append(schemas.AdminAppointmentContactWithContact(**ac.__dict__))
    
    # Prepare appointment dignitaries
    appointment_dignitaries = []
    if appointment.appointment_dignitaries:
        for ad in appointment.appointment_dignitaries:
            ad_dict = ad.__dict__.copy()
            if ad.dignitary is not None:
                ad_dict['dignitary'] = schemas.Dignitary.from_orm(ad.dignitary)
            appointment_dignitaries.append(schemas.AppointmentDignitaryWithDignitary(**ad_dict))
    
    # Convert the appointment to dict and handle nested relationships dynamically
    response_data = appointment.__dict__.copy()
    
    # Dynamic relationship conversion mapping
    relationship_mappings = {
        'location': schemas.Location,
        'created_by_user': schemas.User,
        'last_updated_by_user': schemas.User,
        'approved_by_user': schemas.User,
        'requester': schemas.User,
        'meeting_place': schemas.MeetingPlace,
    }
    
    # Dynamically convert SQLAlchemy relationships to Pydantic models
    for field_name, pydantic_schema in relationship_mappings.items():
        if hasattr(appointment, field_name):
            field_value = getattr(appointment, field_name)
            if field_value is not None:
                # Check if it's a SQLAlchemy model instance (has __table__ attribute)
                if hasattr(field_value, '__table__'):
                    response_data[field_name] = pydantic_schema.from_orm(field_value)
    
    # Prepare response
    response_data.update({
        'calendar_event': calendar_event_info,
        'appointment_contacts': appointment_contacts if appointment_contacts else None,
        'appointment_dignitaries': appointment_dignitaries if appointment_dignitaries else None,
        # Legacy compatibility
        'appointment_date': appointment.calendar_event.start_date if appointment.calendar_event else None,
        'appointment_time': appointment.calendar_event.start_time if appointment.calendar_event else None,
    })
    
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

@router.patch("/bulk-update", response_model=dict)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def bulk_update_appointments(
    bulk_update: schemas.BulkAppointmentUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update multiple appointments with the same status"""
    logger.info(f"Bulk updating {len(bulk_update.appointment_ids)} appointments to status {bulk_update.status}")
    
    try:
        updated_count = 0
        failed_count = 0
        
        for appointment_id in bulk_update.appointment_ids:
            try:
                # Get appointment with access control
                appointment = admin_get_appointment(
                    current_user=current_user,
                    db=db,
                    appointment_id=appointment_id,
                    required_access_level=models.AccessLevel.READ_WRITE
                )
                
                # Exclude DIGNITARY and PROJECT_TEAM_MEETING types
                if appointment.request_type in [models.RequestType.DIGNITARY, models.RequestType.PROJECT_TEAM_MEETING]:
                    logger.warning(f"Skipping appointment {appointment_id}: {appointment.request_type} type not allowed in bulk update")
                    failed_count += 1
                    continue
                
                # Save old status for notifications
                old_status = appointment.status
                
                # Update status
                appointment.status = bulk_update.status
                appointment.last_updated_by = current_user.id
                
                # Handle approval
                if old_status != models.AppointmentStatus.APPROVED and bulk_update.status == models.AppointmentStatus.APPROVED:
                    appointment.approved_datetime = datetime.utcnow()
                    appointment.approved_by = current_user.id
                
                updated_count += 1
                
                # Send email notification for this appointment
                try:
                    old_data = {'status': old_status}
                    update_data = {'status': appointment.status}
                    notify_appointment_update(db, appointment, old_data, update_data)
                except Exception as e:
                    logger.error(f"Error sending email notification for appointment {appointment_id}: {str(e)}")
                
            except Exception as e:
                logger.error(f"Error updating appointment {appointment_id}: {str(e)}")
                failed_count += 1
                continue
        
        db.commit()
        
        logger.info(f"Bulk update completed: {updated_count} updated, {failed_count} failed")
        
        return {
            "message": f"Successfully updated {updated_count} appointments",
            "updated_count": updated_count,
            "failed_count": failed_count
        }
        
    except Exception as e:
        logger.error(f"Error in bulk update: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Bulk update failed: {str(e)}")

@router.patch("/bulk-approve-schedule", response_model=dict)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def bulk_approve_and_schedule_appointments(
    bulk_approve: schemas.BulkAppointmentApproveSchedule,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Approve and schedule multiple appointments to a specific calendar event"""
    logger.info(f"Bulk approving and scheduling {len(bulk_approve.appointment_ids)} appointments to calendar event {bulk_approve.calendar_event_id}")
    
    try:
        # Verify calendar event exists and is accessible
        calendar_event = db.query(models.CalendarEvent).filter(
            models.CalendarEvent.id == bulk_approve.calendar_event_id
        ).first()
        
        if not calendar_event:
            raise HTTPException(status_code=404, detail="Calendar event not found")
        
        # Check if calendar event is a darshan event
        if calendar_event.event_type != models.EventType.DARSHAN:
            raise HTTPException(status_code=400, detail="Calendar event must be a darshan event")
        
        updated_count = 0
        failed_count = 0
        
        for appointment_id in bulk_approve.appointment_ids:
            try:
                # Get appointment with access control
                appointment = admin_get_appointment(
                    current_user=current_user,
                    db=db,
                    appointment_id=appointment_id,
                    required_access_level=models.AccessLevel.READ_WRITE
                )
                
                # Exclude DIGNITARY and PROJECT_TEAM_MEETING types
                if appointment.request_type in [models.RequestType.DIGNITARY, models.RequestType.PROJECT_TEAM_MEETING]:
                    logger.warning(f"Skipping appointment {appointment_id}: {appointment.request_type} type not allowed in bulk approval")
                    failed_count += 1
                    continue
                
                # Save old data for notifications
                old_status = appointment.status
                old_sub_status = appointment.sub_status
                
                # Update appointment status and schedule details
                appointment.status = models.AppointmentStatus.APPROVED
                appointment.sub_status = models.AppointmentSubStatus.SCHEDULED
                appointment.calendar_event_id = bulk_approve.calendar_event_id
                appointment.last_updated_by = current_user.id
                
                # Update appointment details from calendar event
                appointment.duration = calendar_event.duration
                appointment.location_id = calendar_event.location_id
                appointment.meeting_place_id = calendar_event.meeting_place_id
                
                # Handle approval metadata
                if old_status != models.AppointmentStatus.APPROVED:
                    appointment.approved_datetime = datetime.utcnow()
                    appointment.approved_by = current_user.id
                
                # Add secretariat notes if provided
                if bulk_approve.secretariat_notes_to_requester:
                    appointment.secretariat_notes_to_requester = bulk_approve.secretariat_notes_to_requester
                
                updated_count += 1
                
                # Send email notification for this appointment
                try:
                    old_data = {
                        'status': old_status,
                        'sub_status': old_sub_status
                    }
                    update_data = {
                        'status': appointment.status,
                        'sub_status': appointment.sub_status,
                        'calendar_event_id': appointment.calendar_event_id
                    }
                    notify_appointment_update(db, appointment, old_data, update_data)
                except Exception as e:
                    logger.error(f"Error sending email notification for appointment {appointment_id}: {str(e)}")
                
            except Exception as e:
                logger.error(f"Error updating appointment {appointment_id}: {str(e)}")
                failed_count += 1
                continue
        
        db.commit()
        
        logger.info(f"Bulk approval completed: {updated_count} updated, {failed_count} failed")
        
        return {
            "message": f"Successfully approved and scheduled {updated_count} appointments",
            "updated_count": updated_count,
            "failed_count": failed_count,
            "calendar_event_id": bulk_approve.calendar_event_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk approval: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Bulk approval failed: {str(e)}")

@router.get("/all", response_model=List[schemas.AdminAppointment])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    request_type: Optional[str] = None
):
    """Get all appointments with optional status, date range, and request type filters, restricted by user's access permissions"""
    query = db.query(models.Appointment).order_by(models.Appointment.id.asc())

    # Apply status filter if provided
    if status:
        query = query.filter(models.Appointment.status.in_(status.split(',')))
    
    # Apply request type filter if provided
    if request_type:
        query = query.filter(models.Appointment.request_type.in_(request_type.split(',')))
    
    # Apply start and end date filters if provided - handle both single dates and date ranges
    if start_date:
        query = query.filter(or_(
            # Single preferred date (dignitary appointments)
            models.Appointment.preferred_date >= start_date,
            # Date ranges (non-dignitary appointments) - check if range overlaps with start_date
            and_(
                models.Appointment.preferred_start_date.isnot(None),
                models.Appointment.preferred_end_date >= start_date
            ),
            # Calendar event dates (confirmed appointments)
            and_(
                models.Appointment.calendar_event_id.isnot(None),
                models.CalendarEvent.start_date >= start_date
            )
        ))
    if end_date:
        query = query.filter(or_(
            # Single preferred date (dignitary appointments)
            models.Appointment.preferred_date <= end_date,
            # Date ranges (non-dignitary appointments) - check if range overlaps with end_date
            and_(
                models.Appointment.preferred_start_date.isnot(None),
                models.Appointment.preferred_start_date <= end_date
            ),
            # Calendar event dates (confirmed appointments)
            and_(
                models.Appointment.calendar_event_id.isnot(None),
                models.CalendarEvent.start_date <= end_date
            )
        ))

    # Add left join for calendar events to support filtering by calendar event dates (for all users)
    if start_date or end_date:
        query = query.outerjoin(models.CalendarEvent, models.Appointment.calendar_event_id == models.CalendarEvent.id)

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
        joinedload(models.Appointment.requester),
        joinedload(models.Appointment.appointment_contacts).joinedload(models.AppointmentContact.contact),
        joinedload(models.Appointment.calendar_event)
    )

    appointments = query.all()
    logger.debug(f"Appointments: {appointments}")
    return appointments

@router.get("/upcoming", response_model=List[schemas.AdminAppointment])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_upcoming_appointments(
    db: Session = Depends(get_read_db),
    current_user: models.User = Depends(get_current_user),
    status: Optional[str] = None,
    request_type: Optional[str] = None
):
    """Get all upcoming appointments (future calendar event date or preferred date/range) with access control restrictions and optional filters"""
    # Start with the filter for upcoming appointments - use calendar events and preferred dates/ranges
    upcoming_filter = and_(
        or_(
            # Calendar event dates (confirmed appointments)
            and_(
                models.Appointment.calendar_event_id.isnot(None),
                models.CalendarEvent.start_date >= date.today()-timedelta(days=1)
            ),
            # Pending appointments with single preferred dates (dignitary appointments)
            and_(
                models.Appointment.calendar_event_id.is_(None),
                models.Appointment.preferred_date.isnot(None),
                models.Appointment.preferred_date >= date.today()-timedelta(days=1)
            ),
            # Pending appointments with preferred date ranges (non-dignitary appointments)
            and_(
                models.Appointment.calendar_event_id.is_(None),
                models.Appointment.preferred_start_date.isnot(None),
                models.Appointment.preferred_end_date >= date.today()-timedelta(days=1)
            )
        ),
        models.Appointment.status.notin_([
            models.AppointmentStatus.CANCELLED, 
            models.AppointmentStatus.REJECTED, 
            models.AppointmentStatus.COMPLETED,
        ])
    )
    
    # Base query with upcoming filter - add join for calendar events
    query = db.query(models.Appointment).outerjoin(
        models.CalendarEvent, 
        models.Appointment.calendar_event_id == models.CalendarEvent.id
    ).filter(upcoming_filter)
    
    # Apply status filter if provided
    if status:
        query = query.filter(models.Appointment.status == status)
    
    # Apply request type filter if provided
    if request_type:
        query = query.filter(models.Appointment.request_type.in_(request_type.split(',')))

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

    # Add sorting - prioritize calendar event dates, then preferred dates/ranges
    query = query.order_by(
        models.CalendarEvent.start_date.asc().nulls_last(),
        models.Appointment.preferred_date.asc().nulls_last(),
        models.Appointment.preferred_start_date.asc().nulls_last()
    )

    # Add options to eagerly load appointment_dignitaries and their associated dignitaries
    query = query.options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(models.Appointment.requester),
        joinedload(models.Appointment.appointment_contacts).joinedload(models.AppointmentContact.contact),
        joinedload(models.Appointment.calendar_event)
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