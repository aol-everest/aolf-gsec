import React, { useState } from 'react';
import { Container, Typography, Paper, Box, Checkbox, IconButton } from '@mui/material';
import { ColumnDef } from '@tanstack/react-table';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GenericTable, createGenericColumnHelper } from '../components/GenericTable';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { EditIconV2 } from '../components/iconsv2';
import { ActionButton } from '../components/ActionButton';

interface Dignitary {
  id: number;
  honorific_title: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  primary_domain: string;
  primary_domain_other: string;
  title_in_organization: string;
  organization: string;
  country: string;
  state: string;
  city: string;
  has_dignitary_met_gurudev: boolean;
  gurudev_meeting_date?: string;
  gurudev_meeting_location?: string;
  gurudev_meeting_notes?: string;
  name?: string;
}

const columnHelper = createGenericColumnHelper<Dignitary>();

const AdminDignitaryList: React.FC = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const { data: dignitaries = [], isLoading } = useQuery({
    queryKey: ['admin-assigned-dignitaries'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Dignitary[]>('/admin/dignitaries/all');
        return data.map(dignitary => ({
          ...dignitary,
          name: `${formatHonorificTitle(dignitary.honorific_title)} ${dignitary.first_name} ${dignitary.last_name}`,
        }));
      } catch (error) {
        console.error('Error fetching dignitaries:', error);
        enqueueSnackbar('Failed to fetch dignitaries', { variant: 'error' });
        throw error;
      }
    },
  });

  const handleEditClick = (id: number) => {
    navigate(`/admin/dignitaries/edit/${id}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const columns: ColumnDef<Dignitary, any>[] = [
    columnHelper.accessor('id', {
      header: 'ID',
      size: 50,
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      size: 200,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      size: 200,
    }),
    columnHelper.accessor('phone', {
      header: 'Phone',
      size: 130,
    }),
    columnHelper.accessor('primary_domain', {
      header: 'Domain',
      size: 130,
    }),
    columnHelper.accessor('title_in_organization', {
      header: 'Position',
      size: 130,
    }),
    columnHelper.accessor('organization', {
      header: 'Organization',
      size: 200,
    }),
    columnHelper.accessor('country', {
      header: 'Country',
      size: 100,
    }),
    columnHelper.accessor('state', {
      header: 'State',
      size: 100,
    }),
    columnHelper.accessor('city', {
      header: 'City',
      size: 100,
    }),
    columnHelper.accessor('has_dignitary_met_gurudev', {
      header: 'Met Gurudev?',
      size: 120,
      cell: ({ getValue }) => (
        <Checkbox 
          checked={getValue() as boolean} 
          disabled
        />
      ),
    }),
    columnHelper.accessor('gurudev_meeting_date', {
      header: 'Meeting Date',
      size: 120,
    }),
    columnHelper.accessor('gurudev_meeting_location', {
      header: 'Meeting Location',
      size: 150,
    }),
    columnHelper.accessor('gurudev_meeting_notes', {
      header: 'Meeting Notes',
      size: 200,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Edit',
      size: 70,
      cell: ({ row }) => (
        <ActionButton
          onClick={() => handleEditClick(row.original.id)}
          aria-label="edit"
        >
          <EditIconV2 sx={{ width: 20, height: 20 }} />
        </ActionButton>
      ),
    }),
  ];

  const searchableFields: (keyof Dignitary)[] = [
    'name',
    'email',
    'phone',
    'primary_domain',
    'title_in_organization',
    'organization',
    'country',
    'state',
    'city',
    'gurudev_meeting_location',
    'gurudev_meeting_notes'
  ];

  const initialColumnVisibility = {
    id: false,
    phone: false,
    primary_domain: false,
    state: false,
    city: false,
    gurudev_meeting_date: false,
    gurudev_meeting_location: false,
    gurudev_meeting_notes: false,
  };

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box>
          <Typography variant="h1" component="h1" gutterBottom>
            All Dignitaries
          </Typography>
          <GenericTable
            data={dignitaries}
            columns={columns}
            loading={isLoading}
            enableSearch={true}
            searchPlaceholder="Search dignitaries..."
            searchableFields={searchableFields}
            searchValue={searchValue}
            onSearchChange={handleSearchChange}
            enableColumnVisibility={true}
            initialColumnVisibility={initialColumnVisibility}
            enablePagination={true}
            pageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            containerProps={{
              maxHeight: 'calc(100vh - 200px)',
              sx: { mt: 2 }
            }}
            tableProps={{
              stickyHeader: true,
              size: 'small'
            }}
          />
        </Box>
      </Container>
    </Layout>
  );
};

export default AdminDignitaryList; 
