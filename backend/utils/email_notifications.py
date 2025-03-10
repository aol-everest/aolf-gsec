from typing import List, Dict, Any, Optional, Union
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from datetime import datetime
import os
import json
import asyncio
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session
from models.user import User, UserRole
from models.appointment import Appointment
from schemas import AppointmentAdminUpdate
from utils.utils import str_to_bool, as_dict, appointment_to_dict
from models.dignitary import Dignitary
from enum import Enum, auto
import logging
from contextlib import contextmanager
from pathlib import Path
import threading
import queue
import time
import atexit
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
FROM_EMAIL = os.getenv('FROM_EMAIL', 'noreply@meetgurudev.aolf.app')
ENABLE_EMAIL = str_to_bool(os.getenv('ENABLE_EMAIL'))
EMAIL_TEMPLATES_DIR = os.getenv('EMAIL_TEMPLATES_DIR', os.path.join(os.path.dirname(__file__), '../email_templates'))
APP_BASE_URL = os.getenv('APP_BASE_URL', 'https://meetgurudev.aolf.app')

# Create email templates directory if it doesn't exist
Path(EMAIL_TEMPLATES_DIR).mkdir(parents=True, exist_ok=True)

# Initialize Jinja2 environment
try:
    template_env = Environment(
        loader=FileSystemLoader(EMAIL_TEMPLATES_DIR),
        autoescape=select_autoescape(['html', 'xml'])
    )
    logger.info(f"Initialized Jinja2 environment with templates from {EMAIL_TEMPLATES_DIR}")
except Exception as e:
    logger.error(f"Failed to initialize Jinja2 environment: {str(e)}")
    template_env = None

# Email queue for async processing
email_queue = queue.Queue()
email_worker_running = False
email_worker_thread = None

class EmailTemplate(str, Enum):
    """Enum for available email templates."""
    APPOINTMENT_CREATED_REQUESTER = "appointment_created_requester.html"
    APPOINTMENT_CREATED_SECRETARIAT = "appointment_created_secretariat.html"
    APPOINTMENT_UPDATED_REQUESTER = "appointment_updated_requester.html"
    APPOINTMENT_UPDATED_SECRETARIAT = "appointment_updated_secretariat.html"
    APPOINTMENT_STATUS_CHANGE = "appointment_status_change.html"
    GENERIC_NOTIFICATION = "generic_notification.html"

    def __str__(self):
        return self.value

class EmailTrigger(str, Enum):
    """Enum for email trigger types."""
    APPOINTMENT_CREATED = "appointment_created"
    APPOINTMENT_UPDATED = "appointment_updated"
    APPOINTMENT_STATUS_CHANGED = "appointment_status_changed"
    GENERIC_NOTIFICATION = "generic_notification"

    def __str__(self):
        return self.value

def render_template(template_name: str, **context) -> str:
    """Render a template with the given context."""
    # Add global context variables
    context['app_base_url'] = APP_BASE_URL
    
    if not template_env:
        logger.error("Jinja2 environment not initialized. Using fallback template rendering.")
        return fallback_render_template(template_name, **context)
    
    try:
        template = template_env.get_template(template_name)
        return template.render(**context)
    except Exception as e:
        import traceback
        print(traceback.format_exc())  # Print full error stack
        logger.error(f"Error rendering template {template_name}: {str(e)}")
        return fallback_render_template(template_name, **context)

def fallback_render_template(template_name: str, **context) -> str:
    """Fallback template rendering when Jinja2 is not available or fails."""
    logger.warning(f"Using fallback template rendering for {template_name}")
    
    # Ensure app_base_url is set
    if 'app_base_url' not in context:
        context['app_base_url'] = APP_BASE_URL
    
    # Simple template mapping for fallback
    if template_name == EmailTemplate.APPOINTMENT_CREATED_REQUESTER:
        return f"""
            <p>Dear {context.get('user_name', '')},</p>
            <p>Your appointment request has been successfully created.</p>
            {get_appointment_summary(context.get('appointment'))}
            <p>You will be notified of any updates to your request.</p>
            <p>
                Best regards,<br>
                Office of Gurudev Sri Sri Ravi Shankar, USA
            </p>
        """
    elif template_name == EmailTemplate.APPOINTMENT_UPDATED_REQUESTER:
        return f"""
            <p>Dear {context.get('user_name', '')},</p>
            <p>Your appointment request has been updated.</p>
            {get_appointment_changes_summary(context.get('old_data', {}), context.get('new_data', {}))}
            <p>Current Appointment Details:</p>
            {get_appointment_summary(context.get('appointment'))}
            <p>
                Best regards,<br>
                Office of Gurudev Sri Sri Ravi Shankar, USA
            </p>
        """
    # Default generic template
    return f"""
        <p>Dear {context.get('user_name', '')},</p>
        <p>{context.get('message', 'You have a new notification.')}</p>
        <p>Best regards,<br>Office of Gurudev Sri Sri Ravi Shankar, USA</p>
    """

