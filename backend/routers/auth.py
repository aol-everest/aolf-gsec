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