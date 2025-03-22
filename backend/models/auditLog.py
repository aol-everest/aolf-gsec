from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    
    # Who performed the action
    user_id = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=False, index=True)
    
    # What was changed
    entity_type = Column(String, nullable=False)  # e.g., 'appointment', 'dignitary', 'user_access', etc.
    entity_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)  # e.g., 'create', 'update', 'delete', 'grant_access', etc.
    
    # Details of the change
    previous_state = Column(JSON, nullable=True)  # Store previous values of modified fields
    new_state = Column(JSON, nullable=True)  # Store new values of modified fields
    
    # Additional context
    client_ip = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    
    # When the action occurred
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id]) 