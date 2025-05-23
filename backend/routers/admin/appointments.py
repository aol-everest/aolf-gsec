from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, false
from datetime import datetime, date, timedelta
from typing import Optional, List
import logging

import models
import schemas
from dependencies.database import get_db, get_read_db
from dependencies.auth import get_current_user_for_write, get_current_user, requires_any_role
from dependencies.access_control import admin_get_appointment
from utils.email_notifications import notify_appointment_creation, notify_appointment_update
from utils.calendar_sync import check_and_sync_appointment, check_and_sync_updated_appointment

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/new", response_model=schemas.AdminAppointment)
async def create_appointment(
    appointment: schemas.AdminAppointmentCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    start_time = datetime.utcnow()
    logger.info(f"Creating new appointment for user {current_user.email} (ID: {current_user.id})")
    logger.debug(f"Appointment data: {appointment.dict()}")
    
    try:
        # Log timing for database operations
        db_start_time = datetime.utcnow()
        
        # Create appointment
        db_appointment = models.Appointment(
            created_by=current_user.id,
            last_updated_by=current_user.id,
            status=appointment.status,
            sub_status=appointment.sub_status,
            appointment_type=appointment.appointment_type,
            purpose=appointment.purpose,
            appointment_date=appointment.appointment_date,
            appointment_time=appointment.appointment_time,
            location_id=appointment.location_id,
            secretariat_meeting_notes=appointment.secretariat_meeting_notes,
            secretariat_follow_up_actions=appointment.secretariat_follow_up_actions,
            secretariat_notes_to_requester=appointment.secretariat_notes_to_requester,
        )
        db.add(db_appointment)
        db.commit()
        db.refresh(db_appointment)
        
        # Calculate DB operation time
        db_time = (datetime.utcnow() - db_start_time).total_seconds() * 1000
        logger.debug(f"Database operation for creating appointment took {db_time:.2f}ms")

        # Associate dignitaries with the appointment
        dignitary_start_time = datetime.utcnow()
        dignitary_count = 0
        
        for dignitary_id in appointment.dignitary_ids:
            appointment_dignitary = models.AppointmentDignitary(
                appointment_id=db_appointment.id,
                dignitary_id=dignitary_id,
                created_by=current_user.id,
                updated_by=current_user.id
            )
            db.add(appointment_dignitary)
            dignitary_count += 1
            
        db.commit()
        
        # Calculate dignitary association time
        dignitary_time = (datetime.utcnow() - dignitary_start_time).total_seconds() * 1000
        logger.debug(f"Associated {dignitary_count} dignitaries with appointment in {dignitary_time:.2f}ms")

        # Send email notifications
        notification_start_time = datetime.utcnow()
        try:
            notify_appointment_creation(db, db_appointment)
            notification_time = (datetime.utcnow() - notification_start_time).total_seconds() * 1000
            logger.debug(f"Email notifications sent in {notification_time:.2f}ms")
        except Exception as e:
            logger.error(f"Error sending email notifications: {str(e)}", exc_info=True)

        # Sync appointment to Google Calendar if it meets criteria
        try:
            await check_and_sync_appointment(db_appointment, db)
            logger.debug(f"Admin appointment conditionally processed for Google Calendar sync")
        except Exception as e:
            logger.error(f"Error processing admin appointment for Google Calendar sync: {str(e)}", exc_info=True)

        # Calculate total operation time
        total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info(f"Appointment created successfully (ID: {db_appointment.id}) in {total_time:.2f}ms")
        
        return db_appointment
    except Exception as e:
        logger.error(f"Error creating appointment: {str(e)}", exc_info=True)
        # Log the full exception traceback in debug mode
        logger.debug(f"Exception details:", exc_info=True)
        raise


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