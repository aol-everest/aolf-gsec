import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/LibraryAdd';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';
import { UserContact, UserContactCreateData, RequestTypeConfig } from '../models/types';
import { EnumSelect } from './EnumSelect';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';

interface ContactManagementProps {
  userContacts: UserContact[];
  selectedUserContacts: UserContact[];
  requiredContactsCount: number;
  selectedRequestTypeConfig: RequestTypeConfig | null;
  onAddContact: (contact: UserContact) => void;
  onRemoveContact: (contactId: number) => void;
  onCreateContact: (contactData: UserContactCreateData) => Promise<void>;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
  mode: 'select' | 'create';
  onModeChange: (mode: 'select' | 'create') => void;
}

interface ContactFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  relationship_to_owner: string;
  notes: string;
}

export const ContactManagement: React.FC<ContactManagementProps> = ({
  userContacts,
  selectedUserContacts,
  requiredContactsCount,
  selectedRequestTypeConfig,
  onAddContact,
  onRemoveContact,
  onCreateContact,
  isExpanded,
  onToggleExpanded,
  mode,
  onModeChange,
}) => {
  const [selectedContact, setSelectedContact] = useState<UserContact | null>(null);
  const api = useApi();

  // Fetch relationship type map from the API
  const { data: relationshipTypeMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['relationship-type-map'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, string>>('/user-contacts/relationship-type-options-map');
      return data;
    },
  });

  // Helper function to get display name for contact
  const getContactDisplayName = (contact: UserContact) => {
    const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
    const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
      (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
    return isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
  };

  const contactForm = useForm<ContactFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      relationship_to_owner: '',
      notes: '',
    }
  });

  // Filter available contacts (not already selected)
  const availableContacts = userContacts.filter(
    contact => !selectedUserContacts.some(selected => selected.id === contact.id)
  );

  const handleCreateContact = async () => {
    const isValid = await contactForm.trigger();
    if (!isValid) return;

    const formData = contactForm.getValues();
    const contactData: UserContactCreateData = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      relationship_to_owner: formData.relationship_to_owner || undefined,
      notes: formData.notes || undefined,
    };

    await onCreateContact(contactData);
    contactForm.reset();
  };

  const resetForm = () => {
    contactForm.reset();
    setSelectedContact(null);
  };

  return (
    <>
      {/* List of selected contacts */}
      {selectedUserContacts.length > 0 && (
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Selected {selectedRequestTypeConfig?.attendee_label_plural || 'Attendees'} ({selectedUserContacts.length} of {requiredContactsCount})
          </Typography>
          <List>
            {selectedUserContacts.map((contact) => (
              <ListItem 
                key={contact.id}
                component={Paper}
                elevation={1}
                sx={{ 
                  mb: 1,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <ListItemText
                  primary={getContactDisplayName(contact)}
                  secondary={
                    <>
                      {contact.email && (
                        <Typography component="span" variant="body2">
                          Email: {contact.email}
                        </Typography>
                      )}
                      {contact.phone && (
                        <>
                          <br />
                          <Typography component="span" variant="body2">
                            Phone: {contact.phone}
                          </Typography>
                        </>
                      )}
                      {contact.relationship_to_owner && selectedRequestTypeConfig?.attendee_type === 'personal' && (
                        <>
                          <br />
                          <Typography component="span" variant="body2" color="text.secondary">
                            Relationship: {contact.relationship_to_owner}
                          </Typography>
                        </>
                      )}
                      {contact.notes && (
                        <>
                          <br />
                          <Typography component="span" variant="body2" color="text.secondary">
                            Notes: {contact.notes}
                          </Typography>
                        </>
                      )}
                      <br />
                      <Typography component="span" variant="caption" color="text.secondary">
                        Used in {contact.appointment_usage_count} appointment(s)
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="delete"
                    onClick={() => onRemoveContact(contact.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Grid>
      )}

      {/* Button to expand the contact form when it's collapsed */}
      {!isExpanded && (
        <Grid item xs={12}>
          <PrimaryButton
            size="medium"
            startIcon={<AddIcon />}
            onClick={() => {
              onToggleExpanded(true);
              onModeChange('select');
              resetForm();
            }}
            sx={{ mt: 2 }}
            disabled={selectedUserContacts.length >= requiredContactsCount}
          >
            {selectedUserContacts.length < requiredContactsCount
              ? `Add ${selectedRequestTypeConfig?.attendee_label_singular || 'Contact'} ${selectedUserContacts.length + 1} of ${requiredContactsCount}`
              : `All ${requiredContactsCount} ${selectedRequestTypeConfig?.attendee_label_plural?.toLowerCase() || 'contacts'} added`}
          </PrimaryButton>
        </Grid>
      )}

      {/* Contact form when expanded */}
      {isExpanded && (
        <>
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                Add a {selectedRequestTypeConfig?.attendee_label_singular || 'Contact'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                Adding {selectedRequestTypeConfig?.attendee_label_singular?.toLowerCase() || 'contact'} {selectedUserContacts.length + 1} of {requiredContactsCount}
              </Typography>
            </Box>
          </Grid>

          {/* Mode selection */}
          <Grid item xs={12}>
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={mode}
                onChange={(e) => onModeChange(e.target.value as 'select' | 'create')}
              >
                <FormControlLabel 
                  value="select" 
                  control={<Radio />} 
                  label="Select existing contact" 
                  disabled={availableContacts.length === 0}
                />
                <FormControlLabel 
                  value="create" 
                  control={<Radio />} 
                  label="Create new contact" 
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          {mode === 'select' ? (
            /* Contact selection */
            <>
              <Grid item xs={12}>
                <Autocomplete
                  options={availableContacts}
                  getOptionLabel={(contact) => `${getContactDisplayName(contact)}${contact.email ? ` (${contact.email})` : ''}`}
                  value={selectedContact}
                  onChange={(_, newValue) => setSelectedContact(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Contact"
                      placeholder="Search by name or email..."
                      fullWidth
                    />
                  )}
                  renderOption={(props, contact) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body1">
                          {getContactDisplayName(contact)}
                        </Typography>
                        {contact.email && (
                          <Typography variant="body2" color="text.secondary">
                            {contact.email}
                          </Typography>
                        )}
                        {contact.relationship_to_owner && (
                          <Typography variant="caption" color="text.secondary">
                            Relationship: {contact.relationship_to_owner}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          Used {contact.appointment_usage_count} times
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  noOptionsText={
                    availableContacts.length === 0 
                      ? "All contacts have been added to this appointment"
                      : "No contacts found"
                  }
                />
              </Grid>

              {selectedContact && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Contact Details
                    </Typography>
                    <Typography variant="body2">
                      <strong>Name:</strong> {getContactDisplayName(selectedContact)}
                    </Typography>
                    {selectedContact.email && (
                      <Typography variant="body2">
                        <strong>Email:</strong> {selectedContact.email}
                      </Typography>
                    )}
                    {selectedContact.phone && (
                      <Typography variant="body2">
                        <strong>Phone:</strong> {selectedContact.phone}
                      </Typography>
                    )}
                    {selectedContact.relationship_to_owner && (
                      <Typography variant="body2">
                        <strong>Relationship:</strong> {selectedContact.relationship_to_owner}
                      </Typography>
                    )}
                    {selectedContact.notes && (
                      <Typography variant="body2">
                        <strong>Notes:</strong> {selectedContact.notes}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              )}
            </>
          ) : (
            /* Contact creation form */
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  InputLabelProps={{ shrink: true }}
                  {...contactForm.register('first_name', { required: 'First name is required' })}
                  error={!!contactForm.formState.errors.first_name}
                  helperText={contactForm.formState.errors.first_name?.message}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  InputLabelProps={{ shrink: true }}
                  {...contactForm.register('last_name', { required: 'Last name is required' })}
                  error={!!contactForm.formState.errors.last_name}
                  helperText={contactForm.formState.errors.last_name?.message}
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  InputLabelProps={{ shrink: true }}
                  {...contactForm.register('email')}
                  error={!!contactForm.formState.errors.email}
                  helperText={contactForm.formState.errors.email?.message}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  InputLabelProps={{ shrink: true }}
                  {...contactForm.register('phone')}
                  error={!!contactForm.formState.errors.phone}
                  helperText={contactForm.formState.errors.phone?.message}
                />
              </Grid>

              {/* Conditional fields based on attendee type */}
              {selectedRequestTypeConfig?.attendee_type === 'personal' && (
                <Grid item xs={12} md={6}>
                  <Controller
                    name="relationship_to_owner"
                    control={contactForm.control}
                    render={({ field }) => (
                      <EnumSelect
                        enumType="personRelationshipType"
                        label="Relationship to You"
                        error={!!contactForm.formState.errors.relationship_to_owner}
                        helperText={contactForm.formState.errors.relationship_to_owner?.message}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  InputLabelProps={{ shrink: true }}
                  {...contactForm.register('notes')}
                  error={!!contactForm.formState.errors.notes}
                  helperText={contactForm.formState.errors.notes?.message}
                />
              </Grid>
            </>
          )}

          {/* Action buttons */}
          <Grid item xs={12}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'flex-end',
                gap: 2,
                mt: 2 
              }}
            >
              {/* Cancel button */}
              <SecondaryButton
                size="medium"
                startIcon={<CancelIcon />}
                onClick={() => {
                  resetForm();
                  onToggleExpanded(false);
                }}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                Cancel
              </SecondaryButton>
              
              {/* Add/Create button */}
              <PrimaryButton
                size="medium"
                startIcon={mode === 'select' ? <AddIcon /> : <PersonAddIcon />}
                onClick={mode === 'select' 
                  ? () => {
                      if (selectedContact) {
                        onAddContact(selectedContact);
                        resetForm();
                        onToggleExpanded(false);
                      }
                    }
                  : handleCreateContact
                }
                disabled={mode === 'select' ? !selectedContact : false}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {mode === 'select' ? 'Add Contact' : 'Create and Add'}
              </PrimaryButton>
            </Box>
          </Grid>
        </>
      )}
    </>
  );
}; 