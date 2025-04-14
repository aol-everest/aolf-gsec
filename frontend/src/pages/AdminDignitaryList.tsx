import React from 'react';
import { Container, Typography, Paper, Box, Checkbox, IconButton } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import GenericDataGrid from '../components/GenericDataGrid';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { PencilIconV2 } from '../components/iconsv2';

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
  name?: string;
}

const AdminDignitaryList: React.FC = () => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

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

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 50,
      flex: 0.25,
    },
    { 
      field: 'name', 
      headerName: 'Name', 
      width: 200,
      flex: 1.5,
    },
    { field: 'email', headerName: 'Email', width: 200, flex: 1 },
    { field: 'phone', headerName: 'Phone', width: 130, flex: 1 },
    { field: 'primary_domain', headerName: 'Domain', width: 130, flex: 0.81 },
    { field: 'title_in_organization', headerName: 'Position', width: 130, flex: 1 },
    { field: 'organization', headerName: 'Organization', width: 200, flex: 1 },
    { field: 'country', headerName: 'Country', width: 100, flex: 0.81 },
    { field: 'state', headerName: 'State', width: 100, flex: 0.81 },
    { field: 'city', headerName: 'City', width: 100, flex: 0.81 },
    { 
      field: 'has_dignitary_met_gurudev', 
      headerName: 'Met Gurudev?', 
      width: 81,
      flex: 0.5,
      renderCell: (params: GridRenderCellParams) => (
        <Checkbox 
          checked={params.row.has_dignitary_met_gurudev} 
          disabled
        />
      ),
    },
    {
      field: 'gurudev_meeting_date',
      headerName: 'Meeting Date',
      width: 110,
      flex: 0.5,
    },
    {
      field: 'gurudev_meeting_location',
      headerName: 'Meeting Location',
      width: 130,
      flex: 0.5,
    },
    {
      field: 'gurudev_meeting_notes',
      headerName: 'Meeting Notes',
      width: 130,
      flex: 1.3,
    },
    {
      field: 'actions',
      headerName: 'Edit',
      width: 70,
      flex: 0.5,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton
          color="primary"
          onClick={() => handleEditClick(params.row.id)}
          size="small"
          aria-label="edit"
        >
          <PencilIconV2 />
        </IconButton>
      ),
    },
  ];

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box>
          <Typography variant="h1" component="h1" gutterBottom>
            All Dignitaries
          </Typography>
          <GenericDataGrid
            rows={dignitaries}
            columns={columns}
            loading={isLoading}
            defaultVisibleColumns={['name', 'title_in_organization', 'organization', 'country', 'has_dignitary_met_gurudev', 'actions']}
            customRowHeight={56}
          />
        </Box>
      </Container>
    </Layout>
  );
};

export default AdminDignitaryList; 
