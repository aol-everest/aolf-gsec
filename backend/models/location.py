from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    street_address = Column(String, nullable=False)
    state = Column(String, nullable=False)
    city = Column(String, nullable=False)
    country = Column(String, nullable=False)
    zip_code = Column(String, nullable=False)
    driving_directions = Column(Text)
    secretariat_internal_notes = Column(Text)
    parking_info = Column(Text)
    attachment_path = Column(String)  # Path to the stored attachment in S3
    attachment_name = Column(String)  # Original filename of the attachment
    attachment_file_type = Column(String)  # MIME type of the attachment
    attachment_thumbnail_path = Column(String)  # Path to the thumbnail in S3
    
    # Timestamps and audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
    appointments = relationship("Appointment", back_populates="location")
