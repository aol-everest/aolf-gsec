from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any, Union, List
from datetime import datetime, date
from models.enums import (
    AppointmentStatus, 
    AppointmentTimeOfDay, 
    AppointmentSubStatus, 
    AppointmentType,
    HonorificTitle, 
    PrimaryDomain, 
    DignitarySource,
    RelationshipType,
    AccessLevel, 
    EntityType,
    AttachmentType,
    AttendanceStatus,
    EventType, 
    EventStatus,
    CalendarCreationContext,
    RequestType,
    PersonRelationshipType,
    AOLTeacherStatus,
    AOLProgramType,
    AOLAffiliation,
)
from enum import Enum
import json

class GoogleToken(BaseModel):
    token: str

class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    picture: Optional[str] = None
    email_notification_preferences: Optional[Dict[str, bool]] = None

class UserCreate(UserBase):
    google_id: str

class User(UserBase):
    id: int
    created_at: datetime
    role: str
    last_login_at: Optional[datetime] = None
    country_code: Optional[str] = None
    
    # Professional Information (consistent with dignitary model)
    title_in_organization: Optional[str] = None
    organization: Optional[str] = None
    
    # Enhanced Location Information
    state_province: Optional[str] = None
    state_province_code: Optional[str] = None
    city: Optional[str] = None
    
    # Art of Living Teacher Information
    teacher_status: Optional[str] = None
    teacher_code: Optional[str] = None
    programs_taught: Optional[List[str]] = None
    
    # Art of Living Roles/Affiliations
    aol_affiliations: Optional[List[str]] = None

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    phone_number: Optional[str] = None
    picture: Optional[str] = None
    email_notification_preferences: Optional[Dict[str, bool]] = None
    country_code: Optional[str] = None
    
    # Professional Information (consistent with dignitary model)
    title_in_organization: Optional[str] = None
    organization: Optional[str] = None
    
    # Enhanced Location Information
    state_province: Optional[str] = None
    state_province_code: Optional[str] = None
    city: Optional[str] = None
    
    # Art of Living Teacher Information
    teacher_status: Optional[str] = None
    teacher_code: Optional[str] = None
    programs_taught: Optional[List[str]] = None
    
    # Art of Living Roles/Affiliations
    aol_affiliations: Optional[List[str]] = None
    
    class Config:
        orm_mode = True

