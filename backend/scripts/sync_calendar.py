#!/usr/bin/env python3
import os
import sys
import logging
from pathlib import Path
import asyncio

# Add the parent directory to sys.path to import from backend modules
sys.path.append(str(Path(__file__).parent.parent.parent))

from backend.database import SessionLocal
from backend.utils.calendar_sync import conditional_sync_appointment
from backend.models.appointment import Appointment, AppointmentStatus, AppointmentSubStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'sync_calendar.log'))
    ]
)
logger = logging.getLogger("calendar_sync_script")

async def sync_all_appointments_async(db):
    """Async function to sync all relevant appointments with Google Calendar"""
    # Get all appointments that are candidates for calendar sync
    # We'll find Approved/Scheduled appointments that need syncing
    # And also look for appointments that might have been synced but now need removal
    appointments = db.query(Appointment).filter(
        # Either they are approved and scheduled
        ((Appointment.status == AppointmentStatus.APPROVED) & 
         (Appointment.sub_status == AppointmentSubStatus.SCHEDULED) &
         (Appointment.appointment_date.isnot(None)))
        # Or they are not, but might be in calendar and need removal
        | ((Appointment.status != AppointmentStatus.APPROVED) | 
           (Appointment.sub_status != AppointmentSubStatus.SCHEDULED))
    ).all()
    
    logger.info(f"Found {len(appointments)} appointments to process for calendar sync")
    
    for appointment in appointments:
        # Process each appointment according to its status
        await conditional_sync_appointment(appointment, db)
        
    logger.info(f"Bulk calendar sync completed")

def main():
    """Run a full sync of all appointments with Google Calendar"""
    logger.info("Starting calendar sync process")
    
    db = SessionLocal()
    try:
        # Run the async sync function in the event loop
        asyncio.run(sync_all_appointments_async(db))
        logger.info("Calendar sync completed successfully")
    except Exception as e:
        logger.error(f"Error during calendar sync: {str(e)}", exc_info=True)
    finally:
        db.close()
        logger.info("Database connection closed")

if __name__ == "__main__":
    main() 