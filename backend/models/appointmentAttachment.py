from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.sql import func
from database import Base
import enum

class AttachmentType(str, enum.Enum):
    GENERAL = "general"
    BUSINESS_CARD = "business_card"

    def __str__(self):
        return self.value

class AppointmentAttachment(Base):
    __tablename__ = "appointment_attachments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    is_image = Column(Boolean, default=False, nullable=False)
    thumbnail_path = Column(String, nullable=True)  # Path to the thumbnail in S3
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    attachment_type = Column(Enum(AttachmentType), default=AttachmentType.GENERAL, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False) 
