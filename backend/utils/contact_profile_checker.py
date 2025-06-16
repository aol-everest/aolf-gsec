from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging

from models.user import User
from models.userContact import UserContact
from models.appointment import Appointment
from utils.profile_validation import (
    is_profile_complete, 
    get_missing_fields, 
    user_to_dict, 
    get_missing_fields_display_names
)
from utils.email_notifications import send_profile_completion_email

logger = logging.getLogger(__name__)

def check_and_notify_contact_profiles(
    db: Session, 
    appointment: Appointment, 
    contact_ids: List[int]
) -> None:
    """Check contact emails for existing users and send profile completion notifications.
    
    This function:
    1. Gets contact email addresses from contact IDs
    2. Checks if users exist with those emails (case-insensitive)
    3. For existing users, checks if their profile is complete
    4. Sends appropriate emails based on user status and profile completeness
    
    Args:
        db: Database session
        appointment: The created appointment
        contact_ids: List of contact IDs to check
    """
    try:
        logger.info(f"Checking profile completion for {len(contact_ids)} contacts in appointment {appointment.id}")
        
        # Get contact information from contact IDs
        contacts = db.query(UserContact).filter(
            UserContact.id.in_(contact_ids),
            UserContact.email.isnot(None),
            UserContact.email != ''
        ).all()
        
        if not contacts:
            logger.info("No contacts with email addresses found")
            return
        
        # Prepare appointment context information
        appointment_date = None
        if appointment.preferred_date:
            appointment_date = appointment.preferred_date
        elif appointment.preferred_start_date:
            if appointment.preferred_end_date and appointment.preferred_start_date != appointment.preferred_end_date:
                appointment_date = f"{appointment.preferred_start_date} - {appointment.preferred_end_date}"
            else:
                appointment_date = appointment.preferred_start_date
        
        appointment_location = None
        if appointment.location:
            appointment_location = f"{appointment.location.name} - {appointment.location.city}, {appointment.location.state}"
        
        requester_name = f"{appointment.requester.first_name} {appointment.requester.last_name}".strip()
        
        # Process each contact
        for contact in contacts:
            try:
                contact_email = contact.email.strip().lower()
                contact_name = f"{contact.first_name} {contact.last_name}".strip()
                
                logger.info(f"Processing contact: {contact_name} ({contact_email})")
                
                # Check if a user exists with this email (case-insensitive)
                existing_user = db.query(User).filter(
                    func.lower(User.email) == contact_email
                ).first()
                
                if existing_user:
                    # User exists - check if profile is complete
                    logger.info(f"Found existing user for {contact_email}")
                    
                    user_data = user_to_dict(existing_user)
                    
                    if not is_profile_complete(user_data):
                        # Profile is incomplete - send completion reminder
                        missing_fields = get_missing_fields(user_data)
                        missing_fields_display = get_missing_fields_display_names(missing_fields)
                        
                        logger.info(f"User {contact_email} has incomplete profile. Missing fields: {missing_fields}")
                        
                        send_profile_completion_email(
                            db=db,
                            email=contact.email,  # Use original email case from contact
                            contact_name=existing_user.first_name or contact_name,
                            appointment_id=appointment.id,
                            requester_name=requester_name,
                            appointment_date=appointment_date,
                            appointment_location=appointment_location,
                            missing_fields=missing_fields_display,
                            is_new_user=False
                        )
                    else:
                        logger.info(f"User {contact_email} has complete profile - no email needed")
                else:
                    # No user exists - send account creation invitation
                    logger.info(f"No user found for {contact_email} - sending account creation email")
                    
                    send_profile_completion_email(
                        db=db,
                        email=contact.email,  # Use original email case from contact
                        contact_name=contact_name,
                        appointment_id=appointment.id,
                        requester_name=requester_name,
                        appointment_date=appointment_date,
                        appointment_location=appointment_location,
                        missing_fields=None,
                        is_new_user=True
                    )
                    
            except Exception as e:
                logger.error(f"Error processing contact {contact.id} ({contact.email}): {str(e)}", exc_info=True)
                continue
        
        logger.info(f"Completed profile checking for appointment {appointment.id}")
        
    except Exception as e:
        logger.error(f"Error in check_and_notify_contact_profiles for appointment {appointment.id}: {str(e)}", exc_info=True) 