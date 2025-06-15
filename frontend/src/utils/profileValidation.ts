export const MANDATORY_PROFILE_FIELDS = {
  basic: ['phone_number', 'title_in_organization', 'organization', 'country_code', 'teacher_status'] as const,
  conditional: {
    programs_taught: (data: any) => data?.teacher_status !== 'Not a Teacher' && data?.teacher_status !== undefined && data?.teacher_status !== null
  }
} as const;

export interface MandatoryFieldCheck {
  field: string;
  isMissing: boolean;
  isConditional?: boolean;
}

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
  const displayMap: Record<string, string> = {
    phone_number: 'Phone Number',
    title_in_organization: 'Title in Organization',
    organization: 'Organization',
    country_code: 'Country',
    teacher_status: 'Art of Living Teacher Status',
    programs_taught: 'Programs Taught'
  };
  
  return missingFields.map(field => displayMap[field] || field);
}; 