from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class GeoSubdivision(Base):
    __tablename__ = "geo_subdivisions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Country code (ISO 2-letter) - foreign key to geo_countries table
    country_code = Column(String(2), ForeignKey(f"{schema_prefix}geo_countries.iso2_code"), nullable=False, index=True)
    
    # Subdivision code - can be alphanumeric, varies by country
    subdivision_code = Column(String(10), nullable=False, index=True)
    
    # Subdivision name
    name = Column(String, nullable=False, index=True)
    
    # Type of subdivision (State, Province, Emirate, County, Parish, etc.)
    subdivision_type = Column(String(50), nullable=False, index=True)
    
    # Flag to enable/disable a subdivision in the system
    is_enabled = Column(Boolean, default=True, nullable=False)
    
    # Timestamps for audit trail
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    country = relationship("GeoCountry")
    
    # Unique constraint on country_code + subdivision_code combination
    __table_args__ = (
        UniqueConstraint('country_code', 'subdivision_code', name='uq_geo_subdivision_country_code'),
        {'schema': schema if schema != 'public' else None},
    )
    
    def __repr__(self):
        return f"<Subdivision {self.name} ({self.country_code}-{self.subdivision_code}) - {self.subdivision_type}>"
    
    @property
    def full_code(self):
        """Returns the full subdivision code in format: COUNTRY-SUBDIVISION"""
        return f"{self.country_code}-{self.subdivision_code}" 