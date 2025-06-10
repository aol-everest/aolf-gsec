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

@router.get("/countries/enabled", response_model=List[schemas.GeoCountryResponse])
async def get_enabled_countries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all enabled countries for dropdowns and selectors"""
    countries = db.query(models.GeoCountry).filter(models.GeoCountry.is_enabled == True).order_by(models.GeoCountry.name).all()
    return countries

@router.get("/countries/all", response_model=List[schemas.GeoCountryResponse])
async def get_all_countries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all countries for dropdowns and selectors"""
    countries = db.query(models.GeoCountry).order_by(models.GeoCountry.name).all()
    return countries

@router.get("/admin/countries/enabled", response_model=List[schemas.GeoCountryResponse])
@requires_any_role([models.UserRole.SECRETARIAT, models.UserRole.ADMIN])
async def get_enabled_countries_admin(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all enabled countries for dropdowns and selectors with admin access control"""
    query = db.query(models.GeoCountry).filter(
        models.GeoCountry.is_enabled == True
    )

    # Get all countries
    if current_user.role != models.UserRole.ADMIN:
        countries = admin_get_country_list_for_access_level(
            db=db,
            current_user=current_user,
            required_access_level=models.AccessLevel.ADMIN
        )
        query = query.filter(
            models.GeoCountry.iso2_code.in_(countries)
        )

    # Get countries
    countries = query.order_by(models.GeoCountry.name).all()
    return countries

# Subdivision endpoints
@router.get("/subdivisions/enabled", response_model=List[schemas.GeoSubdivisionResponse])
async def get_enabled_subdivisions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all enabled subdivisions for dropdowns and selectors"""
    subdivisions = db.query(models.GeoSubdivision).filter(models.GeoSubdivision.is_enabled == True).order_by(models.GeoSubdivision.name).all()
    return subdivisions

@router.get("/subdivisions/country/{country_code}", response_model=List[schemas.GeoSubdivisionResponse])
async def get_subdivisions_by_country(
    country_code: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all enabled subdivisions for a specific country"""
    subdivisions = db.query(models.GeoSubdivision).filter(
        models.GeoSubdivision.country_code == country_code,
        models.GeoSubdivision.is_enabled == True
    ).order_by(models.GeoSubdivision.name).all()
    return subdivisions

@router.get("/subdivisions/all", response_model=List[schemas.GeoSubdivisionResponse])
async def get_all_subdivisions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all subdivisions (including disabled) for admin purposes"""
    subdivisions = db.query(models.GeoSubdivision).order_by(models.GeoSubdivision.country_code, models.GeoSubdivision.name).all()
    return subdivisions


# Request Type Configuration endpoints  
@router.get("/request-types/configurations", response_model=List[schemas.RequestTypeConfigResponse])
async def get_request_type_configurations(
    current_user: models.User = Depends(get_current_user)
):
    """Get request type configurations for UI display"""
    from models.enums import REQUEST_TYPE_CONFIGS
    
    # Convert configurations to response format
    configurations = []
    for config in REQUEST_TYPE_CONFIGS.values():
        configurations.append(schemas.RequestTypeConfigResponse(
            request_type=config.request_type,
            display_name=config.display_name,
            description=config.description,
            attendee_type=config.attendee_type.value,
            max_attendees=config.max_attendees,
            attendee_label_singular=config.attendee_label_singular,
            attendee_label_plural=config.attendee_label_plural,
            step_2_title=config.step_2_title,
            step_2_description=config.step_2_description
        ))
    
    return configurations

@router.get("/calendar/event-status-options-map")
async def get_event_status_options_map(
    current_user: models.User = Depends(get_current_user)
):
    """Get event status options as a map for frontend use"""
    from models.enums import EventStatus
    
    status_map = {}
    for status in EventStatus:
        # Use enum name as key and enum value as value
        status_map[status.name] = status.value
    
    return status_map 