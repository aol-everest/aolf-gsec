from typing import List, Dict, Any, Optional, Union
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os
import json
import queue
import threading
import time
import logging
import atexit
from datetime import datetime, timedelta
from pathlib import Path
import asyncio
from sqlalchemy.orm import Session, joinedload
from models.appointment import Appointment, AppointmentStatus, AppointmentSubStatus
from models.calendarEvent import CalendarEvent, EventStatus
from models.dignitary import Dignitary, HonorificTitle
from models.geoCountry import GeoCountry
import models
from utils.utils import str_to_bool, convert_to_datetime_with_tz
from zoneinfo import ZoneInfo
from functools import lru_cache
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
GOOGLE_CREDENTIALS_FILE = os.getenv('GOOGLE_CREDENTIALS_FILE', 'google_credentials.json')
DEFAULT_APPOINTMENT_DURATION = int(os.getenv('DEFAULT_APPOINTMENT_DURATION', 15))
CALENDAR_ID = os.getenv('GOOGLE_CALENDAR_ID')
ENABLE_CALENDAR_SYNC = str_to_bool(os.getenv('ENABLE_CALENDAR_SYNC', 'True'))
APP_BASE_URL = os.getenv('APP_BASE_URL', 'https://meetgurudev.aolf.app')

# Queue for asynchronous processing
calendar_queue = queue.Queue()
calendar_worker_running = False
calendar_worker_thread = None

def get_credentials():
    """Get Google API credentials from service account file."""
    try:
        credentials_path = Path(GOOGLE_CREDENTIALS_FILE)
        if not credentials_path.exists():
            logger.error(f"Google credentials file not found at {GOOGLE_CREDENTIALS_FILE}")
            return None
        
        credentials = service_account.Credentials.from_service_account_file(
            GOOGLE_CREDENTIALS_FILE,
            scopes=['https://www.googleapis.com/auth/calendar']
        )
        return credentials
    except Exception as e:
        logger.error(f"Error loading Google credentials: {str(e)}")
        return None

def get_calendar_service():
    """Get Google Calendar API service."""
    credentials = get_credentials()
    if not credentials:
        return None
    
    try:
        service = build('calendar', 'v3', credentials=credentials)
        return service
    except Exception as e:
        logger.error(f"Error building Google Calendar service: {str(e)}")
        return None

def start_calendar_worker():
    """Start the background calendar worker thread if not already running."""
    global calendar_worker_running, calendar_worker_thread
    
    if calendar_worker_running:
        return
    
    calendar_worker_running = True
    calendar_worker_thread = threading.Thread(target=calendar_worker, daemon=True)
    calendar_worker_thread.start()
    logger.info("Calendar worker thread started")

def stop_calendar_worker():
    """Stop the background calendar worker thread."""
    global calendar_worker_running
    calendar_worker_running = False
    logger.info("Calendar worker thread stop requested")

def calendar_worker():
    """Background worker that processes the calendar sync queue."""
    global calendar_worker_running
    
    logger.info("Calendar worker started")
    while calendar_worker_running:
        try:
            # Try to get a task from the queue with a timeout
            try:
                task_data = calendar_queue.get(timeout=1.0)
            except queue.Empty:
                continue
            
            # Get a database session for timezone lookups
            db = None
            try:
                # Import here to avoid circular imports
                from dependencies.database import get_db
                from database import SessionLocal
                db = SessionLocal()
                
                # Process the calendar task
                task_type = task_data.get('type')
                appointment_id = task_data.get('appointment_id')
                
                if task_type == 'create_or_update':
                    if appointment_id:
                        _sync_appointment_with_calendar_event_to_google(appointment_id, db)
                    else:
                        logger.error(f"Invalid calendar task data: {task_data}")
                elif task_type == 'delete':
                    if appointment_id:
                        _delete_appointment_from_calendar(appointment_id)
                    else:
                        logger.error(f"Invalid calendar delete task data: {task_data}")
                else:
                    logger.error(f"Unknown calendar task type: {task_type}")
                    
            except Exception as e:
                logger.error(f"Error processing calendar task: {str(e)}")
            finally:
                # Close the database session
                if db:
                    db.close()
            
            # Mark task as done
            calendar_queue.task_done()
            
        except Exception as e:
            logger.error(f"Error in calendar worker: {str(e)}")
            time.sleep(1)  # Prevent CPU spinning on repeated errors
    
    logger.info("Calendar worker stopped")

