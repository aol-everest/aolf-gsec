from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
from sqlalchemy import Enum
import enum

class DignitaryPrimaryDomain(enum.Enum):
    BUSINESS = "Business"
    GOVERNMENT = "Government"
    RELIGIOUS_SPIRITUAL = "Religious / Spiritual"
    SPORTS = "Sports"
    ENTERTAINMENT_MEDIA = "Entertainment & Media"
    EDUCATION = "Education"
    HEALTHCARE = "Healthcare"

class DignitaryHonorificTitle(enum.Enum):
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
    H_E = "H.E."
    HER_EXCELLENCY_THE_RIGHT_HONOURABLE = "Her Excellency the Right Honourable"
    HER_MAJESTY = "Her Majesty"
    HER_Worship = "Her Worship"
    HIS_EMINENCE = "His Eminence"
    HIS_MAJESTY = "His Majesty"
    HIS_Worship = "His Worship"
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
    THE_REVERENED = "The Reverend"
    SHEIKH = "Sheikh"

class Dignitary(Base):
    __tablename__ = "dignitaries"

    id = Column(Integer, primary_key=True, index=True)
    honorific_title = Column(Enum(DignitaryHonorificTitle), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String)
    primary_domain = Column(Enum(DignitaryPrimaryDomain), nullable=False)
    title_in_organization = Column(String, nullable=False)
    organization = Column(String, nullable=False)
    bio_summary = Column(Text, nullable=False)
    linked_in_or_website = Column(String)
    country = Column(String, nullable=False)
    state = Column(String, nullable=False)
    city = Column(String, nullable=False)
    
    # Foreign keys
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    appointments = relationship("Appointment", back_populates="dignitary")
    point_of_contacts = relationship("DignitaryPointOfContact", back_populates="dignitary") 