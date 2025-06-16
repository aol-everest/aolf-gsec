from typing import List, Dict, Any, Optional, Union, Callable, Type, TypeVar
from models.enums import PersonRelationshipType
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, Bcc
from datetime import datetime
import os
import json
import asyncio
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session
from models.user import User, UserRole
from models.appointment import Appointment, AppointmentStatus, AppointmentSubStatus
from utils.utils import str_to_bool, as_dict, appointment_to_dict
from models.dignitary import Dignitary, HonorificTitle
from models.userContact import UserContact
from enum import Enum, auto
import logging
from contextlib import contextmanager
from pathlib import Path
import threading
import queue
import time
import atexit
import re
from dataclasses import dataclass, field
from typing import Callable
from sqlalchemy import or_, func

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
    # Add custom filters to Jinja2 environment
    template_env.filters['format_honorific_title'] = HonorificTitle.format_honorific_title
    logger.info(f"Initialized Jinja2 environment with templates from {EMAIL_TEMPLATES_DIR}")
except Exception as e:
    logger.error(f"Failed to initialize Jinja2 environment: {str(e)}")
    template_env = None

# Email queue for async processing
email_queue = queue.Queue()
# Generic DB task queue for async processing
db_task_queue = queue.Queue()
email_worker_running = False
db_worker_running = False
email_worker_thread = None
db_worker_thread = None

@dataclass
class DBTask:
    """Generic database task for async processing."""
    task_type: str
    parameters: dict
    created_at: float = field(default_factory=time.time)

class EmailTemplate(str, Enum):
    """Enum for available email templates."""
    APPOINTMENT_CREATED_REQUESTER = "appointment_created_requester.html"
    APPOINTMENT_CREATED_SECRETARIAT = "appointment_created_secretariat.html"
    APPOINTMENT_UPDATED_REQUESTER = "appointment_updated_requester.html"
    APPOINTMENT_UPDATED_SECRETARIAT = "appointment_updated_secretariat.html"
    APPOINTMENT_STATUS_CHANGE = "appointment_status_change.html"
    APPOINTMENT_MORE_INFO_NEEDED = "appointment_more_info_needed.html"
    APPOINTMENT_CANCELLED = "appointment_cancelled.html"
    APPOINTMENT_CONFIRMED = "appointment_confirmed.html"
    APPOINTMENT_REJECTED_LOW_PRIORITY = "appointment_rejected_low_priority.html"
    APPOINTMENT_REJECTED_MET_ALREADY = "appointment_rejected_met_already.html"
    APPOINTMENT_RESCHEDULED = "appointment_rescheduled.html"
    PROFILE_COMPLETION_EXISTING_USER = "profile_completion_existing_user.html"
    PROFILE_COMPLETION_NEW_USER = "profile_completion_new_user.html"
    GENERIC_NOTIFICATION = "generic_notification.html"

    def __str__(self):
        return self.value

class EmailTrigger(str, Enum):
    """Enum for email trigger types."""
    APPOINTMENT_CREATED = "appointment_created"
    APPOINTMENT_UPDATED = "appointment_updated"
    APPOINTMENT_STATUS_CHANGED = "appointment_status_changed"
    APPOINTMENT_MORE_INFO_NEEDED = "appointment_more_info_needed"
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    APPOINTMENT_CONFIRMED = "appointment_confirmed"
    APPOINTMENT_REJECTED_LOW_PRIORITY = "appointment_rejected_low_priority"
    APPOINTMENT_REJECTED_MET_ALREADY = "appointment_rejected_met_already"
    APPOINTMENT_RESCHEDULED = "appointment_rescheduled"
    PROFILE_COMPLETION_EXISTING_USER = "profile_completion_existing_user"
    PROFILE_COMPLETION_NEW_USER = "profile_completion_new_user"
    GENERIC_NOTIFICATION = "generic_notification"

    def __str__(self):
        return self.value

