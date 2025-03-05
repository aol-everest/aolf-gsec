from typing import List, Dict, Any
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from datetime import datetime
import os
from sqlalchemy.orm import Session
from models.user import User, UserRole
from models.appointment import Appointment
from schemas import AppointmentAdminUpdate
from utils.utils import str_to_bool
from models.dignitary import Dignitary

SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
FROM_EMAIL = os.getenv('FROM_EMAIL', 'noreply@aolf-gsec.org')
ENABLE_EMAIL = str_to_bool(os.getenv('ENABLE_EMAIL'))

def send_email(to_email: str, subject: str, content: str):
    """Helper function to send an email using SendGrid."""
    if not ENABLE_EMAIL:
        print("Warning: Email notifications are disabled. Email not sent.")
        return

    if not SENDGRID_API_KEY:
        print("Warning: SENDGRID_API_KEY not set. Email not sent.")
        return

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        html_content=content
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"Email sent to {to_email}. Status: {response.status_code}")
    except Exception as e:
        print(f"Error sending email: {str(e)}")

def get_appointment_summary(appointment: Appointment) -> str:
    """Generate a summary of the appointment for email notifications."""
    
    # Handle multiple dignitaries
    dignitaries_info = ""
    if appointment.appointment_dignitaries:
        dignitaries_list = []
        for app_dignitary in appointment.appointment_dignitaries:
            dignitary = app_dignitary.dignitary
            dignitaries_list.append(f"{dignitary.honorific_title} {dignitary.first_name} {dignitary.last_name}")
        
        if dignitaries_list:
            dignitaries_info = ", ".join(dignitaries_list)
    # Fallback to legacy dignitary relationship if no dignitaries in the new relationship
    elif appointment.dignitary:
        dignitaries_info = f"{appointment.dignitary.honorific_title} {appointment.dignitary.first_name} {appointment.dignitary.last_name}"
    else:
        dignitaries_info = "No dignitaries assigned"
    
    return f"""
        <h3>Appointment Request Summary</h3>
        <p><strong>Request ID:</strong> {appointment.id}</p>
        <p><strong>Dignitary/Dignitaries:</strong> {dignitaries_info}</p>
        <p><strong>Purpose:</strong> {appointment.purpose}</p>
        <p><strong>Preferred Date:</strong> {appointment.preferred_date}</p>
        <p><strong>Preferred Time:</strong> {appointment.preferred_time_of_day or 'Not specified'}</p>
        <p><strong>Location:</strong> {appointment.location.name + ' - ' + appointment.location.city + ', ' + appointment.location.state if appointment.location else 'Not specified'}</p>
        <p><strong>Status:</strong> {appointment.status}</p>
        <p><strong>Requester Notes:</strong> {appointment.requester_notes_to_secretariat}</p>
    """

def get_appointment_changes_summary(old_data: Dict[str, Any], new_data: Dict[str, Any]) -> str:
    """Generate a summary of changes made to an appointment."""
    changes = []
    fields_to_check = [
        ('status', 'Status'),
        ('appointment_date', 'Appointment Date'),
        ('appointment_time', 'Appointment Time'),
        ('location', 'Location'),
        ('secretariat_meeting_notes', 'Meeting Notes'),
        ('secretariat_follow_up_actions', 'Follow-up Actions'),
        ('secretariat_notes_to_requester', 'Secretariat Comments'),
        ('dignitaries', 'Dignitaries')
    ]

    for field, display_name in fields_to_check:
        old_value = old_data.get(field)
        new_value = new_data.get(field)
        
        # Special handling for dignitaries which might be a list
        if field == 'dignitaries':
            if old_value != new_value and new_value is not None:
                # Convert to sets of dignitary IDs for easy comparison if they're lists
                if isinstance(old_value, list) and isinstance(new_value, list):
                    old_ids = set(d.get('id') for d in old_value if d.get('id'))
                    new_ids = set(d.get('id') for d in new_value if d.get('id'))
                    
                    if old_ids != new_ids:
                        old_names = ", ".join(f"{d.get('honorific_title', '')} {d.get('first_name', '')} {d.get('last_name', '')}" 
                                             for d in old_value) or "None"
                        new_names = ", ".join(f"{d.get('honorific_title', '')} {d.get('first_name', '')} {d.get('last_name', '')}" 
                                             for d in new_value) or "None"
                        changes.append(f"<p><strong>{display_name}:</strong> Changed from '{old_names}' to '{new_names}'</p>")
                else:
                    changes.append(f"<p><strong>{display_name}:</strong> Changed</p>")
            continue
            
        # Regular field comparison for non-dignitary fields
        if old_value != new_value and new_value is not None:
            changes.append(f"<p><strong>{display_name}:</strong> Changed from '{old_value or 'Not set'}' to '{new_value}'</p>")

    if not changes:
        return "<p>No significant changes were made to the appointment details.</p>"

    return "<h3>Changes Made:</h3>" + "".join(changes)

