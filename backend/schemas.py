from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class GoogleToken(BaseModel):
    token: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int

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
    pre_meeting_notes: Optional[str] = None

class DignitaryCreate(DignitaryBase):
    pass

class Dignitary(DignitaryBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        orm_mode = True

class AppointmentCreate(BaseModel):
    dignitary: DignitaryCreate
    poc_relationship_type: str

class Appointment(BaseModel):
    id: int
    requester_id: int
    dignitary_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True 