class UserAdminView(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_by_user: Optional["User"] = None
    updated_by_user: Optional["User"] = None
    last_login_at: Optional[datetime] = None
    role: str
    country_code: Optional[str] = None
    
    # Professional Information (consistent with dignitary model)
    title_in_organization: Optional[str] = None
    organization: Optional[str] = None
    
    # Enhanced Location Information
    state_province: Optional[str] = None
    state_province_code: Optional[str] = None
    city: Optional[str] = None
    
    # Art of Living Teacher Information
    teacher_status: Optional[str] = None
    teacher_code: Optional[str] = None
    programs_taught: Optional[List[str]] = None
    
    # Art of Living Roles/Affiliations
    aol_affiliations: Optional[List[str]] = None
    
    class Config:
        orm_mode = True

class UserAdminUpdate(BaseModel):
    role: Optional[str] = None
    country_code: Optional[str] = None
    
    # Professional Information (consistent with dignitary model)
    title_in_organization: Optional[str] = None
    organization: Optional[str] = None
    
    # Enhanced Location Information
    state_province: Optional[str] = None
    state_province_code: Optional[str] = None
    city: Optional[str] = None
    
    # Art of Living Teacher Information
    teacher_status: Optional[str] = None
    teacher_code: Optional[str] = None
    programs_taught: Optional[List[str]] = None
    
    # Art of Living Roles/Affiliations
    aol_affiliations: Optional[List[str]] = None
    
    class Config:
        orm_mode = True

class UserAdminCreate(UserBase):
    role: str
    country_code: str
    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    user: User

class AppointmentDignitaryBase(BaseModel):
    appointment_id: int
    dignitary_id: int

class DignitaryBase(BaseModel):
    honorific_title: Optional[HonorificTitle] = None
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    primary_domain: Optional[PrimaryDomain] = None
    primary_domain_other: Optional[str] = None
    title_in_organization: Optional[str] = None
    organization: Optional[str] = None
    bio_summary: Optional[str] = None
    linked_in_or_website: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    has_dignitary_met_gurudev: Optional[bool] = False
    gurudev_meeting_date: Optional[date] = None
    gurudev_meeting_location: Optional[str] = None
    gurudev_meeting_notes: Optional[str] = None
    source: Optional[DignitarySource] = DignitarySource.MANUAL
    source_appointment_id: Optional[int] = None

class DignitaryCreate(DignitaryBase):
    poc_relationship_type: RelationshipType
    country_code: str

class DignitaryUpdate(DignitaryBase):
    honorific_title: Optional[HonorificTitle] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    primary_domain: Optional[PrimaryDomain] = None
    primary_domain_other: Optional[str] = None
    title_in_organization: Optional[str] = None
    organization: Optional[str] = None
    bio_summary: Optional[str] = None
    linked_in_or_website: Optional[str] = None
    country: Optional[str] = None
    country_code: str
    state: Optional[str] = None
    city: Optional[str] = None
    poc_relationship_type: Optional[RelationshipType] = None

class AppointmentDignitaryWithAppointment(AppointmentDignitaryBase):
    id: int
    created_at: datetime
    appointment: "Appointment"

    class Config:
        orm_mode = True

class DignitaryWithAppointments(DignitaryBase):
    id: int
    created_by: int
    created_at: datetime
    appointment_dignitaries: List[AppointmentDignitaryWithAppointment]

    class Config:
        orm_mode = True

class Dignitary(DignitaryBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        orm_mode = True

class DignitaryWithRelationship(DignitaryWithAppointments):
    relationship_type: str

    class Config:
        orm_mode = True

class AdminAppointmentDignitaryWithAppointment(AppointmentDignitaryBase):
    id: int
    created_at: datetime
    appointment: "AdminAppointment"

    class Config:
        orm_mode = True

class AdminDignitaryWithAppointments(DignitaryBase):
    id: int
    created_by: int
    created_at: datetime
    appointment_dignitaries: Optional[List[AdminAppointmentDignitaryWithAppointment]] = None
    fax: Optional[str] = None
    other_phone: Optional[str] = None
    street_address: Optional[str] = None
    social_media: Optional[Dict[str, str]] = None
    additional_info: Optional[Dict[str, str]] = None
    business_card_file_name: Optional[str] = None
    business_card_file_path: Optional[str] = None
    business_card_file_type: Optional[str] = None
    business_card_is_image: Optional[bool] = None
    business_card_thumbnail_path: Optional[str] = None
    secretariat_notes: Optional[str] = None

    class Config:
        orm_mode = True

class AdminDignitary(DignitaryBase):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    created_by: int
    created_at: datetime
    fax: Optional[str] = None
    other_phone: Optional[str] = None
    street_address: Optional[str] = None
    social_media: Optional[Dict[str, str]] = None
    additional_info: Optional[Dict[str, str]] = None
    business_card_file_name: Optional[str] = None
    business_card_file_path: Optional[str] = None
    business_card_file_type: Optional[str] = None
    business_card_is_image: Optional[bool] = None
    business_card_thumbnail_path: Optional[str] = None
    secretariat_notes: Optional[str] = None

    @validator("social_media", "additional_info", pre=True)
    def parse_json_string(cls, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                raise ValueError("Invalid JSON string")
        return value

    class Config:
        orm_mode = True

class AdminDignitaryCreate(DignitaryBase):
    country_code: str
    honorific_title: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    primary_domain: Optional[str] = None
    primary_domain_other: Optional[str] = None
    title_in_organization: Optional[str] = None
    organization: Optional[str] = None
    bio_summary: Optional[str] = None
    linked_in_or_website: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    has_dignitary_met_gurudev: Optional[bool] = None
    gurudev_meeting_date: Optional[date] = None
    gurudev_meeting_location: Optional[str] = None
    gurudev_meeting_notes: Optional[str] = None
    fax: Optional[str] = None
    other_phone: Optional[str] = None
    street_address: Optional[str] = None
    social_media: Optional[Union[Dict[str, str], str]] = None
    additional_info: Optional[Union[Dict[str, str], str]] = None
    secretariat_notes: Optional[str] = None

class AdminDignitaryUpdate(DignitaryBase):
    country_code: str
    honorific_title: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    primary_domain: Optional[str] = None
    primary_domain_other: Optional[str] = None
    title_in_organization: Optional[str] = None
    organization: Optional[str] = None
    bio_summary: Optional[str] = None
    linked_in_or_website: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    has_dignitary_met_gurudev: Optional[bool] = None
    gurudev_meeting_date: Optional[date] = None
    gurudev_meeting_location: Optional[str] = None
    gurudev_meeting_notes: Optional[str] = None
    fax: Optional[str] = None
    other_phone: Optional[str] = None
    street_address: Optional[str] = None
    social_media: Optional[Union[Dict[str, str], str]] = None
    additional_info: Optional[Union[Dict[str, str], str]] = None
    secretariat_notes: Optional[str] = None



class LocationBase(BaseModel):
    name: str
    street_address: str
    state: str
    state_code: Optional[str] = None
    city: str
    country: str
    country_code: str
    zip_code: str
    driving_directions: Optional[str] = None
    parking_info: Optional[str] = None
    timezone: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_file_type: Optional[str] = None
    attachment_thumbnail_path: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class Location(LocationBase):
    id: int

    class Config:
        orm_mode = True

class LocationAdminCreate(LocationBase):
    secretariat_internal_notes: Optional[str] = None
    attachment_path: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_file_type: Optional[str] = None
    attachment_thumbnail_path: Optional[str] = None

class LocationAdminUpdate(LocationBase):
    name: Optional[str] = None
    street_address: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    zip_code: Optional[str] = None
    driving_directions: Optional[str] = None
    parking_info: Optional[str] = None
    secretariat_internal_notes: Optional[str] = None
    attachment_path: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_file_type: Optional[str] = None
    attachment_thumbnail_path: Optional[str] = None

class LocationAdmin(LocationBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    updated_by: Optional[int] = None
    created_by_user: Optional[User] = None
    updated_by_user: Optional[User] = None
    secretariat_internal_notes: Optional[str] = None
    attachment_path: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_file_type: Optional[str] = None
    attachment_thumbnail_path: Optional[str] = None


# Meeting Place Schemas
class MeetingPlaceBase(BaseModel):
    name: str
    description: Optional[str] = None
    floor: Optional[str] = None
    room_number: Optional[str] = None
    building: Optional[str] = None
    additional_directions: Optional[str] = None
    is_default: bool = False
    is_active: bool = True
    lat: Optional[float] = None
    lng: Optional[float] = None

class MeetingPlace(MeetingPlaceBase):
    id: int
    location_id: int
    created_by: int
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None
    created_by_user: Optional[User] = None
    updated_by_user: Optional[User] = None
    
    class Config:
        orm_mode = True

class MeetingPlaceCreate(MeetingPlaceBase):
    pass  # Inherits all fields from MeetingPlaceBase

class MeetingPlaceUpdate(MeetingPlaceBase):
    name: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    # Make all fields optional for update
    description: Optional[str] = None
    floor: Optional[str] = None
    room_number: Optional[str] = None
    building: Optional[str] = None
    additional_directions: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class AppointmentDignitaryWithDignitary(AppointmentDignitaryBase):
    id: int
    created_at: datetime
    dignitary: Dignitary

    class Config:
        orm_mode = True

class AppointmentBase(BaseModel):
    location_id: Optional[int] = None
    location: Optional[Location] = None
    meeting_place_id: Optional[int] = None
    meeting_place: Optional[MeetingPlace] = None
    status: Optional[AppointmentStatus] = None

class AppointmentCreate(AppointmentBase):
    dignitary_ids: List[int]
    purpose: str
    preferred_date: date
    preferred_time_of_day: Optional[AppointmentTimeOfDay] = None
    requester_notes_to_secretariat: Optional[str] = None


# Calendar Event Schemas
class CalendarEventBasicInfo(BaseModel):
    """Minimal calendar event info for embedding in other responses"""
    id: int
    start_datetime: datetime
    start_date: date
    start_time: str
    duration: int
    location_id: Optional[int] = None
    meeting_place_id: Optional[int] = None
    
    class Config:
        orm_mode = True


class AppointmentUserInfo(BaseModel):
    """Schema for appointment user info in responses"""
    id: int
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    relationship_to_requester: Optional[PersonRelationshipType] = None
    created_at: datetime
    
    class Config:
        orm_mode = True


class Appointment(AppointmentBase):
    id: int
    requester_id: Optional[int] = None
    purpose: Optional[str] = None
    preferred_date: Optional[date] = None
    preferred_time_of_day: Optional[AppointmentTimeOfDay] = None
    requester_notes_to_secretariat: Optional[str] = None
    appointment_dignitaries: List[AppointmentDignitaryWithDignitary]
    status: AppointmentStatus
    sub_status: AppointmentSubStatus
    appointment_type: Optional[AppointmentType] = None
    created_at: datetime
    updated_at: datetime
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    secretariat_notes_to_requester: Optional[str] = None
    approved_datetime: Optional[datetime] = None
    
    # New fields for enhanced functionality
    request_type: Optional[RequestType] = RequestType.DIGNITARY
    calendar_event_id: Optional[int] = None
    number_of_attendees: Optional[int] = 1
    
    # New relationships
    calendar_event: Optional[CalendarEventBasicInfo] = None
    appointment_users: Optional[List[AppointmentUserInfo]] = None

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.strftime("%Y-%m-%d")
        }


class AdminAppointmentCreate(AppointmentBase):
    dignitary_ids: List[int]
    purpose: str
    appointment_date: date
    appointment_time: Optional[str] = None
    duration: Optional[int] = 15  # Duration in minutes
    status: AppointmentStatus
    sub_status: AppointmentSubStatus
    appointment_type: Optional[AppointmentType] = None
    secretariat_meeting_notes: Optional[str] = None
    secretariat_follow_up_actions: Optional[str] = None
    secretariat_notes_to_requester: Optional[str] = None
    meeting_place_id: Optional[int] = None


class AdminAppointmentUpdate(AppointmentBase):
    dignitary_ids: Optional[List[int]] = None
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    duration: Optional[int] = None  # Duration in minutes
    location: Optional[Location] = None
    status: Optional[AppointmentStatus] = None
    sub_status: Optional[AppointmentSubStatus] = None
    appointment_type: Optional[AppointmentType] = None
    secretariat_meeting_notes: Optional[str] = None
    secretariat_follow_up_actions: Optional[str] = None
    secretariat_notes_to_requester: Optional[str] = None
    meeting_place_id: Optional[int] = None


class AdminAppointmentDignitaryWithDignitary(AppointmentDignitaryBase):
    id: int
    created_at: datetime
    dignitary: AdminDignitary

    class Config:
        orm_mode = True

class AdminAppointment(AppointmentBase):
    id: int
    requester_id: Optional[int] = None
    purpose: Optional[str] = None
    preferred_date: Optional[date] = None
    preferred_time_of_day: Optional[AppointmentTimeOfDay] = None
    requester_notes_to_secretariat: Optional[str] = None
    appointment_dignitaries: List[AdminAppointmentDignitaryWithDignitary]
    requester: Optional[User] = None
    status: AppointmentStatus
    sub_status: Optional[AppointmentSubStatus] = None
    appointment_type: Optional[AppointmentType] = None
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    duration: Optional[int] = 15  # Duration in minutes
    created_at: datetime
    created_by: Optional[int] = None
    created_by_user: Optional[User] = None
    updated_at: datetime
    last_updated_by: Optional[int] = None
    last_updated_by_user: Optional[User] = None
    secretariat_meeting_notes: Optional[str] = None
    secretariat_follow_up_actions: Optional[str] = None
    secretariat_notes_to_requester: Optional[str] = None
    approved_datetime: Optional[datetime] = None
    approved_by: Optional[int] = None
    approved_by_user: Optional[User] = None

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.strftime("%Y-%m-%d")
        }

class DignitaryPointOfContactBase(BaseModel):
    dignitary_id: int
    poc_id: int
    relationship_type: RelationshipType

class DignitaryPointOfContactCreate(DignitaryPointOfContactBase):
    pass

class DignitaryPointOfContact(DignitaryPointOfContactBase):
    id: int
    dignitary_id: int
    poc_id: int
    relationship_type: RelationshipType
    created_by: int
    created_at: datetime

    class Config:
        orm_mode = True

class AppointmentAttachmentBase(BaseModel):
    file_name: str
    file_type: str
    is_image: bool = False
    attachment_type: AttachmentType = AttachmentType.GENERAL

class AppointmentAttachmentCreate(AppointmentAttachmentBase):
    appointment_id: int

class AppointmentAttachment(AppointmentAttachmentBase):
    id: int
    appointment_id: int
    file_path: str
    thumbnail_path: Optional[str] = None
    uploaded_by: int
    created_at: datetime

    class Config:
        orm_mode = True

class AdminAppointmentAttachmentThumbnail(BaseModel):
    id: int
    thumbnail: str

    class Config:
        orm_mode = True

class BusinessCardExtraction(BaseModel):
    honorific_title: Optional[HonorificTitle] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    primary_domain: Optional[str] = None
    primary_domain_other: Optional[str] = None
    phone: Optional[str] = None
    other_phone: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country_code: Optional[str] = None
    social_media: Optional[Dict[str, str]] = None
    bio: Optional[str] = None
    additional_info: Optional[Dict[str, str]] = None
    attachment_id: Optional[int] = None
    attachment_uuid: Optional[str] = None
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    is_image: Optional[bool] = None
    thumbnail_path: Optional[str] = None
    has_dignitary_met_gurudev: Optional[bool] = None
    gurudev_meeting_date: Optional[date] = None
    gurudev_meeting_location: Optional[str] = None
    gurudev_meeting_notes: Optional[str] = None
    secretariat_notes: Optional[str] = None

class AppointmentBusinessCardExtractionResponse(BaseModel):
    extraction: BusinessCardExtraction
    attachment_id: int
    appointment_id: int

class BusinessCardExtractionResponse(BaseModel):
    extraction: BusinessCardExtraction
    attachment_uuid: str

# New schemas for USHER role
class DignitaryUsherView(BaseModel):
    id: int
    honorific_title: Optional[HonorificTitle] = None
    first_name: str
    last_name: str

    class Config:
        orm_mode = True

class RequesterUsherView(BaseModel):
    first_name: str
    last_name: str
    phone_number: Optional[str] = None

    class Config:
        orm_mode = True

class AppointmentUserUsherView(BaseModel):
    """Usher view of appointment users (darshan attendees)"""
    id: int
    first_name: str
    last_name: str
    attendance_status: AttendanceStatus
    checked_in_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        orm_mode = True

class AppointmentDignitaryUsherView(AppointmentDignitaryBase):
    id: int
    created_at: datetime
    dignitary: DignitaryUsherView
    attendance_status: Optional[AttendanceStatus] = AttendanceStatus.PENDING

    class Config:
        orm_mode = True

class AppointmentUsherView(BaseModel):
    id: int
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    requester: Optional[RequesterUsherView] = None
    location: Optional[Location] = None
    appointment_dignitaries: Optional[List[AppointmentDignitaryUsherView]] = []
    appointment_users: Optional[List[AppointmentUserUsherView]] = []  # NEW

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.strftime("%Y-%m-%d")
        }

class BulkCheckinResponse(BaseModel):
    """Response for bulk check-in operations"""
    total_checked_in: int
    already_checked_in: int
    failed: int = 0

class AppointmentDignitary(AppointmentDignitaryBase):
    id: int
    created_at: datetime
    appointment: Appointment
    dignitary: Dignitary

    class Config:
        orm_mode = True

# Access Control schemas
class UserAccessBase(BaseModel):
    user_id: int
    country_code: str
    location_id: Optional[int] = None
    access_level: AccessLevel
    entity_type: EntityType
    expiry_date: Optional[date] = None
    reason: str
    is_active: bool = True

class UserAccessCreate(UserAccessBase):
    pass

class UserAccessUpdate(BaseModel):
    country_code: Optional[str] = None
    location_id: Optional[int] = None
    access_level: Optional[AccessLevel] = None
    entity_type: Optional[EntityType] = None
    expiry_date: Optional[date] = None
    reason: Optional[str] = None
    is_active: Optional[bool] = None

class UserAccess(UserAccessBase):
    id: int
    created_by: int
    created_at: datetime
    updated_by: Optional[int] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class UserAccessSummary(BaseModel):
    user_id: int
    user_email: str
    user_name: str
    countries: List[str]
    location_count: int
    entity_types: List[str]
    max_access_level: Optional[str] = None
    access_count: int

# Country schemas
class CountryBase(BaseModel):
    name: str
    iso2_code: str
    iso3_code: str
    region: Optional[str] = None
    sub_region: Optional[str] = None
    intermediate_region: Optional[str] = None
    country_groups: Optional[List[str]] = None
    alt_names: Optional[List[str]] = None
    is_enabled: bool = True
    timezones: Optional[List[str]] = None
    default_timezone: Optional[str] = None

class Country(CountryBase):
    class Config:
        orm_mode = True

class CountryCreate(CountryBase):
    pass

class CountryUpdate(BaseModel):
    name: Optional[str] = None
    iso3_code: Optional[str] = None
    region: Optional[str] = None
    sub_region: Optional[str] = None
    intermediate_region: Optional[str] = None
    country_groups: Optional[List[str]] = None
    alt_names: Optional[List[str]] = None
    is_enabled: Optional[bool] = None
    timezones: Optional[List[str]] = None
    default_timezone: Optional[str] = None

class CountryResponse(CountryBase):
    class Config:
        orm_mode = True

# New schema for appointment time slot aggregation
class AppointmentStatsByDateAndTimeSlot(BaseModel):
    date: date
    total_appointments: int
    time_slots: Dict[str, Dict[str, Any]]  # time -> {'appointment_count': int, 'people_count': int}

# Combined schema with both counts and IDs in a single structure
class AppointmentTimeSlotDetailsMap(BaseModel):
    dates: Dict[str, Dict[str, Any]]  # date -> { appointment_count, time_slots: { time: { appointment_id: people_count } } }

class AttendanceStatusUpdate(BaseModel):
    appointment_dignitary_id: int
    attendance_status: AttendanceStatus

# Appointment User Schemas (for darshan attendees)
from models.appointmentUser import PersonRelationshipType

class AppointmentUserCreate(BaseModel):
    """Schema for creating appointment users (darshan attendees)"""
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    relationship_to_requester: Optional[PersonRelationshipType] = None
    comments: Optional[str] = None  # Special requirements

# Enhanced Appointment Creation Schema
from models.appointment import RequestType

class AppointmentCreateEnhanced(BaseModel):
    """Enhanced appointment creation supporting both dignitary and darshan types"""
    purpose: str
    requester_notes_to_secretariat: Optional[str] = None
    request_type: RequestType = RequestType.DIGNITARY
    
    # Option 1: Link to existing calendar event (ADMIN/SECRETARIAT ONLY)
    calendar_event_id: Optional[int] = None
    
    # Option 2: User preferred time (creates calendar event on approval)
    preferred_date: Optional[date] = None
    preferred_time_of_day: Optional[AppointmentTimeOfDay] = None
    
    # Option 3: Admin exact scheduling (creates calendar event immediately)
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    
    location_id: Optional[int] = None
    meeting_place_id: Optional[int] = None
    duration: Optional[int] = 15
    max_capacity: Optional[int] = None  # For calendar event creation
    is_open_for_booking: Optional[bool] = None  # For calendar event creation
    
    # For dignitary appointments - if present, create AppointmentDignitary records
    dignitary_ids: Optional[List[int]] = None  # All dignitaries for this appointment
    
    # For user attendees - if present, create AppointmentUser records  
    user_ids: Optional[List[AppointmentUserCreate]] = None
    
    @validator('user_ids')
    def validate_user_ids_not_empty(cls, v):
        if v is not None and len(v) == 0:
            raise ValueError("If user_ids is provided, it must contain at least one user")
        return v
    
    @validator('dignitary_ids')
    def validate_dignitary_ids_not_empty(cls, v):
        if v is not None and len(v) == 0:
            raise ValueError("If dignitary_ids is provided, it must contain at least one dignitary")
        return v
    
    @validator('appointment_time')
    def validate_appointment_time_format(cls, v, values):
        # If appointment_date is specified, appointment_time should also be specified
        if values.get('appointment_date') and not v:
            raise ValueError("appointment_time is required when appointment_date is specified")
        return v

# Enhanced Appointment Response Schema
class AppointmentResponseEnhanced(BaseModel):
    """Enhanced appointment response with calendar event and appointment users"""
    id: int
    requester: Optional[User] = None
    purpose: str
    status: AppointmentStatus
    sub_status: Optional[AppointmentSubStatus] = None
    request_type: RequestType
    number_of_attendees: int
    
    # Calendar event info (replaces direct date/time fields)
    calendar_event: Optional[CalendarEventBasicInfo] = None
    
    # Related entities
    appointment_dignitaries: Optional[List[AppointmentDignitaryWithDignitary]] = None
    appointment_users: Optional[List[AppointmentUserInfo]] = None  # If darshan/other
    
    # Legacy fields (populated from calendar_event for backward compatibility)
    appointment_date: Optional[date] = None  # From calendar_event.start_date
    appointment_time: Optional[str] = None   # From calendar_event.start_time
    location: Optional[Location] = None
    meeting_place: Optional[MeetingPlace] = None

    created_at: datetime
    updated_at: datetime
    requester_notes_to_secretariat: Optional[str] = None
    secretariat_notes_to_requester: Optional[str] = None
    approved_datetime: Optional[datetime] = None
    
    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.strftime("%Y-%m-%d")
        }

