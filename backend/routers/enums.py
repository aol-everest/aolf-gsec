from fastapi import APIRouter, Depends
from typing import List
import logging

# Import our dependencies
from dependencies.auth import requires_any_role, get_current_user

# Import models
import models

# Get logger
logger = logging.getLogger(__name__)

router = APIRouter()

# Appointment-related enum endpoints
@router.get("/appointments/status-options", response_model=List[str])
async def get_appointment_status_options():
    """Get all possible appointment status options"""
    return models.VALID_STATUS_OPTIONS

@router.get("/appointments/status-options-map")
async def get_appointment_status_map():
    """Get a dictionary mapping of appointment status enum names to their display values"""
    return {status.name: status.value for status in models.AppointmentStatus}

@router.get("/appointments/sub-status-options", response_model=List[str])
async def get_appointment_sub_status_options():
    """Get all possible appointment sub-status options"""
    return models.VALID_SUBSTATUS_OPTIONS

@router.get("/appointments/sub-status-options-map")
async def get_appointment_sub_status_map():
    """Get a dictionary mapping of appointment sub-status enum names to their display values"""
    return {sub_status.name: sub_status.value for sub_status in models.AppointmentSubStatus}

@router.get("/appointments/status-substatus-mapping")
async def get_status_substatus_mapping():
    """Get mapping between appointment status and valid sub-statuses"""
    return models.STATUS_SUBSTATUS_MAPPING

@router.get("/appointments/type-options", response_model=List[str])
async def get_appointment_type_options():
    """Get all possible appointment type options"""
    return [app_type.value for app_type in models.AppointmentType]

@router.get("/appointments/type-options-map")
async def get_appointment_type_map():
    """Get a dictionary mapping of appointment type enum names to their display values"""
    return {app_type.name: app_type.value for app_type in models.AppointmentType}

@router.get("/appointments/time-of-day-options", response_model=List[str])
async def get_appointment_time_of_day_options():
    """Get all possible appointment time of day options"""
    return [time.value for time in models.AppointmentTimeOfDay]

@router.get("/appointments/time-of-day-options-map")
async def get_appointment_time_of_day_map():
    """Get a dictionary mapping of appointment time of day enum names to their display values"""
    return {time.name: time.value for time in models.AppointmentTimeOfDay}

# Dignitary-related enum endpoints
@router.get("/dignitaries/relationship-type-options", response_model=List[str])
async def get_relationship_type_options():
    """Get all possible relationship type options"""
    return [rel_type.value for rel_type in models.RelationshipType]

@router.get("/dignitaries/relationship-type-options-map")
async def get_relationship_type_map():
    """Get a dictionary mapping of relationship type enum names to their display values"""
    return {rel_type.name: rel_type.value for rel_type in models.RelationshipType}

@router.get("/dignitaries/honorific-title-options", response_model=List[str])
async def get_honorific_title_options():
    """Get all possible honorific title options"""
    return [title.value for title in models.HonorificTitle]

@router.get("/dignitaries/honorific-title-options-map")
async def get_honorific_title_map():
    """Get a dictionary mapping of honorific title enum names to their display values"""
    return {title.name: title.value for title in models.HonorificTitle}

@router.get("/dignitaries/primary-domain-options", response_model=List[str])
async def get_primary_domain_options():
    """Get all possible primary domain options"""
    return [domain.value for domain in models.PrimaryDomain]

@router.get("/dignitaries/primary-domain-options-map")
async def get_primary_domain_map():
    """Get a dictionary mapping of primary domain enum names to their display values"""
    return {domain.name: domain.value for domain in models.PrimaryDomain}

# Admin-specific enum endpoints
@router.get("/admin/user-role-options", response_model=List[str])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_user_role_options(
    current_user: models.User = Depends(get_current_user),
):
    """Get all possible user roles"""
    return [role.value for role in models.UserRole if role.is_less_than(current_user.role) or current_user.role == models.UserRole.ADMIN]

@router.get("/admin/user-role-options-map")
async def get_user_role_map(
    current_user: models.User = Depends(get_current_user),
):
    """Get a dictionary mapping of user role enum names to their display values"""
    return {role.name: role.value for role in models.UserRole if role.is_less_than(current_user.role) or current_user.role == models.UserRole.ADMIN}

@router.get("/admin/access-level-options", response_model=List[str])
async def get_access_levels():
    """Get all possible access level options"""
    # Exclude ADMIN access level for now
    return [level.value for level in models.AccessLevel if level != models.AccessLevel.ADMIN]

@router.get("/admin/access-level-options-map")
async def get_access_level_map():
    """Get a dictionary mapping of access level enum names to their display values"""
    # Exclude ADMIN access level for now
    return {level.name: level.value for level in models.AccessLevel if level != models.AccessLevel.ADMIN}

@router.get("/admin/entity-type-options", response_model=List[str])
async def get_entity_types():
    """Get all possible entity type options"""
    return [entity_type.value for entity_type in models.EntityType]

@router.get("/admin/entity-type-options-map")
async def get_entity_type_map():
    """Get a dictionary mapping of entity type enum names to their display values"""
    return {entity_type.name: entity_type.value for entity_type in models.EntityType} 