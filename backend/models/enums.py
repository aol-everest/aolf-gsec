import enum
from typing import Optional


# ============================================================================
# USER-RELATED ENUMS
# ============================================================================

class UserRole(str, enum.Enum):
    """User role enum with proper case values"""
    SECRETARIAT = "SECRETARIAT"
    GENERAL = "GENERAL"
    USHER = "USHER"
    ADMIN = "ADMIN"

    def __str__(self):
        return self.value
    
    def is_admin_role_type(self):
        return (self == UserRole.ADMIN or self == UserRole.SECRETARIAT)
    
    def is_general_role_type(self):
        return self == UserRole.GENERAL

    def get_int_value(self):
        if self == UserRole.GENERAL:
            return 1
        elif self == UserRole.USHER:
            return 2
        elif self == UserRole.SECRETARIAT:
            return 3
        elif self == UserRole.ADMIN:
            return 4
        else:
            raise ValueError(f"Invalid user role: {self}")
    
    def is_greater_than_or_equal_to(self, other: "UserRole"):
        """
        Check if this user role is greater than or equal to the other
        """
        return self.get_int_value() >= other.get_int_value()

    def is_less_than(self, other: "UserRole"):
        """
        Check if this user role is less than the other
        """
        return self.get_int_value() < other.get_int_value()


# ============================================================================
# APPOINTMENT-RELATED ENUMS
# ============================================================================

class AppointmentStatus(str, enum.Enum):
    """Appointment status enum with proper case values"""
    PENDING = "Pending"
    NEED_MORE_INFO = "Need More Info"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    COMPLETED = "Completed"
    FOLLOW_UP = "To Be Rescheduled"
    CANCELLED = "Cancelled"

    def __str__(self):
        return self.value


class AppointmentSubStatus(str, enum.Enum):
    """Appointment sub-status enum with proper case values"""
    CANCELLED = "Cancelled"
    FOLLOW_UP_REQUIRED = "Follow-up required"
    LOW_PRIORITY = "Low priority"
    MET_GURUDEV = "Met Gurudev already"
    NEED_MORE_INFO = "Need more info"
    NEED_RESCHEDULE = "Need to reschedule"
    NO_FURTHER_ACTION = "No further action"
    NOT_REVIEWED = "Not yet reviewed"
    SHORTLISTED = "Shortlisted"
    UNDER_CONSIDERATION = "Under consideration (screened)"
    UNSCHEDULED = "To be scheduled (reviewed)"
    SCHEDULED = "Scheduled"

    def __str__(self):
        return self.value


class AppointmentType(str, enum.Enum):
    """Appointment type enum with proper case values"""
    EXCLUSIVE_APPOINTMENT = "Exclusive appointment"
    SHARED_APPOINTMENT = "Shared appointment"
    DARSHAN_LINE = "Darshan line"
    PRIVATE_EVENT = "Private event"

    def __str__(self):
        return self.value


class AppointmentTimeOfDay(str, enum.Enum):
    """Appointment time enum with proper case values"""
    MORNING = "Morning"
    AFTERNOON = "Afternoon"
    EVENING = "Evening"

    def __str__(self):
        return self.value


class RequestType(str, enum.Enum):
    """Request type enum for different appointment categories"""
    DIGNITARY = "Dignitary"
    DARSHAN = "Darshan"
    PROJECT_TEAM_MEETING = "Project / Team Meeting"
    OTHER = "Other"

    def __str__(self):
        return self.value


class RoleInTeamProject(str, enum.Enum):
    """Role in project team enum for different appointment categories"""
    LEAD_MEMBER = "Lead Member"
    CORE_TEAM_MEMBER = "Core Team Member"
    OCCASIONAL_CONTRIBUTOR = "Occasional Contributor"
    OTHER = "Other"

    def __str__(self):
        return self.value


class AttendanceStatus(enum.Enum):
    """Attendance status for appointments"""
    PENDING = "Pending"
    CHECKED_IN = "Checked In"
    CANCELLED = "Cancelled"
    NO_SHOW = "No Show"


# ============================================================================
# DIGNITARY-RELATED ENUMS
# ============================================================================

