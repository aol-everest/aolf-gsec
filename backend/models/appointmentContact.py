from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
from database import Base
from .enums import AttendanceStatus, PersonRelationshipType, RoleInTeamProject
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class AppointmentContact(Base):
    __tablename__ = "appointment_contacts"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey(f"{schema_prefix}appointments.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id = Column(Integer, ForeignKey(f"{schema_prefix}user_contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Role and relationship context for this specific appointment
    role_in_team_project = Column(Enum(RoleInTeamProject), nullable=True)
    role_in_team_project_other = Column(String(255), nullable=True)
    
    # Check-in status
    attendance_status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PENDING, index=True)
    checked_in_at = Column(DateTime, nullable=True)
    checked_in_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    
    # Appointment-specific notes and requirements
    comments = Column(Text, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    
    # Relationships
    appointment = relationship("Appointment", back_populates="appointment_contacts")
    contact = relationship(
        "UserContact",
        back_populates="appointment_contacts",
        foreign_keys=[contact_id]
    )
    checked_in_by_user = relationship(
        "User",
        back_populates="checked_in_appointments",
        foreign_keys=[checked_in_by]
    )
    created_by_user = relationship(
        "User",
        back_populates="created_appointment_contacts",
        foreign_keys=[created_by]
    )
    updated_by_user = relationship(
        "User",
        back_populates="updated_appointment_contacts",
        foreign_keys=[updated_by]
    )

    # Constraints and indexes for better performance
    __table_args__ = (
        UniqueConstraint('appointment_id', 'contact_id', name='unique_appointment_contact'),
        Index('idx_appointment_contacts_appointment_id', 'appointment_id'),
        Index('idx_appointment_contacts_contact_id', 'contact_id'),
        Index('idx_appointment_contacts_attendance_status', 'attendance_status'),
    ) 