@dataclass
class NotificationConfig:
    """Configuration class for email notifications."""
    trigger: EmailTrigger
    requester_template: Optional[EmailTemplate] = None
    secretariat_template: Optional[EmailTemplate] = None
    subject_template: str = "Notification from Office of Gurudev"
    preference_key: Optional[str] = None  # For user email preferences
    
    def get_template_for_role(self, role: UserRole) -> EmailTemplate:
        """Get the appropriate template based on user role."""
        if (role == UserRole.SECRETARIAT or role == UserRole.ADMIN) and self.secretariat_template:
            return self.secretariat_template
        elif self.requester_template:
            return self.requester_template
        return EmailTemplate.GENERIC_NOTIFICATION
    
    def format_subject(self, **kwargs) -> str:
        """Format the subject template with provided kwargs."""
        try:
            return self.subject_template.format(**kwargs)
        except Exception as e:
            logger.error(f"Error formatting subject '{self.subject_template}': {str(e)}")
            return self.subject_template
    
    def get_preference_key(self) -> str:
        """Get the preference key for this notification type."""
        return self.preference_key or self.trigger.value

# Notification configurations
NOTIFICATION_CONFIGS = {
    EmailTrigger.APPOINTMENT_CREATED: NotificationConfig(
        trigger=EmailTrigger.APPOINTMENT_CREATED,
        requester_template=EmailTemplate.APPOINTMENT_CREATED_REQUESTER,
        secretariat_template=EmailTemplate.APPOINTMENT_CREATED_SECRETARIAT,
        subject_template="Appointment Request Created - ID: {appointment_id}"
    ),
    EmailTrigger.APPOINTMENT_UPDATED: NotificationConfig(
        trigger=EmailTrigger.APPOINTMENT_UPDATED,
        requester_template=EmailTemplate.APPOINTMENT_UPDATED_REQUESTER,
        secretariat_template=EmailTemplate.APPOINTMENT_UPDATED_SECRETARIAT,
        subject_template="Appointment Request Updated - ID: {appointment_id}"
    ),
    EmailTrigger.APPOINTMENT_STATUS_CHANGED: NotificationConfig(
        trigger=EmailTrigger.APPOINTMENT_STATUS_CHANGED,
        requester_template=EmailTemplate.APPOINTMENT_STATUS_CHANGE,
        subject_template="Appointment Status Updated - ID: {appointment_id}"
    ),
    EmailTrigger.APPOINTMENT_MORE_INFO_NEEDED: NotificationConfig(
        trigger=EmailTrigger.APPOINTMENT_MORE_INFO_NEEDED,
        requester_template=EmailTemplate.APPOINTMENT_MORE_INFO_NEEDED,
        subject_template="Additional Information Needed for Your Meeting Request (ID: {appointment_id})"
    ),
    EmailTrigger.APPOINTMENT_CANCELLED: NotificationConfig(
        trigger=EmailTrigger.APPOINTMENT_CANCELLED,
        requester_template=EmailTemplate.APPOINTMENT_CANCELLED,
        subject_template="Cancellation of Your Scheduled Appointment with Gurudev (ID: {appointment_id})"
    ),
    EmailTrigger.APPOINTMENT_CONFIRMED: NotificationConfig(
        trigger=EmailTrigger.APPOINTMENT_CONFIRMED,
        requester_template=EmailTemplate.APPOINTMENT_CONFIRMED,
        subject_template="Confirmation of Your Appointment with Gurudev (ID: {appointment_id})"
    ),
    EmailTrigger.APPOINTMENT_REJECTED_LOW_PRIORITY: NotificationConfig(
        trigger=EmailTrigger.APPOINTMENT_REJECTED_LOW_PRIORITY,
        requester_template=EmailTemplate.APPOINTMENT_REJECTED_LOW_PRIORITY,
        subject_template="Appointment Request Status (ID: {appointment_id})"
    ),
    EmailTrigger.APPOINTMENT_REJECTED_MET_ALREADY: NotificationConfig(
        trigger=EmailTrigger.APPOINTMENT_REJECTED_MET_ALREADY,
        requester_template=EmailTemplate.APPOINTMENT_REJECTED_MET_ALREADY,
        subject_template="Appointment Request Status (ID: {appointment_id})"
    ),
    EmailTrigger.APPOINTMENT_RESCHEDULED: NotificationConfig(
        trigger=EmailTrigger.APPOINTMENT_RESCHEDULED,
        requester_template=EmailTemplate.APPOINTMENT_RESCHEDULED,
        subject_template="Rescheduled Appointment with Gurudev (ID: {appointment_id})"
    ),
    EmailTrigger.PROFILE_COMPLETION_EXISTING_USER: NotificationConfig(
        trigger=EmailTrigger.PROFILE_COMPLETION_EXISTING_USER,
        requester_template=EmailTemplate.PROFILE_COMPLETION_EXISTING_USER,
        subject_template="Complete Your Profile - Meeting with Gurudev (ID: {appointment_id})",
        preference_key="appointment_created"  # Use appointment_created preference for profile completion emails
    ),
    EmailTrigger.PROFILE_COMPLETION_NEW_USER: NotificationConfig(
        trigger=EmailTrigger.PROFILE_COMPLETION_NEW_USER,
        requester_template=EmailTemplate.PROFILE_COMPLETION_NEW_USER,
        subject_template="Create Your Account - Meeting with Gurudev (ID: {appointment_id})",
        preference_key="appointment_created"  # Use appointment_created preference for profile completion emails
    ),
    EmailTrigger.GENERIC_NOTIFICATION: NotificationConfig(
        trigger=EmailTrigger.GENERIC_NOTIFICATION,
        requester_template=EmailTemplate.GENERIC_NOTIFICATION,
        subject_template="{subject}"
    )
}

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

