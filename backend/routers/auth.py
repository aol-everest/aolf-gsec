from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from google.oauth2 import id_token
from google.auth.transport import requests
import logging

# Import our dependencies
from dependencies.database import get_db
from dependencies.auth import create_access_token, GOOGLE_CLIENT_ID

# Import models and schemas
import models
import schemas

# Get logger
logger = logging.getLogger(__name__)

router = APIRouter()

def create_or_update_self_contact(user: models.User, db: Session) -> None:
    """Create or update a self-contact for the user during login"""
    try:
        if not user.email:
            logger.warning(f"User {user.id} has no email, skipping self-contact creation")
            return
        
        # Check if self-contact already exists
        existing_self_contact = db.query(models.UserContact).filter(
            models.UserContact.owner_user_id == user.id,
            models.UserContact.email == user.email
        ).first()
        
        if existing_self_contact:
            logger.debug(f"Found existing self-contact for user {user.email} (ID: {existing_self_contact.id})")
            
            # Update existing self-contact to ensure it's properly configured
            updated = False
            
            # Ensure it's marked as a self relationship
            if existing_self_contact.relationship_to_owner != models.PersonRelationshipType.SELF:
                existing_self_contact.relationship_to_owner = models.PersonRelationshipType.SELF
                updated = True
                logger.info(f"Updated relationship type to SELF for contact {existing_self_contact.id}")
            
            # Populate contact_user_id if it's missing
            if existing_self_contact.contact_user_id is None:
                existing_self_contact.contact_user_id = user.id
                updated = True
                logger.info(f"Populated missing contact_user_id for self-contact {existing_self_contact.id}")
            
            # Update names if they're generic "Self" values and we have better info
            if (existing_self_contact.first_name == "Self" and user.first_name):
                existing_self_contact.first_name = user.first_name
                updated = True
            if (existing_self_contact.last_name == "Self" and user.last_name):
                existing_self_contact.last_name = user.last_name
                updated = True
            
            if updated:
                existing_self_contact.updated_by = user.id
                existing_self_contact.updated_at = datetime.utcnow()
                db.commit()
                logger.info(f"Updated self-contact for user {user.email}")
            
        else:
            # Create new self-contact
            logger.info(f"Creating new self-contact for user {user.email}")
            
            self_contact = models.UserContact(
                owner_user_id=user.id,
                contact_user_id=user.id,  # Link to self
                first_name=user.first_name or "Self",
                last_name=user.last_name or "Self", 
                email=user.email,
                relationship_to_owner=models.PersonRelationshipType.SELF,
                notes="Auto-created self-contact during login",
                created_by=user.id,
                updated_by=user.id
            )
            
            db.add(self_contact)
            db.commit()
            db.refresh(self_contact)
            logger.info(f"Created self-contact for user {user.email} (ID: {self_contact.id})")
            
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating/updating self-contact for user {user.email}: {str(e)}", exc_info=True)
        # Don't raise exception - this shouldn't block login

@router.post("/verify-google-token", response_model=schemas.Token)
async def verify_google_token(
    token: schemas.GoogleToken,
    db: Session = Depends(get_db)
):
    try:
        logger.debug(f"Received token for verification: {token.token[:20]}...{token.token[-10:] if len(token.token) > 30 else ''}")
        logger.debug(f"Using Google Client ID: {GOOGLE_CLIENT_ID[:10]}...")
        
        # Verify the token with Google
        logger.debug("Sending token to Google for verification")
        idinfo = id_token.verify_oauth2_token(
            token.token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        # Log token verification success and basic info
        logger.debug(f"Token verified successfully with Google for email: {idinfo.get('email')}")
        
        if 'email' not in idinfo:
            logger.warning("Verified token missing email claim")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing email"
            )
        
        # Check if user exists
        user = db.query(models.User).filter(models.User.email == idinfo['email']).first()
        logger.debug(f"Found user: {user}")
        
        if not user:
            logger.info(f"Creating new user with email: {idinfo['email']}")
            # Create new user
            user = models.User(
                google_id=idinfo['sub'],
                email=idinfo['email'],
                first_name=idinfo.get('given_name', ''),
                last_name=idinfo.get('family_name', ''),
                picture=idinfo.get('picture', ''),
                last_login_at=datetime.utcnow(),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"New user created: ID={user.id}, Email={user.email}, Role={user.role}")
            
            # Create self-contact for new user
            create_or_update_self_contact(user, db)
        else:
            logger.debug(f"Existing user found: ID={user.id}, Email={user.email}, Role={user.role}")
            # Update user first name, last name, and picture if they exist
            user.first_name = idinfo.get('given_name', user.first_name)
            user.last_name = idinfo.get('family_name', user.last_name)
            user.picture = idinfo.get('picture', user.picture)
            user.last_login_at = datetime.utcnow()
            # Update google_id if it's not set (for pre-defined users)
            if not user.google_id:
                user.google_id = idinfo.get('sub')
                logger.info(f"Updated google_id for existing user: {user.email}")
            db.commit()
            db.refresh(user)
            
            # Create or update self-contact for existing user
            create_or_update_self_contact(user, db)
        
        # Generate JWT token
        access_token = create_access_token(data={"sub": user.email})
        logger.debug(f"Generated access token: {access_token[:50]}...")
        
        logger.info(f"User logged in successfully: {user.email}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "user": user,
            "role": user.role,
        }
        
    except Exception as e:
        logger.error(f"Error verifying Google token: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        ) 