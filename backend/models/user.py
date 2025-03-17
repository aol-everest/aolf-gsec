from sqlalchemy import Column, Integer, String, DateTime, JSON, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')

class UserRole(str, enum.Enum):
    """User role enum with proper case values"""
    SECRETARIAT = "SECRETARIAT"
    GENERAL = "GENERAL"
    USHER = "USHER"

    def __str__(self):
        return self.value

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
    role = Column(Enum(UserRole), nullable=False, default=UserRole.GENERAL)
    email_notification_preferences = Column(JSON, nullable=False, default=lambda: DEFAULT_EMAIL_NOTIFICATION_PREFERENCES)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime)
    created_by = Column(Integer, ForeignKey(f"{schema}.users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey(f"{schema}.users.id"), nullable=True)

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
