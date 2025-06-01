from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
from database import Base
from .enums import AttendanceStatus, PersonRelationshipType, RoleInTeamProject
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class AppointmentUser(Base):
    __tablename__ = "appointment_users"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey(f"{schema_prefix}appointments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey(f"{schema_prefix}users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Attendee information (for cases where user might bring guests)
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    relationship_to_requester = Column(Enum(PersonRelationshipType), nullable=True)
    role_in_team_project = Column(Enum(RoleInTeamProject), nullable=True)
    role_in_team_project_other = Column(String(255), nullable=True)
    
    # Check-in status
    attendance_status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PENDING, index=True)
    checked_in_at = Column(DateTime, nullable=True)
    checked_in_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    
    # Special requirements
    comments = Column(Text, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    
    # Relationships
    appointment = relationship("Appointment", back_populates="appointment_users")
    user = relationship(
        "User",
        back_populates="appointment_participations",
        foreign_keys=[user_id]
    )
    checked_in_by_user = relationship(
        "User",
        back_populates="checked_in_appointments",
        foreign_keys=[checked_in_by]
    )
    created_by_user = relationship(
        "User",
        back_populates="created_appointment_users",
        foreign_keys=[created_by]
    )
    updated_by_user = relationship(
        "User",
        back_populates="updated_appointment_users",
        foreign_keys=[updated_by]
    )

    # Constraints and indexes for better performance
    __table_args__ = (
        UniqueConstraint('appointment_id', 'user_id', name='unique_appointment_user'),
        Index('idx_appointment_users_appointment_id', 'appointment_id'),
        Index('idx_appointment_users_user_id', 'user_id'),
        Index('idx_appointment_users_attendance_status', 'attendance_status'),
    ) 
