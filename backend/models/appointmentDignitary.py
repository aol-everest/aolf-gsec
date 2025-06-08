from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
from database import Base
from .enums import AttendanceStatus
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class AppointmentDignitary(Base):
    __tablename__ = "appointment_dignitaries"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey(f"{schema_prefix}appointments.id", ondelete="CASCADE"), nullable=False)
    dignitary_id = Column(Integer, ForeignKey(f"{schema_prefix}dignitaries.id", ondelete="CASCADE"), nullable=False)

    # check in status
    attendance_status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PENDING)
    checked_in_at = Column(DateTime, nullable=True)
    checked_in_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)

    # Audit fields
    created_at = Column(DateTime, default=datetime.now(UTC))
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"))

    updated_at = Column(DateTime, default=datetime.now(UTC), onupdate=datetime.now(UTC))
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"))

    # Relationships
    appointment = relationship("Appointment", back_populates="appointment_dignitaries")
    dignitary = relationship("Dignitary", back_populates="appointment_dignitaries") 