def notify_appointment_creation(db: Session, appointment: Appointment):
    """Send notifications when a new appointment is created."""
    # Notify the requesting user if they have enabled notifications
    requester = appointment.requester
    if requester.email_notification_preferences.get('appointment_created', True):
        subject = f"Appointment Request Created - ID: {appointment.id}"
        content = f"""
            <p>Dear {requester.first_name},</p>
            <p>Your appointment request has been successfully created.</p>
            {get_appointment_summary(appointment)}
            <p>You will be notified of any updates to your request.</p>
            <p>Best regards,<br>AOLF GSEC Team</p>
        """
        send_email(requester.email, subject, content)

    # Notify all SECRETARIAT users who have enabled new appointment notifications
    secretariat_users = db.query(User).filter(
        User.role == UserRole.SECRETARIAT,
        User.email_notification_preferences['new_appointment_request'].as_boolean() == True
    ).all()

    for user in secretariat_users:
        subject = f"New Appointment Request - ID: {appointment.id}"
        content = f"""
            <p>Dear {user.first_name},</p>
            <p>A new appointment request has been submitted.</p>
            {get_appointment_summary(appointment)}
            <p>Please review this request at your earliest convenience.</p>
            <p>Best regards,<br>AOLF GSEC Team</p>
        """
        send_email(user.email, subject, content)

def notify_appointment_update(db: Session, appointment: Appointment, old_data: Dict[str, Any], new_data: Dict[str, Any]):
    """Send notifications when an appointment is updated."""
    
    # Ensure dignitaries data is properly prepared for get_appointment_changes_summary
    if 'dignitaries' not in old_data and appointment.dignitary_id and 'dignitary_id' in old_data:
        # Legacy dignitary handling
        old_dignitary = db.query(Dignitary).filter(Dignitary.id == old_data.get('dignitary_id')).first()
        if old_dignitary:
            old_data['dignitaries'] = [{
                'id': old_dignitary.id,
                'first_name': old_dignitary.first_name,
                'last_name': old_dignitary.last_name,
                'honorific_title': getattr(old_dignitary, 'honorific_title', '')
            }]
    
    if 'dignitaries' not in new_data:
        # Get current dignitaries
        dignitaries_data = []
        for app_dignitary in appointment.appointment_dignitaries:
            dignitary = app_dignitary.dignitary
            dignitaries_data.append({
                'id': dignitary.id,
                'first_name': dignitary.first_name,
                'last_name': dignitary.last_name,
                'honorific_title': getattr(dignitary, 'honorific_title', '')
            })
        new_data['dignitaries'] = dignitaries_data
    
    requester = appointment.requester
    if requester.email_notification_preferences.get('appointment_updated', True):
        subject = f"Appointment Request Updated - ID: {appointment.id}"
        content = f"""
            <p>Dear {requester.first_name},</p>
            <p>Your appointment request has been updated.</p>
            {get_appointment_changes_summary(old_data, new_data)}
            <p>Current Appointment Details:</p>
            {get_appointment_summary(appointment)}
            <p>Best regards,<br>AOLF GSEC Team</p>
        """
        send_email(requester.email, subject, content) 