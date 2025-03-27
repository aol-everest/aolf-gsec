from sqlalchemy import Column, String, Integer, Boolean, ARRAY
from database import Base
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class Country(Base):
    __tablename__ = "countries"

    # Primary key is the ISO 2-letter code
    iso2_code = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    iso3_code = Column(String, nullable=False, index=True)
    region = Column(String, nullable=True)
    sub_region = Column(String, nullable=True)  
    intermediate_region = Column(String, nullable=True)
    country_groups = Column(ARRAY(String), nullable=True)
    alt_names = Column(ARRAY(String), nullable=True)
    timezones = Column(ARRAY(String), nullable=True)
    default_timezone = Column(String, nullable=True)
    
    # Flag to enable/disable a country in the system
    is_enabled = Column(Boolean, default=True, nullable=False)
    
    def __repr__(self):
        return f"<Country {self.name} ({self.iso2_code})>" 