def _get_calendar_event_id(appointment_id):
    """Generate a consistent calendar event ID for an appointment."""
    # return f"appointment_{appointment_id}"
    raw = f"appointment-{appointment_id}"
    return hashlib.sha1(raw.encode('utf-8')).hexdigest()

def _get_event_dignitaries_description(appointment_data):
    """Get formatted text of dignitaries for calendar event."""
    dignitaries_text = ""
    dignitaries = []
    
    # Check for appointment_dignitaries relationship
    if appointment_data.get('appointment_dignitaries'):
        for app_dignitary in appointment_data['appointment_dignitaries']:
            dignitary = app_dignitary.get('dignitary', {})
            if dignitary:
                title = dignitary.get('honorific_title', '')
                if title:
                    logger.debug(f"Formatting honorific title: {title}")
                    title = HonorificTitle.format_honorific_title(title)
                name = f"{title} {dignitary.get('first_name', '')} {dignitary.get('last_name', '')}".strip()
                dignitaries.append(name)
        
        if dignitaries:
            dignitaries_text = ", ".join(dignitaries)
        
    return dignitaries_text, dignitaries

@lru_cache(maxsize=256)
def get_country_timezone(db: Session, country_code: str) -> Optional[str]:
    """
    Get the default timezone for a country from the database.
    Results are cached for improved performance.
    
    Args:
        db: Database session
        country_code: ISO 2-letter country code
        
    Returns:
        Default timezone string or None if not found
    """
    if not db or not country_code:
        return None
    
    try:
        country = db.query(GeoCountry).filter(GeoCountry.iso2_code == country_code).first()
        if country and country.default_timezone:
            return country.default_timezone
    except Exception as e:
        logger.error(f"Error getting timezone for country {country_code}: {str(e)}")
    
    return None

