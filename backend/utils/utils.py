from datetime import datetime, timedelta, timezone, date
from typing import Optional, Union, List, Dict, Any, Tuple
from zoneinfo import ZoneInfo
import uuid
import os
import re
import json
import time
import random
import string

def str_to_bool(value: str) -> bool:
    """Convert a string to a boolean."""
    return value.lower() in ('true', '1', 't', 'y', 'yes')


from sqlalchemy.inspection import inspect

def as_dict(obj, visited=None, depth=0, max_depth=2):
    """Convert SQLAlchemy model instance to a dictionary, limiting recursion depth to prevent infinite loops."""
    if obj is None or depth > max_depth:
        return None  # Stop at max depth

    if visited is None:
        visited = set()

    # Avoid infinite recursion for cyclic relationships
    obj_id = id(obj)
    if obj_id in visited:
        return f"<Recursion Detected: {obj.__class__.__name__}>"

    visited.add(obj_id)

    data = {}

    # Convert columns to dictionary
    for column in inspect(obj).mapper.column_attrs:
        data[column.key] = getattr(obj, column.key)

    # Convert relationships (only traverse if within depth limit)
    if depth < max_depth:
        for relationship in inspect(obj).mapper.relationships:
            related_obj = getattr(obj, relationship.key)

            if related_obj is None:
                data[relationship.key] = None
            elif relationship.uselist:  # One-to-Many or Many-to-Many
                data[relationship.key] = [as_dict(item, visited, depth + 1, max_depth) for item in related_obj]
            else:  # Many-to-One or One-to-One
                data[relationship.key] = as_dict(related_obj, visited, depth + 1, max_depth)

    visited.remove(obj_id)  # Remove from visited set after processing

    return data

def entity_to_dict(obj, relationship_config=None, exclude_back_refs=True, visited=None):
    """
    Convert SQLAlchemy model instance to a dictionary with selective relationship inclusion.
    
    Args:
        obj: SQLAlchemy model instance
        relationship_config: Dictionary mapping relationship names to either:
            - Boolean: True to include with default settings, False to exclude
            - Integer: Maximum depth for this relationship
            - Dict: Nested config for this relationship's attributes
        exclude_back_refs: Whether to exclude relationships that reference back to parent objects
        visited: Set to track visited objects (for internal use)
    
    Returns:
        Dictionary representation of the object
    """
    if obj is None:
        return None

    if relationship_config is None:
        relationship_config = {}
        
    if visited is None:
        visited = set()
    
    # Avoid infinite recursion for cyclic relationships
    obj_id = id(obj)
    if obj_id in visited:
        return f"<Recursion Detected: {obj.__class__.__name__}>"
    
    visited.add(obj_id)
    
    data = {}
    
    # Convert columns to dictionary
    for column in inspect(obj).mapper.column_attrs:
        data[column.key] = getattr(obj, column.key)
    
    # Convert relationships with specific inclusion rules
    for relationship in inspect(obj).mapper.relationships:
        rel_name = relationship.key
        
        # Skip if relationship is not in config and we're not including everything
        if rel_name not in relationship_config:
            continue
            
        # Get config for this relationship
        rel_config = relationship_config[rel_name]
        
        # Skip explicitly excluded relationships
        if rel_config is False:
            continue
        
        # Handle back-references if configured to exclude them
        if exclude_back_refs:
            # Try to detect if this relationship points back to a parent
            # This is a simplified approach and might need refinement
            for parent_rel in relationship.mapper.relationships:
                if parent_rel.back_populates == relationship.key:
                    # This might be a back-reference
                    continue
        
        related_obj = getattr(obj, rel_name)
        
        # Setup nested config for recursive calls
        nested_config = {}
        if isinstance(rel_config, dict):
            nested_config = rel_config
        
        if related_obj is None:
            data[rel_name] = None
        elif relationship.uselist:  # One-to-Many or Many-to-Many
            data[rel_name] = [
                entity_to_dict(item, nested_config, exclude_back_refs, visited.copy()) 
                for item in related_obj
            ]
        else:  # Many-to-One or One-to-One
            data[rel_name] = entity_to_dict(
                related_obj, nested_config, exclude_back_refs, visited.copy()
            )
    
    visited.remove(obj_id)  # Remove from visited set after processing
    
    return data

