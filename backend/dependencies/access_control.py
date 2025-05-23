from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
from typing import Set
import logging

import models

logger = logging.getLogger(__name__)

def admin_check_access_to_country(current_user: models.User, db: Session, country_code: str, required_access_level: models.AccessLevel=models.AccessLevel.ADMIN):
    """Check if the current user has access to a specific country"""
    # Fail fast if user is not an admin
    if current_user.role.is_general_role_type():
        raise HTTPException(status_code=403, detail="You don't have access to this country")

    # ADMIN role has full access to create users
    if current_user.role != models.UserRole.ADMIN:
        # Get the allowed access levels for the required access level
        allowed_access_levels = required_access_level.get_higher_or_equal_access_levels()

        # For SECRETARIAT, check if they have ADMIN access level
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # For user management, admin access level is required
            models.UserAccess.access_level.in_(allowed_access_levels),
            # Check country permission
            models.UserAccess.country_code == country_code,
            models.UserAccess.location_id == None
        ).first()
        
        if not user_access:
            # If no valid access record with ADMIN level for this country exists, return 403 Forbidden
            raise HTTPException(
                status_code=403, 
                detail=f"You don't have administrator access for country: {country_code}"
            )

    return True


def admin_check_access_to_location(current_user: models.User, db: Session, country_code: str, location_id: int, required_access_level: models.AccessLevel=models.AccessLevel.ADMIN):
    """Check if the current user has access to a specific location"""
    # Fail fast if user is not an admin
    if current_user.role.is_general_role_type():
        raise HTTPException(status_code=403, detail="You don't have access to this location")

    # ADMIN role has full access to create users
    if current_user.role != models.UserRole.ADMIN:
        # Get the allowed access levels for the required access level
        allowed_access_levels = required_access_level.get_higher_or_equal_access_levels()

        # For SECRETARIAT, check if they have ADMIN access level
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # For user management, admin access level is required
            models.UserAccess.access_level.in_(allowed_access_levels),
            # Check country permission
            or_(
                models.UserAccess.location_id == location_id,
                and_(
                    models.UserAccess.location_id == None,
                    models.UserAccess.country_code == country_code,
                )
            )
        ).first()
        
        if not user_access:
            # If no valid access record with ADMIN level for this country exists, return 403 Forbidden
            raise HTTPException(
                status_code=403, 
                detail=f"You don't have access to this location"
            )

    return True


def admin_get_country_list_for_access_level(current_user: models.User, db: Session, required_access_level: models.AccessLevel) -> Set[str]:
    """Get the list of countries for a specific access level"""
    # Fail fast if user is not an admin
    if current_user.role.is_general_role_type():
        raise HTTPException(status_code=403, detail="You don't have access to this appointment")

    # Get the list of access levels that are >= the required access level
    allowed_access_levels = required_access_level.get_higher_or_equal_access_levels()

    # Get the list of countries for a specific access level
    user_access = db.query(models.UserAccess).filter(
        models.UserAccess.user_id == current_user.id,
        models.UserAccess.is_active == True,
        models.UserAccess.access_level.in_(allowed_access_levels)
    ).all()

    countries = set(access.country_code for access in user_access)
    return countries


def admin_get_appointment(current_user: models.User, db: Session, appointment_id: int, required_access_level: models.AccessLevel=models.AccessLevel.READ):
    """Reusable function to get a specific appointment with access control restrictions"""
    # Fail fast if user is not an admin
    if current_user.role.is_general_role_type():
        raise HTTPException(status_code=403, detail="You don't have access to this appointment")

    appointment = (
        db.query(models.Appointment)
        .filter(models.Appointment.id == appointment_id)
        .options(
            joinedload(models.Appointment.appointment_dignitaries).joinedload(models.AppointmentDignitary.dignitary),
            joinedload(models.Appointment.requester),
            joinedload(models.Appointment.location)
        )
        .first()
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # ADMIN role has full access to all appointments
    if current_user.role != models.UserRole.ADMIN:
        # Get the allowed access levels for the required access level
        allowed_access_levels = required_access_level.get_higher_or_equal_access_levels()

        # For SECRETARIAT, enforce access control restrictions
        # Get all active access records for the current user
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # Only consider records that grant access to appointments
            or_(
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT,
                models.UserAccess.entity_type == models.EntityType.APPOINTMENT_AND_DIGNITARY
            ),
            models.UserAccess.access_level.in_(allowed_access_levels)
        ).all()
        
        if not user_access:
            # If no valid access records exist, return 403 Forbidden
            raise HTTPException(status_code=403, detail="You don't have access to this appointment")
    
        # Check if user has access to this appointment's country/location
        has_access = False
        for access in user_access:
            # Check if user has access to this appointment's country
            if access.country_code == appointment.location.country_code:
                # If location_id is specified in access record, it must match
                if access.location_id is None or access.location_id == appointment.location_id:
                    has_access = True
                    break
        
        if not has_access:
            raise HTTPException(status_code=403, detail="You don't have access to this appointment")

    return appointment


def admin_check_appointment_for_access_level(current_user: models.User, db: Session, appointment_id: int, required_access_level: models.AccessLevel=models.AccessLevel.READ):
    """Check if the current user has access to a specific appointment"""
    # Fail fast if user is not an admin
    if current_user.role.is_general_role_type():
        raise HTTPException(status_code=403, detail="You don't have access to this appointment")

    appointment = admin_get_appointment(
        current_user=current_user,
        db=db,
        appointment_id=appointment_id,
        required_access_level=required_access_level
    )
    return appointment is not None


