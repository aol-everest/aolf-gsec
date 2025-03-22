from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Date, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class AccessLevel(str, enum.Enum):
    """Access level enum with proper case values"""
    READ = "Read"
    READ_WRITE = "ReadWrite"
    ADMIN = "Admin"

    def __str__(self):
        return self.value

class EntityType(str, enum.Enum):
    """Entity type enum with proper case values"""
    APPOINTMENT = "Appointment"
    APPOINTMENT_AND_DIGNITARY = "Appointment and Dignitary"

    def __str__(self):
        return self.value

class UserAccess(Base):
    __tablename__ = "user_access"

    id = Column(Integer, primary_key=True, index=True)
    
    # User who has this access
    user_id = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=False, index=True)
    
    # Access scope
    country_code = Column(String, nullable=False, index=True)
    location_id = Column(Integer, ForeignKey(f"{schema_prefix}locations.id"), nullable=True, index=True)
    
    # Access level and entity type
    access_level = Column(Enum(AccessLevel), nullable=False, default=AccessLevel.READ)
    entity_type = Column(Enum(EntityType), nullable=False, default=EntityType.APPOINTMENT)
    
    # Access metadata
    expiry_date = Column(Date, nullable=True)
    reason = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="access_permissions")
    location = relationship("Location", foreign_keys=[location_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by]) 