class AdminAppointmentResponseEnhanced(AppointmentResponseEnhanced):
    """Enhanced admin appointment response with additional admin fields"""
    created_by: Optional[int] = None
    created_by_user: Optional[User] = None
    last_updated_by: Optional[int] = None
    last_updated_by_user: Optional[User] = None
    approved_by: Optional[int] = None
    approved_by_user: Optional[User] = None
    secretariat_meeting_notes: Optional[str] = None
    secretariat_follow_up_actions: Optional[str] = None
    duration: Optional[int] = 15

class CalendarEventCreate(BaseModel):
    """Schema for creating a new calendar event"""
    event_type: EventType
    title: str
    description: Optional[str] = None
    start_date: date  # User input date
    start_time: str   # User input time in HH:MM format
    duration: int  # minutes
    location_id: Optional[int] = None
    meeting_place_id: Optional[int] = None
    max_capacity: int = 1  # 1 for dignitary, 50-100+ for darshan
    is_open_for_booking: bool = True
    instructions: Optional[str] = None  # Special instructions for darshan
    status: EventStatus = EventStatus.DRAFT
    
    @validator('start_time')
    def validate_start_time_format(cls, v):
        # Validate HH:MM format
        import re
        if not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', v):
            raise ValueError("start_time must be in HH:MM format (e.g., '14:30')")
        return v
    
    @validator('max_capacity')
    def validate_capacity(cls, v, values):
        if 'event_type' in values:
            if values['event_type'] == EventType.DARSHAN and v < 1:
                raise ValueError("Darshan events must have capacity of at least 1")
            elif values['event_type'] == EventType.DIGNITARY_APPOINTMENT and v != 1:
                raise ValueError("Dignitary appointments must have capacity of exactly 1")
        return v