class HonorificTitle(str, enum.Enum):
    """Honorific title enum with proper case values"""
    NA = "(Not Applicable)"
    MR = "Mr."
    MRS = "Mrs."
    MS = "Ms."
    ADMIRAL = "Admiral"
    AIR_CHIEF_MARSHAL = "Air Chief Marshal"
    AMBASSADOR = "Ambassador"
    APOSTLE = "Apostle"
    BISHOP = "Bishop"
    BRIGADIER_GENERAL = "Brigadier General"
    CHANCELLOR = "Chancellor"
    CHIEF = "Chief"
    COLONEL = "Colonel"
    COMMISSIONER = "Commissioner"
    COUNSELLOR = "Counsellor"
    DR = "Dr."
    ELDER = "Elder"
    GENERAL = "General"
    GENERAL_RETD = "General (Retd.)"
    HE = "H.E."
    HER_EXCELLENCY_THE_RIGHT_HONOURABLE = "Her Excellency the Right Honourable"
    HER_MAJESTY = "Her Majesty"
    HER_WORSHIP = "Her Worship"
    HIS_EMINENCE = "His Eminence"
    HIS_MAJESTY = "His Majesty"
    HIS_WORSHIP = "His Worship"
    IMAM = "Imam"
    JUSTICE = "Justice"
    KAMI = "Kami"
    LT_COL = "Lt. Col"
    PASTOR = "Pastor"
    PRIEST = "Priest"
    PROF = "Prof."
    RABBI = "Rabbi"
    RIGHT_HONOURABLE = "Right Honourable"
    SADHVI = "Sadhvi"
    SERGEANT = "Sergeant"
    SHERIFF = "Sheriff"
    SHRI = "Shri"
    SIR = "Sir"
    SMT = "Smt."
    SUSHRI = "Sushri"
    SWAMI = "Swami"
    THE_HONORABLE = "The Honorable"
    THE_HONOURABLE = "The Honourable"
    THE_REVEREND = "The Reverend"
    SHEIKH = "Sheikh"

    def __str__(self):
        return self.value
    
    # Helper function to format honorific titles by removing '(not applicable)'
    @staticmethod
    def format_honorific_title(title: Optional[str]) -> str:
        """Format honorific title by replacing '(not applicable)' with an empty string."""
        if not title:
            return ""
        return "" if title.lower() == "(not applicable)" else title


class PrimaryDomain(str, enum.Enum):
    """Primary domain enum with proper case values"""
    BUSINESS = "Business"
    GOVERNMENT = "Government"
    RELIGIOUS_SPIRITUAL = "Religious / Spiritual"
    SPORTS = "Sports"
    ENTERTAINMENT_MEDIA = "Entertainment & Media"
    EDUCATION = "Education"
    HEALTHCARE = "Healthcare"
    OTHER = "Other"

    def __str__(self):
        return self.value


class DignitarySource(str, enum.Enum):
    """Source of dignitary record"""
    MANUAL = "manual"
    BUSINESS_CARD = "business_card"

    def __str__(self):
        return self.value


# ============================================================================
# RELATIONSHIP-RELATED ENUMS
# ============================================================================

class RelationshipType(str, enum.Enum):
    """Relationship type enum with proper case values"""
    DIRECT = "Direct"
    INDIRECT = "Indirect"

    def __str__(self):
        return self.value


class PersonRelationshipType(str, enum.Enum):
    """Person relationship type for appointment users"""
    FAMILY = "Family"
    FRIEND = "Friend"
    PROFESSIONAL = "Professional"
    OTHER = "Other"

    def __str__(self):
        return self.value


# ============================================================================
# ACCESS CONTROL ENUMS
# ============================================================================

class AccessLevel(str, enum.Enum):
    """Access level enum with proper case values"""
    READ = "Read Only"
    READ_WRITE = "Read and Edit"
    ADMIN = "Admin"

    def __str__(self):
        return self.value

    def get_int_value(self):
        if self == AccessLevel.READ:
            return 1
        elif self == AccessLevel.READ_WRITE:
            return 2
        elif self == AccessLevel.ADMIN:
            return 3
        else:
            raise ValueError(f"Invalid access level: {self}")
    
    def is_higher_than_or_equal_to(self, other: "AccessLevel"):
        """
        Check if this access level is greater than or equal to the other
        """
        return self.get_int_value() >= other.get_int_value()

    def get_higher_or_equal_access_levels(self):
        """
        Get the access that allow this access level
        """
        return [access_level for access_level in AccessLevel if access_level.is_higher_than_or_equal_to(self)]


