import React, { useMemo } from 'react';
import { Typography, Box } from '@mui/material';
import { createColumnHelper, ColumnDef, FilterFn } from '@tanstack/react-table';
import { Appointment, AppointmentDignitary, AppointmentContact, StatusMap, SubStatusMap } from '../models/types';
import { formatDate, formatDateRange } from '../utils/dateUtils';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { AppointmentStatusChip } from './AppointmentStatusChip';
import { CheckCircleIconV2 } from './iconsv2';
import { GenericTable, TableCellComponents, standardColumnSizes } from './GenericTable';

interface AppointmentTableProps {
  appointments: Appointment[];
  onRowClick?: (appointment: Appointment) => void;
  statusMap?: StatusMap;
  subStatusMap?: SubStatusMap;
  relationshipTypeMap?: Record<string, string>;
  enableColumnVisibility?: boolean;
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

// Create appointment-specific columns for general users (simplified)
const createAppointmentColumns = (
  statusMap: StatusMap = {},
  subStatusMap: SubStatusMap = {},
  relationshipTypeMap: Record<string, string> = {}
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

  // Attendees column
  columns.push(
    appointmentColumnHelper.accessor((row) => getAttendeesInfo(row, relationshipTypeMap), {
      id: 'attendees',
      header: 'Attendees',
      cell: (info) => {
        const { primaryName, additionalCount } = info.getValue();
        return (
          <Box>
            <TableCellComponents.PrimaryText sx={{ lineHeight: 1.2 }}>
              {primaryName}
            </TableCellComponents.PrimaryText>
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
      size: 180,
      minSize: 150,
      maxSize: 220,
    })
  );

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
              <TableCellComponents.PrimaryText sx={{ lineHeight: 1 }}>
                {date}
              </TableCellComponents.PrimaryText>
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
                color: '#4caf50', 
                fontSize: 16,
                flexShrink: 0
              }} />
            )}
          </Box>
        );
      },
      size: 160,
      minSize: 140,
      maxSize: 180,
    })
  );

  // Location column
  columns.push(
    appointmentColumnHelper.accessor((row) => row.location?.name || 'N/A', {
      id: 'location',
      header: 'Location',
      cell: (info) => (
        <TableCellComponents.PrimaryText sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {info.getValue()}
        </TableCellComponents.PrimaryText>
      ),
      size: 140,
      minSize: 120,
      maxSize: 160,
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
      size: 120,
      minSize: 100,
      maxSize: 140,
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
      size: 110,
      minSize: 100,
      maxSize: 120,
    })
  );

  return columns;
};

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  onRowClick,
  statusMap = {},
  subStatusMap = {},
  relationshipTypeMap = {},
  enableColumnVisibility = false
}) => {
  // Create appointment-specific columns
  const columns = useMemo(
    () => createAppointmentColumns(statusMap, subStatusMap, relationshipTypeMap),
    [statusMap, subStatusMap, relationshipTypeMap]
  );

  // Create appointment-specific global filter
  const globalFilterFn = useMemo(
    () => createAppointmentGlobalFilter(relationshipTypeMap),
    [relationshipTypeMap]
  );

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
      enableRowSelection={false}
      globalFilterFn={globalFilterFn}
      getRowId={(row) => row.id.toString()}
      emptyMessage="No appointments found."
      enableSearch={true}
      searchPlaceholder="Search appointments..."
      searchableFields={searchableFields}
      enablePagination={appointments.length > 10}
      pageSize={10}
      pageSizeOptions={[5, 10, 25]}
      enableColumnVisibility={enableColumnVisibility}
      tableProps={{
        stickyHeader: true,
        size: 'medium',
        padding: 'normal'
      }}
    />
  );
};

export default AppointmentTable; 