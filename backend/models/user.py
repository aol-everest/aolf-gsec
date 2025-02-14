from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy import Enum
import enum

class UserRole(enum.Enum):
    SECRETARIAT = "secretariat"
    GENERAL = "general"
    USHER = "usher"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String)
    last_name = Column(String)
    phone_number = Column(String)
    picture = Column(String)
    role = Column(Enum(UserRole), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    appointments = relationship("Appointment", back_populates="requester")
    point_of_contacts = relationship(
        "DignitaryPointOfContact",
        back_populates="poc",
        foreign_keys="DignitaryPointOfContact.poc_id"
    )