def start_db_worker():
    """Start the background DB worker thread if not already running."""
    global db_worker_running, db_worker_thread
    
    if db_worker_running:
        return
    
    db_worker_running = True
    db_worker_thread = threading.Thread(target=db_worker, daemon=True)
    db_worker_thread.start()
    logger.info("DB worker thread started")

def stop_email_worker():
    """Stop the background email worker thread."""
    global email_worker_running
    email_worker_running = False
    logger.info("Email worker thread stop requested")

def stop_db_worker():
    """Stop the background DB worker thread."""
    global db_worker_running
    db_worker_running = False
    logger.info("DB worker thread stop requested")

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
                bcc_emails = email_data.get('bcc_emails')
                
                if all([to_email, subject, content]):
                    _send_email_sync(to_email, subject, content, bcc_emails)
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

def db_worker():
    """Background worker that processes the generic DB task queue."""
    global db_worker_running
    
    logger.info("DB worker started")
    while db_worker_running:
        try:
            # Try to get a DB task from the queue with a timeout
            try:
                db_task = db_task_queue.get(timeout=1.0)
            except queue.Empty:
                continue
            
            # Process the DB task
            try:
                if isinstance(db_task, DBTask):
                    task_age = time.time() - db_task.created_at
                    logger.info(f"Processing DB task: {db_task.task_type} (age: {task_age:.2f}s)")
                    _process_db_task(db_task)
                else:
                    logger.error(f"Invalid DB task type: {type(db_task)}")
            except Exception as e:
                logger.error(f"Error processing DB task: {str(e)}", exc_info=True)
            
            # Mark task as done
            db_task_queue.task_done()
            
        except Exception as e:
            logger.error(f"Error in DB worker: {str(e)}", exc_info=True)
            time.sleep(1)  # Prevent CPU spinning on repeated errors
    
    logger.info("DB worker stopped")

def _process_db_task(task: DBTask) -> None:
    """Process a specific DB task based on its type."""
    from database import get_db
    
    with get_db() as db:
        if task.task_type == "contact_profile_check":
            appointment_id = task.parameters.get('appointment_id')
            if appointment_id:
                # Get appointment with relationships loaded
                from models.appointment import Appointment
                from sqlalchemy.orm import joinedload
                
                appointment = db.query(Appointment).options(
                    joinedload(Appointment.appointment_contacts),
                    joinedload(Appointment.requester),
                    joinedload(Appointment.location)
                ).filter(Appointment.id == appointment_id).first()
                
                if appointment:
                    _check_and_notify_contact_profiles_sync(db, appointment)
                else:
                    logger.error(f"Appointment {appointment_id} not found for profile checking")
            else:
                logger.error("Missing appointment_id parameter for contact_profile_check task")
        
        # Add more task types here in the future:
        # elif task.task_type == "bulk_data_cleanup":
        #     _process_bulk_data_cleanup(db, task.parameters)
        # elif task.task_type == "generate_report":
        #     _process_report_generation(db, task.parameters)
        
        else:
            logger.error(f"Unknown DB task type: {task.task_type}")

def _send_email_sync(to_email: str, subject: str, content: str, bcc_emails: List[str] = None):
    """Internal synchronous function to send an email using SendGrid."""
    if not ENABLE_EMAIL:
        logger.warning(f"Email notifications are disabled. Email to {to_email} not sent.")
        return

    if not SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY not set. Email not sent.")
        return
    else:
        logger.info("SENDGRID_API_KEY is set. Email will be sent.")

    # Create the message
    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        html_content=content
    )

    # Add BCC recipients if provided
    if bcc_emails and len(bcc_emails) > 0:
        for bcc_email in bcc_emails:
            if bcc_email and bcc_email.strip():  # Ensure it's not empty
                bcc = Bcc(bcc_email)
                message.add_bcc(bcc)

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"Email sent to {to_email}. BCCs: {bcc_emails or 'None'}. Status: {response.status_code}")
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

