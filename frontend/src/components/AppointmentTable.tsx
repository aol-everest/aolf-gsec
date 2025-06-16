import React, { useMemo } from 'react';
import { Typography, Box } from '@mui/material';
import { createColumnHelper, ColumnDef, FilterFn } from '@tanstack/react-table';
import { Appointment, AppointmentDignitary, AppointmentContact, StatusMap, SubStatusMap } from '../models/types';
import { formatDate, formatDateRange } from '../utils/dateUtils';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { AppointmentStatusChip } from './AppointmentStatusChip';
import { EditIconV2, CheckCircleIconV2 } from './iconsv2';
import { GenericTable, TableCellComponents, standardColumnSizes } from './GenericTable';
import { ActionButton } from './ActionButton';

interface AppointmentTableProps {
  appointments: Appointment[];
  onRowClick: (appointment: Appointment) => void;
  onEdit: (appointmentId: number) => void;
  selectedRows?: number[];
  onRowSelectionChange?: (selectedIds: number[]) => void;
  statusMap?: StatusMap;
  subStatusMap?: SubStatusMap;
  relationshipTypeMap?: Record<string, string>;
  showAttendeeCount?: boolean;
  enableRowSelection?: boolean;
}

// Create a column helper for appointments
const appointmentColumnHelper = createColumnHelper<Appointment>();

