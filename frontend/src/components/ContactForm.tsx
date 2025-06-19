import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Typography,
  Box,
  TextField,
  Grid,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useApi } from '../hooks/useApi';
import { UserContact } from '../models/types';
import { EnumSelect } from './EnumSelect';
import { useEnums, useEnumsMap } from '../hooks/useEnums';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';

export interface UserContactCreateData {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  relationship_to_owner: string;
  notes?: string;
}

// Appointment instance fields interface
interface AppointmentInstanceFields {
  hasMetGurudevRecently: boolean | null;
  isAttendingCourse: boolean | null;
  courseAttending: string;
  courseAttendingOther: string;
  isDoingSeva: boolean | null;
  sevaType: string;
  roleInTeamProject: string;
  roleInTeamProjectOther: string;
}

interface ContactFormProps {
  contact?: UserContact | null;
  mode: 'create' | 'edit';
  request_type?: string;
  fieldsToShow?: 'contact' | 'appointment' | 'both';
  onSave: (contact: UserContact, appointmentInstanceData?: AppointmentInstanceFields) => void;
  onCancel: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  mode,
  request_type,
  fieldsToShow = 'both',
  onSave,
  onCancel
}) => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

  // Fetch role enum values
  const { values: roleValues } = useEnums('roleInTeamProject');

  // Fetch relationship type map
  const { values: relationshipTypeMap = {} } = useEnumsMap('personRelationshipType');

  // State for appointment instance fields
  const [appointmentInstanceFields, setAppointmentInstanceFields] = useState<AppointmentInstanceFields>({
    hasMetGurudevRecently: null,
    isAttendingCourse: null,
    courseAttending: '',
    courseAttendingOther: '',
    isDoingSeva: null,
    sevaType: '',
    roleInTeamProject: '',
    roleInTeamProjectOther: ''
  });



  // Fetch request type map from the API
  const { data: requestTypeMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['request-type-map'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, string>>('/appointments/request-type-options-map');
      return data;
    },
  });

  const contactForm = useForm<UserContactCreateData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      relationship_to_owner: '',
      notes: '',
    }
  });

  // Update form values when contact prop changes (for edit mode)
  useEffect(() => {

    console.log('contact to edit', contact);

    if (mode === 'edit' && contact) {
      contactForm.reset({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        relationship_to_owner: contact.relationship_to_owner || '',
        notes: contact.notes || '',
      });
    } else if (mode === 'create') {
      contactForm.reset({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        relationship_to_owner: '',
        notes: '',
      });
    }
  }, [contact, mode, contactForm]);

  // Helper function to update appointment instance field
  const updateAppointmentInstanceField = (field: keyof AppointmentInstanceFields, value: any) => {
    setAppointmentInstanceFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to check if this is a self-contact
  const isSelfContact = () => {
    if (!contact || !relationshipTypeMap) return false;
    const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
    return contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
           (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
  };

  // Helper function to get the correct pronoun
  const getPersonPronoun = () => {
    return isSelfContact() ? 'you' : 'they';
  };

  const getPersonPronounCapitalized = () => {
    return isSelfContact() ? 'You' : 'They';
  };

  const getHaveVerb = () => {
    return isSelfContact() ? 'Have you' : 'Have they';
  };

  const getAreVerb = () => {
    return isSelfContact() ? 'Are you' : 'Are they';
  };

  // Render appointment instance fields based on request type
  const renderAppointmentInstanceFields = () => {
    if (!request_type) return null;

    // Case statement for different request types
    switch (request_type) {
      case requestTypeMap['PROJECT_TEAM_MEETING']:
        // For project/team meetings, only show role fields
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Project/Team Role Information
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <FormControl fullWidth required>
                <InputLabel>Role in Project/Team</InputLabel>
                <Select
                  label="Role in Project/Team"
                  value={appointmentInstanceFields.roleInTeamProject}
                  onChange={(e) => {
                    updateAppointmentInstanceField('roleInTeamProject', e.target.value as string);
                    // Clear other field when role changes
                    if (e.target.value !== 'Other') {
                      updateAppointmentInstanceField('roleInTeamProjectOther', '');
                    }
                  }}
                >
                  {roleValues.map((value) => (
                    <MenuItem key={value} value={value}>
                      <Box>
                        <Typography variant="body1">{value}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {value === 'Lead Member' ? '(owns initiative)' :
                           value === 'Core Team Member' ? '(involved 80%)' :
                           ''}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {appointmentInstanceFields.roleInTeamProject === 'Other' && (
              <Grid item xs={12} md={6} lg={4}>
                <TextField
                  fullWidth
                  label="Please specify role"
                  value={appointmentInstanceFields.roleInTeamProjectOther}
                  onChange={(e) => updateAppointmentInstanceField('roleInTeamProjectOther', e.target.value)}
                  placeholder="Enter role details"
                  required
                />
              </Grid>
            )}
          </Grid>
        );
      
      case requestTypeMap['PERSONAL']:
      case requestTypeMap['DIGNITARY']:
      case requestTypeMap['OTHER']:
      default:
        // For other request types, show engagement fields
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Details required for the appointment
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4} lg={3}>
                  <FormControl component="fieldset" required>
                    <FormLabel component="legend">
                      {getHaveVerb()} met Gurudev in last 2 weeks?
                    </FormLabel>
                    <RadioGroup
                      row
                      value={appointmentInstanceFields.hasMetGurudevRecently?.toString() || ''}
                      onChange={(e) => updateAppointmentInstanceField('hasMetGurudevRecently', e.target.value === 'true')}
                    >
                      <FormControlLabel value="true" control={<Radio />} label="Yes" />
                      <FormControlLabel value="false" control={<Radio />} label="No" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4} lg={3}>
                  <FormControl component="fieldset" required>
                    <FormLabel component="legend">
                      {getAreVerb()} attending a course?
                    </FormLabel>
                    <RadioGroup
                      row
                      value={appointmentInstanceFields.isAttendingCourse?.toString() || ''}
                      onChange={(e) => {
                        const isAttending = e.target.value === 'true';
                        updateAppointmentInstanceField('isAttendingCourse', isAttending);
                        
                        // Clear course selection if not attending
                        if (!isAttending) {
                          updateAppointmentInstanceField('isDoingSeva', null);
                          updateAppointmentInstanceField('sevaType', '');
                        }
                      }}
                    >
                      <FormControlLabel value="true" control={<Radio />} label="Yes" />
                      <FormControlLabel value="false" control={<Radio />} label="No" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {appointmentInstanceFields.isAttendingCourse && (
                  <Grid item xs={12} md={4} lg={3}>
                    <EnumSelect
                      enumType="courseType"
                      label="Course Attending"
                      value={appointmentInstanceFields.courseAttending}
                      onChange={(e) => {
                        updateAppointmentInstanceField('courseAttending', e.target.value as string);
                        // Clear other field when course type changes
                        if (e.target.value !== 'OTHER') {
                          updateAppointmentInstanceField('courseAttendingOther', '');
                        }
                      }}
                      fullWidth
                    />
                  </Grid>
                )}

                {appointmentInstanceFields.isAttendingCourse && appointmentInstanceFields.courseAttending === 'OTHER' && (
                  <Grid item xs={12} md={4} lg={3}>
                    <TextField
                      fullWidth
                      label="Please specify course"
                      value={appointmentInstanceFields.courseAttendingOther}
                      onChange={(e) => updateAppointmentInstanceField('courseAttendingOther', e.target.value)}
                      placeholder="Enter course name"
                    />
                  </Grid>
                )}

                {appointmentInstanceFields.isAttendingCourse !== null && !appointmentInstanceFields.isAttendingCourse && (
                  <>
                    <Grid item xs={12} md={4} lg={3}>
                      <FormControl component="fieldset" required>
                        <FormLabel component="legend">
                          {getAreVerb()} doing seva?
                        </FormLabel>
                        <RadioGroup
                          row
                          value={appointmentInstanceFields.isDoingSeva?.toString() || ''}
                          onChange={(e) => {
                            const isDoingSeva = e.target.value === 'true';
                            updateAppointmentInstanceField('isDoingSeva', isDoingSeva);
                            
                            // Clear seva type if not doing seva
                            if (!isDoingSeva) {
                              updateAppointmentInstanceField('sevaType', '');
                            }
                          }}
                        >
                          <FormControlLabel value="true" control={<Radio />} label="Yes" />
                          <FormControlLabel value="false" control={<Radio />} label="No" />
                        </RadioGroup>
                      </FormControl>
                    </Grid>

                    {appointmentInstanceFields.isDoingSeva && (
                      <Grid item xs={12} md={4} lg={3}>
                        <EnumSelect
                          enumType="sevaType"
                          label="Type of Seva"
                          value={appointmentInstanceFields.sevaType}
                          onChange={(e) => updateAppointmentInstanceField('sevaType', e.target.value as string)}
                          fullWidth
                        />
                      </Grid>
                    )}
                  </>
                )}
              </Grid> 
            </Grid>
          </Grid>
        );
    }
  };

  // Create mutation
  const createContactMutation = useMutation<UserContact, Error, UserContactCreateData>({
    mutationFn: async (data: UserContactCreateData) => {
      const { data: response } = await api.post<UserContact>('/contacts', data);
      return response;
    },
    onSuccess: (newContact) => {
      onSave(newContact, appointmentInstanceFields);
      enqueueSnackbar('Contact created successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      console.error('Failed to create contact:', error);
      enqueueSnackbar(`Failed to create contact: ${error.response?.data?.detail || 'Unknown error'}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Update mutation
  const updateContactMutation = useMutation<UserContact, Error, UserContactCreateData>({
    mutationFn: async (data: UserContactCreateData) => {
      if (!contact?.id) throw new Error('Contact ID is required for update');
      const { data: response } = await api.patch<UserContact>(`/contacts/${contact.id}`, data);
      return response;
    },
    onSuccess: (updatedContact) => {
      onSave(updatedContact, appointmentInstanceFields);
      enqueueSnackbar('Contact updated successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      console.error('Failed to update contact:', error);
      enqueueSnackbar(`Failed to update contact: ${error.response?.data?.detail || 'Unknown error'}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  const handleSave = async () => {
    // Only validate visible fields
    const fieldsToValidate: (keyof UserContactCreateData)[] = [];
    
    if (fieldsToShow !== 'appointment') {
      // Validate contact fields when they're visible
      fieldsToValidate.push('first_name', 'last_name', 'relationship_to_owner');
      // Email validation is handled in the register options, only add if it has a value
      const emailValue = contactForm.getValues('email');
      if (emailValue) {
        fieldsToValidate.push('email');
      }
    }
    
    // Trigger validation only for visible fields
    const isValid = fieldsToValidate.length > 0 ? await contactForm.trigger(fieldsToValidate) : true;
    
    if (!isValid) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
      return;
    }

    const formData = contactForm.getValues();
    const contactData: UserContactCreateData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      relationship_to_owner: formData.relationship_to_owner,
      notes: formData.notes || undefined,
    };

    if (mode === 'create') {
      createContactMutation.mutate(contactData);
    } else {
      updateContactMutation.mutate(contactData);
    }
  };

  return (
    <Grid item xs={12}>
      <Divider sx={{ my: 2 }} />
      {fieldsToShow !== 'appointment' && (
        <>
          <Typography variant="subtitle1" gutterBottom>
            {mode === 'create' ? 'Add a New Contact' : 'Edit Contact'}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {mode === 'create' 
              ? 'Enter the contact\'s information and click "Save and Add" at the bottom.' 
              : 'Update contact information and click "Save Changes" at the bottom.'
            }
          </Typography>
        </>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Contact Fields Section - Hidden when fieldsToShow='appointment' */}
        <Grid item xs={12} sx={{ display: fieldsToShow === 'appointment' ? 'none' : 'block' }}>
          <Grid container spacing={3}>
            {/* Relationship Type */}
            <Grid item xs={12} md={6} lg={4}>
              <Controller
                name="relationship_to_owner"
                control={contactForm.control}
                rules={{ required: fieldsToShow !== 'appointment' ? 'Relationship type is required' : false }}
                render={({ field }) => (
                  <EnumSelect
                    enumType="personRelationshipType"
                    label="Relationship to You"
                    error={!!contactForm.formState.errors.relationship_to_owner}
                    helperText={contactForm.formState.errors.relationship_to_owner?.message}
                    value={field.value}
                    onChange={field.onChange}
                    required={fieldsToShow !== 'appointment'}
                  />
                )}
              />
            </Grid>

            {/* First Name */}
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="First Name"
                {...contactForm.register('first_name', { required: fieldsToShow !== 'appointment' ? 'First name is required' : false })}
                error={!!contactForm.formState.errors.first_name}
                helperText={contactForm.formState.errors.first_name?.message}
                required={fieldsToShow !== 'appointment'}
              />
            </Grid>

            {/* Last Name */}
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Last Name"
                {...contactForm.register('last_name', { required: fieldsToShow !== 'appointment' ? 'Last name is required' : false })}
                error={!!contactForm.formState.errors.last_name}
                helperText={contactForm.formState.errors.last_name?.message}
                required={fieldsToShow !== 'appointment'}
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                {...contactForm.register('email', {
                  pattern: fieldsToShow !== 'appointment' ? {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Please enter a valid email address'
                  } : undefined
                })}
                error={!!contactForm.formState.errors.email}
                helperText={contactForm.formState.errors.email?.message}
              />
            </Grid>

            {/* Phone */}
            <Grid item xs={12} md={6} lg={4}>
              <TextField
                fullWidth
                label="Phone Number"
                {...contactForm.register('phone')}
                error={!!contactForm.formState.errors.phone}
                helperText={contactForm.formState.errors.phone?.message}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                {...contactForm.register('notes')}
                error={!!contactForm.formState.errors.notes}
                helperText={contactForm.formState.errors.notes?.message}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Appointment Instance Fields Section - Hidden when fieldsToShow='contact' */}
        <Grid item xs={12} sx={{ display: fieldsToShow === 'contact' ? 'none' : 'block' }}>
          {/* Appointment Instance Fields */}
          {renderAppointmentInstanceFields()}
        </Grid>

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <SecondaryButton onClick={onCancel}>
              Cancel
            </SecondaryButton>
            <PrimaryButton 
              onClick={handleSave}
              disabled={createContactMutation.isPending || updateContactMutation.isPending}
            >
              {(createContactMutation.isPending || updateContactMutation.isPending) 
                ? 'Saving...' 
                : mode === 'create' 
                  ? 'Save and Add' 
                  : 'Save Changes'
              }
            </PrimaryButton>
          </Box>
        </Grid>
      </Grid>
    </Grid>
  );
}; 