class EntityType(str, enum.Enum):
    """Entity type enum with proper case values"""
    APPOINTMENT = "Appointment"
    APPOINTMENT_AND_DIGNITARY = "Appointment and Dignitary"

    def __str__(self):
        return self.value


# ============================================================================
# CALENDAR-RELATED ENUMS
# ============================================================================

class EventType(str, enum.Enum):
    """Calendar event type enum"""
    DIGNITARY_APPOINTMENT = "Dignitary Appointment"
    DARSHAN = "Darshan"
    TEACHER_MEETING = "Teacher Meeting"
    VOLUNTEER_MEETING = "Volunteer Meeting"
    PRIVATE_EVENT = "Private Event"
    PLACEHOLDER = "Placeholder"
    TRAVEL = "Travel"
    OTHER = "Other"

    def __str__(self):
        return self.value


class EventStatus(str, enum.Enum):
    """Calendar event status enum"""
    DRAFT = "Draft"
    CONFIRMED = "Confirmed"
    CANCELLED = "Cancelled"
    COMPLETED = "Completed"

    def __str__(self):
        return self.value


class CalendarCreationContext(str, enum.Enum):
    """Calendar event creation context enum"""
    ADMIN = "admin"
    APPOINTMENT = "appointment"
    CALENDAR_IMPORT = "calendar_import"

    def __str__(self):
        return self.value


# ============================================================================
# ATTACHMENT-RELATED ENUMS
# ============================================================================

class AttachmentType(str, enum.Enum):
    """Attachment type enum"""
    GENERAL = "general"
    BUSINESS_CARD = "business_card"

    def __str__(self):
        return self.value


# ============================================================================
# MAPPING DATA
# ============================================================================

# Event type to request type mapping for calendar event creation
EVENT_TYPE_TO_REQUEST_TYPE_MAPPING = {
    RequestType.DIGNITARY: EventType.DIGNITARY_APPOINTMENT,
    RequestType.DARSHAN: EventType.DARSHAN,
    RequestType.PROJECT_TEAM_MEETING: EventType.VOLUNTEER_MEETING,
    RequestType.OTHER: EventType.OTHER
}

# ============================================================================
# STATUS MAPPING AND VALIDATION DATA
# ============================================================================

# Define mapping between status and valid sub-statuses
STATUS_SUBSTATUS_MAPPING = {
    AppointmentStatus.PENDING.value: {
        "default_sub_status": AppointmentSubStatus.NOT_REVIEWED.value,
        "valid_sub_statuses": [
            AppointmentSubStatus.NOT_REVIEWED.value,
            AppointmentSubStatus.UNDER_CONSIDERATION.value,
            AppointmentSubStatus.SHORTLISTED.value,
            AppointmentSubStatus.NEED_MORE_INFO.value
        ]
    },
    AppointmentStatus.APPROVED.value: {
        "default_sub_status": AppointmentSubStatus.SCHEDULED.value,
        "valid_sub_statuses": [
            AppointmentSubStatus.SCHEDULED.value,
            AppointmentSubStatus.UNSCHEDULED.value,
            AppointmentSubStatus.NEED_RESCHEDULE.value
        ]
    },
    AppointmentStatus.REJECTED.value: {
        "default_sub_status": AppointmentSubStatus.LOW_PRIORITY.value,
        "valid_sub_statuses": [
            AppointmentSubStatus.LOW_PRIORITY.value,
            AppointmentSubStatus.MET_GURUDEV.value
        ]
    },
    AppointmentStatus.COMPLETED.value: {
        "default_sub_status": AppointmentSubStatus.NO_FURTHER_ACTION.value,
        "valid_sub_statuses": [
            AppointmentSubStatus.NO_FURTHER_ACTION.value,
            AppointmentSubStatus.FOLLOW_UP_REQUIRED.value,
        ]
    },
    AppointmentStatus.CANCELLED.value: {
        "default_sub_status": AppointmentSubStatus.CANCELLED.value,
        "valid_sub_statuses": [
            AppointmentSubStatus.CANCELLED.value,
        ]
    }
}

VALID_STATUS_OPTIONS = [status for status in STATUS_SUBSTATUS_MAPPING.keys()]
VALID_SUBSTATUS_OPTIONS = [substatus for status in STATUS_SUBSTATUS_MAPPING.values() for substatus in status["valid_sub_statuses"]] 