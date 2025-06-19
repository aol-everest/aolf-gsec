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
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useApi } from '../hooks/useApi';
import { UserContact } from '../models/types';
import { EnumSelect } from './EnumSelect';
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

// Engagement fields interface
interface EngagementFields {
  hasMetGurudevRecently: boolean | null;
  isAttendingCourse: boolean | null;
  courseAttending: string;
  isDoingSeva: boolean | null;
  sevaType: string;
}

interface ContactFormProps {
  contact?: UserContact | null;
  mode: 'create' | 'edit';
  request_type?: string;
  onSave: (contact: UserContact, engagementData?: EngagementFields) => void;
  onCancel: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  mode,
  request_type,
  onSave,
  onCancel
}) => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

  // State for engagement fields
  const [engagementFields, setEngagementFields] = useState<EngagementFields>({
    hasMetGurudevRecently: null,
    isAttendingCourse: null,
    courseAttending: '',
    isDoingSeva: null,
    sevaType: ''
  });

  // Fetch relationship type map from the API
  const { data: relationshipTypeMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['relationship-type-map'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, string>>('/user-contacts/relationship-type-options-map');
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

  // Helper function to update engagement field
  const updateEngagementField = (field: keyof EngagementFields, value: any) => {
    setEngagementFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Render appointment instance fields based on request type
  const appointmentInstanceFields = () => {
    if (!request_type) return null;

    // Case statement for different request types
    switch (request_type) {
      case 'Personal':
      case 'Dignitary':
      case 'Project':
      case 'Team':
      default:
        // For now, all request types get the same fields
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
                      Have they met Gurudev in last 2 weeks?
                    </FormLabel>
                    <RadioGroup
                      row
                      value={engagementFields.hasMetGurudevRecently?.toString() || ''}
                      onChange={(e) => updateEngagementField('hasMetGurudevRecently', e.target.value === 'true')}
                    >
                      <FormControlLabel value="true" control={<Radio />} label="Yes" />
                      <FormControlLabel value="false" control={<Radio />} label="No" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={4} lg={3}>
                  <FormControl component="fieldset" required>
                    <FormLabel component="legend">
                      Are they attending a course?
                    </FormLabel>
                    <RadioGroup
                      row
                      value={engagementFields.isAttendingCourse?.toString() || ''}
                      onChange={(e) => {
                        const isAttending = e.target.value === 'true';
                        updateEngagementField('isAttendingCourse', isAttending);
                        
                        // Clear course selection if not attending
                        if (!isAttending) {
                          updateEngagementField('isDoingSeva', null);
                          updateEngagementField('sevaType', '');
                        }
                      }}
                    >
                      <FormControlLabel value="true" control={<Radio />} label="Yes" />
                      <FormControlLabel value="false" control={<Radio />} label="No" />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {engagementFields.isAttendingCourse && (
                  <Grid item xs={12} md={4} lg={3}>
                    <EnumSelect
                      enumType="courseType"
                      label="Course Attending"
                      value={engagementFields.courseAttending}
                      onChange={(e) => updateEngagementField('courseAttending', e.target.value as string)}
                      fullWidth
                    />
                  </Grid>
                )}

                {engagementFields.isAttendingCourse !== null && !engagementFields.isAttendingCourse && (
                  <>
                    <Grid item xs={12} md={4} lg={3}>
                      <FormControl component="fieldset" required>
                        <FormLabel component="legend">
                          Are they doing seva?
                        </FormLabel>
                        <RadioGroup
                          row
                          value={engagementFields.isDoingSeva?.toString() || ''}
                          onChange={(e) => {
                            const isDoingSeva = e.target.value === 'true';
                            updateEngagementField('isDoingSeva', isDoingSeva);
                            
                            // Clear seva type if not doing seva
                            if (!isDoingSeva) {
                              updateEngagementField('sevaType', '');
                            }
                          }}
                        >
                          <FormControlLabel value="true" control={<Radio />} label="Yes" />
                          <FormControlLabel value="false" control={<Radio />} label="No" />
                        </RadioGroup>
                      </FormControl>
                    </Grid>

                    {engagementFields.isDoingSeva && (
                      <Grid item xs={12} md={4} lg={3}>
                        <EnumSelect
                          enumType="sevaType"
                          label="Type of Seva"
                          value={engagementFields.sevaType}
                          onChange={(e) => updateEngagementField('sevaType', e.target.value as string)}
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
      onSave(newContact, engagementFields);
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
      onSave(updatedContact, engagementFields);
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
    const isValid = await contactForm.trigger();
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
      <Typography variant="subtitle1" gutterBottom>
        {mode === 'create' ? 'Add a New Contact' : 'Edit Contact'}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {mode === 'create' 
          ? 'Enter the contact\'s information and click "Save and Add" at the bottom.' 
          : 'Update contact information and click "Save Changes" at the bottom.'
        }
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {/* Relationship Type */}
        <Grid item xs={12} md={6} lg={4}>
          <Controller
            name="relationship_to_owner"
            control={contactForm.control}
            rules={{ required: 'Relationship type is required' }}
            render={({ field }) => (
              <EnumSelect
                enumType="personRelationshipType"
                label="Relationship to You"
                error={!!contactForm.formState.errors.relationship_to_owner}
                helperText={contactForm.formState.errors.relationship_to_owner?.message}
                value={field.value}
                onChange={field.onChange}
                required
              />
            )}
          />
        </Grid>

        {/* First Name */}
        <Grid item xs={12} md={6} lg={4}>
          <TextField
            fullWidth
            label="First Name"
            {...contactForm.register('first_name', { required: 'First name is required' })}
            error={!!contactForm.formState.errors.first_name}
            helperText={contactForm.formState.errors.first_name?.message}
            required
          />
        </Grid>

        {/* Last Name */}
        <Grid item xs={12} md={6} lg={4}>
          <TextField
            fullWidth
            label="Last Name"
            {...contactForm.register('last_name', { required: 'Last name is required' })}
            error={!!contactForm.formState.errors.last_name}
            helperText={contactForm.formState.errors.last_name?.message}
            required
          />
        </Grid>

        {/* Email */}
        <Grid item xs={12} md={6} lg={4}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            {...contactForm.register('email', {
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email address'
              }
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

        <Grid item xs={12}>
            {/* Appointment Instance Fields */}
            {appointmentInstanceFields()}
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