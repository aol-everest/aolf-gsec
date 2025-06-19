import React, { useMemo } from 'react';
import { Container, Typography, Paper, Box, useMediaQuery } from '@mui/material';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { GenericTable, TableCellComponents, standardColumnSizes, createGenericColumnHelper } from '../components/GenericTable';
import { useEnumsMap } from '../hooks/useEnums';

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  relationship_to_owner: string;
  notes: string;
  appointment_usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  contact_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ContactsResponse {
  contacts: Contact[];
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
  
  // Check if we're on mobile
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  // Create column helper for contacts
  const columnHelper = createGenericColumnHelper<Contact>();
  
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
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {relationshipTypeMap[info.getValue()] || info.getValue() || '-'}
        </TableCellComponents.SecondaryText>
      ),
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
  ], [relationshipTypeMap]);

  // Define responsive column visibility
  const getColumnVisibility = () => {
    if (isMobile) {
      // Mobile: show combined Name & Email, and combined Usage Info
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
    </Layout>
  );
};

export default ContactsList; 