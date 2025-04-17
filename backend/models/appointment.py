from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy import Enum
import enum
from .location import Location
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

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

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    dignitary_id = Column(Integer, ForeignKey(f"{schema_prefix}dignitaries.id"), nullable=True)
    purpose = Column(Text, nullable=True)
    preferred_date = Column(Date, nullable=True)
    preferred_time_of_day = Column(Enum(AppointmentTimeOfDay), nullable=True)
    appointment_date = Column(Date)
    appointment_time = Column(String)
    duration = Column(Integer, nullable=False, default=15)  # Duration in minutes
    location_id = Column(Integer, ForeignKey(f"{schema_prefix}locations.id"))
    requester_notes_to_secretariat = Column(Text)
    status = Column(Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.PENDING)
    sub_status = Column(Enum(AppointmentSubStatus), nullable=True, default=AppointmentSubStatus.NOT_REVIEWED)
    appointment_type = Column(Enum(AppointmentType), nullable=True)
    secretariat_meeting_notes = Column(Text)
    secretariat_follow_up_actions = Column(Text)
    secretariat_notes_to_requester = Column(Text)
    approved_datetime = Column(DateTime)
    approved_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"))
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"))
    last_updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    requester = relationship(
        "User",
        back_populates="appointments",
        foreign_keys=[requester_id]
    )
    dignitary = relationship("Dignitary", back_populates="appointments", foreign_keys=[dignitary_id])
    appointment_dignitaries = relationship("AppointmentDignitary", back_populates="appointment", cascade="all, delete-orphan")
    location = relationship("Location", back_populates="appointments")
    approved_by_user = relationship(
        "User",
        back_populates="approved_appointments",
        foreign_keys=[approved_by]
    )
    last_updated_by_user = relationship(
        "User",
        back_populates="updated_appointments",
        foreign_keys=[last_updated_by]
    )
    created_by_user = relationship(
        "User",
        back_populates="created_appointments",
        foreign_keys=[created_by]
    )
