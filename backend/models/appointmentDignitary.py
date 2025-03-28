from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class AppointmentDignitary(Base):
    __tablename__ = "appointment_dignitaries"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey(f"{schema_prefix}appointments.id", ondelete="CASCADE"), nullable=False)
    dignitary_id = Column(Integer, ForeignKey(f"{schema_prefix}dignitaries.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    appointment = relationship("Appointment", back_populates="appointment_dignitaries")
    dignitary = relationship("Dignitary", back_populates="appointment_dignitaries") 