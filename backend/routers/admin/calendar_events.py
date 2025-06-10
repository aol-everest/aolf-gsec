from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from datetime import datetime, date, time
from typing import Optional, List
import logging

import models
import schemas
from dependencies.database import get_db, get_read_db
from dependencies.auth import get_current_user_for_write, get_current_user, requires_any_role
from models.calendarEvent import EventType, EventStatus
from utils.utils import convert_to_datetime_with_tz

logger = logging.getLogger(__name__)

router = APIRouter()

def calculate_event_capacity(db: Session, event_id: int) -> tuple[int, int]:
    """Calculate current and available capacity for an event"""
    # Count appointments linked to this event
    current_capacity = db.query(func.sum(models.Appointment.number_of_attendees)).filter(
        models.Appointment.calendar_event_id == event_id,
        models.Appointment.status.notin_([
            models.AppointmentStatus.CANCELLED,
            models.AppointmentStatus.REJECTED
        ])
    ).scalar() or 0
    
    return current_capacity, current_capacity

def format_time_from_datetime(dt: datetime) -> str:
    """Format datetime to HH:MM string"""
    return dt.strftime("%H:%M")

def combine_date_and_time(start_date: date, start_time: str) -> datetime:
    """Combine date and time string into naive datetime"""
    try:
        # Parse time string
        time_parts = start_time.split(':')
        hour = int(time_parts[0])
        minute = int(time_parts[1]) if len(time_parts) > 1 else 0
        
        # Combine into naive datetime
        return datetime.combine(start_date, time(hour, minute))
    except (ValueError, IndexError) as e:
        raise ValueError(f"Invalid time format '{start_time}'. Expected HH:MM format.") from e

def create_timezone_aware_datetime_for_event(start_date: date, start_time: str, location_id: int, db: Session) -> datetime:
    """Create timezone-aware datetime for CalendarEvent from date and time strings"""
    
    # First create naive datetime
    naive_datetime = combine_date_and_time(start_date, start_time)
    
    # Get location information for timezone determination
    location = None
    if location_id:
        location = db.query(models.Location).filter(models.Location.id == location_id).first()
    
    # Convert to the format expected by convert_to_datetime_with_tz
    date_str = start_date.isoformat()
    time_str = f"{start_time}:00" if len(start_time.split(':')) == 2 else start_time
    
    # Use the sophisticated timezone conversion logic
    return convert_to_datetime_with_tz(date_str, time_str, location)

