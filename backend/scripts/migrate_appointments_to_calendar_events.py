#!/usr/bin/env python3
"""
Migration script to create CalendarEvent records for existing approved appointments.

This script:
1. Finds all approved appointments that have appointment_date but no calendar_event_id
2. Creates CalendarEvent records for them with CONFIRMED status and timezone-aware datetimes
3. Links appointments to their CalendarEvent via calendar_event_id

Usage:
    python migrate_appointments_to_calendar_events.py [--dry-run] [--batch-size=100]
"""

import os
import sys
import argparse
from datetime import datetime, time
from pathlib import Path

# Add the parent directory to the path so we can import our modules
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session, joinedload
from database import SessionLocal
import models
from models.enums import EVENT_TYPE_TO_REQUEST_TYPE_MAPPING
from utils.utils import convert_to_datetime_with_tz
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def parse_appointment_time(appointment_time_str: str) -> str:
    """Parse appointment time string to HH:MM:SS format for timezone conversion"""
    if not appointment_time_str:
        return "12:00:00"  # Default to noon
    
    # Handle different time formats and ensure HH:MM:SS format
    if ':' in appointment_time_str:
        time_parts = appointment_time_str.split(':')
        hour = int(time_parts[0])
        minute = int(time_parts[1]) if len(time_parts) > 1 else 0
        second = int(time_parts[2]) if len(time_parts) > 2 else 0
        return f"{hour:02d}:{minute:02d}:{second:02d}"
    else:
        # Assume it's just hour
        hour = int(appointment_time_str)
        return f"{hour:02d}:00:00"

def create_timezone_aware_datetime_for_migration(appointment_date, appointment_time_str: str, location, db: Session) -> datetime:
    """Create timezone-aware datetime for migration using sophisticated timezone logic"""
    
    # Convert date to string format
    date_str = appointment_date.isoformat()
    
    # Parse and format time
    time_str = parse_appointment_time(appointment_time_str)
    
    # Use the sophisticated timezone conversion logic
    return convert_to_datetime_with_tz(date_str, time_str, location)

def create_calendar_event_for_appointment(appointment: models.Appointment, db: Session) -> models.CalendarEvent:
    """Create a CalendarEvent record for an approved appointment with timezone-aware datetime"""
    
    # Get event type from appointment request type
    event_type = EVENT_TYPE_TO_REQUEST_TYPE_MAPPING.get(
        appointment.request_type, 
        models.EventType.OTHER
    )
    
    # Get location for timezone determination (will be loaded via joinedload)
    location = appointment.location
    
    # Create timezone-aware datetime using sophisticated timezone logic for start_datetime only
    start_datetime = create_timezone_aware_datetime_for_migration(
        appointment.appointment_date, 
        appointment.appointment_time, 
        location, 
        db
    )
    
    # Create the calendar event
    calendar_event = models.CalendarEvent(
        event_type=event_type,
        title=f"{event_type.value} - {appointment.purpose[:50]}" if appointment.purpose else f"{event_type.value}",
        description=appointment.purpose or "",
        start_datetime=start_datetime,                      # Timezone-aware calculated datetime
        start_date=appointment.appointment_date,            # Original appointment date
        start_time=appointment.appointment_time or "12:00", # Original appointment time string
        duration=appointment.duration or 30,  # Default 30 minutes
        location_id=appointment.location_id,
        meeting_place_id=appointment.meeting_place_id,
        max_capacity=1,  # Default capacity for individual appointments
        is_open_for_booking=False,  # Individual appointments not open for booking
        status=models.EventStatus.CONFIRMED,  # Approved appointments get CONFIRMED status
        creation_context=models.CalendarCreationContext.APPOINTMENT,
        creation_context_id=str(appointment.id),
        created_by=appointment.created_by,
        updated_by=appointment.last_updated_by or appointment.created_by,
        created_at=appointment.created_at,
        updated_at=appointment.updated_at or appointment.created_at
    )
    
    return calendar_event

def migrate_appointments_to_calendar_events(dry_run: bool = False, batch_size: int = 100):
    """Main migration function"""
    
    logger.info(f"Starting migration of appointments to calendar events with timezone-aware datetimes (dry_run={dry_run})")
    
    db = SessionLocal()
    try:
        # Find all approved appointments with appointment_date but no calendar_event_id
        query = db.query(models.Appointment).filter(
            models.Appointment.status == models.AppointmentStatus.APPROVED,
            models.Appointment.appointment_date.isnot(None),
            models.Appointment.calendar_event_id.is_(None)
        ).options(
            joinedload(models.Appointment.location),
            joinedload(models.Appointment.meeting_place)
        )
        
        total_appointments = query.count()
        logger.info(f"Found {total_appointments} approved appointments to migrate")
        
        if total_appointments == 0:
            logger.info("No appointments to migrate")
            return
        
        if dry_run:
            logger.info("DRY RUN - showing what would be migrated:")
            appointments = query.limit(10).all()  # Show first 10 in dry run
            for appointment in appointments:
                # Show timezone information if available
                tz_info = "UTC (fallback)"
                if appointment.location:
                    if hasattr(appointment.location, 'timezone') and appointment.location.timezone:
                        tz_info = appointment.location.timezone
                    elif hasattr(appointment.location, 'country_code') and appointment.location.country_code == "US":
                        tz_info = f"US state-based timezone"
                
                logger.info(
                    f"  Appointment {appointment.id}: {appointment.request_type.value} "
                    f"on {appointment.appointment_date} at {appointment.appointment_time} "
                    f"({tz_info}) - {appointment.purpose[:50] if appointment.purpose else 'No purpose'}..."
                )
            logger.info(f"... and {max(0, total_appointments - 10)} more")
            return
        
        # Process in batches
        migrated_count = 0
        error_count = 0
        
        for offset in range(0, total_appointments, batch_size):
            batch_appointments = query.offset(offset).limit(batch_size).all()
            
            logger.info(f"Processing batch {offset//batch_size + 1} ({len(batch_appointments)} appointments)")
            
            for appointment in batch_appointments:
                try:
                    # Create calendar event with timezone-aware datetime
                    calendar_event = create_calendar_event_for_appointment(appointment, db)
                    db.add(calendar_event)
                    db.flush()  # Get the ID
                    
                    # Link appointment to calendar event
                    appointment.calendar_event_id = calendar_event.id
                    
                    migrated_count += 1
                    
                    if migrated_count % 50 == 0:
                        logger.info(f"Migrated {migrated_count}/{total_appointments} appointments")
                        
                except Exception as e:
                    error_count += 1
                    logger.error(f"Error migrating appointment {appointment.id}: {str(e)}")
                    db.rollback()
                    continue
            
            # Commit batch
            db.commit()
            logger.info(f"Committed batch {offset//batch_size + 1}")
        
        logger.info(f"Migration completed: {migrated_count} successful, {error_count} errors")
        logger.info("All CalendarEvent records created with timezone-aware start_datetime fields")
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description='Migrate appointments to calendar events with timezone-aware datetimes')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be migrated without making changes')
    parser.add_argument('--batch-size', type=int, default=100, help='Number of appointments to process per batch')
    
    args = parser.parse_args()
    
    try:
        migrate_appointments_to_calendar_events(
            dry_run=args.dry_run,
            batch_size=args.batch_size
        )
    except Exception as e:
        logger.error(f"Migration script failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 