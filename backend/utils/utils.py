
from datetime import datetime

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
