from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import logging

# Import our dependencies
from dependencies.database import get_read_db
from dependencies.auth import requires_any_role, get_current_user
from dependencies.access_control import admin_get_country_list_for_access_level

# Import models and schemas
import models
import schemas

# Get logger
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/countries/enabled", response_model=List[schemas.CountryResponse])
async def get_enabled_countries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all enabled countries for dropdowns and selectors"""
    countries = db.query(models.Country).filter(models.Country.is_enabled == True).order_by(models.Country.name).all()
    return countries

@router.get("/countries/all", response_model=List[schemas.CountryResponse])
async def get_all_countries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all countries for dropdowns and selectors"""
    countries = db.query(models.Country).order_by(models.Country.name).all()
    return countries

@router.get("/admin/countries/enabled", response_model=List[schemas.CountryResponse])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_enabled_countries_admin(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all enabled countries for dropdowns and selectors with admin access control"""
    query = db.query(models.Country).filter(
        models.Country.is_enabled == True
    )

    # Get all countries
    if current_user.role != models.UserRole.ADMIN:
        countries = admin_get_country_list_for_access_level(
            db=db,
            current_user=current_user,
            required_access_level=models.AccessLevel.ADMIN
        )
        query = query.filter(
            models.Country.iso2_code.in_(countries)
        )

    # Get countries
    countries = query.order_by(models.Country.name).all()
    return countries 