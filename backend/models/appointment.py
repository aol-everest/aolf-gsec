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

class AppointmentType(str, enum.Enum):
    """Appointment type enum with proper case values"""
    PRIVATE = "Private"
    SMALL_GROUP = "Small group"

class AppointmentTimeOfDay(str, enum.Enum):
    """Appointment time enum with proper case values"""
    MORNING = "Morning"
    AFTERNOON = "Afternoon"
    EVENING = "Evening"

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dignitary_id = Column(Integer, ForeignKey("dignitaries.id"), nullable=False)
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