def appointment_to_dict(appointment):
    """
    Convert Appointment model instance to a dictionary with precisely specified relationship inclusion.
    
    This function explicitly defines which relationships to include and their nested relations:
    - requester: Basic user info
    - appointment_dignitaries: Include with dignitary details but not back-references
    - location: Basic location info
    - Other necessary relationships
    
    Args:
        appointment: Appointment model instance
        
    Returns:
        Dictionary representation of the appointment
    """
    # Define relationship inclusion configuration
    relationship_config = {
        # Include requester with basic attributes only
        "requester": {},
        
        # Include appointment_dignitaries and their dignitaries
        "appointment_dignitaries": {
            # For each appointment_dignitary, include its dignitary
            "dignitary": {}
        },
        
        # Include appointment_contacts and their contacts
        "appointment_contacts": {
            # For each appointment_contact, include its contact
            "contact": {}
        },
        
        # Include location with basic attributes
        "location": {},
        
        # Include the direct dignitary if present
        "dignitary": {},
        
        # Include approver and updater info
        "approved_by_user": {},
        "last_updated_by_user": {}
    }
    
    return entity_to_dict(appointment, relationship_config)

def appointment_dignitary_to_dict(appointment_dignitary):
    """
    Convert AppointmentDignitary model instance to a dictionary focusing on dignitary details.
    
    This function is specialized to include only dignitary information and exclude appointment
    details to avoid circular references.
    
    Args:
        appointment_dignitary: AppointmentDignitary model instance
        
    Returns:
        Dictionary with dignitary information
    """
    relationship_config = {
        # Include dignitary details
        "dignitary": {},
        # Explicitly exclude appointment to avoid circular references
        "appointment": False
    }

    appointment_data = entity_to_dict(appointment_dignitary, relationship_config)
    appointment_data['preferred_date_formatted'] = appointment_data['preferred_date'].strftime('%B %d, %Y') if isinstance(appointment_data['preferred_date'], datetime) else appointment_data['preferred_date']
    
    return entity_to_dict(appointment_dignitary, relationship_config)

def dignitary_to_dict(dignitary):
    """
    Convert Dignitary model instance to a dictionary with basic information.
    
    This function is specialized to include basic dignitary details and excludes
    relationships that might cause circular references.
    
    Args:
        dignitary: Dignitary model instance
        
    Returns:
        Dictionary with dignitary information
    """
    # Only include specific relationships if needed
    relationship_config = {
        # Add specific relationships here if needed
        "creator": False,
        "appointments": False,
        "appointment_dignitaries": False,
        "source_appointment": False,
        "point_of_contacts": False,
    }
    
    return entity_to_dict(dignitary, relationship_config)