def send_email(to_email: str, subject: str, content: str, bcc_emails: List[str] = None):
    """Queue an email to be sent asynchronously."""
    # Ensure the email worker is running
    if not email_worker_running:
        start_email_worker()
    
    # Add the email to the queue
    email_queue.put({
        'to_email': to_email,
        'subject': subject,
        'content': content,
        'bcc_emails': bcc_emails
    })
    logger.info(f"Email to {to_email} queued for sending. BCCs: {bcc_emails or 'None'}")

def send_email_from_template(
    to_email: str, 
    template_name: str, 
    subject: str, 
    context: Dict[str, Any],
    bcc_emails: List[str] = None
):
    """Send an email using a template."""
    content = render_template(template_name, **context)
    send_email(to_email, subject, content, bcc_emails)

def send_notification_email(
    db: Session,
    trigger_type: EmailTrigger,
    recipient: User,
    subject: Optional[str] = None,
    context: Dict[str, Any] = None,
    **kwargs
):
    """Universal function to send a notification email based on trigger type.
    
    Args:
        db: Database session
        trigger_type: Type of notification trigger
        recipient: User to send the notification to
        subject: Optional custom subject (overrides the template)
        context: Optional context dict for email rendering
        **kwargs: Additional parameters to format the subject template
    """
    if context is None:
        context = {}
    
    # Get the configuration for this notification type
    config = NOTIFICATION_CONFIGS.get(trigger_type)
    if not config:
        logger.error(f"No configuration found for trigger type {trigger_type}")
        return
    
    # Check if user has enabled this notification type
    preference_key = config.get_preference_key()
    if not recipient.email_notification_preferences.get(preference_key, True):
        logger.info(f"User {recipient.email} has disabled {preference_key} notifications")
        return
    
    # Get the appropriate template based on user role
    template_name = config.get_template_for_role(recipient.role)
    
    # Add recipient info to context
    context.update({
        'user_name': recipient.first_name,
        'user_email': recipient.email,
        'user_role': recipient.role.value
    })
    
    # Get subject from parameter or format it from the template
    if subject is None:
        # Add context values to kwargs for subject formatting
        format_kwargs = {**kwargs}
        # Add any appointment_id from context if present
        if 'appointment' in context and isinstance(context['appointment'], dict) and 'id' in context['appointment']:
            format_kwargs.setdefault('appointment_id', context['appointment']['id'])
        subject = config.format_subject(**format_kwargs)
    
    # Collect BCC emails
    bcc_emails = []
    
    # Always BCC the sender email to keep record of all communications
    if FROM_EMAIL:
        bcc_emails.append(FROM_EMAIL)
    
    # If this is not an email to a secretariat user, find secretariat users to BCC
    if recipient.role != UserRole.SECRETARIAT and recipient.role != UserRole.ADMIN:
        # Find all secretariat users who have opted into BCC for all emails
        secretariat_bccs = db.query(User).filter(
            or_(
                User.role == UserRole.SECRETARIAT,
                User.role == UserRole.ADMIN
            ),
            User.email_notification_preferences['bcc_on_all_emails'].as_boolean() == True
        ).all()
        
        for secretariat_user in secretariat_bccs:
            if secretariat_user.email and secretariat_user.email not in bcc_emails and secretariat_user.email != recipient.email:
                bcc_emails.append(secretariat_user.email)
    
    # Send email using template
    send_email_from_template(recipient.email, template_name.value, subject, context, bcc_emails)
    logger.info(f"Notification email ({trigger_type.value}) queued for {recipient.email}")

