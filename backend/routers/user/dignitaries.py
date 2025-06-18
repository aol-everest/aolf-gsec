from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
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

@router.post("/dignitaries/new", response_model=schemas.Dignitary)
async def new_dignitary(
    dignitary: schemas.DignitaryCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    # Extract poc_relationship_type and create dignitary without it
    poc_relationship_type = dignitary.poc_relationship_type
    dignitary_data = dignitary.dict(exclude={'poc_relationship_type'})
    
    # Create new dignitary
    new_dignitary = models.Dignitary(
        **dignitary_data,
        created_by=current_user.id
    )
    db.add(new_dignitary)
    db.commit()
    db.refresh(new_dignitary)

    # Create dignitary point of contact with the relationship type
    poc = models.DignitaryPointOfContact(
        dignitary_id=new_dignitary.id,
        poc_id=current_user.id,
        relationship_type=poc_relationship_type,
        created_by=current_user.id
    ) 
    db.add(poc)
    db.commit()
    db.refresh(poc)

    # Add the poc_relationship_type to the response
    new_dignitary.poc_relationship_type = poc_relationship_type

    return new_dignitary

@router.patch("/dignitaries/update/{dignitary_id}", response_model=schemas.Dignitary)
async def update_dignitary(
    dignitary_id: int,
    dignitary: schemas.DignitaryUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    # Log the incoming request data
    logger.info(f"Updating dignitary {dignitary_id} with data: {dignitary.dict()}")
    
    # Check if dignitary exists
    existing_dignitary = db.query(models.Dignitary).filter(models.Dignitary.id == dignitary_id).first()
    if not existing_dignitary:
        logger.error(f"Dignitary with ID {dignitary_id} not found")
        raise HTTPException(status_code=404, detail="Dignitary not found")
    
    # Extract poc_relationship_type and create dignitary without it
    poc_relationship_type = dignitary.poc_relationship_type
    try:
        dignitary_data = dignitary.dict(exclude={'poc_relationship_type'}, exclude_unset=True)
        logger.debug(f"Processed dignitary data for update: {dignitary_data}")
    except Exception as e:
        logger.error(f"Error processing dignitary data: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Error processing dignitary data: {str(e)}")

    # Update dignitary  
    try:
        for key, value in dignitary_data.items():
            setattr(existing_dignitary, key, value)
        db.commit()
        db.refresh(existing_dignitary)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating dignitary: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Error updating dignitary: {str(e)}")

    # Update POC relationship
    try:
        poc = db.query(models.DignitaryPointOfContact).filter(
            models.DignitaryPointOfContact.dignitary_id == dignitary_id, 
            models.DignitaryPointOfContact.poc_id == current_user.id
        ).first()
        if poc and poc_relationship_type and poc_relationship_type != poc.relationship_type:
            logger.info(f"Updating POC relationship type from {poc.relationship_type} to {poc_relationship_type}")
            poc.relationship_type = poc_relationship_type
            db.commit()
            db.refresh(poc)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating POC relationship: {str(e)}")
        raise HTTPException(status_code=422, detail=f"Error updating POC relationship: {str(e)}")

    # Add the poc_relationship_type to the response
    if poc_relationship_type:
        existing_dignitary.poc_relationship_type = poc_relationship_type
    
    logger.info(f"Successfully updated dignitary {dignitary_id}")
    return existing_dignitary

@router.get("/dignitaries/assigned", response_model=List[schemas.DignitaryWithRelationship])
async def get_assigned_dignitaries(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get all dignitaries assigned to the current user as POC with their relationship type"""
    # Query dignitaries and their relationship types in one go
    results = (
        db.query(
            models.Dignitary, 
            models.DignitaryPointOfContact.relationship_type
        )
        .join(models.DignitaryPointOfContact)
        .filter(models.DignitaryPointOfContact.poc_id == current_user.id)
        .all()
    )
    
    # Transform the results to include the relationship type
    dignitaries_with_relationship = []
    for dignitary, relationship_type in results:
        # Add the relationship_type attribute to the dignitary object
        # This will be picked up by Pydantic's ORM mode
        setattr(dignitary, 'relationship_type', relationship_type.value)
        dignitaries_with_relationship.append(dignitary)
    
    return dignitaries_with_relationship 