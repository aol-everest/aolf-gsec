import React, { useMemo, useState } from 'react';
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
  useTheme,
  Checkbox,
  Chip
} from '@mui/material';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  FilterFn,
  RowSelectionState
} from '@tanstack/react-table';
import { Appointment, AppointmentDignitary, AppointmentContact, StatusMap } from '../models/types';
import { formatDate, formatDateRange } from '../utils/dateUtils';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { AppointmentStatusChip } from './AppointmentStatusChip';
import { EditIconV2, CheckCircleIconV2 } from './iconsv2';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { debugLog, createDebugLogger } from '../utils/debugUtils';

interface AppointmentTableProps {
  appointments: Appointment[];
  onRowClick: (appointment: Appointment) => void;
  onEdit: (appointmentId: number) => void;
  selectedRows?: number[];
  onRowSelectionChange?: (selectedIds: number[]) => void;
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

// Helper function to determine which date/time to show and if appointment date should be marked
const getDateTimeDisplay = (appointment: Appointment, statusMap: StatusMap) => {
  // Check if appointment is to be rescheduled, approved, or completed
  const shouldShowAppointmentDate = appointment.status === statusMap['APPROVED'] || 
                                   appointment.status === statusMap['COMPLETED'] ||
                                   (appointment.status === statusMap['APPROVED'] && appointment.sub_status === 'NEED_RESCHEDULE');

  let date, time, isAppointmentDate = false;

  if (shouldShowAppointmentDate && appointment.appointment_date) {
    // Show appointment date/time with checkmark
    date = formatDate(appointment.appointment_date, false);
    time = appointment.appointment_time || '';
    isAppointmentDate = true;
      } else {
      // Show date range if available, otherwise single date
      if (appointment.preferred_start_date && appointment.preferred_end_date) {
        date = formatDateRange(appointment.preferred_start_date, appointment.preferred_end_date);
        time = appointment.preferred_time_of_day || '';
      } else if (appointment.preferred_date) {
        date = formatDate(appointment.preferred_date, false);
        time = appointment.preferred_time_of_day || '';
      } else {
        // Fall back to created_at if no preferred date is available
        date = formatDate(appointment.created_at || '', false);
        time = '';
      }
      isAppointmentDate = false;
    }

  return { date, time, isAppointmentDate };
};

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  onRowClick,
  onEdit,
  selectedRows = [],
  onRowSelectionChange
}) => {
  const logger = createDebugLogger('AppointmentTable');
  const theme = useTheme();
  const api = useApi();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Fetch status map from the API
  const { data: statusMap = {} } = useQuery<StatusMap>({
    queryKey: ['status-map'],
    queryFn: async () => {
      const { data } = await api.get<StatusMap>('/appointments/status-options-map');
      return data;
    },
  });

  // Update row selection when selectedRows prop changes
  React.useEffect(() => {
    logger('📋 [TABLE DEBUG] selectedRows prop changed:', {
      selectedRows,
      count: selectedRows.length,
      appointmentCount: appointments.length
    });
    
    const newRowSelection: RowSelectionState = {};
    selectedRows.forEach(id => {
      // Since getRowId uses appointment ID, we use the ID directly as the key
      const appointmentExists = appointments.some(apt => apt.id === id);
      logger(`📋 [TABLE DEBUG] Looking for appointment ID ${id} exists: ${appointmentExists}`);
      if (appointmentExists) {
        newRowSelection[id.toString()] = true;
      }
    });
    
    logger('📋 [TABLE DEBUG] Setting new row selection:', newRowSelection);
    setRowSelection(newRowSelection);
  }, [selectedRows, appointments]);

  // Handle row selection change
  const handleRowSelectionChange = (updater: any) => {
    logger('📋 [TABLE DEBUG] handleRowSelectionChange called with:', {
      updaterType: typeof updater,
      currentRowSelection: rowSelection,
      appointmentCount: appointments.length
    });
    
    const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
    
    logger('📋 [TABLE DEBUG] New selection computed:', {
      newSelection,
      selectedRowKeys: Object.keys(newSelection).filter(key => newSelection[key]),
      totalSelected: Object.keys(newSelection).filter(key => newSelection[key]).length
    });
    
    setRowSelection(newSelection);
    
    if (onRowSelectionChange) {
      const selectedIds = Object.keys(newSelection)
        .filter(key => newSelection[key])
        .map(key => {
          // Since getRowId returns row.id.toString(), the key IS the appointment ID
          const appointmentId = parseInt(key);
          logger(`📋 [TABLE DEBUG] Selection key ${key} is appointment ID: ${appointmentId}`);
          return appointmentId;
        })
        .filter(Boolean);
      
      logger('📋 [TABLE DEBUG] Final selectedIds:', selectedIds);
      onRowSelectionChange(selectedIds);
    }
  };

  // Define columns using TanStack Table with exact Figma widths
  const columns = useMemo(
    () => [
      // Checkbox column for multi-select
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            size="small"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            indeterminate={row.getIsSomeSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            size="small"
          />
        ),
        size: 50,
        minSize: 50,
        maxSize: 50,
        enableSorting: false,
      }),

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
        size: 50,
        minSize: 40,
        maxSize: 100,
      }),

      columnHelper.accessor((row) => getAttendeesInfo(row), {
        id: 'dignitary',
        header: 'Attendees',
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

      // Combined Date & Time column
      columnHelper.accessor((row) => getDateTimeDisplay(row, statusMap), {
        id: 'date_time',
        header: 'Date & Time',
        cell: (info) => {
          const { date, time, isAppointmentDate } = info.getValue();
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
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
              {isAppointmentDate && (
                <CheckCircleIconV2 sx={{ 
                  color: '#aaa', 
                  fontSize: 16,
                  flexShrink: 0
                }} />
              )}
            </Box>
          );
        },
        size: 130,
        minSize: 130,
        maxSize: 150,
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

      // Requested column (when the appointment was requested)
      columnHelper.accessor('created_at', {
        id: 'requested',
        header: 'Requested',
        cell: (info) => {
          const createdAt = info.getValue();
          return (
            <Typography sx={{
              fontSize: '14px',
              color: '#6f7283',
              fontWeight: 400,
              fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
            }}>
              {createdAt ? formatDate(createdAt, false) : '-'}
            </Typography>
          );
        },
        size: 108,
        minSize: 108,
        maxSize: 108,
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
        size: 56,
        minSize: 56,
        maxSize: 56,
        enableSorting: false,
      }),
    ],
    [onEdit, statusMap]
  );

  // Create table instance
  const table = useReactTable({
    data: appointments,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn,
    getRowId: (row) => row.id.toString(),
    debugTable: false,
  });

  if (appointments.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>No appointments found for the selected filters.</Typography>
      </Paper>
    );
  }

  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Selection info */}
      {selectedCount > 0 && (
        <Box sx={{ 
          mb: 1, 
          p: 2, 
          // backgroundColor: theme.palette.primary.light, 
          backgroundColor: 'rgba(255, 255, 255, 0.81)',
          border: '1px solid rgba(56, 56, 56, 0.1)',
          borderRadius: 2,
          // border: `1px solid ${theme.palette.primary.main}`,
        }}>
          <Typography variant="body2" color="primary.dark">
            {selectedCount} appointment{selectedCount === 1 ? '' : 's'} selected
          </Typography>
        </Box>
      )}

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
                  },
                  backgroundColor: row.getIsSelected() ? theme.palette.action.selected : 'inherit',
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