import React, { useState } from 'react';
import {
  Grid,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Autocomplete,
  TextField,
} from '@mui/material';
import { UserContact } from '../models/types';
import { PrimaryButton } from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import AddIcon from '@mui/icons-material/LibraryAdd';
import CancelIcon from '@mui/icons-material/Cancel';

// Configuration interface for customizing behavior
export interface UserContactSelectorConfig {
  title?: string;
  description?: string;
  maxContacts?: number;
}

// Props interface for the component
export interface UserContactSelectorProps {
  // Data
  userContacts: UserContact[];
  selectedContacts: UserContact[];
  relationshipTypeMap: Record<string, string>;
  
  // Callbacks
  onContactAdd: (contact: UserContact) => void;
  onCancel: () => void;
  
  // Configuration
  config?: UserContactSelectorConfig;
  
  // UI State
  disabled?: boolean;
}

const defaultConfig: UserContactSelectorConfig = {
  title: "Select Existing Contact",
  description: "Choose from your existing contacts.",
  maxContacts: 15,
};

export const UserContactSelector: React.FC<UserContactSelectorProps> = ({
  userContacts,
  selectedContacts,
  relationshipTypeMap,
  onContactAdd,
  onCancel,
  config = {},
  disabled = false,
}) => {
  const finalConfig = { ...defaultConfig, ...config };
  const [selectedContactId, setSelectedContactId] = useState<number | ''>('');

  // Filter out already selected contacts and self contacts
  const availableContacts = userContacts.filter(
    contact => !selectedContacts.some(selected => selected.id === contact.id) &&
               contact.relationship_to_owner !== relationshipTypeMap['SELF']
  );

  const handleContactSelect = () => {
    if (selectedContactId && typeof selectedContactId === 'number') {
      const contact = userContacts.find(c => c.id === selectedContactId);
      if (contact) {
        onContactAdd(contact);
        setSelectedContactId('');
      }
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" gutterBottom>
          {finalConfig.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {finalConfig.description}
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Autocomplete
          fullWidth
          options={availableContacts}
          value={availableContacts.find(c => c.id === selectedContactId) || undefined}
          onChange={(_, newValue) => {
            setSelectedContactId(newValue?.id || '');
          }}
          getOptionLabel={(contact) => {
            const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
            const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
              (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
            
            return isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
          }}
          renderOption={(props, contact) => {
            const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
            const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
              (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
            
            const displayName = isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
            const relationship = contact.relationship_to_owner;
            
            return (
              <Box component="li" {...props} key={contact.id}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body2">
                    {displayName}
                  </Typography>
                  {relationship && !isSelfContact && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {relationship}
                    </Typography>
                  )}
                  {contact.email && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {contact.email}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Contact"
              placeholder="Search for a contact..."
              autoComplete="off"
              required
            />
          )}
          disabled={disabled || availableContacts.length === 0}
          disableClearable
          filterOptions={(options, { inputValue }) => {
            if (!inputValue) return options;
            
            const searchTerm = inputValue.toLowerCase();
            return options.filter(contact => {
              const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
              const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
                (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
              
              const displayName = isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
              const email = contact.email || '';
              const relationship = contact.relationship_to_owner || '';
              
              return displayName.toLowerCase().includes(searchTerm) || 
                     email.toLowerCase().includes(searchTerm) || 
                     relationship.toLowerCase().includes(searchTerm);
            });
          }}
          noOptionsText={availableContacts.length === 0 ? "All contacts have been added" : "No contacts found"}
          isOptionEqualToValue={(option, value) => option.id === value.id}
        />
      </Grid>

      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <SecondaryButton
            startIcon={<CancelIcon />}
            onClick={onCancel}
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            startIcon={<AddIcon />}
            onClick={handleContactSelect}
            disabled={!selectedContactId || disabled}
          >
            Add Contact
          </PrimaryButton>
        </Box>
      </Grid>
    </Grid>
  );
};

export default UserContactSelector; 