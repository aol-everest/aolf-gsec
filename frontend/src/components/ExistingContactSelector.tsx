import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Divider,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { UserContact } from '../models/types';

interface ExistingContactSelectorProps {
  open: boolean;
  onClose: () => void;
  contacts: UserContact[];
  selectedContacts: UserContact[];
  onContactSelect: (contact: UserContact) => void;
  relationshipTypeMap: Record<string, string>;
}

export const ExistingContactSelector: React.FC<ExistingContactSelectorProps> = ({
  open,
  onClose,
  contacts,
  selectedContacts,
  onContactSelect,
  relationshipTypeMap
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<UserContact | null>(null);

  // Filter contacts based on search term and exclude already selected ones
  const availableContacts = contacts.filter(contact => {
    const isAlreadySelected = selectedContacts.some(selected => selected.id === contact.id);
    if (isAlreadySelected) return false;

    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const email = contact.email?.toLowerCase() || '';
    const relationship = contact.relationship_to_owner?.toLowerCase() || '';
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           relationship.includes(searchLower);
  });

  const handleContactClick = (contact: UserContact) => {
    setSelectedContact(contact);
  };

  const handleAddContact = () => {
    if (selectedContact) {
      onContactSelect(selectedContact);
      setSelectedContact(null);
      setSearchTerm('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedContact(null);
    setSearchTerm('');
    onClose();
  };

  const formatContactName = (contact: UserContact) => {
    const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
    const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
      (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
    return isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Select Existing Contact</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Search field */}
        <TextField
          fullWidth
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Contact list */}
        {availableContacts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {searchTerm ? 'No contacts found matching your search.' : 'All contacts have been added to this appointment.'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {availableContacts.map((contact, index) => (
              <React.Fragment key={contact.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleContactClick(contact)}
                    selected={selectedContact?.id === contact.id}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {formatContactName(contact)}
                          </Typography>
                          {contact.relationship_to_owner === relationshipTypeMap['SELF'] && (
                            <Chip
                              label="You"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
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
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
                {index < availableContacts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <SecondaryButton onClick={handleClose}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          onClick={handleAddContact}
          disabled={!selectedContact}
        >
          Add Contact
        </PrimaryButton>
      </DialogActions>
    </Dialog>
  );
};

export default ExistingContactSelector; 