from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, desc
from typing import List, Optional
from datetime import datetime
import logging
import math

# Import our dependencies
from dependencies.database import get_db, get_read_db
from dependencies.auth import get_current_user, get_current_user_for_write

# Import models and schemas
import models
import schemas
from models.enums import PersonRelationshipType

# Get logger
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/contacts/", response_model=schemas.UserContactResponse)
async def create_contact(
    contact: schemas.UserContactCreate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Create a new contact for the current user"""
    start_time = datetime.utcnow()
    logger.info(f"Creating new contact for user {current_user.email} (ID: {current_user.id})")
    logger.debug(f"Contact data: {contact.dict()}")
    
    try:
        # Check for duplicate email if email is provided
        if contact.email:
            existing_contact = db.query(models.UserContact).filter(
                models.UserContact.owner_user_id == current_user.id,
                models.UserContact.email == contact.email
            ).first()
            
            if existing_contact:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Contact with email '{contact.email}' already exists"
                )
        
        # Create the contact
        db_contact = models.UserContact(
            owner_user_id=current_user.id,
            contact_user_id=contact.contact_user_id,
            first_name=contact.first_name,
            last_name=contact.last_name,
            email=contact.email,
            phone=contact.phone,
            relationship_to_owner=contact.relationship_to_owner,
            notes=contact.notes,
            created_by=current_user.id,
            updated_by=current_user.id
        )
        
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)
        
        # Calculate total operation time
        total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info(f"Contact created successfully (ID: {db_contact.id}) in {total_time:.2f}ms")
        
        # Return the created contact with relationships loaded
        db_contact = db.query(models.UserContact).options(
            joinedload(models.UserContact.contact_user)
        ).filter(models.UserContact.id == db_contact.id).first()
        
        return db_contact
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating contact: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create contact")


@router.get("/contacts/", response_model=schemas.UserContactListResponse)
async def list_contacts(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("usage", description="Sort by: usage, recent, name, created"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    relationship: Optional[str] = Query(None, description="Filter by relationship type")
):
    """Get all contacts for the current user with sorting and filtering options"""
    logger.info(f"Fetching contacts for user {current_user.email} (page: {page}, per_page: {per_page}, sort: {sort_by})")
    
    try:
        # Build base query
        query = db.query(models.UserContact).filter(
            models.UserContact.owner_user_id == current_user.id
        ).options(
            joinedload(models.UserContact.contact_user)
        )
        
        # Apply search filter
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    func.concat(models.UserContact.first_name, ' ', models.UserContact.last_name).ilike(search_term),
                    models.UserContact.email.ilike(search_term)
                )
            )
        
        # Apply relationship filter
        if relationship:
            try:
                relationship_enum = PersonRelationshipType(relationship)
                query = query.filter(models.UserContact.relationship_to_owner == relationship_enum)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid relationship type: {relationship}")
        
        # Apply sorting
        if sort_by == "usage":
            # Sort by appointment usage count (descending), then by last_used_at (descending)
            query = query.order_by(
                desc(models.UserContact.appointment_usage_count),
                desc(models.UserContact.last_used_at),
                models.UserContact.first_name
            )
        elif sort_by == "recent":
            # Sort by last_used_at (descending), then by created_at (descending)
            query = query.order_by(
                desc(models.UserContact.last_used_at),
                desc(models.UserContact.created_at)
            )
        elif sort_by == "name":
            # Sort alphabetically by first name, then last name
            query = query.order_by(
                models.UserContact.first_name,
                models.UserContact.last_name
            )
        elif sort_by == "created":
            # Sort by creation date (most recent first)
            query = query.order_by(desc(models.UserContact.created_at))
        else:
            # Default to usage sort
            query = query.order_by(
                desc(models.UserContact.appointment_usage_count),
                desc(models.UserContact.last_used_at),
                models.UserContact.first_name
            )
        
        # Get total count for pagination
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        contacts = query.offset(offset).limit(per_page).all()
        
        # Calculate pagination metadata
        total_pages = math.ceil(total / per_page)
        has_next = page < total_pages
        has_prev = page > 1
        
        logger.info(f"Retrieved {len(contacts)} contacts (total: {total}) for user {current_user.id}")
        
        return schemas.UserContactListResponse(
            contacts=contacts,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
            has_next=has_next,
            has_prev=has_prev
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching contacts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch contacts")


@router.get("/contacts/{contact_id}", response_model=schemas.UserContactResponse)
async def get_contact(
    contact_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db)
):
    """Get a specific contact by ID"""
    logger.info(f"Fetching contact {contact_id} for user {current_user.email}")
    
    try:
        contact = db.query(models.UserContact).options(
            joinedload(models.UserContact.contact_user)
        ).filter(
            models.UserContact.id == contact_id,
            models.UserContact.owner_user_id == current_user.id
        ).first()
        
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        return contact
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching contact {contact_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch contact")


@router.put("/contacts/{contact_id}", response_model=schemas.UserContactResponse)
async def update_contact(
    contact_id: int,
    contact_update: schemas.UserContactUpdate,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Update a specific contact"""
    start_time = datetime.utcnow()
    logger.info(f"Updating contact {contact_id} for user {current_user.email}")
    logger.debug(f"Update data: {contact_update.dict(exclude_unset=True)}")
    
    try:
        # Find the contact
        contact = db.query(models.UserContact).filter(
            models.UserContact.id == contact_id,
            models.UserContact.owner_user_id == current_user.id
        ).first()
        
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        # Check for duplicate email if email is being updated
        if contact_update.email and contact_update.email != contact.email:
            existing_contact = db.query(models.UserContact).filter(
                models.UserContact.owner_user_id == current_user.id,
                models.UserContact.email == contact_update.email,
                models.UserContact.id != contact_id
            ).first()
            
            if existing_contact:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Contact with email '{contact_update.email}' already exists"
                )
        
        # Update the contact with provided fields
        update_data = contact_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(contact, field, value)
        
        contact.updated_by = current_user.id
        contact.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(contact)
        
        # Calculate total operation time
        total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info(f"Contact {contact_id} updated successfully in {total_time:.2f}ms")
        
        # Return the updated contact with relationships loaded
        contact = db.query(models.UserContact).options(
            joinedload(models.UserContact.contact_user)
        ).filter(models.UserContact.id == contact_id).first()
        
        return contact
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating contact {contact_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update contact")


@router.delete("/contacts/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Delete a specific contact"""
    start_time = datetime.utcnow()
    logger.info(f"Deleting contact {contact_id} for user {current_user.email}")
    
    try:
        # Find the contact
        contact = db.query(models.UserContact).filter(
            models.UserContact.id == contact_id,
            models.UserContact.owner_user_id == current_user.id
        ).first()
        
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        # Check if contact is being used in any appointments
        appointment_contacts_count = db.query(models.AppointmentContact).filter(
            models.AppointmentContact.contact_id == contact_id
        ).count()
        
        if appointment_contacts_count > 0:
            raise HTTPException(
                status_code=409, 
                detail=f"Cannot delete contact. It is being used in {appointment_contacts_count} appointment(s). Please remove it from appointments first."
            )
        
        # Delete the contact
        db.delete(contact)
        db.commit()
        
        # Calculate total operation time
        total_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        logger.info(f"Contact {contact_id} deleted successfully in {total_time:.2f}ms")
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting contact {contact_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete contact")


@router.get("/contacts/search/", response_model=schemas.UserContactSearchResponse)
async def search_contacts(
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results")
):
    """Search contacts by name or email for autocomplete/quick selection"""
    logger.info(f"Searching contacts for user {current_user.email} with query: '{q}'")
    
    try:
        search_term = f"%{q.strip()}%"
        
        contacts = db.query(models.UserContact).filter(
            models.UserContact.owner_user_id == current_user.id,
            or_(
                func.concat(models.UserContact.first_name, ' ', models.UserContact.last_name).ilike(search_term),
                models.UserContact.email.ilike(search_term)
            )
        ).options(
            joinedload(models.UserContact.contact_user)
        ).order_by(
            # Sort by usage count first, then alphabetically
            desc(models.UserContact.appointment_usage_count),
            models.UserContact.first_name
        ).limit(limit).all()
        
        logger.info(f"Found {len(contacts)} contacts matching search query")
        
        return schemas.UserContactSearchResponse(
            contacts=contacts,
            total_results=len(contacts),
            search_query=q
        )
        
    except Exception as e:
        logger.error(f"Error searching contacts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to search contacts")


@router.get("/contacts/frequent/", response_model=List[schemas.UserContactResponse])
async def get_frequent_contacts(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_read_db),
    limit: int = Query(10, ge=1, le=20, description="Number of frequent contacts to return")
):
    """Get the most frequently used contacts for quick access"""
    logger.info(f"Fetching {limit} frequent contacts for user {current_user.email}")
    
    try:
        contacts = db.query(models.UserContact).filter(
            models.UserContact.owner_user_id == current_user.id,
            models.UserContact.appointment_usage_count > 0
        ).options(
            joinedload(models.UserContact.contact_user)
        ).order_by(
            desc(models.UserContact.appointment_usage_count),
            desc(models.UserContact.last_used_at)
        ).limit(limit).all()
        
        logger.info(f"Retrieved {len(contacts)} frequent contacts")
        return contacts
        
    except Exception as e:
        logger.error(f"Error fetching frequent contacts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch frequent contacts") 