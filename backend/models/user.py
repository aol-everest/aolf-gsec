from sqlalchemy import Column, Integer, String, DateTime, JSON, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum
from .enums import UserRole, AOLTeacherStatus
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

# Define default notification preferences
DEFAULT_EMAIL_NOTIFICATION_PREFERENCES = {
    "appointment_created": True,  # When user creates an appointment
    "appointment_updated": True,  # When an appointment's status/details are updated
    "new_appointment_request": False,  # For secretariat - when new appointments are created
    "bcc_on_all_emails": False,  # For secretariat - to receive BCCs of all appointment-related emails
}

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, nullable=True)
    email = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String)
    last_name = Column(String)
    phone_number = Column(String)
    picture = Column(String)
    country_code = Column(String, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.GENERAL)
    email_notification_preferences = Column(JSON, nullable=False, default=lambda: DEFAULT_EMAIL_NOTIFICATION_PREFERENCES)
    
    # Professional Information (consistent with dignitary model)
    title_in_organization = Column(String, nullable=True)  # Professional title/designation
    organization = Column(String, nullable=True)  # Company or organization name
    
    # Enhanced Location Information
    state_province = Column(String, nullable=True)  # State or province name
    state_province_code = Column(String, nullable=True)  # State or province code
    city = Column(String, nullable=True)  # City
    
    # Art of Living Teacher Information
    teacher_status = Column(Enum(AOLTeacherStatus), nullable=True, default=AOLTeacherStatus.NOT_TEACHER)
    teacher_code = Column(String, nullable=True)  # Teacher identification code
    programs_taught = Column(JSON, nullable=True)  # Array of programs: values from AOLProgramType enum
    
    # Art of Living Roles/Affiliations
    aol_affiliations = Column(JSON, nullable=True)  # Array of roles: values from AOLAffiliation enum
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime)
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)

    # Relationships
    appointments = relationship(
        "Appointment",
        back_populates="requester",
        foreign_keys="[Appointment.requester_id]"
    )
    approved_appointments = relationship(
        "Appointment",
        back_populates="approved_by_user",
        foreign_keys="[Appointment.approved_by]"
    )
    updated_appointments = relationship(
        "Appointment",
        back_populates="last_updated_by_user",
        foreign_keys="[Appointment.last_updated_by]"
    )
    created_appointments = relationship(
        "Appointment",
        back_populates="created_by_user",
        foreign_keys="[Appointment.created_by]"
    )
    point_of_contacts = relationship(
        "DignitaryPointOfContact",
        back_populates="poc",
        foreign_keys="[DignitaryPointOfContact.poc_id]"
    )
    created_locations = relationship(
        "Location",
        back_populates="created_by_user",
        foreign_keys="[Location.created_by]"
    )
    updated_locations = relationship(
        "Location",
        back_populates="updated_by_user",
        foreign_keys="[Location.updated_by]"
    )
    
    # New relationships for calendar management
    created_calendar_events = relationship(
        "CalendarEvent",
        back_populates="created_by_user",
        foreign_keys="[CalendarEvent.created_by]"
    )
    updated_calendar_events = relationship(
        "CalendarEvent",
        back_populates="updated_by_user",
        foreign_keys="[CalendarEvent.updated_by]"
    )
    appointment_participations = relationship(
        "AppointmentUser",
        back_populates="user",
        foreign_keys="[AppointmentUser.user_id]"
    )
    checked_in_appointments = relationship(
        "AppointmentUser",
        back_populates="checked_in_by_user",
        foreign_keys="[AppointmentUser.checked_in_by]"
    )
    created_appointment_users = relationship(
        "AppointmentUser",
        back_populates="created_by_user",
        foreign_keys="[AppointmentUser.created_by]"
    )
    updated_appointment_users = relationship(
        "AppointmentUser",
        back_populates="updated_by_user",
        foreign_keys="[AppointmentUser.updated_by]"
    )
    
    # User contacts relationships
    owned_contacts = relationship(
        "UserContact",
        back_populates="owner_user",
        foreign_keys="[UserContact.owner_user_id]",
        cascade="all, delete-orphan"
    )
    contact_references = relationship(
        "UserContact",
        back_populates="contact_user",
        foreign_keys="[UserContact.contact_user_id]"
    )
    created_user_contacts = relationship(
        "UserContact",
        back_populates="created_by_user",
        foreign_keys="[UserContact.created_by]"
    )
    updated_user_contacts = relationship(
        "UserContact",
        back_populates="updated_by_user",
        foreign_keys="[UserContact.updated_by]"
    )