def get_appointment_summary(appointment: Appointment) -> str:
    """Generate a summary of the appointment for email notifications."""
    
    # Handle multiple dignitaries
    dignitaries_info = ""
    if appointment.appointment_dignitaries:
        dignitaries_list = []
        for app_dignitary in appointment.appointment_dignitaries:
            dignitary = app_dignitary.dignitary
            dignitaries_list.append(f"{HonorificTitle.format_honorific_title(dignitary.honorific_title)} {dignitary.first_name} {dignitary.last_name}".strip())
        
        if dignitaries_list:
            dignitaries_info = ", ".join(dignitaries_list)
    # Fallback to legacy dignitary relationship if no dignitaries in the new relationship
    elif appointment.dignitary:
        dignitaries_info = f"{HonorificTitle.format_honorific_title(appointment.dignitary.honorific_title)} {appointment.dignitary.first_name} {appointment.dignitary.last_name}".strip()
    
    if not dignitaries_info:
        dignitaries_info = "No dignitaries assigned"
    
    # Handle contacts
    contacts_info = ""
    if appointment.appointment_contacts:
        contacts_list = []
        for app_contact in appointment.appointment_contacts:
            contact = app_contact.contact
            # Handle self-contacts specially
            if (contact.relationship_to_owner == PersonRelationshipType.SELF or 
                (contact.first_name == PersonRelationshipType.SELF and contact.last_name == PersonRelationshipType.SELF)):
                contacts_list.append(PersonRelationshipType.SELF)
            else:
                contacts_list.append(f"{contact.first_name} {contact.last_name}".strip())
        
        if contacts_list:
            contacts_info = ", ".join(contacts_list)
    
    if not contacts_info:
        contacts_info = "No contacts assigned"
    
    # Build attendees section
    attendees_section = ""
    if dignitaries_info != "No dignitaries assigned":
        attendees_section += f"<p><strong>Dignitaries:</strong> {dignitaries_info}</p>"
    if contacts_info != "No contacts assigned":
        attendees_section += f"<p><strong>Contacts:</strong> {contacts_info}</p>"
    if not attendees_section:
        attendees_section = "<p><strong>Attendees:</strong> No attendees assigned</p>"
    
    # Get appointment date/time from calendar event only
    appointment_date = 'Not scheduled'
    appointment_time = 'Not specified'
    
    if hasattr(appointment, 'calendar_event') and appointment.calendar_event:
        appointment_date = appointment.calendar_event.start_date or 'Not scheduled'
        appointment_time = appointment.calendar_event.start_time or 'Not specified'
    
    return f"""
        <h3>Appointment Request Summary</h3>
        <p><strong>Request ID:</strong> {appointment.id}</p>
        {attendees_section}
        <p><strong>Purpose:</strong> {appointment.purpose}</p>
        <p><strong>Preferred Date:</strong> {appointment.preferred_date}</p>
        <p><strong>Preferred Time:</strong> {appointment.preferred_time_of_day or 'Not specified'}</p>
        <p><strong>Appointment Date:</strong> {appointment_date}</p>
        <p><strong>Appointment Time:</strong> {appointment_time}</p>
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
        ('dignitaries', 'Dignitaries'),
        ('contacts', 'Contacts')
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
                        old_names = ", ".join(
                            f"{HonorificTitle.format_honorific_title(d.get('honorific_title', ''))} {d.get('first_name', '')} {d.get('last_name', '')}".strip() 
                            for d in old_value
                        ) or "None"
                        new_names = ", ".join(
                            f"{HonorificTitle.format_honorific_title(d.get('honorific_title', ''))} {d.get('first_name', '')} {d.get('last_name', '')}".strip() 
                            for d in new_value
                        ) or "None"
                        changes.append(f"<p><strong>{display_name}:</strong> Changed from '{old_names}' to '{new_names}'</p>")
                else:
                    changes.append(f"<p><strong>{display_name}:</strong> Changed</p>")
            continue
            
        # Special handling for contacts which might be a list
        if field == 'contacts':
            if old_value != new_value and new_value is not None:
                # Convert to sets of contact IDs for easy comparison if they're lists
                if isinstance(old_value, list) and isinstance(new_value, list):
                    old_ids = set(c.get('id') for c in old_value if c.get('id'))
                    new_ids = set(c.get('id') for c in new_value if c.get('id'))
                    
                    if old_ids != new_ids:
                        old_names = ", ".join(
                            PersonRelationshipType.SELF if (c.get('relationship_to_owner') == PersonRelationshipType.SELF or 
                                     (c.get('first_name') == PersonRelationshipType.SELF and c.get('last_name') == PersonRelationshipType.SELF))
                            else f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() 
                            for c in old_value
                        ) or "None"
                        new_names = ", ".join(
                            PersonRelationshipType.SELF if (c.get('relationship_to_owner') == PersonRelationshipType.SELF or 
                                     (c.get('first_name') == PersonRelationshipType.SELF and c.get('last_name') == PersonRelationshipType.SELF))
                            else f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() 
                            for c in new_value
                        ) or "None"
                        changes.append(f"<p><strong>{display_name}:</strong> Changed from '{old_names}' to '{new_names}'</p>")
                else:
                    changes.append(f"<p><strong>{display_name}:</strong> Changed</p>")
            continue
            
        # Regular field comparison for other fields
        if old_value != new_value and new_value is not None:
            changes.append(f"<p><strong>{display_name}:</strong> Changed from '{old_value or 'Not set'}' to '{new_value}'</p>")

    if not changes:
        return "<p>No significant changes were made to the appointment details.</p>"

    return "<h3>Changes Made:</h3>" + "".join(changes)

def notify_appointment_creation(db: Session, appointment: Appointment):
    """Send notifications when a new appointment is created."""
    
    context = {
        'appointment': appointment_to_dict(appointment)
    }
    
    # Notify the requesting user
    requester = appointment.requester
    if requester:
        send_notification_email(
            db=db,
            trigger_type=EmailTrigger.APPOINTMENT_CREATED,
            recipient=requester,
            context=context,
            appointment_id=appointment.id
        )

    # Notify all SECRETARIAT users who have enabled new appointment notifications
    secretariat_users = db.query(User).filter(
        or_(
            User.role == UserRole.SECRETARIAT,
            User.role == UserRole.ADMIN
        ),
        User.email_notification_preferences['new_appointment_request'].as_boolean() == True
    ).all()

    for user in secretariat_users:
        send_notification_email(
            db=db,
            trigger_type=EmailTrigger.APPOINTMENT_CREATED,
            recipient=user,
            context=context,
            appointment_id=appointment.id
        )
    
    # Queue contact profile checking for async processing
    queue_contact_profile_check(appointment.id)

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
    
    # Ensure contacts data is properly prepared for get_appointment_changes_summary
    if 'contacts' not in new_data:
        # Get current contacts
        contacts_data = []
        for app_contact in appointment.appointment_contacts:
            contact = app_contact.contact
            contacts_data.append({
                'id': contact.id,
                'first_name': contact.first_name,
                'last_name': contact.last_name
            })
        new_data['contacts'] = contacts_data
    
    # Get current appointment date/time from calendar event only
    current_appointment_date = None
    current_appointment_time = None
    
    if hasattr(appointment, 'calendar_event') and appointment.calendar_event:
        current_appointment_date = appointment.calendar_event.start_date
        current_appointment_time = appointment.calendar_event.start_time
    
    # Update new_data with current calendar event values for change detection
    new_data['appointment_date'] = current_appointment_date
    new_data['appointment_time'] = current_appointment_time
    
    # Check if appointment date, time has changed (rescheduling case)
    date_time_changed = (
        old_data.get('appointment_date') != new_data.get('appointment_date') or 
        old_data.get('appointment_time') != new_data.get('appointment_time')
    )
    
    is_rescheduled = (
        date_time_changed and (
            # Ensure the appointment is approved and scheduled before sending a rescheduled notification
            appointment.status == AppointmentStatus.APPROVED and 
            appointment.sub_status == AppointmentSubStatus.SCHEDULED and
            current_appointment_date is not None and
            # Ensure the appointment was previously approved and scheduled before sending a rescheduled notification
            old_data.get("status") == AppointmentStatus.APPROVED and
            old_data.get("sub_status") == AppointmentSubStatus.SCHEDULED
        )
    )
    
    # Check if status has changed - this might need special notification
    status_changed = old_data.get('status') != new_data.get('status') and new_data.get('status') is not None
    
    # Check if this is a "Need more info" case
    need_more_info = (
        appointment.status == AppointmentStatus.PENDING and 
        appointment.sub_status == AppointmentSubStatus.NEED_MORE_INFO and
        appointment.secretariat_notes_to_requester and
        (
            # Ensure the appointment was previously not pending and need more info or 
            # the secretariat notes to requester have changed before sending a need more info notification
            not (
                old_data.get('status') == AppointmentStatus.PENDING and
                old_data.get('sub_status') == AppointmentSubStatus.NEED_MORE_INFO
            )
            or (
                old_data.get('secretariat_notes_to_requester', '').strip() != appointment.secretariat_notes_to_requester.strip()
            )
        )
    )
    
    # Check if this is a "Cancelled" case
    is_cancelled = (
        appointment.status == AppointmentStatus.CANCELLED and
        appointment.sub_status == AppointmentSubStatus.CANCELLED and
        # Ensure the appointment was previously not cancelled before sending a cancelled notification
        old_data.get('status') != AppointmentStatus.CANCELLED and 
        old_data.get('sub_status') != AppointmentSubStatus.CANCELLED
    )
    
    # Check if this is a "Confirmed" case (Approved + Scheduled)
    is_confirmed = (
        appointment.status == AppointmentStatus.APPROVED and
        appointment.sub_status == AppointmentSubStatus.SCHEDULED and
        current_appointment_date is not None and
        # Ensure the appointment was previously not approved and scheduled before sending a confirmed notification
        not (old_data.get('status') == AppointmentStatus.APPROVED and
             old_data.get('sub_status') == AppointmentSubStatus.SCHEDULED)
    )
    
    # Check if this is a "Rejected" case with "Low priority" substatus
    is_rejected_low_priority = (
        appointment.status == AppointmentStatus.REJECTED and
        appointment.sub_status == AppointmentSubStatus.LOW_PRIORITY and
        # Ensure the appointment was previously not rejected and low priority before sending a rejected low priority notification
        not (old_data.get('status') == AppointmentStatus.REJECTED and
             old_data.get('sub_status') == AppointmentSubStatus.LOW_PRIORITY)
    )
    
    # Check if this is a "Rejected" case with "Met Gurudev already" substatus
    is_rejected_met_already = (
        appointment.status == AppointmentStatus.REJECTED and
        appointment.sub_status == AppointmentSubStatus.MET_GURUDEV and
        # Ensure the appointment was previously not rejected and met Gurudev already before sending a rejected met Gurudev already notification
        not (old_data.get('status') == AppointmentStatus.REJECTED and
             old_data.get('sub_status') == AppointmentSubStatus.MET_GURUDEV)
    )
    
    # Notify the requester
    requester = appointment.requester
    
    # Prepare base context
    context = {
        'appointment': appointment_to_dict(appointment)
    }
    
    if requester:
        if need_more_info:
            # Special handling for "Need more info" case
            send_notification_email(
                db=db,
                trigger_type=EmailTrigger.APPOINTMENT_MORE_INFO_NEEDED,
                recipient=requester,
                context=context,
                appointment_id=appointment.id
            )
        elif is_cancelled:
            # Special handling for "Cancelled" case
            send_notification_email(
                db=db,
                trigger_type=EmailTrigger.APPOINTMENT_CANCELLED,
                recipient=requester,
                context=context,
                appointment_id=appointment.id
            )
        elif is_rescheduled:
            # Special handling for "Rescheduled" case
            logger.info(f"Sending rescheduled notification for appointment ID: {appointment.id}")
            send_notification_email(
                db=db,
                trigger_type=EmailTrigger.APPOINTMENT_RESCHEDULED,
                recipient=requester,
                context=context,
                appointment_id=appointment.id
            )
        elif is_confirmed:
            # Special handling for "Confirmed" case
            send_notification_email(
                db=db,
                trigger_type=EmailTrigger.APPOINTMENT_CONFIRMED,
                recipient=requester,
                context=context,
                appointment_id=appointment.id
            )
        elif is_rejected_low_priority:
            # Special handling for "Rejected - Low priority" case
            send_notification_email(
                db=db,
                trigger_type=EmailTrigger.APPOINTMENT_REJECTED_LOW_PRIORITY,
                recipient=requester,
                context=context,
                appointment_id=appointment.id
            )
        elif is_rejected_met_already:
            # Special handling for "Rejected - Met Gurudev already" case
            send_notification_email(
                db=db,
                trigger_type=EmailTrigger.APPOINTMENT_REJECTED_MET_ALREADY,
                recipient=requester,
                context=context,
                appointment_id=appointment.id
            )
        else:
            logger.info(f"Skipped sending email for appointment update (ID: {appointment.id})")

def queue_contact_profile_check(appointment_id: int) -> None:
    """Queue a contact profile check task for async processing."""
    task = DBTask(
        task_type="contact_profile_check",
        parameters={'appointment_id': appointment_id}
    )
    db_task_queue.put(task)
    logger.info(f"Queued contact profile check for appointment {appointment_id}")

def queue_db_task(task_type: str, parameters: dict) -> None:
    """Queue a generic DB task for async processing."""
    task = DBTask(task_type=task_type, parameters=parameters)
    db_task_queue.put(task)
    logger.info(f"Queued DB task: {task_type}")

def _check_and_notify_contact_profiles_sync(db: Session, appointment: Appointment) -> None:
    """Check contact emails for existing users and send profile completion notifications.
    
    This function runs synchronously in the profile worker thread.
    
    Steps:
    1. Gets contact email addresses from the appointment
    2. Checks if users exist with those emails (case-insensitive)
    3. For existing users, checks if their profile is complete
    4. Sends appropriate emails based on user status and profile completeness
    
    Args:
        db: Database session
        appointment: The created appointment
    """
    try:
        # Import here to avoid circular imports
        from utils.profile_validation import (
            is_profile_complete, 
            get_missing_fields, 
            user_to_dict, 
            get_missing_fields_display_names
        )
        
        logger.info(f"Checking contact profiles for appointment {appointment.id}")
        
        # Get contact IDs from appointment
        contact_ids = []
        if hasattr(appointment, 'appointment_contacts') and appointment.appointment_contacts:
            contact_ids = [ac.contact_id for ac in appointment.appointment_contacts]
        
        if not contact_ids:
            logger.info(f"No contacts found for appointment {appointment.id}")
            return
        
        # Batch query for all contacts with emails (more efficient than individual queries)
        contacts = db.query(UserContact).filter(
            UserContact.id.in_(contact_ids),
            UserContact.email.isnot(None),
            UserContact.email != ''
        ).all()
        
        if not contacts:
            logger.info(f"No contacts with email addresses found for appointment {appointment.id}")
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
        
        # Batch query for existing users to avoid N+1 queries
        contact_emails = [contact.email.strip().lower() for contact in contacts if contact.email]
        existing_users = {}
        if contact_emails:
            users = db.query(User).filter(
                func.lower(User.email).in_(contact_emails)
            ).all()
            existing_users = {user.email.lower(): user for user in users}
        
        # Process each contact
        for contact in contacts:
            try:
                contact_email = contact.email.strip().lower()
                contact_name = f"{contact.first_name} {contact.last_name}".strip()
                
                logger.info(f"Processing contact: {contact_name} ({contact_email})")
                
                existing_user = existing_users.get(contact_email)
                
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
        logger.error(f"Error in _check_and_notify_contact_profiles_sync for appointment {appointment.id}: {str(e)}", exc_info=True)

def send_profile_completion_email(
    db: Session,
    email: str,
    contact_name: str,
    appointment_id: int,
    requester_name: str,
    appointment_date: str = None,
    appointment_location: str = None,
    missing_fields: List[str] = None,
    is_new_user: bool = False
):
    """Send profile completion email to a contact based on their user status.
    
    Args:
        db: Database session
        email: Contact's email address
        contact_name: Contact's full name
        appointment_id: ID of the appointment they're added to
        requester_name: Name of the person who requested the appointment
        appointment_date: Optional appointment date string
        appointment_location: Optional appointment location string
        missing_fields: List of missing profile fields (for existing users)
        is_new_user: Whether this is a new user invitation or existing user reminder
    """
    try:
        # Prepare context for email template
        context = {
            'contact_name': contact_name,
            'contact_email': email,
            'appointment_id': appointment_id,
            'requester_name': requester_name,
            'appointment_date': appointment_date,
            'appointment_location': appointment_location
        }
        
        if is_new_user:
            trigger_type = EmailTrigger.PROFILE_COMPLETION_NEW_USER
        else:
            trigger_type = EmailTrigger.PROFILE_COMPLETION_EXISTING_USER
            context['missing_fields'] = missing_fields or []
        
        # Create a temporary recipient object for the notification system
        # Since this person might not have a User record yet, we create a minimal object
        class TempRecipient:
            def __init__(self, email_addr, name):
                self.email = email_addr
                self.first_name = name
                self.role = UserRole.GENERAL
                self.email_notification_preferences = {"appointment_created": True}
        
        recipient = TempRecipient(email, contact_name)
        
        # Send the notification email
        send_notification_email(
            db=db,
            trigger_type=trigger_type,
            recipient=recipient,
            context=context,
            appointment_id=appointment_id
        )
        
        logger.info(f"Profile completion email sent to {email} (new_user: {is_new_user})")
        
    except Exception as e:
        logger.error(f"Error sending profile completion email to {email}: {str(e)}", exc_info=True)

# Initialize the workers when module is imported
start_email_worker()
start_db_worker()

# Make sure the workers are stopped properly when the application exits
atexit.register(stop_email_worker)
atexit.register(stop_db_worker)

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