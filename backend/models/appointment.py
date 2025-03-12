from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy import Enum
import enum
from .location import Location

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
    DARSHAN_LINE = "Darshan line / public event"
    FOLLOW_UP_REQUIRED = "Follow-up required"
    LOW_PRIORITY = "Low priority"
    MET_GURUDEV = "Met Gurudev already"
    NEED_MORE_INFO = "Need more info"
    NEED_RESCHEDULE = "Need to reschedule"
    NO_FURTHER_ACTION = "No further action"
    NOT_REVIEWED = "Not yet reviewed"
    SHORTLISTED = "Shortlisted"
    UNDER_CONSIDERATION = "Under consideration"
    UNSCHEDULED = "Unscheduled"
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
        "default_sub_status": AppointmentSubStatus.NO_FURTHER_ACTION.value,
        "valid_sub_statuses": [
            AppointmentSubStatus.NO_FURTHER_ACTION.value,
            AppointmentSubStatus.LOW_PRIORITY.value,
            AppointmentSubStatus.DARSHAN_LINE.value,
            AppointmentSubStatus.MET_GURUDEV.value
        ]
    },
    AppointmentStatus.COMPLETED.value: {
        "default_sub_status": AppointmentSubStatus.FOLLOW_UP_REQUIRED.value,
        "valid_sub_statuses": [
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

class AppointmentType(str, enum.Enum):
    """Appointment type enum with proper case values"""
    PRIVATE = "Private"
    SMALL_GROUP = "Small group"

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
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dignitary_id = Column(Integer, ForeignKey("dignitaries.id"), nullable=True)
    purpose = Column(Text, nullable=False)
    preferred_date = Column(Date, nullable=False)
    preferred_time_of_day = Column(Enum(AppointmentTimeOfDay), nullable=False)
    appointment_date = Column(Date)
    appointment_time = Column(String)
    location_id = Column(Integer, ForeignKey("locations.id"))
    requester_notes_to_secretariat = Column(Text)
    status = Column(Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.PENDING)
    sub_status = Column(Enum(AppointmentSubStatus), nullable=True, default=AppointmentSubStatus.NOT_REVIEWED)
    appointment_type = Column(Enum(AppointmentType), nullable=True)
    secretariat_meeting_notes = Column(Text)
    secretariat_follow_up_actions = Column(Text)
    secretariat_notes_to_requester = Column(Text)
    approved_datetime = Column(DateTime)
    approved_by = Column(Integer, ForeignKey("users.id"))
    last_updated_by = Column(Integer, ForeignKey("users.id"))
    
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
