# Email Templates

This directory contains HTML templates for emails sent by the AOLF GSEC application. The templates use Jinja2 templating syntax.

## Template Structure

All templates extend from `base.html`, which provides the common layout and styling for all emails.

## Available Templates

1. **appointment_created_requester.html**
   - Sent to the requester when they create a new appointment
   - Context variables: `user_name`, `appointment`

2. **appointment_created_secretariat.html**
   - Sent to secretariat staff when a new appointment is created
   - Context variables: `user_name`, `appointment`, `admin_url` (optional)

3. **appointment_updated_requester.html**
   - Sent to the requester when their appointment is updated
   - Context variables: `user_name`, `appointment`, `old_data`, `new_data`

4. **appointment_updated_secretariat.html**
   - Sent to secretariat staff when an appointment is updated
   - Context variables: `user_name`, `appointment`, `old_data`, `new_data`, `admin_url` (optional)

5. **appointment_status_change.html**
   - Sent to the requester when the status of their appointment changes
   - Context variables: `user_name`, `appointment`

6. **generic_notification.html**
   - Generic template for miscellaneous notifications
   - Context variables: `user_name`, `subject`, `message`, `additional_content` (optional), `action_url` (optional), `action_text` (optional)

## Adding New Templates

1. Create a new HTML file in this directory
2. Start with `{% extends "base.html" %}`
3. Define the `{% block title %}` and `{% block content %}`
4. Use Jinja2 syntax for dynamic content

## Testing Templates

To test a template, you can use the Python REPL:

```python
from jinja2 import Environment, FileSystemLoader
import os

# Initialize Jinja2 environment
templates_dir = "path/to/email_templates"
env = Environment(loader=FileSystemLoader(templates_dir))

# Load template
template = env.get_template("template_name.html")

# Prepare test context
context = {
    "user_name": "Test User",
    # Add other variables needed by the template
}

# Render template
output = template.render(**context)

# Save to file for inspection
with open("test_output.html", "w") as f:
    f.write(output)
```

## Email System Usage

The email system in `utils/email_notifications.py` provides several functions for sending emails:

1. `send_email(to_email, subject, content)` - Queues an email for asynchronous sending
2. `send_email_from_template(to_email, template_name, subject, context)` - Sends an email using a template
3. `send_notification_email(db, trigger_type, recipient, subject, context)` - Smart function that selects the appropriate template based on the trigger type and recipient role

### Example Usage

```python
from utils.email_notifications import send_notification_email, EmailTrigger

# Send an appointment creation notification
send_notification_email(
    db=db,
    trigger_type=EmailTrigger.APPOINTMENT_CREATED,
    recipient=user,
    subject="Your Appointment Request",
    context={"appointment": appointment}
)
``` 