def _format_calendar_event_for_google(appointment_id: int, appointment_data: dict, calendar_event_data: dict, db: Session = None):
    """Format appointment + calendar event data for Google Calendar event."""
    
    # Check appointment status - only sync approved and scheduled appointments
    status = appointment_data.get('status')
    sub_status = appointment_data.get('sub_status')
    
    if status != AppointmentStatus.APPROVED or sub_status != AppointmentSubStatus.SCHEDULED:
        logger.info(f"Appointment {appointment_id} is not approved/scheduled, not syncing to calendar")
        return None
    
    # Get calendar event details (these are now the authoritative source for date/time/location)
    start_datetime = calendar_event_data.get('start_datetime')
    if not start_datetime:
        logger.warning(f"Calendar event for appointment {appointment_id} has no start_datetime")
        return None
    
    duration = calendar_event_data.get('duration', DEFAULT_APPOINTMENT_DURATION)
    
    # Handle datetime conversion - preserve timezone-aware datetime from CalendarEvent
    if isinstance(start_datetime, str):
        start_dt = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
    else:
        start_dt = start_datetime
    
    end_dt = start_dt + timedelta(minutes=duration)
    
    # Get location information from calendar event for additional timezone verification
    location = calendar_event_data.get('location')
    timezone_id = "America/New_York"  # Default fallback
    
    # Sophisticated timezone handling - preserve original logic
    try:
        # If start_dt is already timezone-aware (from CalendarEvent), use its timezone
        if start_dt.tzinfo is not None:
            timezone_id = str(start_dt.tzinfo)
            logger.debug(f"Using timezone from CalendarEvent start_datetime: '{timezone_id}' for appointment {appointment_id}")
        else:
            # If somehow the CalendarEvent datetime is naive, apply timezone conversion
            logger.warning(f"CalendarEvent start_datetime is naive for appointment {appointment_id}, applying timezone conversion")
            
            # Priority 1: Get location.timezone if available
            if location and location.get('timezone'):
                timezone_id = location.get('timezone')
                logger.debug(f"Using location timezone '{timezone_id}' for appointment {appointment_id}")
            
            # Priority 2: Get country default timezone if available
            elif location and db:
                country_code = location.get('country_code')
                if country_code:
                    default_timezone = get_country_timezone(db, country_code)
                    if default_timezone:
                        timezone_id = default_timezone
                        logger.debug(f"Using country default timezone '{timezone_id}' for appointment {appointment_id}")
            
            # Apply timezone to naive datetime
            from zoneinfo import ZoneInfo
            start_dt = start_dt.replace(tzinfo=ZoneInfo(timezone_id))
            end_dt = end_dt.replace(tzinfo=ZoneInfo(timezone_id))
            logger.info(f"Applied timezone '{timezone_id}' to naive CalendarEvent datetime for appointment {appointment_id}")
        
    except Exception as e:
        logger.error(f"Error handling timezone for appointment {appointment_id}: {str(e)}")
        # Continue with default timezone as fallback
        if start_dt.tzinfo is None:
            from zoneinfo import ZoneInfo
            start_dt = start_dt.replace(tzinfo=ZoneInfo("America/New_York"))
            end_dt = end_dt.replace(tzinfo=ZoneInfo("America/New_York"))
            timezone_id = "America/New_York"
    
    # Get appointment details for description
    meeting_purpose = appointment_data.get('purpose', 'N/A').strip()
    
    # Get dignitaries text from appointment
    dignitary_short_description, dignitary_list = _get_event_dignitaries_description(appointment_data)
    if dignitary_short_description:
        meeting_title = f"Meeting with {dignitary_short_description}"
        if dignitary_list:
            dignitaries_description = "\n".join([f"- {d}" for d in dignitary_list])
            description = f"Dignitaries: \n{dignitaries_description}\n\n"
        else:
            description = ""
    else:
        title_suffix = ""
        if meeting_purpose:
            if len(meeting_purpose) > 50:
                title_suffix = f": {meeting_purpose[:50]}..."
            else:
                title_suffix = f": {meeting_purpose}"
        meeting_title = f"Meeting block{title_suffix}"
        description = ""
    
    # Get location text
    location_text = ""
    if location:
        location_text = f"{location.get('name', '')}"
        if location.get('street_address'):
            location_text += f"\n{location.get('street_address')}"
        if location.get('city'):
            location_text += f", {location.get('city')}"
        if location.get('state'):
            location_text += f", {location.get('state')}"
        if location.get('zip_code'):
            location_text += f" {location.get('zip_code')}"
        if location.get('country'):
            location_text += f", {location.get('country')}"
    
    # Prepare event description
    description += f"Purpose: {meeting_purpose}\n"
    if appointment_data.get('requester_notes_to_secretariat'):
        description += f"Requester Notes: {appointment_data.get('requester_notes_to_secretariat')}\n"
    if appointment_data.get('secretariat_meeting_notes'):
        description += f"Meeting Notes: {appointment_data.get('secretariat_meeting_notes')}\n"
    
    # Add calendar event details
    if calendar_event_data.get('instructions'):
        description += f"Instructions: {calendar_event_data.get('instructions')}\n"
    
    # Add link to appointment in the app
    description += f"\nView in app: {APP_BASE_URL}/admin/appointments/review/{appointment_id}"
    
    # Create the event data with proper timezone information
    event = {
        'id': _get_calendar_event_id(appointment_id),
        'summary': meeting_title,
        'location': location_text,
        'description': description,
        'start': {
            'dateTime': start_dt.isoformat(),
            'timeZone': str(start_dt.tzinfo) if start_dt.tzinfo else timezone_id,
        },
        'end': {
            'dateTime': end_dt.isoformat(),
            'timeZone': str(end_dt.tzinfo) if end_dt.tzinfo else timezone_id,
        },
        # Add metadata to track this event
        'extendedProperties': {
            'private': {
                'appointmentId': str(appointment_id),
                'calendarEventId': str(calendar_event_data.get('id')),
                'syncSource': 'meetgurudev-app'
            }
        }
    }
    
    logger.debug(f"Created Google Calendar event for appointment {appointment_id} with timezone {timezone_id}")
    
    return event

