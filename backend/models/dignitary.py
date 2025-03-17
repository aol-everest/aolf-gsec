from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy import Enum
import enum
from typing import Optional
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')

class HonorificTitle(str, enum.Enum):
    """Honorific title enum with proper case values"""
    NA = "(Not Applicable)"
    MR = "Mr."
    MRS = "Mrs."
    MS = "Ms."
    ADMIRAL = "Admiral"
    AIR_CHIEF_MARSHAL = "Air Chief Marshal"
    AMBASSADOR = "Ambassador"
    APOSTLE = "Apostle"
    BISHOP = "Bishop"
    BRIGADIER_GENERAL = "Brigadier General"
    CHANCELLOR = "Chancellor"
    CHIEF = "Chief"
    COLONEL = "Colonel"
    COMMISSIONER = "Commissioner"
    COUNSELLOR = "Counsellor"
    DR = "Dr."
    ELDER = "Elder"
    GENERAL = "General"
    GENERAL_RETD = "General (Retd.)"
    HE = "H.E."
    HER_EXCELLENCY_THE_RIGHT_HONOURABLE = "Her Excellency the Right Honourable"
    HER_MAJESTY = "Her Majesty"
    HER_WORSHIP = "Her Worship"
    HIS_EMINENCE = "His Eminence"
    HIS_MAJESTY = "His Majesty"
    HIS_WORSHIP = "His Worship"
    IMAM = "Imam"
    JUSTICE = "Justice"
    KAMI = "Kami"
    LT_COL = "Lt. Col"
    PASTOR = "Pastor"
    PRIEST = "Priest"
    PROF = "Prof."
    RABBI = "Rabbi"
    RIGHT_HONOURABLE = "Right Honourable"
    SADHVI = "Sadhvi"
    SERGEANT = "Sergeant"
    SHERIFF = "Sheriff"
    SHRI = "Shri"
    SIR = "Sir"
    SMT = "Smt."
    SUSHRI = "Sushri"
    SWAMI = "Swami"
    THE_HONORABLE = "The Honorable"
    THE_HONOURABLE = "The Honourable"
    THE_REVEREND = "The Reverend"
    SHEIKH = "Sheikh"

    def __str__(self):
        return self.value
    
    # Helper function to format honorific titles by removing '(not applicable)'
    @staticmethod
    def format_honorific_title(title: Optional[str]) -> str:
        """Format honorific title by replacing '(not applicable)' with an empty string."""
        if not title:
            return ""
        return "" if title.lower() == "(not applicable)" else title



class PrimaryDomain(str, enum.Enum):
    """Primary domain enum with proper case values"""
    BUSINESS = "Business"
    GOVERNMENT = "Government"
    RELIGIOUS_SPIRITUAL = "Religious / Spiritual"
    SPORTS = "Sports"
    ENTERTAINMENT_MEDIA = "Entertainment & Media"
    EDUCATION = "Education"
    HEALTHCARE = "Healthcare"
    OTHER = "Other"

    def __str__(self):
        return self.value

class DignitarySource(str, enum.Enum):
    """Source of dignitary record"""
    MANUAL = "manual"
    BUSINESS_CARD = "business_card"

    def __str__(self):
        return self.value

class Dignitary(Base):
    __tablename__ = "dignitaries"

    id = Column(Integer, primary_key=True, index=True)
    honorific_title = Column(Enum(HonorificTitle), nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    primary_domain = Column(Enum(PrimaryDomain), nullable=True)
    primary_domain_other = Column(String, nullable=True)
    title_in_organization = Column(String, nullable=True)
    organization = Column(String, nullable=True)
    bio_summary = Column(Text, nullable=True)
    linked_in_or_website = Column(String, nullable=True)
    country = Column(String, nullable=True)
    state = Column(String, nullable=True)
    city = Column(String, nullable=True)
    has_dignitary_met_gurudev = Column(Boolean, nullable=True, default=False)
    gurudev_meeting_date = Column(Date, nullable=True)
    gurudev_meeting_location = Column(String, nullable=True)
    gurudev_meeting_notes = Column(Text, nullable=True)
    
    # Source of the dignitary record
    source = Column(Enum(DignitarySource), default=DignitarySource.MANUAL, nullable=False)
    source_appointment_id = Column(Integer, ForeignKey(f"{schema}.appointments.id", ondelete="SET NULL"), nullable=True)
  
    # Foreign keys
    created_by = Column(Integer, ForeignKey(f"{schema}.users.id"), nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    appointments = relationship("Appointment", back_populates="dignitary", foreign_keys="Appointment.dignitary_id")
    appointment_dignitaries = relationship("AppointmentDignitary", back_populates="dignitary", cascade="all, delete-orphan")
    source_appointment = relationship("Appointment", foreign_keys=[source_appointment_id])
    point_of_contacts = relationship("DignitaryPointOfContact", back_populates="dignitary") 