// Custom filter function for appointments
const createAppointmentGlobalFilter = (relationshipTypeMap: Record<string, string> = {}): FilterFn<Appointment> => 
  (row, columnId, value, addMeta) => {
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

    // Search in contacts with proper self-contact handling
    const contactNames = (appointment.appointment_contacts || []).map(ac => {
      const contact = ac.contact;
      const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
      const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
        (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
      return isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
    });

    const allSearchableText = [
      ...basicFields,
      ...dignitaryNames,
      ...contactNames
    ].join(' ').toLowerCase();

    return allSearchableText.includes(searchValue);
  };

// Helper function to get attendees info (simplified for table display)
const getAttendeesInfo = (appointment: Appointment, relationshipTypeMap: Record<string, string> = {}) => {
  const dignitaries = appointment.appointment_dignitaries || [];
  const contacts = appointment.appointment_contacts || [];
  
  const dignitaryNames = dignitaries.map((ad: AppointmentDignitary) => 
    `${formatHonorificTitle(ad.dignitary.honorific_title)} ${ad.dignitary.first_name} ${ad.dignitary.last_name}`
  );
  
  const contactNames = contacts.map((ac: AppointmentContact) => {
    const contact = ac.contact;
    const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
    const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
      (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
    return isSelfContact ? selfDisplayName : `${contact.first_name} ${contact.last_name}`;
  });
  
  const allNames = [...dignitaryNames, ...contactNames];
  const totalCount = allNames.length;
  
  if (totalCount === 0) return { primaryName: 'No attendees', additionalCount: 0 };
  if (totalCount === 1) return { primaryName: allNames[0], additionalCount: 0 };
  
  return { primaryName: allNames[0], additionalCount: totalCount - 1 };
};

// Helper function to get attendee count
const getAttendeeCount = (appointment: Appointment) => {
  const dignitaries = appointment.appointment_dignitaries || [];
  const contacts = appointment.appointment_contacts || [];
  return dignitaries.length + contacts.length;
};

// Helper function to determine which date/time to show and if appointment date should be marked
const getDateTimeDisplay = (appointment: Appointment, statusMap: StatusMap, subStatusMap: SubStatusMap) => {
  // Check if appointment is to be rescheduled, approved, or completed
  const shouldShowAppointmentDate = (
    appointment.status === statusMap['APPROVED'] || 
    appointment.status === statusMap['COMPLETED'] ||
    (
      appointment.status === statusMap['APPROVED'] && 
      appointment.sub_status === subStatusMap['NEED_RESCHEDULE']
    )
  );

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

// Create appointment-specific columns
const createAppointmentColumns = (
  onEdit: (appointmentId: number) => void,
  statusMap: StatusMap = {},
  subStatusMap: SubStatusMap = {},
  relationshipTypeMap: Record<string, string> = {},
  showAttendeeCount: boolean = false
): ColumnDef<Appointment, any>[] => {
  const columns: ColumnDef<Appointment, any>[] = [];

  // ID column
  columns.push(
    appointmentColumnHelper.accessor('id', {
      id: 'id',
      header: 'ID',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          #{info.getValue()}
        </TableCellComponents.PrimaryText>
      ),
      ...standardColumnSizes.id,
    })
  );

  // Requester column
  columns.push(
    appointmentColumnHelper.accessor((row) => row.requester, {
      id: 'requester',
      header: 'Requester',
      cell: (info) => {
        const requester = info.getValue();
        if (!requester) {
          return (
            <TableCellComponents.SecondaryText>
              No requester
            </TableCellComponents.SecondaryText>
          );
        }
        
        const fullName = `${requester.first_name} ${requester.last_name}`.trim();
        return (
          <Box>
            <TableCellComponents.PrimaryText sx={{ lineHeight: 1.2 }}>
              {fullName || 'Unknown'}
            </TableCellComponents.PrimaryText>
            {requester.email && (
              <TableCellComponents.SecondaryText sx={{ 
                fontSize: '0.75rem', 
                lineHeight: 1.2, 
                mt: 0.5,
                color: 'text.secondary'
              }}>
                {requester.email}
              </TableCellComponents.SecondaryText>
            )}
          </Box>
        );
      },
      size: 160,
      minSize: 160,
      maxSize: 180,
    })
  );

  // Attendees column
  columns.push(
    appointmentColumnHelper.accessor((row) => getAttendeesInfo(row, relationshipTypeMap), {
      id: 'dignitary',
      header: 'Attendees',
      cell: (info) => {
        const { primaryName, additionalCount } = info.getValue();
        return (
          <Box>
            <TableCellComponents.SecondaryText sx={{ lineHeight: 1.2 }}>
              {primaryName}
            </TableCellComponents.SecondaryText>
            {additionalCount > 0 && (
              <TableCellComponents.SecondaryText sx={{ 
                fontSize: '0.75rem', 
                lineHeight: 1.2, 
                mt: 0.5,
                color: 'text.secondary'
              }}>
                +{additionalCount} others
              </TableCellComponents.SecondaryText>
            )}
          </Box>
        );
      },
      size: 130,
      minSize: 130,
      maxSize: 170,
    })
  );

  // Attendee count column (optional)
  if (showAttendeeCount) {
    columns.push(
      appointmentColumnHelper.accessor((row) => getAttendeeCount(row), {
        id: 'attendee_count',
        header: 'Count',
        cell: (info) => (
          <TableCellComponents.SecondaryText sx={{ textAlign: 'center', fontWeight: 500 }}>
            {info.getValue()}
          </TableCellComponents.SecondaryText>
        ),
        size: 60,
        minSize: 60,
        maxSize: 60,
      })
    );
  }

  // Combined Date & Time column
  columns.push(
    appointmentColumnHelper.accessor((row) => getDateTimeDisplay(row, statusMap, subStatusMap), {
      id: 'date_time',
      header: 'Date & Time',
      cell: (info) => {
        const { date, time, isAppointmentDate } = info.getValue();
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
            <Box>
              <TableCellComponents.SecondaryText sx={{ lineHeight: 1 }}>
                {date}
              </TableCellComponents.SecondaryText>
              {time && (
                <TableCellComponents.SecondaryText sx={{ 
                  lineHeight: 1, 
                  mt: '8px',
                  fontSize: '0.75rem',
                  color: 'text.secondary'
                }}>
                  {time}
                </TableCellComponents.SecondaryText>
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
    })
  );

  // Location column
  columns.push(
    appointmentColumnHelper.accessor((row) => row.location?.name || 'N/A', {
      id: 'location',
      header: 'Location',
      cell: (info) => (
        <TableCellComponents.SecondaryText sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {info.getValue()}
        </TableCellComponents.SecondaryText>
      ),
      size: 120,
      minSize: 120,
      maxSize: 120,
    })
  );

  // Status column
  columns.push(
    appointmentColumnHelper.accessor('status', {
      id: 'status',
      header: 'Status',
      cell: (info) => (
        <AppointmentStatusChip status={info.getValue()} size="small" />
      ),
      size: 116,
      minSize: 116,
      maxSize: 116,
    })
  );

  // Requested column (when the appointment was requested)
  columns.push(
    appointmentColumnHelper.accessor('created_at', {
      id: 'requested',
      header: 'Requested',
      cell: (info) => {
        const createdAt = info.getValue();
        return (
          <TableCellComponents.SecondaryText>
            {createdAt ? formatDate(createdAt, false) : '-'}
          </TableCellComponents.SecondaryText>
        );
      },
      size: 108,
      minSize: 108,
      maxSize: 108,
    })
  );

  // Actions column
  columns.push(
    appointmentColumnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <ActionButton
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onEdit(info.row.original.id);
          }}
        >
          <EditIconV2 sx={{ width: 20, height: 20 }} />
        </ActionButton>
      ),
      size: 56,
      minSize: 56,
      maxSize: 56,
      enableSorting: false,
    })
  );

  return columns;
};

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  onRowClick,
  onEdit,
  selectedRows = [],
  onRowSelectionChange,
  statusMap = {},
  subStatusMap = {},
  relationshipTypeMap = {},
  showAttendeeCount = false,
  enableRowSelection = true
}) => {
  // Create appointment-specific columns
  const columns = useMemo(
    () => createAppointmentColumns(onEdit, statusMap, subStatusMap, relationshipTypeMap, showAttendeeCount),
    [onEdit, statusMap, subStatusMap, relationshipTypeMap, showAttendeeCount]
  );

  // Create appointment-specific global filter
  const globalFilterFn = useMemo(
    () => createAppointmentGlobalFilter(relationshipTypeMap),
    [relationshipTypeMap]
  );

  // Convert selectedRows to the format expected by GenericTable
  const handleRowSelectionChange = (selectedIds: (string | number)[]) => {
    if (onRowSelectionChange) {
      // Convert back to numbers for appointment IDs
      const numericIds = selectedIds.map(id => typeof id === 'number' ? id : parseInt(String(id), 10)).filter(id => !isNaN(id));
      onRowSelectionChange(numericIds);
    }
  };

  // Define searchable fields for appointments (used when enableSearch is true)
  const searchableFields: (keyof Appointment)[] = [
    'id',
    'purpose',
    'appointment_type',
    'status',
    'sub_status',
    'preferred_date',
    'appointment_date',
    'appointment_time',
    'location'
  ];

  return (
    <GenericTable
      data={appointments}
      columns={columns}
      onRowClick={onRowClick}
      selectedRows={selectedRows}
      onRowSelectionChange={handleRowSelectionChange}
      enableRowSelection={enableRowSelection}
      globalFilterFn={globalFilterFn}
      getRowId={(row) => row.id.toString()}
      emptyMessage="No appointments found for the selected filters."
      selectionMessage={`${selectedRows.length} appointment${selectedRows.length === 1 ? '' : 's'} selected`}
      searchableFields={searchableFields}
      tableProps={{
        stickyHeader: true,
        size: 'medium',
        padding: 'normal'
      }}
    />
  );
};

export default AppointmentTable; 