def convert_to_datetime_with_tz(appointment_date: str, start_time: str, location, default_timezone: str = None) -> datetime:
    """
    Convert a date and time string along with a location into a timezone-aware datetime.
    
    Args:
        appointment_date (str): Date in 'YYYY-MM-DD' format.
        start_time (str): Time in 'HH24:MI' format (e.g., '14:30'). Seconds will be added if missing.
        location: A location object (e.g., an instance of Location) that should have a 'country_code' attribute.
        default_timezone (str): Optional default timezone to use if location doesn't have timezone info.
    
    Returns:
        datetime: A timezone-aware datetime object.
    """
    # Ensure the time string includes seconds (append ':00' if needed)
    if len(start_time.split(':')) == 2:
        start_time = f"{start_time}:00"
    
    # Combine date and time into an ISO string and create a naive datetime object.
    dt_str = f"{appointment_date}T{start_time}"
    dt_naive = datetime.fromisoformat(dt_str)
    
    # Determine timezone string
    tz_str = None
    
    # Use location's timezone field when available
    if hasattr(location, 'timezone') and location.timezone:
        tz_str = location.timezone
    # If a default timezone was provided, use it next
    elif default_timezone:
        tz_str = default_timezone
    # Otherwise use US state-specific timezone as fallback
    elif hasattr(location, 'country_code') and location.country_code == "US" and hasattr(location, 'state') and location.state:
        # More detailed mapping based on US states
        us_state_timezone_map = {
            "AL": "America/Chicago",     # Alabama
            "AK": "America/Anchorage",   # Alaska
            "AZ": "America/Phoenix",     # Arizona
            "AR": "America/Chicago",     # Arkansas
            "CA": "America/Los_Angeles", # California
            "CO": "America/Denver",      # Colorado
            "CT": "America/New_York",    # Connecticut
            "DE": "America/New_York",    # Delaware
            "FL": "America/New_York",    # Florida (mostly, some parts use Central)
            "GA": "America/New_York",    # Georgia
            "HI": "Pacific/Honolulu",    # Hawaii
            "ID": "America/Denver",      # Idaho (partially Mountain, partially Pacific)
            "IL": "America/Chicago",     # Illinois
            "IN": "America/New_York",    # Indiana (mostly, some counties use Central)
            "IA": "America/Chicago",     # Iowa
            "KS": "America/Chicago",     # Kansas
            "KY": "America/New_York",    # Kentucky (partly Eastern, partly Central)
            "LA": "America/Chicago",     # Louisiana
            "ME": "America/New_York",    # Maine
            "MD": "America/New_York",    # Maryland
            "MA": "America/New_York",    # Massachusetts
            "MI": "America/New_York",    # Michigan (mostly, part is Central)
            "MN": "America/Chicago",     # Minnesota
            "MS": "America/Chicago",     # Mississippi
            "MO": "America/Chicago",     # Missouri
            "MT": "America/Denver",      # Montana
            "NE": "America/Chicago",     # Nebraska
            "NV": "America/Los_Angeles", # Nevada
            "NH": "America/New_York",    # New Hampshire
            "NJ": "America/New_York",    # New Jersey
            "NM": "America/Denver",      # New Mexico
            "NY": "America/New_York",    # New York
            "NC": "America/New_York",    # North Carolina
            "ND": "America/Chicago",     # North Dakota
            "OH": "America/New_York",    # Ohio
            "OK": "America/Chicago",     # Oklahoma
            "OR": "America/Los_Angeles", # Oregon
            "PA": "America/New_York",    # Pennsylvania
            "RI": "America/New_York",    # Rhode Island
            "SC": "America/New_York",    # South Carolina
            "SD": "America/Chicago",     # South Dakota
            "TN": "America/Chicago",     # Tennessee (Western part is Central, Eastern part is Eastern)
            "TX": "America/Chicago",     # Texas (mostly, Western part is Mountain)
            "UT": "America/Denver",      # Utah
            "VT": "America/New_York",    # Vermont
            "VA": "America/New_York",    # Virginia
            "WA": "America/Los_Angeles", # Washington
            "WV": "America/New_York",    # West Virginia
            "WI": "America/Chicago",     # Wisconsin
            "WY": "America/Denver",      # Wyoming
        }
        
        # Try to use the state code directly or extract it from the state name
        state_code = location.state
        if len(state_code) > 2:  # It's probably a full state name
            state_code = state_code[:2].upper()
        
        tz_str = us_state_timezone_map.get(state_code, "America/New_York")
    else:
        # Last resort - use UTC
        tz_str = "UTC"
    
    # Attach timezone information to the naive datetime
    dt_with_tz = dt_naive.replace(tzinfo=ZoneInfo(tz_str))
    
    return dt_with_tz
