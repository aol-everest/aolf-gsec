from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    street_address = Column(String, nullable=False)
    state = Column(String, nullable=False)
    state_code = Column(String, nullable=True)
    city = Column(String, nullable=False)
    country = Column(String, nullable=False)
    country_code = Column(String, nullable=False)
    zip_code = Column(String, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    timezone = Column(String)  # Store IANA timezone identifier (e.g., 'America/New_York')
    driving_directions = Column(Text)
    secretariat_internal_notes = Column(Text)
    parking_info = Column(Text)
    attachment_path = Column(String)  # Path to the stored attachment in S3
    attachment_name = Column(String)  # Original filename of the attachment
    attachment_file_type = Column(String)  # MIME type of the attachment
    attachment_thumbnail_path = Column(String)  # Path to the thumbnail in S3
    is_active = Column(Boolean, default=True, nullable=False)  # Allow admins to disable locations for front-end users
    
    # Timestamps and audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"))
    
    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
    appointments = relationship("Appointment", back_populates="location")
    meeting_places = relationship("MeetingPlace", back_populates="location")


class MeetingPlace(Base):
    __tablename__ = "meeting_places"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey(f"{schema_prefix}locations.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    floor = Column(String)
    room_number = Column(String)
    building = Column(String)
    additional_directions = Column(Text)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Coordinates within the location (optional)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    
    # Timestamps and audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"))
    
    # Relationships
    location = relationship("Location", back_populates="meeting_places")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
    appointments = relationship("Appointment", back_populates="meeting_place")
