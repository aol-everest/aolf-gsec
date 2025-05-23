from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm import aliased
from typing import List
import json

# Import our dependencies
from dependencies.database import get_db, get_read_db
from dependencies.auth import requires_any_role, get_current_user, get_current_user_for_write
from dependencies.access_control import admin_check_access_to_country, admin_get_country_list_for_access_level

# Import models and schemas
import models
import schemas

router = APIRouter()

@router.get("/all", response_model=List[schemas.UserAdminView])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all users with creator and updater information via joins, with access control restrictions"""

    # Create aliases for the User table for creator and updater
    CreatorUser = aliased(models.User)
    UpdaterUser = aliased(models.User)

    # Query users with joins 
    query = (
        db.query(models.User, CreatorUser, UpdaterUser)
        .outerjoin(CreatorUser, models.User.created_by == CreatorUser.id)
        .outerjoin(UpdaterUser, models.User.updated_by == UpdaterUser.id)
    )

    # ADMIN role has full access to all users
    if current_user.role != models.UserRole.ADMIN:
        # For SECRETARIAT, check if they have ADMIN access level
        user_access = db.query(models.UserAccess).filter(
            models.UserAccess.user_id == current_user.id,
            models.UserAccess.is_active == True,
            # For user management, admin access level is required
            models.UserAccess.access_level == models.AccessLevel.ADMIN,
            models.UserAccess.location_id == None,
        ).all()
        
        if not user_access:
            # If no valid access records with ADMIN level exist, return 403 Forbidden
            raise HTTPException(
                status_code=403, 
                detail="You need administrator access level to view users"
            )
        
        # Create country filters based on access permissions
        countries = set(access.country_code for access in user_access)

        # Add country filter
        query = query.filter(models.User.country_code.in_(countries))

    # Get all users
    users = query.all()
    
    # Process results to set created_by_user and updated_by_user attributes
    result_users = []
    for user, creator, updater in users:
        if creator:
            setattr(user, "created_by_user", creator)
        if updater:
            setattr(user, "updated_by_user", updater)
        result_users.append(user)
    
    return result_users

@router.post("/new", response_model=schemas.UserAdminView)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_user(
    user: schemas.UserAdminCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new user with access control restrictions"""
    admin_check_access_to_country(
        current_user=current_user,
        db=db,
        country_code=user.country_code,
        required_access_level=models.AccessLevel.ADMIN
    )
    
    try:
        user_role_enum = models.UserRole(user.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {user.role}")

    if current_user.role != models.UserRole.ADMIN:
        if user_role_enum.is_higher_than_or_equal_to(current_user.role):
            raise HTTPException(status_code=403, detail=f"You do not have permission to create a user with role {user.role}")

    # Create the user
    new_user = models.User(
        **user.dict(),
        created_by=current_user.id,
        updated_by=current_user.id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Set creator and updater user references (both are the current user for a new record)
    setattr(new_user, "created_by_user", current_user)
    setattr(new_user, "updated_by_user", current_user)
    
    return new_user

@router.patch("/update/{user_id}", response_model=schemas.UserAdminView)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_user(
    user_id: int,
    user_update: schemas.UserAdminUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update a user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    admin_check_access_to_country(
        current_user=current_user,
        db=db,
        country_code=user.country_code,
        required_access_level=models.AccessLevel.ADMIN
    )    
        
    if 'role' in user_update.dict(exclude_unset=True) and current_user.role != models.UserRole.ADMIN:
        if user_update.role.is_higher_than_or_equal_to(current_user.role) or user.role.is_higher_than_or_equal_to(current_user.role):
            raise HTTPException(status_code=403, detail="You do not have permission to change this user's role")

    # If trying to change country, check if they have access to the new country as well
    if 'country_code' in user_update.dict(exclude_unset=True):
        new_country = user_update.country_code
        if new_country != user.country_code:
            admin_check_access_to_country(
                current_user=current_user,
                db=db,
                country_code=new_country,
                required_access_level=models.AccessLevel.ADMIN
            )
    
    # Update user with new data
    update_data = user_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    user.updated_by = current_user.id
    
    db.commit()
    db.refresh(user)
    
    # Fetch creator and updater information
    if user.created_by:
        creator = db.query(models.User).filter(models.User.id == user.created_by).first()
        if creator:
            setattr(user, "created_by_user", creator)
    
    # For updater, we know it's the current user who just did the update
    setattr(user, "updated_by_user", current_user)
    
    return user

@router.get("/access/all", response_model=List[schemas.UserAccess])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_all_user_access(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all user access records"""
    user_access = db.query(models.UserAccess).all()
    return user_access

@router.get("/{user_id}/access/all", response_model=List[schemas.UserAccess])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_user_access_by_user(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get access records for a specific user"""
    user_access = db.query(models.UserAccess).filter(models.UserAccess.user_id == user_id).all()
    return user_access

@router.post("/{user_id}/access/new", response_model=schemas.UserAccess)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def create_user_access(
    user_id: int,
    user_access: schemas.UserAccessCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new user access record with role-based restrictions"""
    # Use the new method that enforces role-based restrictions
    new_access = models.UserAccess.create_with_role_enforcement(
        db=db,
        user_id=user_id,
        country_code=user_access.country_code,
        location_id=user_access.location_id,
        access_level=user_access.access_level,
        entity_type=user_access.entity_type,
        expiry_date=user_access.expiry_date,
        reason=user_access.reason,
        is_active=user_access.is_active,
        created_by=current_user.id
    )
    
    db.commit()
    db.refresh(new_access)
    return new_access

@router.patch("/{user_id}/access/update/{access_id}", response_model=schemas.UserAccess)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def update_user_access(
    user_id: int,
    access_id: int,
    user_access_update: schemas.UserAccessUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update a user access record with role-based restrictions"""
    access = db.query(models.UserAccess).filter(models.UserAccess.id == access_id, models.UserAccess.user_id == user_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="User access record not found")
    
    # Use the new method that enforces role-based restrictions
    update_data = user_access_update.dict(exclude_unset=True)
    models.UserAccess.update_with_role_enforcement(
        db=db,
        access_record=access,
        update_data=update_data,
        updated_by=current_user.id
    )
    
    db.commit()
    db.refresh(access)
    return access

@router.delete("/{user_id}/access/{access_id}", status_code=204)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def delete_user_access(
    user_id: int,
    access_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Delete a user access record"""
    access = db.query(models.UserAccess).filter(models.UserAccess.id == access_id, models.UserAccess.user_id == user_id).first()
    if not access:
        raise HTTPException(status_code=404, detail="User access record not found")
    
    # Log access deletion in audit trail
    audit_log = models.AuditLog(
        user_id=current_user.id,
        entity_type="user_access",
        entity_id=access_id,
        action="delete",
        previous_state={
            "user_id": access.user_id,
            "country_code": access.country_code,
            "location_id": access.location_id,
            "access_level": str(access.access_level),
            "entity_type": str(access.entity_type),
            "expiry_date": access.expiry_date.isoformat() if access.expiry_date else None,
            "reason": access.reason,
            "is_active": access.is_active
        },
        new_state=None
    )
    db.add(audit_log)
    
    db.delete(access)
    db.commit()
    
    return None

@router.get("/{user_id}/access/summary", response_model=schemas.UserAccessSummary)
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_user_access_summary(
    user_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a summary of access for a specific user"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    access_records = db.query(models.UserAccess).filter(
        models.UserAccess.user_id == user_id,
        models.UserAccess.is_active == True
    ).all()
    
    countries = set()
    locations = set()
    entity_types = set()
    max_access_level = None
    
    for access in access_records:
        countries.add(access.country_code)
        if access.location_id:
            locations.add(access.location_id)
        entity_types.add(str(access.entity_type))
        
        # Determine highest access level (ADMIN > READ_WRITE > READ)
        if max_access_level is None:
            max_access_level = access.access_level
        elif access.access_level == models.AccessLevel.ADMIN:
            max_access_level = models.AccessLevel.ADMIN
        elif access.access_level == models.AccessLevel.READ_WRITE and max_access_level != models.AccessLevel.ADMIN:
            max_access_level = models.AccessLevel.READ_WRITE
    
    return {
        "user_id": user_id,
        "user_email": user.email,
        "user_name": f"{user.first_name} {user.last_name}",
        "countries": list(countries),
        "location_count": len(locations),
        "entity_types": list(entity_types),
        "max_access_level": str(max_access_level) if max_access_level else None,
        "access_count": len(access_records)
    } 