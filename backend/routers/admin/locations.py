from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session, aliased, joinedload
from typing import List
from datetime import datetime

# Import our dependencies
from dependencies.database import get_db, get_read_db
from dependencies.auth import requires_any_role, get_current_user, get_current_user_for_write
from dependencies.access_control import (
    admin_check_access_to_country,
    admin_check_access_to_location,
    admin_get_country_list_for_access_level
)

# Import models and schemas
import models
import schemas

# Import utilities
from utils.s3 import upload_file

router = APIRouter()

@router.post("/new", response_model=schemas.LocationAdmin)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_location(
    location: schemas.LocationAdminCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new location"""
    # Check if the user has access to the country
    admin_check_access_to_country(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        required_access_level=models.AccessLevel.ADMIN
    )

    new_location = models.Location(
        **location.dict(),
        created_by=current_user.id
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    
    # Set creator user reference (it's the current user for a new record)
    setattr(new_location, "created_by_user", current_user)
    
    return new_location

@router.get("/all", response_model=List[schemas.LocationAdmin])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_locations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all locations with creator and updater information.
    
    Note: Admin endpoints intentionally show ALL locations including disabled ones (is_active=False).
    This allows administrators to manage location status and view complete location data.
    """

    # Create aliases for the User table for creator and updater
    CreatorUser = aliased(models.User)
    UpdaterUser = aliased(models.User)
    
    query = (
        db.query(models.Location, CreatorUser, UpdaterUser)
        .outerjoin(CreatorUser, models.Location.created_by == CreatorUser.id)
        .outerjoin(UpdaterUser, models.Location.updated_by == UpdaterUser.id)
    )

    if current_user.role != models.UserRole.ADMIN:
        # Get the list of countries for the current user
        countries = admin_get_country_list_for_access_level(
            current_user=current_user,
            db=db,
            required_access_level=models.AccessLevel.READ
        )
        query = query.filter(models.Location.country_code.in_(countries))

    # Query locations with joins to get creator and updater information in one go
    locations = query.all()
    
    # Process results to set created_by_user and updated_by_user attributes
    result_locations = []
    for location, creator, updater in locations:
        if creator:
            setattr(location, "created_by_user", creator)
        if updater:
            setattr(location, "updated_by_user", updater)
        result_locations.append(location)
    
    return result_locations

@router.get("/{location_id}", response_model=schemas.LocationAdmin)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_location(
    location_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific location with creator and updater information.
    
    Note: Admin endpoints show all locations regardless of is_active status.
    """
    # Create aliases for the User table for creator and updater
    CreatorUser = aliased(models.User)
    UpdaterUser = aliased(models.User)

    # Query location with joins to get creator and updater information
    result = (
        db.query(models.Location, CreatorUser, UpdaterUser)
        .filter(models.Location.id == location_id)
        .outerjoin(CreatorUser, models.Location.created_by == CreatorUser.id)
        .outerjoin(UpdaterUser, models.Location.updated_by == UpdaterUser.id)
        .first()
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")

    location, creator, updater = result
    
    # Check if the user has access to the location
    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        location_id=location_id,
        required_access_level=models.AccessLevel.READ
    )

    if creator:
        setattr(location, "created_by_user", creator)
    if updater:
        setattr(location, "updated_by_user", updater)
    
    return location

@router.get("/{location_id}/meeting_places", response_model=List[schemas.MeetingPlace])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_meeting_places_for_location(
    location_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all meeting places for a specific location.
    
    Note: Admin endpoints show meeting places for all locations including disabled ones.
    """
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

@router.patch("/update/{location_id}", response_model=schemas.LocationAdmin)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_location(
    location_id: int,
    location_update: schemas.LocationAdminUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update a location"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Check if the user has access to the location
    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        location_id=location_id,
        required_access_level=models.AccessLevel.ADMIN
    )

    update_data = location_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(location, key, value)
    location.updated_by = current_user.id
    
    db.commit()
    db.refresh(location)
    
    # Fetch creator information
    if location.created_by:
        creator = db.query(models.User).filter(models.User.id == location.created_by).first()
        if creator:
            setattr(location, "created_by_user", creator)
    
    # For updater, we know it's the current user who just did the update
    setattr(location, "updated_by_user", current_user)
    
    return location

@router.post("/{location_id}/attachment", response_model=schemas.LocationAdmin)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def upload_location_attachment(
    location_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Upload an attachment for a location"""
    # Check if location exists
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Check if the user has access to the location
    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        location_id=location_id,
        required_access_level=models.AccessLevel.ADMIN
    )

    try:
        # Read file content
        file_content = await file.read()
        
        # Upload to S3
        result = upload_file(
            file_data=file_content,
            file_name=f"{location_id}/{file.filename}",
            content_type=file.content_type,
            entity_type="locations"
        )
        
        # Update location with attachment info
        location.attachment_path = result['s3_path']
        location.attachment_name = file.filename
        location.attachment_file_type = file.content_type
        # Store thumbnail path if available
        if 'thumbnail_path' in result:
            location.attachment_thumbnail_path = result['thumbnail_path']
        location.updated_by = current_user.id
        
        db.commit()
        db.refresh(location)
        
        return location
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.delete("/{location_id}/attachment", response_model=schemas.LocationAdmin)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def remove_location_attachment(
    location_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Remove an attachment from a location"""
    # Retrieve location for the given ID
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Check if the user has access to the location
    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        location_id=location_id,
        required_access_level=models.AccessLevel.ADMIN
    )

    # Clear attachment fields
    location.attachment_path = None
    location.attachment_name = None
    location.attachment_file_type = None
    location.attachment_thumbnail_path = None
    location.updated_by = current_user.id
    
    db.commit()
    db.refresh(location)
    return location

@router.post("/{location_id}/meeting_places/new", response_model=schemas.MeetingPlace)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_meeting_place(
    location_id: int,
    meeting_place: schemas.MeetingPlaceCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new meeting place within a location"""
    # Check if location exists
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Check if the user has access to the location (needs ADMIN level to create sub-locations)
    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=location.country_code,
        location_id=location_id,
        required_access_level=models.AccessLevel.ADMIN  # Creating sub-locations requires ADMIN access
    )

    new_meeting_place = models.MeetingPlace(
        **meeting_place.dict(),
        location_id=location_id,
        created_by=current_user.id
    )
    db.add(new_meeting_place)
    db.commit()
    db.refresh(new_meeting_place)
    
    # Set creator user reference (it's the current user for a new record)
    setattr(new_meeting_place, "created_by_user", current_user)
    
    return new_meeting_place

@router.patch("/meeting_places/update/{meeting_place_id}", response_model=schemas.MeetingPlace)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_meeting_place(
    meeting_place_id: int,
    meeting_place_update: schemas.MeetingPlaceUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update a meeting place"""
    # Query the MeetingPlace and join Location to get country_code
    meeting_place = (
        db.query(models.MeetingPlace)
        .options(joinedload(models.MeetingPlace.location))
        .filter(models.MeetingPlace.id == meeting_place_id)
        .first()
    )
    
    if not meeting_place:
        raise HTTPException(status_code=404, detail="Meeting place not found")
    
    if not meeting_place.location:
        # This should ideally not happen due to FK constraint, but good to check
        raise HTTPException(status_code=500, detail="Meeting place is not linked to a valid location")

    # Check if the user has access to the parent location (needs ADMIN level to update sub-locations)
    admin_check_access_to_location(
        current_user=current_user,
        db=db,
        country_code=meeting_place.location.country_code,
        location_id=meeting_place.location_id,
        required_access_level=models.AccessLevel.ADMIN  # Updating sub-locations requires ADMIN access
    )

    update_data = meeting_place_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(meeting_place, key, value)
    meeting_place.updated_by = current_user.id
    meeting_place.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(meeting_place)
    
    # Fetch creator information if it exists
    if meeting_place.created_by:
        creator = db.query(models.User).filter(models.User.id == meeting_place.created_by).first()
        if creator:
            setattr(meeting_place, "created_by_user", creator)
    
    # Set the updater user (it's the current user)
    setattr(meeting_place, "updated_by_user", current_user)
    
    return meeting_place 