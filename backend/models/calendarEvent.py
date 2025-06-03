from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum, Index, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from .enums import EventType, EventStatus, CalendarCreationContext
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(Enum(EventType), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Time fields
    start_datetime = Column(DateTime, nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False)
    duration = Column(Integer, nullable=False)
    
    # Location
    location_id = Column(Integer, ForeignKey(f"{schema_prefix}locations.id"), nullable=True)
    meeting_place_id = Column(Integer, ForeignKey(f"{schema_prefix}meeting_places.id"), nullable=True)
    
    # Capacity management (for events like darshan)
    max_capacity = Column(Integer, default=1)
    is_open_for_booking = Column(Boolean, default=True)
    
    # Instructions for the event attendees
    instructions = Column(Text, nullable=True)
    
    # Event status
    status = Column(Enum(EventStatus), default=EventStatus.DRAFT, index=True)
    
    # Creation context tracking
    creation_context = Column(Enum(CalendarCreationContext), nullable=True)
    creation_context_id = Column(String(255), nullable=True)  # Can store appointment_id, user_id, etc.
    
    # Calendar sync
    external_calendar_id = Column(String(255), nullable=True)  # Google Calendar ID
    external_calendar_link = Column(Text, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    
    # Relationships
    location = relationship("Location", back_populates="calendar_events")
    meeting_place = relationship("MeetingPlace", back_populates="calendar_events")
    created_by_user = relationship(
        "User",
        back_populates="created_calendar_events",
        foreign_keys=[created_by]
    )
    updated_by_user = relationship(
        "User",
        back_populates="updated_calendar_events",
        foreign_keys=[updated_by]
    )
    appointments = relationship("Appointment", back_populates="calendar_event")

    # Additional indexes for better query performance
    __table_args__ = (
        Index('idx_calendar_events_datetime_type', 'start_datetime', 'event_type'),
        Index('idx_calendar_events_status_booking', 'status', 'is_open_for_booking'),
        Index('idx_calendar_events_creation_context', 'creation_context', 'creation_context_id'),
    )