def admin_get_dignitary(current_user: models.User, db: Session, dignitary_id: int, required_access_level: models.AccessLevel=models.AccessLevel.READ):
    """Reusable function to get a specific dignitary with access control restrictions"""
    # Fail fast if user is not an admin type
    if not current_user.role.is_admin_role_type():
        logger.warning(f"Non-admin user {current_user.email} attempting to access admin dignitary endpoint for ID {dignitary_id}")
        raise HTTPException(status_code=403, detail="You don't have access to view dignitary details")

    # Get the requested dignitary
    dignitary = db.query(models.Dignitary).filter(models.Dignitary.id == dignitary_id).first()
    
    if not dignitary:
        logger.warning(f"Dignitary ID {dignitary_id} not found.")
        raise HTTPException(status_code=404, detail="Dignitary not found")
    
    # ADMIN role has full access
    if current_user.role == models.UserRole.ADMIN:
        logger.debug(f"Admin user {current_user.email} accessing dignitary {dignitary_id}")
        return dignitary
    
    # --- SECRETARIAT Access Control --- 
    logger.debug(f"Checking access for user {current_user.email} to dignitary {dignitary_id} (country: {dignitary.country_code}) requiring level {required_access_level}")
    # Get the allowed access levels based on the required level
    allowed_access_levels = required_access_level.get_higher_or_equal_access_levels()
    logger.debug(f"Allowed access levels: {allowed_access_levels}")
    
    # Get all active access records for the current user related to dignitaries
    user_access_records = db.query(models.UserAccess).filter(
        models.UserAccess.user_id == current_user.id,
        models.UserAccess.is_active == True,
        # Check entity type allows dignitary access
        models.UserAccess.entity_type == models.EntityType.APPOINTMENT_AND_DIGNITARY,
        models.UserAccess.access_level.in_(allowed_access_levels)
    ).all()
    
    if not user_access_records:
        logger.warning(f"Access denied for {current_user.email} to dignitary {dignitary_id}: No matching active access records found.")
        raise HTTPException(status_code=403, detail=f"Access denied. Required level: {required_access_level}")
    
    logger.debug(f"Found {len(user_access_records)} relevant access records for user {current_user.email}")

    has_country_access = False
    has_appointment_access = False

    # Check 1: Direct country access
    has_country_access = any(
        access.country_code == dignitary.country_code and access.location_id is None
        for access in user_access_records
    )
    logger.debug(f"Direct country access check for {dignitary.country_code}: {has_country_access}")
    
    if not has_country_access:
        # Check 2: Access via recent appointments
        # Calculate date threshold for recent appointments (e.g., last 90 days)
        recent_appointment_threshold = datetime.now().date() - timedelta(days=90)
        
        # Create location filters based on user's access permissions (including country-level)
        location_filters = []
        for access in user_access_records:
            if access.location_id is not None:
                # Specific location access
                location_filters.append(models.Appointment.location_id == access.location_id)
            else:
                # Country-level access (applies to all locations in that country)
                # Ensure we only add country filters if the user has APPOINTMENT access for it
                if access.entity_type in [models.EntityType.APPOINTMENT, models.EntityType.APPOINTMENT_AND_DIGNITARY]:
                    location_filters.append(models.Location.country_code == access.country_code)
        
        has_appointment_access = False
        if location_filters: # Only query if there are potential locations the user can access
            appointment_check_query = db.query(models.AppointmentDignitary.dignitary_id)\
                .join(models.Appointment, models.AppointmentDignitary.appointment_id == models.Appointment.id)\
                .join(models.Location, models.Appointment.location_id == models.Location.id)\
                .filter(
                    models.AppointmentDignitary.dignitary_id == dignitary_id,
                    # Check if appointment is recent
                    or_(
                        models.Appointment.preferred_date >= recent_appointment_threshold,
                        models.Appointment.appointment_date >= recent_appointment_threshold
                    ),
                    # Check if user has access to the appointment's location
                    or_(*location_filters)
                ).limit(1) # We only need to know if at least one exists
            
            has_appointment_access = appointment_check_query.first() is not None
            logger.debug(f"Appointment access check: {has_appointment_access} (based on {len(location_filters)} location filters)")
        else:
            logger.debug("Skipping appointment access check as no relevant location filters were found.")

    # Grant access if either condition is met
    if has_country_access or has_appointment_access:
        logger.info(f"Access granted for user {current_user.email} to dignitary {dignitary_id}. Country access: {has_country_access}, Appt access: {has_appointment_access}")
        return dignitary
    
    # If neither access condition is met
    logger.warning(f"Access denied for user {current_user.email} to dignitary {dignitary_id}. Country access: {has_country_access}, Appt access: {has_appointment_access}")
    raise HTTPException(status_code=403, detail="Access denied to this dignitary based on your permissions")


def admin_check_dignitary_for_access_level(current_user: models.User, db: Session, dignitary_id: int, required_access_level: models.AccessLevel=models.AccessLevel.READ):
    """Check if the current user has the required access level to a specific dignitary.
    Returns True if access is allowed, False otherwise.
    Logs reasons for denial but doesn't raise HTTPException itself.
    """
    try:
        # Attempt to get the dignitary using the access-controlled function
        admin_get_dignitary(
            current_user=current_user, 
            db=db, 
            dignitary_id=dignitary_id, 
            required_access_level=required_access_level
        )
        # If no HTTPException was raised, access is granted
        return True
    except HTTPException as e:
        # Log the reason for denial (403 or 404)
        logger.info(f"Access check failed for user {current_user.email} on dignitary {dignitary_id} (required: {required_access_level}): {e.status_code} - {e.detail}")
        return False
    except Exception as e:
        # Log unexpected errors during the check
        logger.error(f"Unexpected error during access check for user {current_user.email} on dignitary {dignitary_id}: {str(e)}", exc_info=True)
        return False 