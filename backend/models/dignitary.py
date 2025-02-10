from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Dignitary(Base):
    __tablename__ = "dignitaries"

    id = Column(Integer, primary_key=True, index=True)
    honorific_title = Column(String, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String)
    primary_domain = Column(String, nullable=False)
    title_in_organization = Column(String, nullable=False)
    organization = Column(String, nullable=False)
    bio_summary = Column(Text, nullable=False)
    linked_in_or_website = Column(String)
    country = Column(String, nullable=False)
    state = Column(String, nullable=False)
    city = Column(String, nullable=False)
    
    # Foreign keys
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    appointments = relationship("Appointment", back_populates="dignitary")
    point_of_contacts = relationship("DignitaryPointOfContact", back_populates="dignitary") 