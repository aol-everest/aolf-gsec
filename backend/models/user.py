from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy import Enum
import enum

class UserRole(enum.Enum):
    SECRETARIAT = "SECRETARIAT"
    GENERAL = "GENERAL"
    USHER = "USHER"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, nullable=True)
    email = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String)
    last_name = Column(String)
    phone_number = Column(String)
    picture = Column(String)
    role = Column(Enum(UserRole), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime)

    # Relationships with explicit foreign keys
    appointments = relationship(
        "Appointment",
        back_populates="requester",
        foreign_keys="[Appointment.requester_id]"
    )
    approved_appointments = relationship(
        "Appointment",
        back_populates="approved_by_user",
        foreign_keys="[Appointment.approved_by]"
    )
    updated_appointments = relationship(
        "Appointment",
        back_populates="last_updated_by_user",
        foreign_keys="[Appointment.last_updated_by]"
    )
    point_of_contacts = relationship(
        "DignitaryPointOfContact",
        back_populates="poc",
        foreign_keys="[DignitaryPointOfContact.poc_id]"
    )
