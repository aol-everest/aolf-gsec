from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class RelationshipType(str, enum.Enum):
    """Relationship type enum with proper case values"""
    DIRECT = "Direct"
    INDIRECT = "Indirect"

    def __str__(self):
        return self.value

class DignitaryPointOfContact(Base):
    __tablename__ = "dignitary_point_of_contacts"

    id = Column(Integer, primary_key=True, index=True)
    dignitary_id = Column(Integer, ForeignKey(f"{schema_prefix}dignitaries.id"), nullable=False)
    poc_id = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=False)
    relationship_type = Column(Enum(RelationshipType), nullable=False)
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    dignitary = relationship("Dignitary", back_populates="point_of_contacts")
    poc = relationship(
        "User",
        foreign_keys=[poc_id],
        back_populates="point_of_contacts"
    )
    creator = relationship(
        "User",
        foreign_keys=[created_by],
        backref="created_point_of_contacts"
    )

