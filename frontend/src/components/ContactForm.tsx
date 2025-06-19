import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  TextField,
  Grid,
  Divider,
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

interface ContactFormProps {
  open?: boolean; // Optional for inline mode
  onClose?: () => void; // Optional for inline mode
  contact?: UserContact | null;
  mode: 'create' | 'edit';
  onSuccess: (contact: UserContact) => void;
  inline?: boolean; // New prop to determine if rendering inline
  onCancel?: () => void; // For inline mode
}

export const ContactForm: React.FC<ContactFormProps> = ({
  open = false,
  onClose,
  contact,
  mode,
  onSuccess,
  inline = false,
  onCancel
}) => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();

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

  // Create mutation
  const createContactMutation = useMutation<UserContact, Error, UserContactCreateData>({
    mutationFn: async (data: UserContactCreateData) => {
      const { data: response } = await api.post<UserContact>('/contacts', data);
      return response;
    },
    onSuccess: (newContact) => {
      onSuccess(newContact);
      enqueueSnackbar('Contact created successfully', { variant: 'success' });
      if (!inline && onClose) onClose();
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
      onSuccess(updatedContact);
      enqueueSnackbar('Contact updated successfully', { variant: 'success' });
      if (!inline && onClose) onClose();
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

  const handleCancel = () => {
    if (inline && onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  const formContent = (
    <Grid container spacing={3} sx={{ mx: 0 }}>
      {/* Form title and description for inline mode */}
      {inline && (
        <>
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
          </Grid>
        </>
      )}

      {/* Relationship Type */}
      <Grid item xs={12} md={6}>
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
      <Grid item xs={12} md={6}>
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
      <Grid item xs={12} md={6}>
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
      <Grid item xs={12} md={6}>
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
      <Grid item xs={12} md={6}>
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

      {/* Action Buttons */}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
          <SecondaryButton onClick={handleCancel}>
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
  );

  // Render inline or in dialog based on the inline prop
  if (inline) {
    return formContent;
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleCancel}
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        {mode === 'create' ? 'Add New Contact' : 'Edit Contact'}
      </DialogTitle>
      <DialogContent>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}; 