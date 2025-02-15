from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy import Enum
import enum

class AppointmentStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FOLLOW_UP = "follow_up"

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dignitary_id = Column(Integer, ForeignKey("dignitaries.id"), nullable=False)
    purpose = Column(Text, nullable=False)
    preferred_date = Column(Date, nullable=False)
    preferred_time = Column(String)
    duration = Column(String)
    location = Column(String)
    pre_meeting_notes = Column(Text)
    status = Column(Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.PENDING)
    meeting_notes = Column(Text)
    follow_up_actions = Column(Text)
    secretariat_comments = Column(Text)
    approved_datetime = Column(DateTime)
    approved_by = Column(Integer, ForeignKey("users.id"))
    last_updated_by = Column(Integer, ForeignKey("users.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    requester = relationship("User", back_populates="appointments")
    dignitary = relationship("Dignitary", back_populates="appointments") 
