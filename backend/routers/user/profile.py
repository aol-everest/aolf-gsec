from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import logging

# Import our dependencies
from dependencies.database import get_db, get_read_db
from dependencies.auth import get_current_user, get_current_user_for_write

# Import models and schemas
import models
import schemas

# Get logger
logger = logging.getLogger(__name__)

router = APIRouter()

@router.patch("/users/me/update", response_model=schemas.User)
async def update_user(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    logger.info(f"Received user update: {user_update.dict()}")
    """Update current user's information"""
    # Fetch the user in the current write session
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Apply updates to the user fetched in the current session
    for key, value in user_update.dict(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user

@router.get("/users/me", response_model=schemas.User)
async def get_current_user_info(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get current user's information"""
    return current_user 