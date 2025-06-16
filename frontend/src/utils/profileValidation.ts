export const MANDATORY_PROFILE_FIELDS = {
  basic: ['phone_number', 'title_in_organization', 'organization', 'country_code', 'teacher_status'] as const,
  conditional: {
    programs_taught: (data: any) => data?.teacher_status !== 'Not a Teacher' && data?.teacher_status !== undefined && data?.teacher_status !== null
  }
} as const;

// Field categories for form organization
export const PROFILE_FIELD_CATEGORIES = {
  contact: ['phone_number', 'country_code', 'state_province', 'city'],
  professional: ['title_in_organization', 'organization'],
  aol: ['teacher_status', 'teacher_code', 'programs_taught', 'aol_affiliations']
} as const;

export interface MandatoryFieldCheck {
  field: string;
  isMissing: boolean;
  isConditional?: boolean;
}

// Helper function to get all mandatory fields for a user
export const getMandatoryFieldsForUser = (userData: any): string[] => {
  const allFields: string[] = [...MANDATORY_PROFILE_FIELDS.basic];
  
  // Add conditional fields if they apply
  Object.entries(MANDATORY_PROFILE_FIELDS.conditional).forEach(([field, condition]) => {
    if (condition(userData)) {
      allFields.push(field);
    }
  });
  
  return allFields;
};

// Helper function to get fields to show for profile completion
export const getProfileCompletionFields = (userData?: any): string[] => {
  // Include all categories and all mandatory fields
  const categories = Object.keys(PROFILE_FIELD_CATEGORIES);
  const mandatoryFields = getMandatoryFieldsForUser(userData || {});
  
  return [...categories, ...mandatoryFields];
};

// Helper function to check if a field is mandatory
export const isMandatoryField = (fieldName: string, userData?: any): boolean => {
  // Check basic mandatory fields
  const basicFieldsArray = Array.from(MANDATORY_PROFILE_FIELDS.basic);
  if (basicFieldsArray.some(field => field === fieldName)) {
    return true;
  }
  
  // Check conditional mandatory fields
  if (fieldName in MANDATORY_PROFILE_FIELDS.conditional) {
    const condition = MANDATORY_PROFILE_FIELDS.conditional[fieldName as keyof typeof MANDATORY_PROFILE_FIELDS.conditional];
    return userData ? condition(userData) : false;
  }
  
  return false;
};

export const checkMandatoryFields = (userData: any): MandatoryFieldCheck[] => {
  const checks: MandatoryFieldCheck[] = [];
  
  // Check basic mandatory fields
  MANDATORY_PROFILE_FIELDS.basic.forEach(field => {
    const value = userData?.[field];
    const isMissing = !value || (typeof value === 'string' && value.trim() === '');
    
    checks.push({
      field,
      isMissing,
      isConditional: false
    });
  });
  
  // Check conditional mandatory fields
  Object.entries(MANDATORY_PROFILE_FIELDS.conditional).forEach(([field, condition]) => {
    if (condition(userData)) {
      const value = userData?.[field];
      const isMissing = !value || (Array.isArray(value) && value.length === 0);
      
      checks.push({
        field,
        isMissing,
        isConditional: true
      });
    }
  });
  
  return checks;
};

export const isProfileComplete = (userData: any): boolean => {
  const checks = checkMandatoryFields(userData);
  return !checks.some(check => check.isMissing);
};

export const getMissingFields = (userData: any): string[] => {
  const checks = checkMandatoryFields(userData);
  return checks.filter(check => check.isMissing).map(check => check.field);
};

export const getMissingFieldsDisplay = (userData: any): string[] => {
  const missingFields = getMissingFields(userData);
  // Import here to avoid circular dependency
  const { getFieldDisplayName } = require('../models/types');
  
  return missingFields.map(field => getFieldDisplayName(field));
}; 