def start_email_worker():
    """Start the background email worker thread if not already running."""
    global email_worker_running, email_worker_thread
    
    if email_worker_running:
        return
    
    email_worker_running = True
    email_worker_thread = threading.Thread(target=email_worker, daemon=True)
    email_worker_thread.start()
    logger.info("Email worker thread started")

def stop_email_worker():
    """Stop the background email worker thread."""
    global email_worker_running
    email_worker_running = False
    logger.info("Email worker thread stop requested")

def email_worker():
    """Background worker that processes the email queue."""
    global email_worker_running
    
    logger.info("Email worker started")
    while email_worker_running:
        try:
            # Try to get an email from the queue with a timeout
            try:
                email_data = email_queue.get(timeout=1.0)
            except queue.Empty:
                continue
            
            # Process the email
            try:
                to_email = email_data.get('to_email')
                subject = email_data.get('subject')
                content = email_data.get('content')
                
                if all([to_email, subject, content]):
                    _send_email_sync(to_email, subject, content)
                else:
                    logger.error(f"Invalid email data: {email_data}")
            except Exception as e:
                logger.error(f"Error processing email: {str(e)}")
            
            # Mark task as done
            email_queue.task_done()
            
        except Exception as e:
            logger.error(f"Error in email worker: {str(e)}")
            time.sleep(1)  # Prevent CPU spinning on repeated errors
    
    logger.info("Email worker stopped")

def _send_email_sync(to_email: str, subject: str, content: str):
    """Internal synchronous function to send an email using SendGrid."""
    if not ENABLE_EMAIL:
        logger.warning(f"Email notifications are disabled. Email to {to_email} not sent.")
        return

    if not SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY not set. Email not sent.")
        return
    else:
        logger.info("SENDGRID_API_KEY is set. Email will be sent.")

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        html_content=content
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"Email sent to {to_email}. Status: {response.status_code}")
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error sending email: {error_message}")
        # Log more details about the error if available
        if hasattr(e, 'body') and e.body:
            try:
                body_json = json.loads(e.body)
                logger.error(f"SendGrid Error Details: {json.dumps(body_json, indent=2)}")
            except:
                logger.error(f"SendGrid Error Body: {e.body}")
        if hasattr(e, 'headers') and e.headers:
            logger.error(f"SendGrid Error Headers: {e.headers}")

def send_email(to_email: str, subject: str, content: str):
    """Queue an email to be sent asynchronously."""
    # Ensure the email worker is running
    if not email_worker_running:
        start_email_worker()
    
    # Add the email to the queue
    email_queue.put({
        'to_email': to_email,
        'subject': subject,
        'content': content
    })
    logger.info(f"Email to {to_email} queued for sending")

def send_email_from_template(
    to_email: str, 
    template_name: str, 
    subject: str, 
    context: Dict[str, Any]
):
    """Send an email using a template."""
    content = render_template(template_name, **context)
    send_email(to_email, subject, content)

