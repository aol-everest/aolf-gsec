from typing import List, Dict, Any, Optional
from models.user import User
from models.enums import AOLTeacherStatus

# Mandatory profile fields (based on frontend profileValidation.ts)
MANDATORY_PROFILE_FIELDS = {
    'basic': ['phone_number', 'title_in_organization', 'organization', 'country_code', 'teacher_status'],
    'conditional': {
        'programs_taught': lambda user_data: (
            user_data.get('teacher_status') not in [None, AOLTeacherStatus.NOT_TEACHER] and
            user_data.get('teacher_status') != 'Not a Teacher'
        )
    }
}

def get_mandatory_fields_for_user(user_data: Dict[str, Any]) -> List[str]:
    """Get all mandatory fields for a user based on their data"""
    all_fields = MANDATORY_PROFILE_FIELDS['basic'].copy()
    
    # Add conditional fields if they apply
    for field, condition in MANDATORY_PROFILE_FIELDS['conditional'].items():
        if condition(user_data):
            all_fields.append(field)
    
    return all_fields

def is_mandatory_field(field_name: str, user_data: Optional[Dict[str, Any]] = None) -> bool:
    """Check if a field is mandatory for the given user data"""
    # Check basic mandatory fields
    if field_name in MANDATORY_PROFILE_FIELDS['basic']:
        return True
    
    # Check conditional mandatory fields
    if field_name in MANDATORY_PROFILE_FIELDS['conditional'] and user_data:
        condition = MANDATORY_PROFILE_FIELDS['conditional'][field_name]
        return condition(user_data)
    
    return False

def check_mandatory_fields(user_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Check which mandatory fields are missing for a user"""
    checks = []
    
    # Check basic mandatory fields
    for field in MANDATORY_PROFILE_FIELDS['basic']:
        value = user_data.get(field)
        is_missing = not value or (isinstance(value, str) and value.strip() == '')
        
        checks.append({
            'field': field,
            'is_missing': is_missing,
            'is_conditional': False
        })
    
    # Check conditional mandatory fields
    for field, condition in MANDATORY_PROFILE_FIELDS['conditional'].items():
        if condition(user_data):
            value = user_data.get(field)
            is_missing = not value or (isinstance(value, list) and len(value) == 0)
            
            checks.append({
                'field': field,
                'is_missing': is_missing,
                'is_conditional': True
            })
    
    return checks

def is_profile_complete(user_data: Dict[str, Any]) -> bool:
    """Check if a user's profile is complete based on mandatory fields"""
    checks = check_mandatory_fields(user_data)
    return not any(check['is_missing'] for check in checks)

def get_missing_fields(user_data: Dict[str, Any]) -> List[str]:
    """Get list of missing mandatory fields for a user"""
    checks = check_mandatory_fields(user_data)
    return [check['field'] for check in checks if check['is_missing']]

def user_to_dict(user: User) -> Dict[str, Any]:
    """Convert User model to dictionary for validation"""
    return {
        'phone_number': user.phone_number,
        'title_in_organization': user.title_in_organization,
        'organization': user.organization,
        'country_code': user.country_code,
        'teacher_status': user.teacher_status,
        'programs_taught': user.programs_taught,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email
    }

def get_missing_fields_display_names(missing_fields: List[str]) -> List[str]:
    """Convert field names to user-friendly display names"""
    field_display_map = {
        'phone_number': 'Phone Number',
        'title_in_organization': 'Job Title',
        'organization': 'Organization',
        'country_code': 'Country',
        'teacher_status': 'Teacher Status',
        'programs_taught': 'Programs Taught'
    }
    
    return [field_display_map.get(field, field) for field in missing_fields] 