from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy import Enum
import enum
from .location import Location
from .enums import (
    AppointmentStatus, 
    AppointmentSubStatus, 
    AppointmentType, 
    AppointmentTimeOfDay, 
    RequestType,
    STATUS_SUBSTATUS_MAPPING,
    VALID_STATUS_OPTIONS,
    VALID_SUBSTATUS_OPTIONS
)
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

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
    
    # Foreign key for meeting place (sub-location)
    meeting_place_id = Column(Integer, ForeignKey(f"{schema_prefix}meeting_places.id"), nullable=True)
    
    # New columns for calendar management evolution
    calendar_event_id = Column(Integer, ForeignKey(f"{schema_prefix}calendar_events.id"), nullable=True, index=True)
    request_type = Column(Enum(RequestType), default=RequestType.DIGNITARY, index=True)
    
    # For darshan appointments
    number_of_attendees = Column(Integer, default=1)
    
    # Relationships
    requester = relationship(
        "User",
        back_populates="appointments",
        foreign_keys=[requester_id]
    )
    dignitary = relationship("Dignitary", back_populates="appointments", foreign_keys=[dignitary_id])
    appointment_dignitaries = relationship("AppointmentDignitary", back_populates="appointment", cascade="all, delete-orphan")
    location = relationship("Location", back_populates="appointments")
    meeting_place = relationship("MeetingPlace", back_populates="appointments")
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
    
    # New relationships for calendar management
    calendar_event = relationship("CalendarEvent", back_populates="appointments")
    appointment_users = relationship("AppointmentUser", back_populates="appointment", cascade="all, delete-orphan")
