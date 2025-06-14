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

# =============================================================================
# APPOINTMENT-RELATED ENUM ENDPOINTS
# =============================================================================

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

@router.get("/appointments/request-type-options", response_model=List[str])
async def get_request_type_options():
    """Get all possible request type options"""
    return [req_type.value for req_type in models.RequestType]

@router.get("/appointments/request-type-options-map")
async def get_request_type_map():
    """Get a dictionary mapping of request type enum names to their display values"""
    return {req_type.name: req_type.value for req_type in models.RequestType}

@router.get("/appointments/attendance-status-options", response_model=List[str])
async def get_attendance_status_options():
    """Get all possible attendance status options"""
    return [status.value for status in models.AttendanceStatus]

@router.get("/appointments/attendance-status-options-map")
async def get_attendance_status_map():
    """Get a dictionary mapping of attendance status enum names to their display values"""
    return {status.name: status.value for status in models.AttendanceStatus}

@router.get("/appointments/role-in-team-project-options", response_model=List[str])
async def get_role_in_team_project_options():
    """Get all possible role in team project options"""
    return [role.value for role in models.RoleInTeamProject]

@router.get("/appointments/role-in-team-project-options-map")
async def get_role_in_team_project_map():
    """Get a dictionary mapping of role in team project enum names to their display values"""
    return {role.name: role.value for role in models.RoleInTeamProject}

@router.get("/appointments/person-relationship-type-options", response_model=List[str])
async def get_person_relationship_type_options():
    """Get all possible person relationship type options"""
    return [rel_type.value for rel_type in models.PersonRelationshipType]

@router.get("/appointments/person-relationship-type-options-map")
async def get_person_relationship_type_map():
    """Get a dictionary mapping of person relationship type enum names to their display values"""
    return {rel_type.name: rel_type.value for rel_type in models.PersonRelationshipType}

# =============================================================================
# USER CONTACTS ENUM ENDPOINTS
# =============================================================================

@router.get("/user-contacts/relationship-type-options-map")
async def get_user_contact_relationship_type_options_map():
    """Get user contact relationship type options as a map for frontend use"""
    return {x.name: x.value for x in models.PersonRelationshipType}

# =============================================================================
# DIGNITARY-RELATED ENUM ENDPOINTS
# =============================================================================

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

@router.get("/dignitaries/source-options", response_model=List[str])
async def get_dignitary_source_options():
    """Get all possible dignitary source options"""
    return [source.value for source in models.DignitarySource]

@router.get("/dignitaries/source-options-map")
async def get_dignitary_source_map():
    """Get a dictionary mapping of dignitary source enum names to their display values"""
    return {source.name: source.value for source in models.DignitarySource}

# =============================================================================
# CALENDAR-RELATED ENUM ENDPOINTS
# =============================================================================

@router.get("/calendar/event-type-options", response_model=List[str])
async def get_event_type_options():
    """Get all possible calendar event type options"""
    return [event_type.value for event_type in models.EventType]

@router.get("/calendar/event-type-options-map")
async def get_event_type_map():
    """Get a dictionary mapping of calendar event type enum names to their display values"""
    return {event_type.name: event_type.value for event_type in models.EventType}

@router.get("/calendar/event-status-options", response_model=List[str])
async def get_event_status_options():
    """Get all possible calendar event status options"""
    return [status.value for status in models.EventStatus]

@router.get("/calendar/event-status-options-map")
async def get_event_status_options_map():
    """Get event status options as a map for frontend use"""
    return {status.name: status.value for status in models.EventStatus}

@router.get("/calendar/creation-context-options", response_model=List[str])
async def get_calendar_creation_context_options():
    """Get all possible calendar creation context options"""
    return [context.value for context in models.CalendarCreationContext]

@router.get("/calendar/creation-context-options-map")
async def get_calendar_creation_context_map():
    """Get a dictionary mapping of calendar creation context enum names to their display values"""
    return {context.name: context.value for context in models.CalendarCreationContext}

# =============================================================================
# ATTACHMENT-RELATED ENUM ENDPOINTS
# =============================================================================

@router.get("/attachments/type-options", response_model=List[str])
async def get_attachment_type_options():
    """Get all possible attachment type options"""
    return [att_type.value for att_type in models.AttachmentType]

@router.get("/attachments/type-options-map")
async def get_attachment_type_map():
    """Get a dictionary mapping of attachment type enum names to their display values"""
    return {att_type.name: att_type.value for att_type in models.AttachmentType}

# =============================================================================
# USER-RELATED ENUM ENDPOINTS
# =============================================================================

@router.get("/users/aol-teacher-status-options", response_model=List[str])
async def get_aol_teacher_status_options():
    """Get all possible AOL teacher status options"""
    return [status.value for status in models.AOLTeacherStatus]

@router.get("/users/aol-teacher-status-options-map")
async def get_aol_teacher_status_map():
    """Get a dictionary mapping of AOL teacher status enum names to their display values"""
    return {status.name: status.value for status in models.AOLTeacherStatus}

@router.get("/users/aol-program-type-options", response_model=List[str])
async def get_aol_program_type_options():
    """Get all possible AOL program type options"""
    return [program.value for program in models.AOLProgramType]

@router.get("/users/aol-program-type-options-map")
async def get_aol_program_type_map():
    """Get a dictionary mapping of AOL program type enum names to their display values"""
    return {program.name: program.value for program in models.AOLProgramType}

@router.get("/users/aol-affiliation-options", response_model=List[str])
async def get_aol_affiliation_options():
    """Get all possible AOL affiliation options"""
    return [affiliation.value for affiliation in models.AOLAffiliation]

@router.get("/users/aol-affiliation-options-map")
async def get_aol_affiliation_map():
    """Get a dictionary mapping of AOL affiliation enum names to their display values"""
    return {affiliation.name: affiliation.value for affiliation in models.AOLAffiliation}

# =============================================================================
# ADMIN-SPECIFIC ENUM ENDPOINTS
# =============================================================================

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
