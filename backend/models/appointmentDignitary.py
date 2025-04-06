from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
from database import Base
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

from sqlalchemy import Enum
import enum

class AttendanceStatus(enum.Enum):
    PENDING = "Pending"
    CHECKED_IN = "Checked In"
    CANCELLED = "Cancelled"
    NO_SHOW = "No Show"

class AppointmentDignitary(Base):
    __tablename__ = "appointment_dignitaries"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey(f"{schema_prefix}appointments.id", ondelete="CASCADE"), nullable=False)
    dignitary_id = Column(Integer, ForeignKey(f"{schema_prefix}dignitaries.id", ondelete="CASCADE"), nullable=False)
    attendance_status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PENDING)

    created_at = Column(DateTime, default=datetime.now(UTC))
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"))

    updated_at = Column(DateTime, default=datetime.now(UTC), onupdate=datetime.now(UTC))
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"))

    # Relationships
    appointment = relationship("Appointment", back_populates="appointment_dignitaries")
    dignitary = relationship("Dignitary", back_populates="appointment_dignitaries") 