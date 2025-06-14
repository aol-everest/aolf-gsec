# Email Templates

This directory contains HTML templates for emails sent by the AOLF GSEC application. The templates use Jinja2 templating syntax.

## Template Structure

All templates extend from `base.html`, which provides the common layout and styling for all emails.

## Available Templates

1. **appointment_created_requester.html**
   - Sent to the requester when they create a new appointment
   - Context variables: `user_name`, `appointment`
   - ✅ **Updated**: Now supports both dignitaries and contacts

2. **appointment_created_secretariat.html**
   - Sent to secretariat staff when a new appointment is created
   - Context variables: `user_name`, `appointment`, `admin_url` (optional)
   - ✅ **Updated**: Now supports both dignitaries and contacts

3. **appointment_updated_requester.html**
   - Sent to the requester when their appointment is updated
   - Context variables: `user_name`, `appointment`, `old_data`, `new_data`
   - ✅ **Updated**: Now supports both dignitaries and contacts in change tracking

4. **appointment_updated_secretariat.html**
   - Sent to secretariat staff when an appointment is updated
   - Context variables: `user_name`, `appointment`, `old_data`, `new_data`, `admin_url` (optional)

5. **appointment_confirmed.html**
   - Sent when an appointment is confirmed with calendar event details
   - Context variables: `user_name`, `appointment`
   - ✅ **Updated**: Now supports both dignitaries and contacts

6. **appointment_status_change.html**
   - Sent to the requester when the status of their appointment changes
   - Context variables: `user_name`, `appointment`

7. **macros.html**
   - ✨ **New**: Reusable macros for attendee handling and date formatting
   - Contains `render_attendees()`, `attendee_count()`, `format_appointment_date()`, and `get_date_label()` macros

8. **generic_notification.html**
   - Generic template for miscellaneous notifications
   - Context variables: `user_name`, `subject`, `message`, `additional_content` (optional), `action_url` (optional), `action_text` (optional)

## 🆕 Attendee Handling (Dignitaries & Contacts)

All appointment templates now support both **dignitaries** and **contacts** as attendees. Use the macros from `macros.html`:

## 🆕 Date Range Support

All appointment templates now support both **single dates** (for dignitary appointments) and **date ranges** (for non-dignitary appointments). Use the date formatting macros from `macros.html`:

### Import Macros
```jinja2
{% from 'macros.html' import render_attendees, attendee_count, format_appointment_date, get_date_label %}
```

### Available Date Macros

#### `format_appointment_date(appointment, include_time=true)`
Intelligently formats appointment dates based on available data:

```jinja2
{{ format_appointment_date(appointment) }}
<!-- For confirmed appointments: "2024-01-15 10:00 AM" -->
<!-- For date ranges: "2024-01-15 - 2024-01-20 (Morning)" -->
<!-- For single preferred dates: "2024-01-15 Morning" -->
<!-- For no dates: "To be determined" -->
```

#### `get_date_label(appointment)`
Returns appropriate label for the date field:

```jinja2
<strong>{{ get_date_label(appointment) }}:</strong> {{ format_appointment_date(appointment) }}
<!-- Outputs: "Confirmed Date & Time: 2024-01-15 10:00 AM" -->
<!-- Or: "Requested Date Range: 2024-01-15 - 2024-01-20 (Morning)" -->
```

### Available Attendee Macros

#### `attendee_count(appointment)`
Returns the total number of attendees (dignitaries + contacts).

```jinja2
{{ attendee_count(appointment) }} attendees
```

#### `render_attendees(appointment, format='list')`
Renders attendees in different formats:

1. **List format** (`'list'`): HTML bullet list
```jinja2
{{ render_attendees(appointment, 'list') }}
<!-- Outputs:
<ul>
  <li>Dr. John Smith</li>
  <li>Jane Doe (Contact)</li>
</ul>
-->
```

2. **Inline format** (`'inline'`): Comma-separated with proper grammar
```jinja2
{{ render_attendees(appointment, 'inline') }}
<!-- Outputs: "Dr. John Smith and Jane Doe (Group of 2)" -->
```

3. **Separated format** (`'separated'`): Grouped by type
```jinja2
{{ render_attendees(appointment, 'separated') }}
<!-- Outputs:
<p><strong>Dignitaries:</strong> Dr. John Smith</p>
<p><strong>Contacts:</strong> Jane Doe</p>
-->
```

### Manual Handling (if needed)
```jinja2
<!-- Dignitaries -->
{% for app_dignitary in appointment.appointment_dignitaries %}
    {% set dignitary = app_dignitary.dignitary %}
    {{ dignitary.honorific_title|format_honorific_title }} {{ dignitary.first_name }} {{ dignitary.last_name }}
{% endfor %}

<!-- Contacts -->
{% for app_contact in appointment.appointment_contacts %}
    {% set contact = app_contact.contact %}
    {{ contact.first_name }} {{ contact.last_name }}
{% endfor %}
```

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