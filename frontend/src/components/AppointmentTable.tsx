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

// Helper function to get attendees info (simplified for table display)
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
  
  return `${allNames[0]} +${totalCount - 1} others`;
};

// Helper function to get date/time display
const getDateTimeDisplay = (appointment: Appointment) => {
  if (['approved', 'completed'].includes(appointment.status.toLowerCase()) && appointment.appointment_date) {
    const date = formatDate(appointment.appointment_date, false);
    const time = appointment.appointment_time || '';
    return { date, time };
  } else {
    const date = formatDate(appointment.preferred_date || '', false);
    const time = appointment.preferred_time_of_day || '';
    return { date, time };
  }
};

// Helper function to get requested date/time
const getRequestedDateTime = (appointment: Appointment) => {
  const date = formatDate(appointment.created_at || '', false);
  const time = ''; // Could be derived from created_at if needed
  return { date, time };
};

// Helper function to get last updated date/time
const getLastUpdatedDateTime = (appointment: Appointment) => {
  const date = formatDate(appointment.updated_at || appointment.created_at || '', false);
  const time = ''; // Could be derived from updated_at if needed
  return { date, time };
};

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  onRowClick,
  onEdit
}) => {
  const theme = useTheme();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Define columns using TanStack Table with exact Figma widths
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        id: 'id',
        header: 'ID',
        cell: (info) => (
          <Typography sx={{
            fontSize: '14px',
            color: '#31364e',
            fontWeight: 500,
            fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
          }}>
            #{info.getValue()}
          </Typography>
        ),
        size: 40,
        minSize: 30,
        maxSize: 100,
      }),

      columnHelper.accessor((row) => getAttendeesInfo(row), {
        id: 'dignitary',
        header: 'Dignitary',
        cell: (info) => (
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '14px',
              color: '#6f7283',
              fontWeight: 400,
              fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
            }}
          >
            {info.getValue()}
          </Typography>
        ),
        size: 180,
        minSize: 180,
        maxSize: 180,
      }),

      columnHelper.accessor((row) => getRequestedDateTime(row), {
        id: 'requested_date_time',
        header: 'Requested Date & Time',
        cell: (info) => {
          const { date, time } = info.getValue();
          return (
            <Box>
              <Typography sx={{ 
                fontSize: '14px',
                color: '#6f7283',
                fontWeight: 400,
                fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
                lineHeight: 1,
              }}>
                {date}
              </Typography>
              {time && (
                <Typography sx={{ 
                  fontSize: '14px',
                  color: '#6f7283',
                  fontWeight: 400,
                  fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  lineHeight: 1,
                  mt: '8px',
                }}>
                  {time}
                </Typography>
              )}
            </Box>
          );
        },
        size: 170,
        minSize: 170,
        maxSize: 170,
        enableSorting: false,
      }),

      columnHelper.accessor((row) => getDateTimeDisplay(row), {
        id: 'appointment_date_time',
        header: 'Appointment Date & Time',
        cell: (info) => {
          const { date, time } = info.getValue();
          return (
            <Box>
              <Typography sx={{ 
                fontSize: '14px',
                color: '#6f7283',
                fontWeight: 400,
                fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
                lineHeight: 1,
              }}>
                {date}
              </Typography>
              {time && (
                <Typography sx={{ 
                  fontSize: '14px',
                  color: '#6f7283',
                  fontWeight: 400,
                  fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  lineHeight: 1,
                  mt: '8px',
                }}>
                  {time}
                </Typography>
              )}
            </Box>
          );
        },
        size: 180,
        minSize: 180,
        maxSize: 180,
        enableSorting: false,
      }),

      columnHelper.accessor((row) => row.location?.name || 'N/A', {
        id: 'location',
        header: 'Location',
        cell: (info) => (
          <Typography sx={{
            fontSize: '14px',
            color: '#6f7283',
            fontWeight: 400,
            fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
            // whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {info.getValue()}
          </Typography>
        ),
        size: 120,
        minSize: 120,
        maxSize: 120,
      }),

      columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        cell: (info) => (
          <AppointmentStatusChip status={info.getValue()} size="small" />
        ),
        size: 116,
        minSize: 116,
        maxSize: 116,
      }),

      columnHelper.accessor((row) => getRequestedDateTime(row), {
        id: 'requested',
        header: 'Requested',
        cell: (info) => {
          const { date, time } = info.getValue();
          return (
            <Box>
              <Typography sx={{ 
                fontSize: '14px',
                color: '#6f7283',
                fontWeight: 400,
                fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
                lineHeight: 1,
              }}>
                {date}
              </Typography>
              {time && (
                <Typography sx={{ 
                  fontSize: '14px',
                  color: '#6f7283',
                  fontWeight: 400,
                  fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  lineHeight: 1,
                  mt: '8px',
                }}>
                  {time}
                </Typography>
              )}
            </Box>
          );
        },
        enableSorting: false,
      }),

      columnHelper.accessor((row) => getLastUpdatedDateTime(row), {
        id: 'last_updated',
        header: 'Last Updated',
        cell: (info) => {
          const { date, time } = info.getValue();
          return (
            <Box>
              <Typography sx={{ 
                fontSize: '14px',
                color: '#6f7283',
                fontWeight: 400,
                fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
                lineHeight: 1,
              }}>
                {date}
              </Typography>
              {time && (
                <Typography sx={{ 
                  fontSize: '14px',
                  color: '#6f7283',
                  fontWeight: 400,
                  fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
                  lineHeight: 1,
                  mt: '8px',
                }}>
                  {time}
                </Typography>
              )}
            </Box>
          );
        },
        enableSorting: false,
      }),

      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <IconButton 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(info.row.original.id);
            }}
            sx={{ 
              borderRadius: '12px',
              border: '1px solid #e9e9e9',
              width: 40,
              height: 40,
              backgroundColor: '#f7f7f7',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.08)',
              }
            }}
          >
            <EditIconV2 sx={{ width: 20, height: 20 }} />
          </IconButton>
        ),
        size: 72,
        minSize: 72,
        maxSize: 72,
        enableSorting: false,
      }),
    ],
    [onEdit]
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
          borderRadius: '12px',
          border: '1px solid #f7f7f7',
          boxShadow: '0px 12px 16px -4px rgba(81, 77, 74, 0.08), 0px -1px 6px -2px rgba(81, 77, 74, 0.03)',
          width: '100%',
          overflow: 'hidden', // Remove horizontal scroll
          backgroundColor: '#fff',
        }}
      >
        <Table 
          stickyHeader 
          aria-label="appointments table"
          sx={{ 
            width: '100%',
            tableLayout: 'fixed', // Critical: enforce column widths
          }}
        >
          <TableHead>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableCell
                    key={header.id}
                    sx={{ 
                      width: header.column.columnDef.size,
                      minWidth: header.column.columnDef.minSize,
                      maxWidth: header.column.columnDef.maxSize,
                      padding: '12px 16px',
                      fontSize: '12px',
                      color: '#6f7283',
                      fontWeight: 500,
                      fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
                      backgroundColor: '#f7f7f7',
                      borderBottom: '1px solid #e9e9e9',
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
                  },
                  '&:last-child td': {
                    borderBottom: 'none',
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell 
                    key={cell.id}
                    sx={{
                      width: cell.column.columnDef.size,
                      minWidth: cell.column.columnDef.minSize,
                      maxWidth: cell.column.columnDef.maxSize,
                      padding: '16px',
                      borderBottom: '1px solid #e9e9e9',
                      minHeight: '72px',
                      height: '72px',
                      verticalAlign: 'middle',
                    }}
                  >
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