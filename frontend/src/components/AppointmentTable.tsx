import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  Chip,
  useTheme
} from '@mui/material';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  FilterFn
} from '@tanstack/react-table';
import { Appointment, AppointmentDignitary, AppointmentContact } from '../models/types';
import { formatDate } from '../utils/dateUtils';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { AppointmentStatusChip } from './AppointmentStatusChip';
import { EditIconV2 } from './iconsv2';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface AppointmentTableProps {
  appointments: Appointment[];
  onRowClick: (appointment: Appointment) => void;
  onEdit: (appointmentId: number) => void;
}

// Create a column helper for type safety
const columnHelper = createColumnHelper<Appointment>();

// Custom filter function for searching across all fields
const globalFilterFn: FilterFn<Appointment> = (row, columnId, value) => {
  const appointment = row.original;
  const searchValue = String(value).toLowerCase();

  // Search in basic appointment fields
  const basicFields = [
    appointment.id?.toString(),
    appointment.request_type,
    appointment.purpose,
    appointment.status,
    appointment.location?.name,
    appointment.location?.city
  ].filter(Boolean);

  // Search in dignitaries
  const dignitaryNames = (appointment.appointment_dignitaries || []).map(ad =>
    `${formatHonorificTitle(ad.dignitary.honorific_title)} ${ad.dignitary.first_name} ${ad.dignitary.last_name}`
  );

  // Search in contacts
  const contactNames = (appointment.appointment_contacts || []).map(ac =>
    `${ac.contact.first_name} ${ac.contact.last_name}`
  );

  const allSearchableText = [
    ...basicFields,
    ...dignitaryNames,
    ...contactNames
  ].join(' ').toLowerCase();

  return allSearchableText.includes(searchValue);
};

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  onRowClick,
  onEdit
}) => {
  const theme = useTheme();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Helper function to get attendees info
  const getAttendeesInfo = (appointment: Appointment) => {
    const dignitaries = appointment.appointment_dignitaries || [];
    const contacts = appointment.appointment_contacts || [];
    
    const dignitaryNames = dignitaries.map((ad: AppointmentDignitary) => 
      `${formatHonorificTitle(ad.dignitary.honorific_title)} ${ad.dignitary.first_name} ${ad.dignitary.last_name}`
    );
    
    const contactNames = contacts.map((ac: AppointmentContact) => 
      `${ac.contact.first_name} ${ac.contact.last_name}`
    );
    
    const allNames = [...dignitaryNames, ...contactNames];
    const totalCount = allNames.length;
    
    if (totalCount === 0) return 'No attendees';
    if (totalCount === 1) return allNames[0];
    if (totalCount <= 3) return allNames.join(', ');
    
    return `${allNames[0]} +${totalCount - 1} others`;
  };

  // Helper function to get date/time display
  const getDateTimeDisplay = (appointment: Appointment) => {
    if (['approved', 'completed'].includes(appointment.status.toLowerCase()) && appointment.appointment_date) {
      return `${formatDate(appointment.appointment_date, false)} ${appointment.appointment_time || ''}`;
    } else {
      return `${formatDate(appointment.preferred_date || '', false)} ${appointment.preferred_time_of_day || ''}`;
    }
  };

  // Define columns using TanStack Table
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        id: 'id',
        header: 'Request #',
        cell: (info) => (
          <Typography variant="body2" fontWeight="medium">
            #{info.getValue()}
          </Typography>
        ),
        minSize: 80,
        maxSize: 120,
      }),
      columnHelper.accessor('request_type', {
        id: 'request_type',
        header: 'Type',
        cell: (info) => (
          <Chip 
            label={info.getValue() || 'Dignitary'} 
            size="small"
            variant="outlined"
            sx={{ 
              fontSize: '0.75rem',
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main
            }}
          />
        ),
        minSize: 120,
        maxSize: 160,
      }),
      columnHelper.accessor((row) => getAttendeesInfo(row), {
        id: 'attendees',
        header: 'Attendees',
        cell: (info) => (
          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
            {info.getValue()}
          </Typography>
        ),
        minSize: 180,
        maxSize: 250,
      }),
      columnHelper.accessor('purpose', {
        id: 'purpose',
        header: 'Purpose',
        cell: (info) => (
          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
            {info.getValue() || 'No purpose specified'}
          </Typography>
        ),
        minSize: 250,
        size: 400,
      }),
      columnHelper.accessor((row) => getDateTimeDisplay(row), {
        id: 'date_time',
        header: 'Date & Time',
        cell: (info) => (
          <Typography variant="body2">
            {info.getValue()}
          </Typography>
        ),
        minSize: 150,
        maxSize: 180,
      }),
      columnHelper.accessor((row) => row.location ? `${row.location.name}, ${row.location.city}` : 'N/A', {
        id: 'location',
        header: 'Location',
        cell: (info) => (
          <Typography variant="body2">
            {info.getValue()}
          </Typography>
        ),
        minSize: 150,
        maxSize: 200,
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        cell: (info) => (
          <AppointmentStatusChip status={info.getValue()} size="small" />
        ),
        minSize: 100,
        maxSize: 140,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <IconButton 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(info.row.original.id);
            }}
            sx={{ 
              backgroundColor: 'rgba(0,0,0,0.04)',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.08)',
              }
            }}
          >
            <EditIconV2 sx={{ width: 16, height: 16 }} />
          </IconButton>
        ),
        minSize: 80,
        maxSize: 100,
        enableSorting: false,
      }),
    ],
    [theme.palette.primary.main, onEdit]
  );

  // Create table instance
  const table = useReactTable({
    data: appointments,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn,
    debugTable: false,
  });

  if (appointments.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>No appointments found for the selected filters.</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer 
        component={Paper} 
        sx={{ 
          maxHeight: 600,
          width: '100%',
          overflowX: 'auto'
        }}
      >
        <Table 
          stickyHeader 
          aria-label="appointments table"
          sx={{ 
            width: '100%',
            tableLayout: 'auto'
          }}
        >
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    sx={{ 
                      fontWeight: 'bold',
                      minWidth: header.column.columnDef.minSize,
                      maxWidth: header.column.columnDef.maxSize,
                      width: header.column.columnDef.size,
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                      '&:hover': header.column.getCanSort() ? {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      } : {}
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', opacity: 0.5 }}>
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                          ) : (
                            <>
                              <ArrowUpwardIcon sx={{ fontSize: 12, marginBottom: '-2px' }} />
                              <ArrowDownwardIcon sx={{ fontSize: 12, marginTop: '-2px' }} />
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow 
                key={row.id}
                hover 
                onClick={() => onRowClick(row.original)}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AppointmentTable; 