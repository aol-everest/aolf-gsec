from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy import Enum
import enum
from typing import Optional
from .enums import HonorificTitle, PrimaryDomain, DignitarySource
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class Dignitary(Base):
    __tablename__ = "dignitaries"

    id = Column(Integer, primary_key=True, index=True)
    honorific_title = Column(Enum(HonorificTitle), nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    other_phone = Column(String, nullable=True)
    fax = Column(String, nullable=True)
    primary_domain = Column(Enum(PrimaryDomain), nullable=True)
    primary_domain_other = Column(String, nullable=True)
    title_in_organization = Column(String, nullable=True)
    organization = Column(String, nullable=True)
    bio_summary = Column(Text, nullable=True)
    linked_in_or_website = Column(String, nullable=True)
    country = Column(String, nullable=True)
    country_code = Column(String, nullable=True)
    state = Column(String, nullable=True)
    city = Column(String, nullable=True)
    street_address = Column(String, nullable=True)
    has_dignitary_met_gurudev = Column(Boolean, nullable=True, default=False)
    gurudev_meeting_date = Column(Date, nullable=True)
    gurudev_meeting_location = Column(String, nullable=True)
    gurudev_meeting_notes = Column(Text, nullable=True)

    social_media = Column(JSONB, nullable=True)
    additional_info = Column(JSONB, nullable=True)
    secretariat_notes = Column(Text, nullable=True)

    # Business card file
    business_card_file_name = Column(String, nullable=True)
    business_card_file_path = Column(String, nullable=True)
    business_card_file_type = Column(String, nullable=True)
    business_card_is_image = Column(Boolean, default=False, nullable=True)
    business_card_thumbnail_path = Column(String, nullable=True)  # Path to the thumbnail in S3

    # Source of the dignitary record
    source = Column(Enum(DignitarySource), default=DignitarySource.MANUAL, nullable=False)
    source_appointment_id = Column(Integer, ForeignKey(f"{schema_prefix}appointments.id", ondelete="SET NULL"), nullable=True)
  
    # Foreign keys
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    appointments = relationship("Appointment", back_populates="dignitary", foreign_keys="Appointment.dignitary_id")
    appointment_dignitaries = relationship("AppointmentDignitary", back_populates="dignitary", cascade="all, delete-orphan")
    source_appointment = relationship("Appointment", foreign_keys=[source_appointment_id])
    point_of_contacts = relationship("DignitaryPointOfContact", back_populates="dignitary") 
