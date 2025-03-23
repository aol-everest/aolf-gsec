from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, Union, List
from datetime import datetime, date
from models.appointment import AppointmentStatus, AppointmentTimeOfDay, AppointmentSubStatus, AppointmentType
from models.dignitary import HonorificTitle, PrimaryDomain, DignitarySource
from models.dignitaryPointOfContact import RelationshipType
from models.accessControl import AccessLevel, EntityType
from enum import Enum
from models.appointmentAttachment import AttachmentType

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

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    phone_number: Optional[str] = None
    picture: Optional[str] = None
    email_notification_preferences: Optional[Dict[str, bool]] = None
    country_code: Optional[str] = None
    
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
    country_code: str
    
    class Config:
        orm_mode = True

class UserAdminUpdate(BaseModel):
    role: Optional[str] = None
    
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
    appointment_dignitaries: List[AdminAppointmentDignitaryWithAppointment]
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

    class Config:
        orm_mode = True

class LocationBase(BaseModel):
    name: str
    street_address: str
    state: str
    city: str
    country: str
    country_code: str
    zip_code: str
    driving_directions: Optional[str] = None
    parking_info: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_file_type: Optional[str] = None
    attachment_thumbnail_path: Optional[str] = None

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


class AppointmentDignitaryWithDignitary(AppointmentDignitaryBase):
    id: int
    created_at: datetime
    dignitary: Dignitary

    class Config:
        orm_mode = True

class AppointmentBase(BaseModel):
    location_id: Optional[int] = None
    location: Optional[Location] = None
    status: Optional[AppointmentStatus] = None

class AppointmentCreate(AppointmentBase):
    dignitary_ids: List[int]
    purpose: str
    preferred_date: date
    preferred_time_of_day: Optional[AppointmentTimeOfDay] = None
    requester_notes_to_secretariat: Optional[str] = None



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
    status: AppointmentStatus
    sub_status: AppointmentSubStatus
    appointment_type: Optional[AppointmentType] = None
    secretariat_meeting_notes: Optional[str] = None
    secretariat_follow_up_actions: Optional[str] = None
    secretariat_notes_to_requester: Optional[str] = None


class AdminAppointmentUpdate(AppointmentBase):
    dignitary_ids: Optional[List[int]] = None
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    location: Optional[Location] = None
    status: Optional[AppointmentStatus] = None
    sub_status: Optional[AppointmentSubStatus] = None
    appointment_type: Optional[AppointmentType] = None
    secretariat_meeting_notes: Optional[str] = None
    secretariat_follow_up_actions: Optional[str] = None
    secretariat_notes_to_requester: Optional[str] = None


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
    created_at: datetime
    updated_at: datetime
    secretariat_meeting_notes: Optional[str] = None
    secretariat_follow_up_actions: Optional[str] = None
    secretariat_notes_to_requester: Optional[str] = None
    approved_datetime: Optional[datetime] = None
    approved_by: Optional[int] = None
    approved_by_user: Optional[User] = None
    last_updated_by: Optional[int] = None
    last_updated_by_user: Optional[User] = None

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
    country: Optional[str] = None
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

class AppointmentDignitaryUsherView(AppointmentDignitaryBase):
    id: int
    created_at: datetime
    dignitary: DignitaryUsherView

    class Config:
        orm_mode = True

class AppointmentUsherView(BaseModel):
    id: int
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    requester: RequesterUsherView
    location: Optional[Location] = None
    appointment_dignitaries: List[AppointmentDignitaryUsherView]

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.strftime("%Y-%m-%d")
        }

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

class CountryResponse(CountryBase):
    class Config:
        orm_mode = True

