from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from .enums import PersonRelationshipType
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class UserContact(Base):
    __tablename__ = "user_contacts"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey(f"{schema_prefix}users.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_user_id = Column(Integer, ForeignKey(f"{schema_prefix}users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Contact information as entered by owner
    first_name = Column(String(255), nullable=False)
    last_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    
    # Relationship context
    relationship_to_owner = Column(Enum(PersonRelationshipType), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Usage tracking
    appointment_usage_count = Column(Integer, default=0, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    
    # Relationships
    owner_user = relationship(
        "User",
        back_populates="owned_contacts",
        foreign_keys=[owner_user_id]
    )
    contact_user = relationship(
        "User",
        back_populates="contact_references",
        foreign_keys=[contact_user_id]
    )
    created_by_user = relationship(
        "User",
        back_populates="created_user_contacts",
        foreign_keys=[created_by]
    )
    updated_by_user = relationship(
        "User",
        back_populates="updated_user_contacts",
        foreign_keys=[updated_by]
    )
    appointment_contacts = relationship(
        "AppointmentContact",
        back_populates="contact",
        cascade="all, delete-orphan"
    )

    # Constraints and indexes for better performance
    __table_args__ = (
        # Unique email per owner (if email is provided)
        UniqueConstraint('owner_user_id', 'email', name='unique_owner_email', 
                        sqlite_on_conflict='IGNORE'),
        Index('idx_user_contacts_owner_id', 'owner_user_id'),
        Index('idx_user_contacts_contact_user_id', 'contact_user_id'),
        Index('idx_user_contacts_owner_usage', 'owner_user_id', 'appointment_usage_count'),
        Index('idx_user_contacts_owner_last_used', 'owner_user_id', 'last_used_at'),
    ) 