def _sync_appointment_with_calendar_event_to_google(appointment_id: int, db: Session):
    """Sync an appointment with its linked calendar event to Google Calendar."""
    if not ENABLE_CALENDAR_SYNC:
        logger.info(f"Calendar sync is disabled. Appointment {appointment_id} not synced.")
        return
    
    service = get_calendar_service()
    if not service:
        logger.error(f"Could not get Google Calendar service, appointment {appointment_id} not synced")
        return
    
    try:
        # Query appointment with joined calendar event
        appointment = db.query(Appointment).options(
            joinedload(Appointment.calendar_event).joinedload(CalendarEvent.location),
            joinedload(Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
            joinedload(Appointment.location)
        ).filter(Appointment.id == appointment_id).first()
        
        if not appointment:
            logger.warning(f"Appointment {appointment_id} not found")
            return
        
        if not appointment.calendar_event_id:
            logger.info(f"Appointment {appointment_id} has no linked calendar event, skipping sync")
            return
        
        if not appointment.calendar_event:
            logger.warning(f"Appointment {appointment_id} calendar_event_id={appointment.calendar_event_id} but calendar event not found")
            return
        
        # Convert to dictionaries for formatting
        appointment_data = appointment_to_dict(appointment)
        calendar_event_data = calendar_event_to_dict(appointment.calendar_event, db)
        
        # Format for Google Calendar
        event = _format_calendar_event_for_google(appointment_id, appointment_data, calendar_event_data, db)
        if not event:
            # Not a syncable appointment or missing required data
            return
        
        event_id = _get_calendar_event_id(appointment_id)
        
        # Try to get existing event
        existing_event = None
        try:
            existing_event = service.events().get(
                calendarId=CALENDAR_ID,
                eventId=event_id
            ).execute()
        except HttpError as e:
            if e.resp.status != 404:  # Not found is expected for new appointments
                logger.warning(f"Error checking for existing calendar event: {str(e)}")
        
        if existing_event:
            # Update existing event
            updated_event = service.events().update(
                calendarId=CALENDAR_ID,
                eventId=event_id,
                body=event
            ).execute()
            logger.info(f"Updated Google Calendar event for appointment {appointment_id}")
        else:
            # Create new event
            created_event = service.events().insert(
                calendarId=CALENDAR_ID,
                body=event
            ).execute()
            logger.info(f"Created Google Calendar event for appointment {appointment_id}")
            
    except Exception as e:
        logger.error(f"Error syncing appointment {appointment_id} to Google Calendar: {str(e)}")

def _delete_appointment_from_calendar(appointment_id):
    """Delete an appointment from Google Calendar."""
    if not ENABLE_CALENDAR_SYNC:
        logger.info(f"Calendar sync is disabled. Appointment {appointment_id} not deleted from calendar.")
        return
    
    service = get_calendar_service()
    if not service:
        logger.error(f"Could not get Google Calendar service, appointment {appointment_id} not deleted from calendar")
        return
    
    event_id = _get_calendar_event_id(appointment_id)
    
    try:
        # Check if event exists before deleting
        try:
            existing_event = service.events().get(
                calendarId=CALENDAR_ID,
                eventId=event_id
            ).execute()
        except HttpError as e:
            if e.resp.status == 404:  # Not found, nothing to delete
                logger.info(f"No Google Calendar event found for appointment {appointment_id}")
                return
            else:
                raise
        
        # Delete the event
        service.events().delete(
            calendarId=CALENDAR_ID,
            eventId=event_id
        ).execute()
        logger.info(f"Deleted Google Calendar event for appointment {appointment_id}")
    except Exception as e:
        logger.error(f"Error deleting appointment {appointment_id} from Google Calendar: {str(e)}")

def queue_appointment_sync(appointment_id: int):
    """Queue an appointment to be synced to Google Calendar using its linked calendar event."""
    # Ensure the calendar worker is running
    if not calendar_worker_running:
        start_calendar_worker()
    
    # Add the task to the queue
    calendar_queue.put({
        'type': 'create_or_update',
        'appointment_id': appointment_id
    })
    logger.info(f"Appointment {appointment_id} queued for calendar sync")

def queue_appointment_delete(appointment_id: int):
    """Queue an appointment to be deleted from Google Calendar."""
    # Ensure the calendar worker is running
    if not calendar_worker_running:
        start_calendar_worker()
    
    # Add the task to the queue
    calendar_queue.put({
        'type': 'delete',
        'appointment_id': appointment_id
    })
    logger.info(f"Appointment {appointment_id} queued for deletion from calendar")

def appointment_to_dict(appointment):
    """Convert an Appointment model to a dictionary suitable for calendar sync."""
    if not appointment:
        return None
    
    # Convert appointment to dictionary
    data = {
        'id': appointment.id,
        'status': appointment.status,
        'sub_status': appointment.sub_status,
        'purpose': appointment.purpose,
        'requester_notes_to_secretariat': appointment.requester_notes_to_secretariat,
        'secretariat_meeting_notes': appointment.secretariat_meeting_notes,
    }
    
    # Add dignitaries if available
    if hasattr(appointment, 'appointment_dignitaries') and appointment.appointment_dignitaries:
        data['appointment_dignitaries'] = []
        for app_dignitary in appointment.appointment_dignitaries:
            dignitary_data = {
                'dignitary': {
                    'id': app_dignitary.dignitary.id,
                    'first_name': app_dignitary.dignitary.first_name,
                    'last_name': app_dignitary.dignitary.last_name,
                    'honorific_title': app_dignitary.dignitary.honorific_title,
                }
            }
            data['appointment_dignitaries'].append(dignitary_data)
    
    return data

def calendar_event_to_dict(calendar_event, db: Session = None):
    """Convert a CalendarEvent model to a dictionary suitable for calendar sync."""
    if not calendar_event:
        return None
    
    data = {
        'id': calendar_event.id,
        'start_datetime': calendar_event.start_datetime,
        'start_date': calendar_event.start_date,
        'start_time': calendar_event.start_time,
        'duration': calendar_event.duration,
        'instructions': calendar_event.instructions,
    }
    
    # Add location if available and loaded
    if calendar_event.location:
        data['location'] = {
            'id': calendar_event.location.id,
            'name': calendar_event.location.name,
            'city': calendar_event.location.city,
            'state': calendar_event.location.state,
            'street_address': getattr(calendar_event.location, 'street_address', None),
            'zip_code': getattr(calendar_event.location, 'zip_code', None),
            'country': getattr(calendar_event.location, 'country', None),
            'country_code': getattr(calendar_event.location, 'country_code', None),
            'timezone': getattr(calendar_event.location, 'timezone', None),
        }
    
    return data

async def sync_appointment(appointment):
    """Sync a single appointment to Google Calendar using its linked calendar event (async wrapper)."""
    if appointment and appointment.calendar_event_id:
        logger.info(f"Syncing appointment {appointment.id} with calendar event {appointment.calendar_event_id} to Google Calendar")
        queue_appointment_sync(appointment.id)
    else:
        logger.info(f"Appointment {appointment.id if appointment else 'None'} has no linked calendar event, skipping sync")

async def delete_appointment(appointment_id):
    """Delete an appointment from Google Calendar (async wrapper)."""
    logger.info(f"Deleting appointment {appointment_id} from Google Calendar")
    queue_appointment_delete(appointment_id)

def sync_all_appointments(db: Session):
    """Sync all approved and scheduled appointments with linked calendar events to Google Calendar.
    
    This function is designed to be run as a cron job to ensure all
    appointments are properly synced to the calendar.
    """
    if not ENABLE_CALENDAR_SYNC:
        logger.info("Calendar sync is disabled. No appointments synced.")
        return
    
    service = get_calendar_service()
    if not service:
        logger.error("Could not get Google Calendar service for bulk sync")
        return
    
    # Get all approved and scheduled appointments with linked calendar events
    appointments = db.query(Appointment).options(
        joinedload(Appointment.calendar_event).joinedload(CalendarEvent.location),
        joinedload(Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
        joinedload(Appointment.location)
    ).filter(
        Appointment.status == AppointmentStatus.APPROVED,
        Appointment.sub_status == AppointmentSubStatus.SCHEDULED,
        Appointment.calendar_event_id.isnot(None)
    ).all()
    
    logger.info(f"Found {len(appointments)} approved and scheduled appointments with calendar events for bulk sync")
    
    for appointment in appointments:
        if appointment.calendar_event:
            # Process directly instead of queueing to avoid overwhelming the queue
            _sync_appointment_with_calendar_event_to_google(appointment.id, db)
        else:
            logger.warning(f"Appointment {appointment.id} has calendar_event_id but no calendar_event loaded")
    
    logger.info(f"Bulk calendar sync completed")

def test_calendar_connection():
    """Test the Google Calendar API connection and permissions.
    
    Returns:
        tuple: (bool, str) - Success status and a message
    """
    service = get_calendar_service()
    if not service:
        return False, "Failed to get Google Calendar service"
    
    try:
        # Try to access the calendar to verify permissions
        calendar = service.calendars().get(calendarId=CALENDAR_ID).execute()
        return True, f"Successfully connected to calendar: {calendar.get('summary')}"
    except Exception as e:
        error_message = str(e)
        return False, f"Google Calendar API connection failed: {error_message}" 

async def check_and_sync_appointment(appointment, db: Session = None):
    """Conditionally sync an appointment to Google Calendar based on its status and calendar event.
    
    Only sync if appointment is Approved and Scheduled, has a linked calendar event, and update status to Completed after sync.
    If appointment doesn't meet criteria but was previously synced, delete it from calendar.
    
    Args:
        appointment: The appointment object to sync
        db: Database session (optional, only needed when status needs to be updated)
    """
    if not appointment:
        return
    
    logger.info(f"Checking appointment {appointment.id} for calendar sync")
    
    # Check if appointment meets criteria for syncing
    should_sync = (
        (
            (
                appointment.status == AppointmentStatus.APPROVED and 
                appointment.sub_status == AppointmentSubStatus.SCHEDULED
            )
            or
            (
                appointment.status == AppointmentStatus.COMPLETED
            )
        )
        and
        (
            appointment.calendar_event_id is not None
        )
    )
    
    if should_sync:
        # First sync to calendar
        await sync_appointment(appointment)
    else:
        # If appointment was previously synced but now doesn't meet criteria, delete from calendar
        try:
            await delete_appointment(appointment.id)
            logger.info(
                f"Appointment {appointment.id} no longer meets sync criteria "
                f"(status={appointment.status}, sub_status={appointment.sub_status}, calendar_event_id={appointment.calendar_event_id}). "
                f"Removed from calendar."
            )
        except Exception as e:
            logger.error(f"Error checking/removing calendar event: {str(e)}")

async def check_and_sync_updated_appointment(appointment, old_data: Dict[str, Any], new_data: Dict[str, Any], db: Session = None):
    """Check if an appointment's status has changed and handle calendar sync accordingly.
    
    Args:
        appointment: The updated appointment object
        old_data: Dictionary with old appointment data
        new_data: Dictionary with new appointment data
        db: Database session (optional)
    """
    # Check if status or sub_status has changed
    status_changed = old_data.get('status') != new_data.get('status')
    sub_status_changed = old_data.get('sub_status') != new_data.get('sub_status')
    calendar_event_changed = old_data.get('calendar_event_id') != new_data.get('calendar_event_id')
    
    # Also check if calendar event fields changed (we'd need to detect this via calendar event updates)
    purpose_changed = old_data.get('purpose', '') != new_data.get('purpose', '')
    requester_notes_to_secretariat_changed = old_data.get('requester_notes_to_secretariat', '') != new_data.get('requester_notes_to_secretariat', '')
    secretariat_meeting_notes_changed = old_data.get('secretariat_meeting_notes', '') != new_data.get('secretariat_meeting_notes', '')

    if status_changed or sub_status_changed or calendar_event_changed or purpose_changed or requester_notes_to_secretariat_changed or secretariat_meeting_notes_changed:
        # Get old status values
        old_status = old_data.get('status')
        old_sub_status = old_data.get('sub_status')
        old_calendar_event_id = old_data.get('calendar_event_id')
        
        # Check if appointment previously met criteria for calendar sync
        was_syncable = (
            (
                old_status == AppointmentStatus.APPROVED and
                old_sub_status == AppointmentSubStatus.SCHEDULED
            )
            or
            (
                old_status == AppointmentStatus.COMPLETED
            )
        ) and old_calendar_event_id is not None
        
        # Check if appointment currently meets criteria for calendar sync
        is_syncable = (
            (
                appointment.status == AppointmentStatus.APPROVED and
                appointment.sub_status == AppointmentSubStatus.SCHEDULED
            )
            or
            (
                appointment.status == AppointmentStatus.COMPLETED
            )
        ) and appointment.calendar_event_id is not None
        
        if was_syncable and not is_syncable:
            # Appointment no longer meets criteria, remove from calendar
            await delete_appointment(appointment.id)
            logger.info(
                f"Appointment {appointment.id} status changed from {old_status}/{old_sub_status} "
                f"to {appointment.status}/{appointment.sub_status}. Removed from calendar."
            )
        elif is_syncable:
            # Appointment meets criteria, sync to calendar and update status if db provided
            await check_and_sync_appointment(appointment, db)


# Initialize the calendar worker when module is imported
start_calendar_worker()

# Make sure the worker is stopped properly when the application exits
atexit.register(stop_calendar_worker) 
