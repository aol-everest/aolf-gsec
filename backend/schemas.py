from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime, date
from models.appointment import AppointmentStatus, AppointmentTimeOfDay, AppointmentSubStatus, AppointmentType
from models.dignitary import HonorificTitle, PrimaryDomain
from models.dignitaryPointOfContact import RelationshipType

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
    
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    user: User

class DignitaryBase(BaseModel):
    honorific_title: HonorificTitle
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    primary_domain: PrimaryDomain
    title_in_organization: str
    organization: str
    bio_summary: str
    linked_in_or_website: str
    country: str
    state: str
    city: str
    has_dignitary_met_gurudev: Optional[bool] = False
    gurudev_meeting_date: Optional[date] = None
    gurudev_meeting_location: Optional[str] = None
    gurudev_meeting_notes: Optional[str] = None

class DignitaryCreate(DignitaryBase):
    poc_relationship_type: RelationshipType

class DignitaryUpdate(DignitaryBase):
    honorific_title: Optional[HonorificTitle] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    primary_domain: Optional[PrimaryDomain] = None
    title_in_organization: Optional[str] = None
    organization: Optional[str] = None
    bio_summary: Optional[str] = None
    linked_in_or_website: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    poc_relationship_type: Optional[RelationshipType] = None

class Dignitary(DignitaryBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        orm_mode = True

class DignitaryAdmin(DignitaryBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        orm_mode = True

class LocationBase(BaseModel):
    name: str
    street_address: str
    state: str
    city: str
    country: str
    zip_code: str
    driving_directions: Optional[str] = None
    parking_info: Optional[str] = None

class Location(LocationBase):
    id: int

    class Config:
        orm_mode = True

class LocationAdminCreate(LocationBase):
    secretariat_internal_notes: Optional[str] = None

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

class LocationAdmin(LocationBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    updated_by: Optional[int] = None
    secretariat_internal_notes: Optional[str] = None


class AppointmentBase(BaseModel):
    location_id: Optional[int] = None
    location: Optional[Location] = None
    status: Optional[AppointmentStatus] = None

class AppointmentCreate(AppointmentBase):
    dignitary_id: int
    purpose: str
    preferred_date: date
    preferred_time_of_day: Optional[AppointmentTimeOfDay] = None
    requester_notes_to_secretariat: Optional[str] = None

class Appointment(AppointmentBase):
    id: int
    requester_id: int
    dignitary_id: int
    purpose: str
    preferred_date: date
    preferred_time_of_day: Optional[AppointmentTimeOfDay] = None
    requester_notes_to_secretariat: Optional[str] = None
    dignitary: Dignitary
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

class AppointmentAdminUpdate(AppointmentBase):
    appointment_date: Optional[date] = None
    appointment_time: Optional[str] = None
    location: Optional[str] = None
    status: Optional[AppointmentStatus] = None
    sub_status: Optional[AppointmentSubStatus] = None
    appointment_type: Optional[AppointmentType] = None
    secretariat_meeting_notes: Optional[str] = None
    secretariat_follow_up_actions: Optional[str] = None
    secretariat_notes_to_requester: Optional[str] = None
    approved_datetime: Optional[datetime] = None
    approved_by: Optional[int] = None
    last_updated_by: Optional[int] = None

class AppointmentAdmin(AppointmentBase):
    id: int
    requester_id: int
    dignitary_id: int
    purpose: str
    preferred_date: date
    preferred_time_of_day: Optional[AppointmentTimeOfDay] = None
    requester_notes_to_secretariat: Optional[str] = None
    dignitary: DignitaryAdmin
    requester: User
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

