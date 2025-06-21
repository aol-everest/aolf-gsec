import React, { useMemo, useState } from 'react';
import { Container, Typography, Paper, Box, useMediaQuery, Dialog, DialogTitle, DialogContent, IconButton, Tooltip, DialogActions, Button } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useTheme } from '@mui/material/styles';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { GenericTable, TableCellComponents, standardColumnSizes, createGenericColumnHelper } from '../components/GenericTable';
import { useEnumsMap } from '../hooks/useEnums';
import { ContactForm } from '../components/ContactForm';
import { UserContact } from '../models/types';
import { ActionButton } from '../components/ActionButton';
import { CloseIconFilledCircleV2, EditIconV2, InfoCircleIconV2, TrashIconV2, WarningTriangleFilledIconV2 } from '../components/iconsv2';
import { useSnackbar } from 'notistack';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';

interface ContactsResponse {
  contacts: UserContact[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

const ContactsList: React.FC = () => {
  const api = useApi();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  
  // Check if we're on mobile
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Dialog state for editing contacts
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<UserContact | null>(null);

  // Dialog state for deleting contacts
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<UserContact | null>(null);

  // Fetch relationship type map for display
  const { values: relationshipTypeMap = {} } = useEnumsMap('personRelationshipType');

  const { data: contactsResponse, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      try {
        const { data } = await api.get<ContactsResponse>('/contacts/?per_page=100&sort_by=usage');
        return data;
      } catch (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }
    },
  });

  // Filter out self contacts
  const contacts = useMemo(() => {
    const allContacts = contactsResponse?.contacts || [];
    return allContacts.filter(contact => 
      contact.relationship_to_owner !== relationshipTypeMap['SELF']
    );
  }, [contactsResponse?.contacts, relationshipTypeMap]);

  // Handle edit contact
  const handleEditContact = (contact: UserContact) => {
    setSelectedContact(contact);
    setEditDialogOpen(true);
  };

  // Handle save contact
  const handleSaveContact = () => {
    setEditDialogOpen(false);
    setSelectedContact(null);
    // Refetch contacts to get updated data
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setSelectedContact(null);
  };

