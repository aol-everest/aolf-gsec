from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Date, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base
import os

schema = os.getenv('POSTGRES_SCHEMA', 'public')
schema_prefix = f"{schema}." if schema != 'public' else ''

class AccessLevel(str, enum.Enum):
    """Access level enum with proper case values"""
    READ = "Read Only"
    READ_WRITE = "Read and Edit"
    ADMIN = "Admin"

    def __str__(self):
        return self.value

    def get_int_value(self):
        if self == AccessLevel.READ:
            return 1
        elif self == AccessLevel.READ_WRITE:
            return 2
        elif self == AccessLevel.ADMIN:
            return 3
        else:
            raise ValueError(f"Invalid access level: {self}")
    
    def is_greater_than_or_equal_to(self, other: "AccessLevel"):
        """
        Check if this access level is greater than or equal to the other
        """
        return self.get_int_value() >= other.get_int_value()

    def get_permitting_access_levels(self):
        """
        Get the access that allow this access level
        """
        return [access_level for access_level in AccessLevel if access_level.is_greater_than_or_equal_to(self)]


class EntityType(str, enum.Enum):
    """Entity type enum with proper case values"""
    APPOINTMENT = "Appointment"
    APPOINTMENT_AND_DIGNITARY = "Appointment and Dignitary"

    def __str__(self):
        return self.value

class UserAccess(Base):
    __tablename__ = "user_access"

    id = Column(Integer, primary_key=True, index=True)
    
    # User who has this access
    user_id = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=False, index=True)
    
    # Access scope
    country_code = Column(String, nullable=False, index=True)
    location_id = Column(Integer, ForeignKey(f"{schema_prefix}locations.id"), nullable=True, index=True)
    
    # Access level and entity type
    access_level = Column(Enum(AccessLevel), nullable=False, default=AccessLevel.READ)
    entity_type = Column(Enum(EntityType), nullable=False, default=EntityType.APPOINTMENT)
    
    # Access metadata
    expiry_date = Column(Date, nullable=True)
    reason = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey(f"{schema_prefix}users.id"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="access_permissions")
    location = relationship("Location", foreign_keys=[location_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])

    @classmethod
    def check_access_level(cls, required_access_level: AccessLevel):
        required_access_int = required_access_level.get_int_value()
        user_access_int = cls.access_level.get_int_value()
        return user_access_int >= required_access_int
    
    @classmethod
    def create_with_role_enforcement(cls, db, user_id, country_code, location_id, access_level, 
                                     entity_type, expiry_date, reason, is_active, created_by):
        """
        Create a user access with role-based restrictions.
        If the user has the USHER role, it will enforce read-only access to appointments only.
        """
        from models.user import User, UserRole
        
        # Get the user to check their role
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise ValueError("User not found")
        
        if user.role == UserRole.USHER:
            if not location_id:
                raise ValueError("Location is required for USHER users")
        
            if access_level != AccessLevel.READ:
                raise ValueError("USHER users can only have read access")

            if entity_type != EntityType.APPOINTMENT:
                raise ValueError("USHER users can only have appointment access")
        
        # Create the access record
        access = cls(
            user_id=user_id,
            country_code=country_code,
            location_id=location_id,
            access_level=access_level,
            entity_type=entity_type,
            expiry_date=expiry_date,
            reason=reason,
            is_active=is_active,
            created_by=created_by
        )
        
        db.add(access)
        return access 
        
    @staticmethod
    def update_with_role_enforcement(db, access_record, update_data, updated_by):
        """
        Update a user access with role-based restrictions.
        If the user has the USHER role, it will enforce read-only access to appointments only.
        
        Args:
            db: Database session
            access_record: The UserAccess object to update
            update_data: Dictionary containing the fields to update
            updated_by: User ID of the person making the update
            
        Returns:
            The updated UserAccess object
        """
        from models.user import User, UserRole
        
        # Get the user to check their role
        user = db.query(User).filter(User.id == access_record.user_id).first()
        
        # Create a copy of update_data to avoid modifying the original
        final_update_data = update_data.copy()
        
        if user and user.role == UserRole.USHER:
            # Override settings for USHER role if they're being updated
            if 'access_level' in final_update_data:
                final_update_data['access_level'] = AccessLevel.READ
            if 'entity_type' in final_update_data:
                final_update_data['entity_type'] = EntityType.APPOINTMENT
        
        # Apply updates to the record
        for key, value in final_update_data.items():
            setattr(access_record, key, value)
        
        # Update audit fields
        access_record.updated_by = updated_by
        access_record.updated_at = datetime.utcnow()
        
        return access_record 