class CalendarEventUpdate(BaseModel):
    """Schema for updating an existing calendar event"""
    event_type: Optional[EventType] = None
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None   # User input date
    start_time: Optional[str] = None    # User input time in HH:MM format
    duration: Optional[int] = None
    location_id: Optional[int] = None
    meeting_place_id: Optional[int] = None
    max_capacity: Optional[int] = None
    is_open_for_booking: Optional[bool] = None
    instructions: Optional[str] = None
    status: Optional[EventStatus] = None
    
    @validator('start_time')
    def validate_start_time_format(cls, v):
        if v is not None:
            # Validate HH:MM format
            import re
            if not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', v):
                raise ValueError("start_time must be in HH:MM format (e.g., '14:30')")
        return v

class CalendarEventResponse(CalendarEventCreate):
    """Full calendar event response with all details"""
    id: int
    start_datetime: datetime  # Calculated timezone-aware datetime (included in response)
    # start_date and start_time are inherited from CalendarEventCreate (user input)
    current_capacity: int  # Calculated field
    available_capacity: int  # max_capacity - current_capacity
    linked_appointments_count: int
    external_calendar_id: Optional[str] = None
    external_calendar_link: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_by_user: Optional[User] = None
    updated_by_user: Optional[User] = None
    location: Optional[Location] = None
    meeting_place: Optional[MeetingPlace] = None
    creation_context: Optional[CalendarCreationContext] = None
    creation_context_id: Optional[str] = None  # String to match model
    
    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.strftime("%Y-%m-%d")
        }