@router.post("/", response_model=schemas.CalendarEventResponse)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_calendar_event(
    event: schemas.CalendarEventCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new calendar event"""
    logger.info(f"Creating calendar event: {event.title} by user {current_user.email}")
    
    # Create timezone-aware datetime from separate date and time fields
    timezone_aware_datetime = create_timezone_aware_datetime_for_event(
        event.start_date, 
        event.start_time, 
        event.location_id, 
        db
    )
    
    # Create the event
    db_event = models.CalendarEvent(
        event_type=event.event_type,
        title=event.title,
        description=event.description,
        start_datetime=timezone_aware_datetime,     # Timezone-aware calculated datetime
        start_date=event.start_date,                # Original user input date
        start_time=event.start_time,                # Original user input time
        duration=event.duration,
        location_id=event.location_id,
        meeting_place_id=event.meeting_place_id,
        max_capacity=event.max_capacity,
        is_open_for_booking=event.is_open_for_booking,
        instructions=event.instructions,
        status=event.status,
        created_by=current_user.id,
        updated_by=current_user.id
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    # Calculate capacity
    current_capacity, _ = calculate_event_capacity(db, db_event.id)
    
    # Prepare response
    response = schemas.CalendarEventResponse(
        **db_event.__dict__,
        current_capacity=current_capacity,
        available_capacity=db_event.max_capacity - current_capacity,
        linked_appointments_count=0
    )
    
    return response

@router.get("/", response_model=List[schemas.CalendarEventResponse])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def list_calendar_events(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db),
    event_type: Optional[EventType] = None,
    status: Optional[EventStatus] = None,
    location_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    is_open_for_booking: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """List calendar events with filters"""
    query = db.query(models.CalendarEvent)
    
    # Apply filters
    if event_type:
        query = query.filter(models.CalendarEvent.event_type == event_type)
    if status:
        query = query.filter(models.CalendarEvent.status == status)
    if location_id:
        query = query.filter(models.CalendarEvent.location_id == location_id)
    if start_date:
        query = query.filter(models.CalendarEvent.start_date >= start_date)
    if end_date:
        query = query.filter(models.CalendarEvent.start_date <= end_date)
    if is_open_for_booking is not None:
        query = query.filter(models.CalendarEvent.is_open_for_booking == is_open_for_booking)
    
    # Order by start datetime
    query = query.order_by(models.CalendarEvent.start_datetime.asc())
    
    # Add eager loading
    query = query.options(
        joinedload(models.CalendarEvent.location),
        joinedload(models.CalendarEvent.meeting_place),
        joinedload(models.CalendarEvent.created_by_user),
        joinedload(models.CalendarEvent.updated_by_user)
    )
    
    # Apply pagination
    events = query.offset(skip).limit(limit).all()
    
    # Calculate capacity for each event
    response_events = []
    for event in events:
        current_capacity, _ = calculate_event_capacity(db, event.id)
        appointments_count = db.query(func.count(models.Appointment.id)).filter(
            models.Appointment.calendar_event_id == event.id
        ).scalar()
        
        response_events.append(schemas.CalendarEventResponse(
            **event.__dict__,
            current_capacity=current_capacity,
            available_capacity=event.max_capacity - current_capacity,
            linked_appointments_count=appointments_count
        ))
    
    return response_events

@router.get("/schedule", response_model=schemas.AdminCalendarEventScheduleResponse)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_calendar_events_schedule(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Get calendar events with enriched appointment data for schedule view"""
    
    # Set default date range - current week if not specified
    if not start_date:
        start_date = datetime.now().date()
    if not end_date:
        end_date = start_date
    
    # Get calendar events in date range with active/published status
    # Only filters: start_date, end_date, and status in (CONFIRMED, COMPLETED)
    events_query = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.start_date >= start_date,
        models.CalendarEvent.start_date <= end_date,
        models.CalendarEvent.status.in_([
            models.EventStatus.CONFIRMED,
            models.EventStatus.COMPLETED
        ])
    ).order_by(models.CalendarEvent.start_datetime.asc())
    
    # Add eager loading for related entities
    events_query = events_query.options(
        joinedload(models.CalendarEvent.location),
        joinedload(models.CalendarEvent.meeting_place),
        joinedload(models.CalendarEvent.created_by_user),
        joinedload(models.CalendarEvent.updated_by_user)
    )
    
    calendar_events = events_query.all()
    
    # Get appointments linked to calendar events with APPROVED/COMPLETED status
    appointments_query = db.query(models.Appointment).filter(
        models.Appointment.calendar_event_id.in_([e.id for e in calendar_events]),
        models.Appointment.status.in_([
            models.AppointmentStatus.APPROVED,
            models.AppointmentStatus.COMPLETED
        ])
    ).options(
        # Eager load all related entities
        joinedload(models.Appointment.appointment_dignitaries).joinedload(
            models.AppointmentDignitary.dignitary
        ),
        joinedload(models.Appointment.appointment_contacts).joinedload(
            models.AppointmentContact.contact
        ),
        joinedload(models.Appointment.requester),
        joinedload(models.Appointment.location),
        joinedload(models.Appointment.meeting_place)
    )
    
    linked_appointments = appointments_query.all()
    
    # Group appointments by calendar event
    appointments_by_event = {}
    for apt in linked_appointments:
        event_id = apt.calendar_event_id
        if event_id not in appointments_by_event:
            appointments_by_event[event_id] = []
        appointments_by_event[event_id].append(apt)
    
    # NOTE: Orphaned appointments concept has been removed
    # All appointments must now be linked to calendar events
    
    # Build response
    enriched_events = []
    
    for event in calendar_events:
        event_appointments = appointments_by_event.get(event.id, [])
        
        # Calculate capacity
        current_capacity, _ = calculate_event_capacity(db, event.id)
        
        # Convert appointments to summary format
        appointment_summaries = []
        total_attendees = 0
        
        for apt in event_appointments:
            # Convert ORM objects to schema objects
            appointment_dignitaries = []
            if apt.appointment_dignitaries:
                for ad in apt.appointment_dignitaries:
                    # Manually create AdminDignitary schema from ORM object
                    dignitary_data = {
                        'id': ad.dignitary.id,
                        'first_name': ad.dignitary.first_name,
                        'last_name': ad.dignitary.last_name,
                        'honorific_title': ad.dignitary.honorific_title,
                        'email': ad.dignitary.email,
                        'phone': ad.dignitary.phone,
                        'primary_domain': ad.dignitary.primary_domain,
                        'primary_domain_other': ad.dignitary.primary_domain_other,
                        'title_in_organization': ad.dignitary.title_in_organization,
                        'organization': ad.dignitary.organization,
                        'bio_summary': ad.dignitary.bio_summary,
                        'linked_in_or_website': ad.dignitary.linked_in_or_website,
                        'country': ad.dignitary.country,
                        'country_code': ad.dignitary.country_code,
                        'state': ad.dignitary.state,
                        'city': ad.dignitary.city,
                        'has_dignitary_met_gurudev': ad.dignitary.has_dignitary_met_gurudev,
                        'gurudev_meeting_date': ad.dignitary.gurudev_meeting_date,
                        'gurudev_meeting_location': ad.dignitary.gurudev_meeting_location,
                        'gurudev_meeting_notes': ad.dignitary.gurudev_meeting_notes,
                        'source': ad.dignitary.source,
                        'source_appointment_id': ad.dignitary.source_appointment_id,
                        'created_by': ad.dignitary.created_by,
                        'created_at': ad.dignitary.created_at,
                        'fax': getattr(ad.dignitary, 'fax', None),
                        'other_phone': getattr(ad.dignitary, 'other_phone', None),
                        'street_address': getattr(ad.dignitary, 'street_address', None),
                        'social_media': getattr(ad.dignitary, 'social_media', None),
                        'additional_info': getattr(ad.dignitary, 'additional_info', None),
                        'business_card_file_name': getattr(ad.dignitary, 'business_card_file_name', None),
                        'business_card_file_path': getattr(ad.dignitary, 'business_card_file_path', None),
                        'business_card_file_type': getattr(ad.dignitary, 'business_card_file_type', None),
                        'business_card_is_image': getattr(ad.dignitary, 'business_card_is_image', None),
                        'business_card_thumbnail_path': getattr(ad.dignitary, 'business_card_thumbnail_path', None),
                        'secretariat_notes': getattr(ad.dignitary, 'secretariat_notes', None),
                    }
                    
                    appointment_dignitaries.append(schemas.AdminAppointmentDignitaryWithDignitary(
                        id=ad.id,
                        appointment_id=ad.appointment_id,
                        dignitary_id=ad.dignitary_id,
                        created_at=ad.created_at,
                        dignitary=schemas.AdminDignitary(**dignitary_data)
                    ))
            
            appointment_contacts = []
            if apt.appointment_contacts:
                for ac in apt.appointment_contacts:
                    # Manually create AdminUserContact schema from ORM object
                    contact_data = {
                        'id': ac.contact.id,
                        'first_name': ac.contact.first_name,
                        'last_name': ac.contact.last_name,
                        'email': ac.contact.email,
                        'phone': ac.contact.phone,
                        'relationship_to_owner': ac.contact.relationship_to_owner,
                        'notes': ac.contact.notes,
                        'owner_user_id': ac.contact.owner_user_id,
                        'contact_user_id': ac.contact.contact_user_id,
                        'appointment_usage_count': ac.contact.appointment_usage_count,
                        'last_used_at': ac.contact.last_used_at,
                        'created_at': ac.contact.created_at,
                        'updated_at': ac.contact.updated_at,
                    }
                    
                    appointment_contacts.append(schemas.AdminAppointmentContactWithContact(
                        id=ac.id,
                        appointment_id=ac.appointment_id,
                        contact_id=ac.contact_id,
                        created_at=ac.created_at,
                        contact=schemas.AdminUserContact(**contact_data)
                    ))
            
            appointment_summaries.append(schemas.AdminAppointmentSummary(
                id=apt.id,
                purpose=apt.purpose,
                status=apt.status,
                sub_status=apt.sub_status,
                appointment_type=apt.appointment_type,
                request_type=apt.request_type,
                number_of_attendees=apt.number_of_attendees or 1,
                appointment_dignitaries=appointment_dignitaries,
                appointment_contacts=appointment_contacts,
                requester=apt.requester,
                secretariat_meeting_notes=apt.secretariat_meeting_notes,
                secretariat_follow_up_actions=apt.secretariat_follow_up_actions,
                secretariat_notes_to_requester=apt.secretariat_notes_to_requester,
                # Legacy fields from calendar event
                appointment_date=event.start_date,
                appointment_time=event.start_time,
                duration=event.duration
            ))
            total_attendees += apt.number_of_attendees or 1
        
        # Create enriched calendar event
        event_dict = event.__dict__.copy()
        event_dict.pop('location', None)
        event_dict.pop('meeting_place', None)
        enriched_events.append(schemas.AdminCalendarEventWithAppointments(
            **event_dict,
            location=schemas.Location.from_orm(event.location) if event.location else None,
            meeting_place=schemas.MeetingPlace.from_orm(event.meeting_place) if event.meeting_place else None,
            current_capacity=current_capacity,
            available_capacity=event.max_capacity - current_capacity,
            linked_appointments_count=len(event_appointments),
            appointments=appointment_summaries,
            total_attendees=total_attendees,
            appointment_count=len(event_appointments)
        ))
    
    logger.info(f"/schedule API: Returning {len(enriched_events)} calendar events for date range {start_date} to {end_date}")
    return schemas.AdminCalendarEventScheduleResponse(
        calendar_events=enriched_events,
        total_events=len(enriched_events)
    )

