from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date

class GoogleToken(BaseModel):
    token: str

class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None

class UserCreate(UserBase):
    google_id: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    phone_number: Optional[str] = None

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    user: User

class DignitaryBase(BaseModel):
    honorific_title: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    primary_domain: str
    title_in_organization: str
    organization: str
    bio_summary: str
    linked_in_or_website: str
    country: str
    state: str
    city: str

class DignitaryCreate(DignitaryBase):
    poc_relationship_type: str

class DignitaryUpdate(DignitaryBase):
    honorific_title: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    primary_domain: Optional[str] = None
    title_in_organization: Optional[str] = None
    organization: Optional[str] = None
    bio_summary: Optional[str] = None
    linked_in_or_website: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    poc_relationship_type: Optional[str] = None

class Dignitary(DignitaryBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        orm_mode = True

class AppointmentBase(BaseModel):
    dignitary_id: int
    purpose: str
    preferred_date: date
    preferred_time: Optional[str] = None
    duration: Optional[str] = None
    location: Optional[str] = None
    pre_meeting_notes: Optional[str] = None
    status: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    pass

class Appointment(AppointmentBase):
    id: int
    requester_id: int
    dignitary_id: int
    dignitary: Dignitary
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.strftime("%Y-%m-%d")
        }

class DignitaryPointOfContactBase(BaseModel):
    dignitary_id: int
    poc_id: int
    relationship_type: str

class DignitaryPointOfContactCreate(DignitaryPointOfContactBase):
    pass

class DignitaryPointOfContact(DignitaryPointOfContactBase):
    id: int
    dignitary_id: int
    poc_id: int
    relationship_type: str
    created_by: int
    created_at: datetime

    class Config:
        orm_mode = True