class CalendarEventAvailability(BaseModel):
    """Response for checking event availability"""
    event_id: int
    max_capacity: int
    current_capacity: int
    available_capacity: int
    is_available: bool
    message: Optional[str] = None

class CalendarEventBatchCreate(BaseModel):
    """Schema for creating multiple calendar events (e.g., recurring darshan)"""
    event_type: EventType
    title_template: str  # Can include {date} placeholder
    description: Optional[str] = None
    start_dates: List[date]  # List of dates to create events
    start_time: str  # HH:MM format - same time for all events
    duration: int  # minutes
    location_id: Optional[int] = None
    meeting_place_id: Optional[int] = None
    max_capacity: int = 1
    is_open_for_booking: bool = True
    instructions: Optional[str] = None
    status: EventStatus = EventStatus.DRAFT
    
    @validator('start_time')
    def validate_start_time_format(cls, v):
        # Validate HH:MM format
        import re
        if not re.match(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$', v):
            raise ValueError("start_time must be in HH:MM format (e.g., '14:30')")
        return v
    
    @validator('start_dates')
    def validate_dates(cls, v):
        if not v:
            raise ValueError("At least one date must be provided")
        if len(v) > 365:
            raise ValueError("Cannot create more than 365 events at once")
        return v

class CalendarEventBatchUpdate(BaseModel):
    """Schema for updating multiple calendar events"""
    event_ids: List[int]
    update_data: CalendarEventUpdate
    
    @validator('event_ids')
    def validate_event_ids(cls, v):
        if not v:
            raise ValueError("At least one event ID must be provided")
        if len(v) > 100:
            raise ValueError("Cannot update more than 100 events at once")
        return v

class CalendarEventBatchResponse(BaseModel):
    """Response for batch operations"""
    total_requested: int
    successful: int
    failed: int
    events: List[CalendarEventResponse]
    errors: Optional[List[Dict[str, Any]]] = None
