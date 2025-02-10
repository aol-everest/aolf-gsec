from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

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
    status = Column(String, default="pending")  # pending, approved, rejected
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    requester = relationship("User", back_populates="appointments")
    dignitary = relationship("Dignitary", back_populates="appointments") 
