import React, { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Typography,
  FormControl,
  InputLabel,
  Select,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  FormHelperText
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { isMandatoryField, MANDATORY_PROFILE_FIELDS } from '../utils/profileValidation';
import { getFieldDisplayName, NotificationPreferences, UserUpdateData, SubdivisionData } from '../models/types';
import { CountrySelect } from './selects/CountrySelect';
import { SubdivisionStateDropdown } from './selects/SubdivisionStateDropdown';

export interface ProfileFieldsFormRef {
  validate: () => boolean;
  submit: () => void;
  isValid: () => boolean;
  getFormData: () => UserUpdateData;
}

interface ProfileFieldsFormProps {
  initialData?: any;
  onSubmit: (data: UserUpdateData) => void;
  onCancel?: () => void;
  submitButtonText?: string;
  showCancelButton?: boolean;
  isSubmitting?: boolean;
  variant?: 'profile' | 'onboarding';
  fieldsToShow?: string[];
  showNotificationPreferences?: boolean;
  showInternalButton?: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  appointment_created: true,
  appointment_updated: true,
  new_appointment_request: false,
  bcc_on_all_emails: false,
};

export const ProfileFieldsForm = forwardRef<ProfileFieldsFormRef, ProfileFieldsFormProps>(({
  initialData,
  onSubmit,
  onCancel,
  submitButtonText = 'Save Changes',
  showCancelButton = true,
  isSubmitting = false,
  variant = 'profile',
  fieldsToShow,
  showNotificationPreferences = true,
  showInternalButton = true
}, ref) => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

  // Fetch countries from the backend
  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      try {
        const { data } = await api.get<any[]>('/countries/all');
        return data;
      } catch (error) {
        console.error('Error fetching countries:', error);
        enqueueSnackbar('Failed to fetch countries', { variant: 'error' });
        return [];
      }
    },
  });

  // Fetch AOL Teacher Status options
  const { data: teacherStatusOptions = [], isLoading: teacherStatusLoading } = useQuery({
    queryKey: ['aol-teacher-status-options'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/users/aol-teacher-status-options');
        return data.map(status => ({ value: status, label: status === 'Not a Teacher' ? 'No' : status }));
      } catch (error) {
        console.error('Error fetching teacher status options:', error);
        return [
          { value: 'Not a Teacher', label: 'No' },
          { value: 'Part-time Teacher', label: 'Yes - Part-time' },
          { value: 'Full-time Teacher', label: 'Yes - Full-time' }
        ];
      }
    },
  });

  // Fetch AOL Teacher Status map
  const { data: teacherStatusMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['aol-teacher-status-options-map'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Record<string, string>>('/users/aol-teacher-status-options-map');
        return data;
      } catch (error) {
        console.error('Error fetching teacher status map:', error);
        return {};
      }
    },
  });

  // Fetch AOL Program Type options
  const { data: programTypeOptions = [], isLoading: programTypeLoading } = useQuery({
    queryKey: ['aol-program-type-options'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/users/aol-program-type-options');
        return data;
      } catch (error) {
        console.error('Error fetching program type options:', error);
        return ['HP', 'Silence Program', 'Higher level Programs - DSN / VTP / TTP / Sanyam', 'Sahaj', 'AE/YES!', 'SSY'];
      }
    },
  });

  // Fetch AOL Affiliation options
  const { data: affiliationOptions = [], isLoading: affiliationLoading } = useQuery({
    queryKey: ['aol-affiliation-options'],
    queryFn: async () => {
      try {
        const { data } = await api.get<string[]>('/users/aol-affiliation-options');
        return data;
      } catch (error) {
        console.error('Error fetching affiliation options:', error);
        return ['Ashramite', 'Ashram Sevak (Short-term)', 'Swamiji / Brahmachari', 'Ashram HOD', 'Trustee', 'State Apex / STC'];
      }
    },
  });

  // Form state
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phone_number || '');
  const [countryCode, setCountryCode] = useState(initialData?.country_code || '');
  const [titleInOrganization, setTitleInOrganization] = useState(initialData?.title_in_organization || '');
  const [organization, setOrganization] = useState(initialData?.organization || '');
  const [stateProvince, setStateProvince] = useState(initialData?.state_province || '');
  const [stateProvinceCode, setStateProvinceCode] = useState(initialData?.state_province_code || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [teacherStatus, setTeacherStatus] = useState(initialData?.teacher_status || null);
  const [teacherCode, setTeacherCode] = useState(initialData?.teacher_code || '');
  const [programsTaught, setProgramsTaught] = useState<string[]>(initialData?.programs_taught || []);
  const [aolAffiliations, setAolAffiliations] = useState<string[]>(initialData?.aol_affiliations || []);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isFormValid, setIsFormValid] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Update form state when initialData changes
  useEffect(() => {
    if (initialData) {
      setPhoneNumber(initialData.phone_number || '');
      setCountryCode(initialData.country_code || '');
      setTitleInOrganization(initialData.title_in_organization || '');
      setOrganization(initialData.organization || '');
      setStateProvince(initialData.state_province || '');
      setStateProvinceCode(initialData.state_province_code || '');
      setCity(initialData.city || '');
      setTeacherStatus(initialData.teacher_status || null);
      setTeacherCode(initialData.teacher_code || '');
      setProgramsTaught(initialData.programs_taught || []);
      setAolAffiliations(initialData.aol_affiliations || []);
      
      const userPrefs = (initialData.email_notification_preferences || {}) as Partial<NotificationPreferences>;
      setNotificationPreferences({
        appointment_created: userPrefs.appointment_created ?? DEFAULT_PREFERENCES.appointment_created,
        appointment_updated: userPrefs.appointment_updated ?? DEFAULT_PREFERENCES.appointment_updated,
        new_appointment_request: userPrefs.new_appointment_request ?? DEFAULT_PREFERENCES.new_appointment_request,
        bcc_on_all_emails: userPrefs.bcc_on_all_emails ?? DEFAULT_PREFERENCES.bcc_on_all_emails,
      });
    }
  }, [initialData]);

  const shouldShowField = (fieldName: string): boolean => {
    if (!fieldsToShow) return true;
    return fieldsToShow.includes(fieldName);
  };

  // Validation logic using shared configuration
  const validateForm = useCallback(() => {
    const currentData = {
      phone_number: phoneNumber,
      country_code: countryCode,
      title_in_organization: titleInOrganization,
      organization: organization,
      teacher_status: teacherStatus,
      programs_taught: programsTaught
    };
    
    const requiredFields: string[] = [];
    const missingFieldNames: string[] = [];
    
    // Check basic mandatory fields
    MANDATORY_PROFILE_FIELDS.basic.forEach(field => {
      if (shouldShowField(field)) {
        const value = currentData[field as keyof typeof currentData];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          requiredFields.push(getFieldDisplayName(field));
          missingFieldNames.push(field);
        }
      }
    });
    
    // Check conditional mandatory fields
    Object.entries(MANDATORY_PROFILE_FIELDS.conditional).forEach(([field, condition]) => {
      if (shouldShowField(field) && condition(currentData)) {
        const value = currentData[field as keyof typeof currentData];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          requiredFields.push(getFieldDisplayName(field));
          missingFieldNames.push(field);
        }
      }
    });
    
    // Update missing fields state
    setMissingFields(missingFieldNames);
    
    return {
      isValid: requiredFields.length === 0,
      missingFieldsDisplay: requiredFields,
      missingFieldNames: missingFieldNames
    };
  }, [phoneNumber, countryCode, titleInOrganization, organization, teacherStatus, programsTaught, shouldShowField]);

  // Update validation state when form fields change
  useEffect(() => {
    const validation = validateForm();
    setIsFormValid(validation.isValid);
  }, [validateForm]);

  const getFormData = useCallback((): UserUpdateData => {
    return {
      phone_number: phoneNumber,
      country_code: countryCode,
      email_notification_preferences: notificationPreferences,
      title_in_organization: titleInOrganization,
      organization: organization,
      state_province: stateProvince,
      state_province_code: stateProvinceCode,
      city,
      teacher_status: teacherStatus,
      teacher_code: teacherCode,
      programs_taught: programsTaught,
      aol_affiliations: aolAffiliations
    };
  }, [phoneNumber, countryCode, notificationPreferences, titleInOrganization, organization, stateProvince, stateProvinceCode, city, teacherStatus, teacherCode, programsTaught, aolAffiliations]);

  const handleSubmit = useCallback(() => {
    const validation = validateForm();
    if (validation.isValid) {
      onSubmit(getFormData());
    } else {
      const fieldsList = validation.missingFieldsDisplay.join(', ');
      enqueueSnackbar(`Please complete the following required fields: ${fieldsList}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  }, [validateForm, getFormData, onSubmit, enqueueSnackbar]);

  // Helper function for external validation calls
  const isValidForm = useCallback(() => {
    const validation = validateForm();
    return validation.isValid;
  }, [validateForm]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    validate: isValidForm,
    submit: handleSubmit,
    isValid: () => isFormValid,
    getFormData
  }), [isValidForm, handleSubmit, getFormData, isFormValid]);

  const handleNotificationChange = (key: keyof NotificationPreferences) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [key]: event.target.checked
    }));
  };

  const getNotificationLabel = (key: keyof NotificationPreferences): string => {
    switch (key) {
      case 'appointment_created':
        return 'When I create a new appointment request';
      case 'appointment_updated':
        return 'When my appointment request is updated';
      case 'new_appointment_request':
        return 'When new appointment requests are created (Secretariat only)';
      case 'bcc_on_all_emails':
        return 'Receive BCC copies of all appointment-related emails sent to users (Secretariat only)';
      default:
        return key;
    }
  };

  return (
    <Box>
      {/* Contact Information section */}
      {shouldShowField('contact') && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Contact Information
          </Typography>
          
          <Grid container spacing={3}>
                          {shouldShowField('phone_number') && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    fullWidth
                    required
                    error={missingFields.includes('phone_number')}
                    helperText={missingFields.includes('phone_number') ? 'Phone number is required' : ''}
                  />
                </Grid>
              )}
            {shouldShowField('country_code') && (
              <Grid item xs={12} md={6}>
                <CountrySelect
                  label="Country"
                  value={countryCode}
                  onChange={setCountryCode}
                  helperText={missingFields.includes('country_code') ? 'Country is required' : ''}
                  required
                  error={missingFields.includes('country_code')}
                />
              </Grid>
            )}
            {shouldShowField('state_province') && (
              <Grid item xs={12} md={6}>
                <SubdivisionStateDropdown
                  label="State/Province"
                  value={stateProvince}
                  onChange={setStateProvince}
                  onStateCodeChange={setStateProvinceCode}
                  countryCode={countryCode}
                />
              </Grid>
            )}
            {shouldShowField('city') && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  fullWidth
                />
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {shouldShowField('professional') && (
        <>
          <Divider sx={{ my: 4 }} />
          
          {/* Professional Information section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Professional Information
            </Typography>
            
            <Grid container spacing={3}>
              {shouldShowField('title_in_organization') && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Title in Organization"
                    value={titleInOrganization}
                    onChange={(e) => setTitleInOrganization(e.target.value)}
                    fullWidth
                    required
                    error={missingFields.includes('title_in_organization')}
                    helperText={missingFields.includes('title_in_organization') ? 'Title in organization is required' : ''}
                  />
                </Grid>
              )}
              {shouldShowField('organization') && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Organization"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    fullWidth
                    required
                    error={missingFields.includes('organization')}
                    helperText={missingFields.includes('organization') ? 'Organization is required' : ''}
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        </>
      )}

      {shouldShowField('aol') && (
        <>
          <Divider sx={{ my: 4 }} />
          
          {/* Art of Living Information section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Art of Living Information
            </Typography>
            
            <Grid container spacing={3}>
              {shouldShowField('teacher_status') && (
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Are you an Art of Living teacher?"
                    value={teacherStatus || ''}
                    onChange={(e) => setTeacherStatus(e.target.value || null)}
                    disabled={teacherStatusLoading}
                    helperText={teacherStatusLoading ? "Loading options..." : (missingFields.includes('teacher_status') ? 'Teacher status selection is required' : '')}
                    required
                    error={missingFields.includes('teacher_status')}
                  >
                    <MenuItem value="" sx={{ color: 'text.secondary' }}>
                      <em>Unselect</em>
                    </MenuItem>
                    {teacherStatusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              {teacherStatus && teacherStatus !== teacherStatusMap['NOT_TEACHER'] && shouldShowField('teacher_code') && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Teacher Code"
                    value={teacherCode}
                    onChange={(e) => setTeacherCode(e.target.value)}
                    fullWidth
                  />
                </Grid>
              )}
            </Grid>

            {teacherStatus && teacherStatus !== teacherStatusMap['NOT_TEACHER'] && shouldShowField('programs_taught') && (
              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth disabled={programTypeLoading} required error={missingFields.includes('programs_taught')}>
                  <InputLabel>Programs you teach</InputLabel>
                  <Select
                    multiple
                    value={programsTaught}
                    onChange={(e) => setProgramsTaught(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    input={<OutlinedInput label="Programs you teach" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {programTypeOptions.map((program) => (
                      <MenuItem key={program} value={program}>
                        <Checkbox checked={programsTaught.indexOf(program) > -1} />
                        <ListItemText primary={program} />
                      </MenuItem>
                    ))}
                  </Select>
                  {missingFields.includes('programs_taught') && (
                    <FormHelperText>At least one program is required for teachers</FormHelperText>
                  )}
                </FormControl>
              </Box>
            )}

            {shouldShowField('aol_affiliations') && (
              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth disabled={affiliationLoading}>
                  <InputLabel>Art of Living Affiliations (if applicable)</InputLabel>
                  <Select
                    multiple
                    value={aolAffiliations}
                    onChange={(e) => setAolAffiliations(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    input={<OutlinedInput label="Art of Living Affiliations (if applicable)" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {affiliationOptions.map((affiliation) => (
                      <MenuItem key={affiliation} value={affiliation}>
                        <Checkbox checked={aolAffiliations.indexOf(affiliation) > -1} />
                        <ListItemText primary={affiliation} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        </>
      )}

      {showNotificationPreferences && shouldShowField('notifications') && (
        <>
          <Divider sx={{ my: 4 }} />
          
          {/* Notification Preferences section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Email Notification Preferences
            </Typography>
            
            <Grid container spacing={2}>
              {Object.keys(notificationPreferences).map((key) => {
                // Only show secretariat-specific options to secretariat users
                if ((key === 'new_appointment_request' || key === 'bcc_on_all_emails') && 
                    initialData?.role !== 'SECRETARIAT' && initialData?.role !== 'ADMIN') {
                  return null;
                }
                
                return (
                  <Grid item xs={12} key={key}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notificationPreferences[key as keyof NotificationPreferences]}
                          onChange={handleNotificationChange(key as keyof NotificationPreferences)}
                          name={key}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {getNotificationLabel(key as keyof NotificationPreferences)}
                        </Typography>
                      }
                      sx={{ ml: 0 }}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </>
      )}

      {/* Action buttons - only show if showInternalButton is true */}
      {showInternalButton && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
          {showCancelButton && onCancel && (
            <SecondaryButton onClick={onCancel}>
              Cancel
            </SecondaryButton>
          )}
          <PrimaryButton onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              submitButtonText
            )}
          </PrimaryButton>
        </Box>
      )}
    </Box>
  );
});

ProfileFieldsForm.displayName = 'ProfileFieldsForm';

export default ProfileFieldsForm; 