def send_notification_email(
    db: Session,
    trigger_type: EmailTrigger,
    recipient: User,
    subject: str,
    context: Dict[str, Any]
):
    """Universal function to send a notification email based on trigger type."""
    # Check if user has enabled this notification type
    notification_preference_key = trigger_type.value
    if not recipient.email_notification_preferences.get(notification_preference_key, True):
        logger.info(f"User {recipient.email} has disabled {trigger_type.value} notifications")
        return
    
    # Determine which template to use based on trigger type and user role
    template_name = EmailTemplate.GENERIC_NOTIFICATION
    
    if trigger_type == EmailTrigger.APPOINTMENT_CREATED:
        if recipient.role == UserRole.SECRETARIAT:
            template_name = EmailTemplate.APPOINTMENT_CREATED_SECRETARIAT
        else:
            template_name = EmailTemplate.APPOINTMENT_CREATED_REQUESTER
    
    elif trigger_type == EmailTrigger.APPOINTMENT_UPDATED:
        if recipient.role == UserRole.SECRETARIAT:
            template_name = EmailTemplate.APPOINTMENT_UPDATED_SECRETARIAT
        else:
            template_name = EmailTemplate.APPOINTMENT_UPDATED_REQUESTER
    
    elif trigger_type == EmailTrigger.APPOINTMENT_STATUS_CHANGED:
        template_name = EmailTemplate.APPOINTMENT_STATUS_CHANGE
    
    # Add recipient name to context
    context.update({
        'user_name': recipient.first_name,
        'user_email': recipient.email,
        'user_role': recipient.role.value
    })
    
    # Send email using template
    send_email_from_template(recipient.email, template_name.value, subject, context)
    logger.info(f"Notification email ({trigger_type.value}) queued for {recipient.email}")

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
    # Notify the requesting user
    requester = appointment.requester
    subject = f"Appointment Request Created - ID: {appointment.id}"
    
    context = {
        'appointment': appointment_to_dict(appointment)
    }
    
    # logger.info(f"context = {json.dumps(context, indent=4, sort_keys=True, default=str)}")
    send_notification_email(
        db=db,
        trigger_type=EmailTrigger.APPOINTMENT_CREATED,
        recipient=requester,
        subject=subject,
        context=context
    )

    # Notify all SECRETARIAT users who have enabled new appointment notifications
    secretariat_users = db.query(User).filter(
        User.role == UserRole.SECRETARIAT,
        User.email_notification_preferences['new_appointment_request'].as_boolean() == True
    ).all()

    for user in secretariat_users:
        subject = f"New Appointment Request - ID: {appointment.id}"
        context = {
            'appointment': appointment_to_dict(appointment)
        }
        send_notification_email(
            db=db,
            trigger_type=EmailTrigger.APPOINTMENT_CREATED,
            recipient=user,
            subject=subject,
            context=context
        )

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
    
    # Check if status has changed - this might need special notification
    status_changed = old_data.get('status') != new_data.get('status') and new_data.get('status') is not None
    
    # Notify the requester
    requester = appointment.requester
    subject = f"Appointment Request Updated - ID: {appointment.id}"
    context = {
        'appointment': appointment_to_dict(appointment),
        'old_data': old_data,
        'new_data': new_data
    }
    
    # Use status change trigger if status changed, otherwise use update trigger
    trigger_type = EmailTrigger.APPOINTMENT_STATUS_CHANGED if status_changed else EmailTrigger.APPOINTMENT_UPDATED
    
    send_notification_email(
        db=db,
        trigger_type=trigger_type,
        recipient=requester,
        subject=subject,
        context=context
    )

# Initialize the email worker when module is imported
start_email_worker()

# Make sure the worker is stopped properly when the application exits
atexit.register(stop_email_worker)

def test_sendgrid_connection():
    """Test the SendGrid API connection and permissions.
    
    This function attempts to get the SendGrid API connection status
    without actually sending an email, to verify if the API key is valid
    and has the necessary permissions.
    
    Returns:
        tuple: (bool, str) - Success status and a message
    """
    if not SENDGRID_API_KEY:
        return False, "SENDGRID_API_KEY not set"
    
    try:
        # First, try a simple API call to verify the API key is valid
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        
        # Get API key permissions
        try:
            response = sg.client.api_keys._(SENDGRID_API_KEY).get()
            scopes = response.to_dict.get('scopes', [])
            if 'mail.send' not in scopes:
                return False, "API key does not have 'mail.send' permission"
        except Exception as e:
            # If we can't get permissions, try another approach
            pass
        
        # Check sender identity verification
        if FROM_EMAIL:
            try:
                response = sg.client.verified_senders.get()
                senders = response.to_dict
                verified_emails = [s.get('email', '') for s in senders.get('results', [])]
                if FROM_EMAIL not in verified_emails:
                    return False, f"Sender email {FROM_EMAIL} is not verified in SendGrid"
            except Exception as e:
                # If we can't check verified senders, continue
                pass
        
        return True, "SendGrid API connection successful"
    except Exception as e:
        error_message = str(e)
        if hasattr(e, 'body') and e.body:
            try:
                body_json = json.loads(e.body)
                error_message = f"{error_message}\nDetails: {json.dumps(body_json, indent=2)}"
            except:
                error_message = f"{error_message}\nBody: {e.body}"
        
        return False, f"SendGrid API connection failed: {error_message}" 