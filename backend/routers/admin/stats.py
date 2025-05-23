from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta, date
from sqlalchemy import or_, and_

# Import our dependencies
from dependencies.database import get_read_db
from dependencies.auth import requires_any_role, get_current_user

# Import models and schemas
import models
import schemas

router = APIRouter()

@router.get("/appointments/summary", response_model=List[schemas.AppointmentStatsByDateAndTimeSlot])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_appointment_time_slots(
    start_date: date,
    end_date: date,
    location_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """
    Get aggregated information about appointment time slots for a date range.
    Returns the count of appointments per date and per time slot, including
    the total number of people (dignitaries) for each time slot.
    """
    # Calculate date range
    date_range = end_date - start_date
    if date_range.days > 90:  # Limit to 90 days to prevent excessive queries
        raise HTTPException(
            status_code=400, 
            detail="Date range cannot exceed 90 days"
        )
    
    # Build query for appointments in the date range
    query = db.query(models.Appointment).filter(
        models.Appointment.appointment_date.between(start_date, end_date),
        or_(
            and_(
                models.Appointment.status == models.AppointmentStatus.APPROVED,
                models.Appointment.sub_status == models.AppointmentSubStatus.SCHEDULED
            ),
            models.Appointment.status == models.AppointmentStatus.COMPLETED,
        ),
    )
    
    # Add location filter if provided
    if location_id:
        query = query.filter(models.Appointment.location_id == location_id)
    
    # Get all appointments in the date range
    appointments = query.all()
    
    # Group appointments by date
    date_to_appointments = {}
    current_date = start_date
    while current_date <= end_date:
        date_to_appointments[current_date] = []
        current_date += timedelta(days=1)
    
    for appointment in appointments:
        if appointment.appointment_date in date_to_appointments:
            date_to_appointments[appointment.appointment_date].append(appointment)
    
    # Build the response
    result = []
    for date_obj, appointments_list in date_to_appointments.items():
        # Group appointments by time slot
        time_slots = {}
        for appointment in appointments_list:
            time_key = appointment.appointment_time
            if time_key not in time_slots:
                time_slots[time_key] = {
                    "appointment_count": 0,
                    "people_count": 0
                }
            
            time_slots[time_key]["appointment_count"] += 1
            # Count dignitaries for this appointment
            dignitary_count = db.query(models.AppointmentDignitary).filter(
                models.AppointmentDignitary.appointment_id == appointment.id
            ).count()
            time_slots[time_key]["people_count"] += dignitary_count
        
        result.append({
            "date": date_obj,
            "total_appointments": len(appointments_list),
            "time_slots": time_slots
        })
    
    return result


@router.get("/appointments/detailed", response_model=schemas.AppointmentTimeSlotDetailsMap)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_appointment_time_slots_combined(
    start_date: date,
    end_date: date,
    location_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """
    Get comprehensive information about appointment time slots in a single call.
    Returns a combined structure with both appointment counts and IDs for each time slot.
    """
    # Calculate date range
    date_range = end_date - start_date
    if date_range.days > 90:  # Limit to 90 days to prevent excessive queries
        raise HTTPException(
            status_code=400, 
            detail="Date range cannot exceed 90 days"
        )
    
    # Build query for appointments in the date range
    query = db.query(models.Appointment).filter(
        models.Appointment.appointment_date.between(start_date, end_date),
        or_(
            and_(
                models.Appointment.status == models.AppointmentStatus.APPROVED,
                models.Appointment.sub_status == models.AppointmentSubStatus.SCHEDULED
            ),
            models.Appointment.status == models.AppointmentStatus.COMPLETED,
        ),
    )
    
    # Add location filter if provided
    if location_id:
        query = query.filter(models.Appointment.location_id == location_id)
    
    # Get all appointments in the date range
    appointments = query.all()
    
    # Initialize the result structure
    result = {}
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.isoformat()
        result[date_str] = {
            "appointment_count": 0,
            "time_slots": {}
        }
        current_date += timedelta(days=1)
    
    # Process each appointment
    for appointment in appointments:
        date_str = appointment.appointment_date.isoformat()
        if date_str in result:
            time_key = appointment.appointment_time
            
            # Increment the total appointment count for this date
            result[date_str]["appointment_count"] += 1
            
            # Initialize the time slot if not already present
            if time_key not in result[date_str]["time_slots"]:
                result[date_str]["time_slots"][time_key] = {}
            
            # Count dignitaries for this appointment
            dignitary_count = db.query(models.AppointmentDignitary).filter(
                models.AppointmentDignitary.appointment_id == appointment.id
            ).count()
            
            # Add the appointment ID with its people count
            result[date_str]["time_slots"][time_key][str(appointment.id)] = dignitary_count
    
    # logger.info(f"Result: {result}")

    return {
        "dates": result
    } 