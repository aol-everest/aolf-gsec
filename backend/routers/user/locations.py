from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, aliased
from typing import List
import io

# Import our dependencies
from dependencies.database import get_db, get_read_db
from dependencies.auth import requires_any_role, get_current_user
from dependencies.access_control import admin_check_access_to_location

# Import models and schemas
import models
import schemas

# Import utilities
from utils.s3 import get_file

router = APIRouter()

@router.get("/locations/all", response_model=List[schemas.Location])
async def get_locations_for_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all locations - accessible by all users"""
    locations = db.query(models.Location).all()
    return locations

@router.get("/locations/{location_id}", response_model=schemas.Location)
async def get_location_for_user(
    location_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific location - accessible by all users"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@router.get("/locations/{location_id}/meeting_places", response_model=List[schemas.MeetingPlace])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_meeting_places_for_location(
    location_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all meeting places for a specific location"""
    # First, check if the user has access to the parent location
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        location_id=location_id,
        required_access_level=models.AccessLevel.READ  # Read access is sufficient to view meeting places
    )
    
    # Query meeting places with creator/updater info
    CreatorUser = aliased(models.User)
    UpdaterUser = aliased(models.User)
    
    results = (
        db.query(models.MeetingPlace, CreatorUser, UpdaterUser)
        .filter(models.MeetingPlace.location_id == location_id)
        .outerjoin(CreatorUser, models.MeetingPlace.created_by == CreatorUser.id)
        .outerjoin(UpdaterUser, models.MeetingPlace.updated_by == UpdaterUser.id)
        .order_by(models.MeetingPlace.name)
        .all()
    )
    
    # Process results to add user info
    meeting_places = []
    for mp, creator, updater in results:
        if creator:
            setattr(mp, "created_by_user", creator)
        if updater:
            setattr(mp, "updated_by_user", updater)
        meeting_places.append(mp)
        
    return meeting_places

@router.get("/locations/{location_id}/attachment")
async def get_location_attachment(
    location_id: int,
    db: Session = Depends(get_read_db)
):
    """Get a location's attachment - accessible to all users"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    if not location.attachment_path or not location.attachment_name:
        raise HTTPException(status_code=404, detail="Location has no attachment")
    
    try:
        file_data = get_file(location.attachment_path)
        
        # Determine content disposition based on file type
        content_disposition = 'attachment'
        # For PDFs and images, display inline in the browser
        if location.attachment_file_type in [
            'application/pdf', 
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/svg+xml'
        ]:
            content_disposition = 'inline'
        
        return StreamingResponse(
            io.BytesIO(file_data['file_data']),
            media_type=location.attachment_file_type,
            headers={
                'Content-Disposition': f'{content_disposition}; filename="{location.attachment_name}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve file: {str(e)}")

@router.get("/locations/{location_id}/thumbnail")
async def get_location_thumbnail(
    location_id: int,
    db: Session = Depends(get_read_db)
):
    """Get a location's attachment thumbnail - accessible to all users"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    if not location.attachment_thumbnail_path:
        raise HTTPException(status_code=404, detail="Location has no thumbnail")
    
    try:
        file_data = get_file(location.attachment_thumbnail_path)
        return StreamingResponse(
            io.BytesIO(file_data['file_data']),
            media_type=location.attachment_file_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve thumbnail: {str(e)}") 