@router.get("/{event_id}", response_model=schemas.CalendarEventResponse)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_calendar_event(
    event_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific calendar event"""
    event = db.query(models.CalendarEvent).options(
        joinedload(models.CalendarEvent.location),
        joinedload(models.CalendarEvent.meeting_place),
        joinedload(models.CalendarEvent.created_by_user),
        joinedload(models.CalendarEvent.updated_by_user)
    ).filter(models.CalendarEvent.id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    
    # Calculate capacity
    current_capacity, _ = calculate_event_capacity(db, event.id)
    appointments_count = db.query(func.count(models.Appointment.id)).filter(
        models.Appointment.calendar_event_id == event.id
    ).scalar()
    
    return schemas.CalendarEventResponse(
        **event.__dict__,
        current_capacity=current_capacity,
        available_capacity=event.max_capacity - current_capacity,
        linked_appointments_count=appointments_count
    )

@router.put("/{event_id}", response_model=schemas.CalendarEventResponse)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_calendar_event(
    event_id: int,
    event_update: schemas.CalendarEventUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update a calendar event"""
    event = db.query(models.CalendarEvent).filter(models.CalendarEvent.id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    
    # Update fields
    update_data = event_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    
    # Handle date/time updates - calculate new timezone-aware start_datetime if needed
    if 'start_date' in update_data and 'start_time' in update_data:
        # Create new timezone-aware datetime from updated date/time
        timezone_aware_datetime = create_timezone_aware_datetime_for_event(
            update_data['start_date'], 
            update_data['start_time'], 
            event.location_id, 
            db
        )
        event.start_datetime = timezone_aware_datetime
    
    event.updated_by = current_user.id
    event.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(event)
    
    # Calculate capacity
    current_capacity, _ = calculate_event_capacity(db, event.id)
    appointments_count = db.query(func.count(models.Appointment.id)).filter(
        models.Appointment.calendar_event_id == event.id
    ).scalar()
    
    return schemas.CalendarEventResponse(
        **event.__dict__,
        current_capacity=current_capacity,
        available_capacity=event.max_capacity - current_capacity,
        linked_appointments_count=appointments_count
    )

@router.delete("/{event_id}")
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def delete_calendar_event(
    event_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Delete a calendar event"""
    event = db.query(models.CalendarEvent).filter(models.CalendarEvent.id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    
    # Check if there are any linked appointments
    linked_appointments = db.query(models.Appointment).filter(
        models.Appointment.calendar_event_id == event_id,
        models.Appointment.status.notin_([
            models.AppointmentStatus.CANCELLED,
            models.AppointmentStatus.REJECTED
        ])
    ).count()
    
    if linked_appointments > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete event with {linked_appointments} active appointments"
        )
    
    db.delete(event)
    db.commit()
    
    return {"message": "Calendar event deleted successfully"}

@router.get("/{event_id}/availability", response_model=schemas.CalendarEventAvailability)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def check_event_availability(
    event_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Check availability for a calendar event"""
    event = db.query(models.CalendarEvent).filter(models.CalendarEvent.id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    
    current_capacity, _ = calculate_event_capacity(db, event.id)
    available_capacity = event.max_capacity - current_capacity
    
    return schemas.CalendarEventAvailability(
        event_id=event.id,
        max_capacity=event.max_capacity,
        current_capacity=current_capacity,
        available_capacity=available_capacity,
        is_available=available_capacity > 0 and event.is_open_for_booking,
        message="Available for booking" if available_capacity > 0 else "Event is full"
    )

@router.get("/{event_id}/appointments", response_model=List[schemas.AdminAppointment])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_event_appointments(
    event_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all appointments linked to a calendar event"""
    event = db.query(models.CalendarEvent).filter(models.CalendarEvent.id == event_id).first()
    
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    
    appointments = db.query(models.Appointment).filter(
        models.Appointment.calendar_event_id == event_id
    ).options(
        joinedload(models.Appointment.appointment_dignitaries).joinedload(
            models.AppointmentDignitary.dignitary
        ),
        joinedload(models.Appointment.requester),
        joinedload(models.Appointment.location),
        joinedload(models.Appointment.meeting_place),
        joinedload(models.Appointment.appointment_contacts).joinedload(models.AppointmentContact.contact)
    ).all()
    
    return appointments

@router.post("/batch", response_model=schemas.CalendarEventBatchResponse)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_calendar_events_batch(
    batch_data: schemas.CalendarEventBatchCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create multiple calendar events (e.g., recurring darshan sessions)"""
    logger.info(f"Creating {len(batch_data.start_dates)} calendar events by user {current_user.email}")
    
    created_events = []
    errors = []
    
    for event_date in batch_data.start_dates:
        try:
            # Create timezone-aware datetime from date and time
            timezone_aware_datetime = create_timezone_aware_datetime_for_event(
                event_date, 
                batch_data.start_time, 
                batch_data.location_id, 
                db
            )
            
            # Format title with date if template includes {date}
            title = batch_data.title_template.format(date=event_date.strftime("%B %d, %Y"))
            
            db_event = models.CalendarEvent(
                event_type=batch_data.event_type,
                title=title,
                description=batch_data.description,
                start_datetime=timezone_aware_datetime,     # Timezone-aware calculated datetime
                start_date=event_date,                      # Original user input date
                start_time=batch_data.start_time,           # Original user input time string
                duration=batch_data.duration,
                location_id=batch_data.location_id,
                meeting_place_id=batch_data.meeting_place_id,
                max_capacity=batch_data.max_capacity,
                is_open_for_booking=batch_data.is_open_for_booking,
                instructions=batch_data.instructions,
                status=batch_data.status,
                created_by=current_user.id,
                updated_by=current_user.id
            )
            
            db.add(db_event)
            db.flush()  # Get the ID without committing
            
            created_events.append(schemas.CalendarEventResponse(
                **db_event.__dict__,
                current_capacity=0,
                available_capacity=db_event.max_capacity,
                linked_appointments_count=0
            ))
            
        except Exception as e:
            errors.append({
                "date": str(event_date),
                "error": str(e)
            })
            logger.error(f"Error creating event for {event_date}: {str(e)}")
    
    db.commit()
    
    return schemas.CalendarEventBatchResponse(
        total_requested=len(batch_data.start_dates),
        successful=len(created_events),
        failed=len(errors),
        events=created_events,
        errors=errors if errors else None
    )

@router.put("/batch", response_model=schemas.CalendarEventBatchResponse)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_calendar_events_batch(
    batch_data: schemas.CalendarEventBatchUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update multiple calendar events"""
    logger.info(f"Updating {len(batch_data.event_ids)} calendar events by user {current_user.email}")
    
    updated_events = []
    errors = []
    
    # Get all events to update
    events = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.id.in_(batch_data.event_ids)
    ).all()
    
    if len(events) != len(batch_data.event_ids):
        found_ids = [e.id for e in events]
        missing_ids = [id for id in batch_data.event_ids if id not in found_ids]
        raise HTTPException(
            status_code=404,
            detail=f"Calendar events not found: {missing_ids}"
        )
    
    update_data = batch_data.update_data.dict(exclude_unset=True)
    
    for event in events:
        try:
            # Update fields (excluding special date/time handling)
            for field, value in update_data.items():
                setattr(event, field, value)
            
            # Handle date/time updates - calculate new timezone-aware start_datetime if needed
            if 'start_date' in update_data and 'start_time' in update_data:
                # Create new timezone-aware datetime from updated date/time
                timezone_aware_datetime = create_timezone_aware_datetime_for_event(
                    update_data['start_date'], 
                    update_data['start_time'], 
                    event.location_id, 
                    db
                )
                event.start_datetime = timezone_aware_datetime
            
            event.updated_by = current_user.id
            event.updated_at = datetime.utcnow()
            
            db.flush()
            
            # Calculate capacity
            current_capacity, _ = calculate_event_capacity(db, event.id)
            appointments_count = db.query(func.count(models.Appointment.id)).filter(
                models.Appointment.calendar_event_id == event.id
            ).scalar()
            
            updated_events.append(schemas.CalendarEventResponse(
                **event.__dict__,
                current_capacity=current_capacity,
                available_capacity=event.max_capacity - current_capacity,
                linked_appointments_count=appointments_count
            ))
            
        except Exception as e:
            errors.append({
                "event_id": event.id,
                "error": str(e)
            })
            logger.error(f"Error updating event {event.id}: {str(e)}")
    
    db.commit()
    
    return schemas.CalendarEventBatchResponse(
        total_requested=len(batch_data.event_ids),
        successful=len(updated_events),
        failed=len(errors),
        events=updated_events,
        errors=errors if errors else None
    ) 