  // Handle delete contact
  const handleDeleteContact = (contact: UserContact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      await api.delete(`/contacts/${contactId}`);
    },
    onSuccess: () => {
      enqueueSnackbar('Contact deleted successfully', { variant: 'success' });
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      // Refetch contacts to update the list
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (error: any) => {
      console.error('Failed to delete contact:', error);
      enqueueSnackbar(`Failed to delete contact: ${error.response?.data?.detail || 'Unknown error'}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (contactToDelete) {
      deleteContactMutation.mutate(contactToDelete.id);
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  // Create column helper for contacts
  const columnHelper = createGenericColumnHelper<UserContact>();
  
  const columns = useMemo(() => [
    columnHelper.accessor((row) => `${row.first_name} ${row.last_name}`, {
      id: 'name',
      header: 'Name',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue()}
        </TableCellComponents.PrimaryText>
      ),
      size: 200,
      minSize: 150,
      maxSize: 250,
    }),
    // Combined name and email column for mobile
    columnHelper.accessor((row) => ({ 
      name: `${row.first_name} ${row.last_name}`, 
      email: row.email 
    }), {
      id: 'name_email',
      header: 'Contact',
      cell: (info) => {
        const data = info.getValue();
        return (
          <Box>
            <TableCellComponents.PrimaryText sx={{ lineHeight: 1.2 }}>
              {data.name}
            </TableCellComponents.PrimaryText>
            {data.email && (
              <TableCellComponents.SecondaryText sx={{
                fontSize: '12px',
                color: '#6f7283',
                mt: 0.25,
                lineHeight: 1.1
              }}>
                {data.email}
              </TableCellComponents.SecondaryText>
            )}
          </Box>
        );
      },
      size: 200,
      minSize: 150,
      maxSize: 250,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue() || '-'}
        </TableCellComponents.SecondaryText>
      ),
      size: 200,
      minSize: 150,
      maxSize: 250,
    }),
    columnHelper.accessor('phone', {
      header: 'Phone',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue() || '-'}
        </TableCellComponents.SecondaryText>
      ),
      size: 130,
      minSize: 100,
      maxSize: 160,
    }),
    columnHelper.accessor('relationship_to_owner', {
      header: 'Relationship',
      cell: (info) => {
        const value = info.getValue();
        return (
          <TableCellComponents.SecondaryText>
            {value ? (relationshipTypeMap[value] || value) : '-'}
          </TableCellComponents.SecondaryText>
        );
      },
      size: 130,
      minSize: 100,
      maxSize: 160,
    }),
    // Combined usage info column for mobile
    columnHelper.accessor((row) => ({ 
      usageCount: row.appointment_usage_count, 
      lastUsed: row.last_used_at 
    }), {
      id: 'usage_info',
      header: 'Requests',
      cell: (info) => {
        const data = info.getValue();
        return (
          <Box>
            <TableCellComponents.PrimaryText sx={{ lineHeight: 1.2 }}>
              {data.usageCount || 0} requests
            </TableCellComponents.PrimaryText>
            {data.lastUsed && (
              <TableCellComponents.SecondaryText sx={{
                fontSize: '12px',
                color: '#6f7283',
                mt: 0.25,
                lineHeight: 1.1
              }}>
                Last: {new Date(data.lastUsed).toLocaleDateString()}
              </TableCellComponents.SecondaryText>
            )}
          </Box>
        );
      },
      size: 120,
      minSize: 100,
      maxSize: 140,
    }),
    columnHelper.accessor('appointment_usage_count', {
      header: 'Requests',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue() || 0}
        </TableCellComponents.SecondaryText>
      ),
      size: 100,
      minSize: 80,
      maxSize: 120,
    }),
    columnHelper.accessor('last_used_at', {
      header: 'Last Used',
      cell: (info) => {
        const date = info.getValue();
        return (
          <TableCellComponents.SecondaryText>
            {date ? new Date(date).toLocaleDateString() : '-'}
          </TableCellComponents.SecondaryText>
        );
      },
      size: 110,
      minSize: 100,
      maxSize: 130,
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      cell: (info) => {
        const date = info.getValue();
        return (
          <TableCellComponents.SecondaryText>
            {date ? new Date(date).toLocaleDateString() : '-'}
          </TableCellComponents.SecondaryText>
        );
      },
      size: 110,
      minSize: 100,
      maxSize: 130,
    }),
    columnHelper.accessor('notes', {
      header: 'Notes',
      cell: (info) => (
        <TableCellComponents.SecondaryText sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '200px'
        }}>
          {info.getValue() || '-'}
        </TableCellComponents.SecondaryText>
      ),
      size: 200,
      minSize: 150,
      maxSize: 300,
    }),
    // Actions column
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit Contact">
            <ActionButton
              onClick={(e) => {
                e.stopPropagation();
                handleEditContact(row.original);
              }}
            >
              <EditIconV2 sx={{ width: 20, height: 20 }} />
            </ActionButton>
          </Tooltip>
          <Tooltip title="Delete Contact">
            <ActionButton
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteContact(row.original);
              }}
              sx={{ 
                '&:hover': {
                  backgroundColor: 'error.light',
                  borderColor: 'error.main'
                }
              }}
            >
              <TrashIconV2 sx={{ width: 20, height: 20, color: 'error.main' }} />
            </ActionButton>
          </Tooltip>
        </Box>
      ),
      size: 120,
      minSize: 120,
      maxSize: 120,
    }),
  ], [relationshipTypeMap, handleEditContact, handleDeleteContact]);

  // Define responsive column visibility
  const getColumnVisibility = () => {
    if (isMobile) {
      // Mobile: show combined Name & Email, combined Usage Info, and Actions
      return {
        'name': false,
        'name_email': true,
        'email': false,
        'phone': false,
        'relationship_to_owner': false,
        'usage_info': true,
        'appointment_usage_count': false,
        'last_used_at': false,
        'created_at': false,
        'notes': false,
        'actions': true,
      };
    } else {
      // Desktop: show separate fields but hide the combined columns
      return {
        'name': true,
        'name_email': false,
        'email': true,
        'phone': true,
        'relationship_to_owner': true,
        'usage_info': false,
        'appointment_usage_count': true,
        'last_used_at': true,
        'created_at': false,
        'notes': false,
        'actions': true,
      };
    }
  };

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box>
          <Typography variant="h1" component="h1" gutterBottom>
            Contacts
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom>
            Manage your contact list
          </Typography>
          <GenericTable
            data={contacts}
            columns={columns}
            loading={isLoading}
            enableSearch={true}
            searchPlaceholder="Search contacts..."
            enablePagination={contacts.length > 10}
            pageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            enableColumnVisibility={true}
            initialColumnVisibility={getColumnVisibility()}
            emptyMessage="No contacts found."
            initialSorting={[{ id: 'appointment_usage_count', desc: true }]}
            tableProps={{
              stickyHeader: true,
              size: 'medium',
              padding: 'normal'
            }}
          />
        </Box>
      </Container>

      {/* Edit Contact Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '500px' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h2">Edit Contact</Typography>
            <IconButton
                edge="end"
                onClick={handleCancelEdit}
                aria-label="close"
            >
                <CloseIconFilledCircleV2 sx={{ fontSize: '1.5rem' }} />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedContact && (
            <ContactForm
              contact={selectedContact}
              mode="edit"
              fieldsToShow="contact"
              onSave={handleSaveContact}
              onCancel={handleCancelEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-start' }}>
          <WarningTriangleFilledIconV2 sx={{ color: 'error.main' }} />
          <Typography variant="h3" color="error.main" >
            Delete Contact?
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          {contactToDelete && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to delete this contact?
              </Typography>
              <Box sx={{ 
                mt: 2, 
                p: 2, 
                backgroundColor: 'grey.50', 
                borderRadius: 1.3,
              }}>
                <Typography variant="h6">
                  {contactToDelete.first_name} {contactToDelete.last_name}
                </Typography>
                {contactToDelete.email && (
                  <Typography variant="body2" color="text.secondary">
                    {contactToDelete.email} • {contactToDelete.phone}
                  </Typography>
                )}
                {contactToDelete.relationship_to_owner && (
                  <Typography variant="body2" color="text.secondary">
                    Relationship: {relationshipTypeMap[contactToDelete.relationship_to_owner] || contactToDelete.relationship_to_owner}
                  </Typography>
                )}
                {contactToDelete.appointment_usage_count > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Used in {contactToDelete.appointment_usage_count} appointment{contactToDelete.appointment_usage_count > 1 ? 's' : ''}
                  </Typography>
                )}
              </Box>
              
              {/* Show different warning messages based on appointment history */}
              {contactToDelete.appointment_usage_count > 0 ? (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  backgroundColor: 'warning.light', 
                  borderRadius: 1.3, 
                  // border: '1px solid', 
                  // borderColor: 'error.main' 
                  display: 'flex', alignItems: 'center', gap: 1.3
                }}>
                  <InfoCircleIconV2 sx={{ color: 'warning.main', fontSize: '1.5rem' }} /> 
                  <Typography variant="body1" color="warning.main" sx={{ fontWeight: 'medium' }}>
                    This contact will be removed from your list but preserved due to existing appointment history.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ 
                  mt: 2, 
                  p: 2, 
                  backgroundColor: 'error.light', 
                  borderRadius: 1.3, 
                  // border: '1px solid', 
                  // borderColor: 'error.main' 
                }}>
                  <Typography variant="body1" color="error.main" sx={{ fontWeight: 'medium' }}>
                    This contact will be permanently deleted and cannot be recovered.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <SecondaryButton onClick={handleCancelDelete}>
            Cancel
          </SecondaryButton>
          <PrimaryButton 
            onClick={handleConfirmDelete}
            disabled={deleteContactMutation.isPending}
            startIcon={<TrashIconV2 />}
          >
            {deleteContactMutation.isPending 
              ? 'Deleting...' 
              : contactToDelete && contactToDelete.appointment_usage_count > 0 
                ? 'Remove Contact' 
                : 'Delete Contact'
            }
          </PrimaryButton>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default ContactsList; 