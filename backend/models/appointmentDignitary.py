from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')


class AppointmentDignitary(Base):
    __tablename__ = "appointment_dignitaries"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey(f"{schema}.appointments.id", ondelete="CASCADE"), nullable=False)
    dignitary_id = Column(Integer, ForeignKey(f"{schema}.dignitaries.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    appointment = relationship("Appointment", back_populates="appointment_dignitaries")
    dignitary = relationship("Dignitary", back_populates="appointment_dignitaries") 