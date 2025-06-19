import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { useAppointmentSummary } from '../hooks/useAppointmentSummary';
import PrimaryButton from '../components/PrimaryButton';
import { formatDate } from '../utils/dateUtils';
import GenericTable, { createGenericColumnHelper, standardColumnSizes, TableCellComponents } from '../components/GenericTable';
import { createColumnHelper } from '@tanstack/react-table';
import { AppointmentStatusChip } from '../components/AppointmentStatusChip';
import AppointmentDetailDialog from '../components/AppointmentDetailDialog';

const drawerWidth = 260;

// Define the flattened appointment type for the table
interface AppointmentTableRow {
  id: number;
  requestType: string;
  statusDisplay: string;
}

const Home: React.FC = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const { data: appointmentSummary, isLoading: summaryLoading } = useAppointmentSummary();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Status mapping as requested
  const getStatusDisplay = (status: string): string => {
    switch (status?.toLowerCase() || '') {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending Approval';
      case 'rejected':
        return 'Unable to schedule';
      default:
        return status || 'Unknown';
    }
  };

  // Get status chip color based on status
  const getStatusChipColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status?.toLowerCase() || '') {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Flatten appointments for table display
  const tableData = useMemo((): AppointmentTableRow[] => {
    if (!appointmentSummary) return [];
    
    const allAppointments: AppointmentTableRow[] = [];

    Object.entries(appointmentSummary).forEach(([requestType, summary]) => {
      summary.appointments.forEach(appointment => {
        allAppointments.push({
          id: appointment.id,
          requestType: requestType + ' • ' + (appointment.date ? formatDate(appointment.date, false) : 'Not scheduled'),
          statusDisplay: getStatusDisplay(appointment.status),
        });
      });
    });

    return allAppointments;
  }, [appointmentSummary]);

  // Create column definitions
  const columnHelper = createGenericColumnHelper<AppointmentTableRow>();
  const columns = useMemo(() => [
    columnHelper.accessor('id', {
      header: 'ID',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue()}
        </TableCellComponents.PrimaryText>
      ),
      ...standardColumnSizes.id,
      enableSorting: true,
    }),
    columnHelper.accessor('requestType', {
      header: 'Request',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue()}
        </TableCellComponents.PrimaryText>
      ),
      ...standardColumnSizes.small,
      enableSorting: true,
    }),
    columnHelper.accessor('statusDisplay', {
      header: 'Status',
      cell: (info) => {
        return (
          <AppointmentStatusChip status={info.getValue()} size="small" />
        );
      },
      ...standardColumnSizes.status,
      enableSorting: true,
    }),
  ], []);

  const handleCreateAppointment = () => {
    navigate('/appointment/request');
  };

  const handleRowClick = (row: AppointmentTableRow) => {
    // Open appointment in dialog
    setSelectedAppointmentId(row.id);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAppointmentId(null);
  };

  return (
    <Layout>
      <Container maxWidth="md">
        <Box
          component="main"
          sx={{
            width: '100%',
            p: 0,
          }}
        >
          <Paper sx={{ p: 4, mb: 4 }}>
            <Typography variant="h1" gutterBottom>
              Welcome, {userInfo?.first_name}!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              You can manage appointment requests with Gurudev Sri Sri Ravi Shankar.
              Use the navigation menu to create new appointments, view existing requests, or manage your profile.
            </Typography>
            
            {/* Image with button overlay */}
            <Box sx={{ position: 'relative', mb: 4 }}>
              <img 
                src={'/desktop-bg-1.png'} 
                alt="banner" 
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  borderRadius: '13px', 
                  border: '1px solid #eee' 
                }} 
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 24,
                  left: 24,
                }}
              >
                <PrimaryButton
                  size="small"
                  onClick={handleCreateAppointment}
                  // sx={{
                  //   boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                  // }}
                >
                  Create New Request
                </PrimaryButton>
              </Box>
            </Box>

            {/* Appointment Summary Table */}
            {!summaryLoading && tableData.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                  Your Appointment Requests
                </Typography>
                <GenericTable
                  data={tableData}
                  columns={columns}
                  onRowClick={handleRowClick}
                  loading={summaryLoading}
                  emptyMessage="No open appointment requests found. Click 'Create New Request' to get started."
                  enableSearch={false}
                  enablePagination={tableData.length > 5}
                  pageSize={5}
                  pageSizeOptions={[5, 10, 25]}
                  initialSorting={[{ id: 'id', desc: true }]}
                  tableProps={{
                    stickyHeader: true,
                    size: 'medium',
                    padding: 'normal',
                  }}
                  containerProps={{
                    maxHeight: 600,
                    sx: {
                      borderRadius: 2,
                      border: '1px solid rgba(56, 56, 56, 0.1)',
                      boxShadow: '0px 12px 16px -4px rgba(81, 77, 74, 0.08), 0px -1px 6px -2px rgba(81, 77, 74, 0.03)',
                    }
                  }}
                />
              </Box>
            )}

            {/* No appointments message */}
            {!summaryLoading && tableData.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No open appointment requests found. Click "Create New Request" to get started.
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Container>

      {/* Appointment Detail Dialog */}
      <AppointmentDetailDialog
        appointmentId={selectedAppointmentId}
        open={dialogOpen}
        onClose={handleDialogClose}
      />
    </Layout>
  );
};

export default Home; 