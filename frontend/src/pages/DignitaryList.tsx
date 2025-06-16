import React, { useMemo } from 'react';
import { Container, Typography, Paper, Box, Checkbox, useMediaQuery } from '@mui/material';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useTheme } from '@mui/material/styles';

import { useQuery } from '@tanstack/react-query';
import { GenericTable, TableCellComponents, standardColumnSizes, createGenericColumnHelper } from '../components/GenericTable';
import { formatHonorificTitle } from '../utils/formattingUtils';

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
}

const DignitaryList: React.FC = () => {
  const api = useApi();
  const theme = useTheme();
  
  // Check if we're on mobile
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { data: dignitaries = [], isLoading } = useQuery({
    queryKey: ['assigned-dignitaries'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Dignitary[]>('/dignitaries/assigned');
        return data;
      } catch (error) {
        console.error('Error fetching dignitaries:', error);
        throw error;
      }
    },
  });

  // Create column helper for dignitaries
  const columnHelper = createGenericColumnHelper<Dignitary>();
  
  const columns = useMemo(() => [
    columnHelper.accessor((row) => `${formatHonorificTitle(row.honorific_title)} ${row.first_name} ${row.last_name}`, {
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
    columnHelper.accessor('email', {
      header: 'Email',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 200,
      minSize: 150,
      maxSize: 250,
    }),
    columnHelper.accessor('phone', {
      header: 'Phone',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 130,
      minSize: 100,
      maxSize: 160,
    }),
    columnHelper.accessor('primary_domain', {
      header: 'Domain',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 130,
      minSize: 100,
      maxSize: 160,
    }),
    columnHelper.accessor('title_in_organization', {
      header: 'Position',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 130,
      minSize: 100,
      maxSize: 160,
    }),
    columnHelper.accessor('organization', {
      header: 'Organization',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 200,
      minSize: 150,
      maxSize: 250,
    }),
    columnHelper.accessor('country', {
      header: 'Country',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 100,
      minSize: 80,
      maxSize: 120,
    }),
    columnHelper.accessor('state', {
      header: 'State',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 100,
      minSize: 80,
      maxSize: 120,
    }),
    columnHelper.accessor('city', {
      header: 'City',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 100,
      minSize: 80,
      maxSize: 120,
    }),
    columnHelper.accessor('has_dignitary_met_gurudev', {
      header: 'Met Gurudev?',
      cell: (info) => (
        <Checkbox 
          checked={info.getValue() || false} 
          disabled
          size="small"
        />
      ),
      size: 120,
      minSize: 100,
      maxSize: 140,
    }),
    columnHelper.accessor('gurudev_meeting_date', {
      header: 'Meeting Date',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 110,
      minSize: 100,
      maxSize: 130,
    }),
    columnHelper.accessor('gurudev_meeting_location', {
      header: 'Meeting Location',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 130,
      minSize: 120,
      maxSize: 150,
    }),
    columnHelper.accessor('gurudev_meeting_notes', {
      header: 'Meeting Notes',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue() || '-'}
        </TableCellComponents.PrimaryText>
      ),
      size: 200,
      minSize: 150,
      maxSize: 300,
    }),
  ], []);

  // Define responsive column visibility
  const getColumnVisibility = () => {
    if (isMobile) {
      // Mobile: show only Name, Position, and Organization
      return {
        'name': true,
        'email': false,
        'phone': false,
        'primary_domain': false,
        'title_in_organization': true,
        'organization': true,
        'country': false,
        'state': false,
        'city': false,
        'has_dignitary_met_gurudev': false,
        'gurudev_meeting_date': false,
        'gurudev_meeting_location': false,
        'gurudev_meeting_notes': false,
      };
    } else {
      // Desktop: show more fields including email and phone
      return {
        'name': true,
        'email': true,
        'phone': true,
        'primary_domain': false,
        'title_in_organization': true,
        'organization': true,
        'country': false,
        'state': false,
        'city': false,
        'has_dignitary_met_gurudev': true,
        'gurudev_meeting_date': false,
        'gurudev_meeting_location': false,
        'gurudev_meeting_notes': false,
      };
    }
  };

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box>
          <Typography variant="h1" component="h1" gutterBottom>
            Dignitaries
          </Typography>
          <Typography variant="h6" component="h2" gutterBottom>
            Dignitaries assigned to you
          </Typography>
          <GenericTable
            data={dignitaries}
            columns={columns}
            loading={isLoading}
            enableSearch={true}
            searchPlaceholder="Search dignitaries..."
            enablePagination={dignitaries.length > 10}
            pageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
            enableColumnVisibility={true}
            initialColumnVisibility={getColumnVisibility()}
            emptyMessage="No assigned dignitaries found."
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

export default DignitaryList; 