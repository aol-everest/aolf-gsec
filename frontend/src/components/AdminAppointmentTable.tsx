import React, { useMemo } from 'react';
import { Typography, Box } from '@mui/material';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { Appointment, AppointmentDignitary, AppointmentContact, StatusMap, SubStatusMap } from '../models/types';
import { formatDate, formatDateRange } from '../utils/dateUtils';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { AppointmentStatusChip } from './AppointmentStatusChip';
import { EditIconV2, CheckCircleIconV2 } from './iconsv2';
import { GenericTable, TableCellComponents, standardColumnSizes } from './GenericTable';
import { ActionButton } from './ActionButton';

interface AdminAppointmentTableProps {
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
  onRefresh?: () => void;
  refreshing?: boolean;
}

// Create a column helper for appointments
const appointmentColumnHelper = createColumnHelper<Appointment>();

// Hidden columns now provide comprehensive search functionality

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
  statusMap: StatusMap,
  subStatusMap: SubStatusMap,
  relationshipTypeMap: Record<string, string>,
  showAttendeeCount: boolean
): ColumnDef<Appointment, any>[] => {
  const columns: ColumnDef<Appointment, any>[] = [];

  // Hidden searchable columns for comprehensive search functionality
  // These columns are permanently hidden but their data is searchable
  
  // Searchable requester info
  columns.push(
    appointmentColumnHelper.accessor((row) => {
      const requester = row.requester;
      if (!requester) return '';
      return [
        requester.first_name,
        requester.last_name,
        requester.email,
        requester.phone_number
      ].filter(Boolean).join(' ');
    }, {
      id: 'searchable_requester_info',
      header: 'Searchable Requester Info',
      enableHiding: false, // Permanently hidden
      enableSorting: false,
    })
  );

  // Searchable dignitary info
  columns.push(
    appointmentColumnHelper.accessor((row) => {
      const dignitaries = row.appointment_dignitaries || [];
      return dignitaries.map(ad => {
        const dig = ad.dignitary;
        return [
          dig.honorific_title,
          dig.first_name,
          dig.last_name,
          dig.email,
          dig.phone,
          dig.organization,
          dig.title_in_organization,
          dig.primary_domain,
          dig.primary_domain_other,
          dig.country,
          dig.state,
          dig.city
        ].filter(Boolean).join(' ');
      }).join(' ');
    }, {
      id: 'searchable_dignitary_info',
      header: 'Searchable Dignitary Info',
      enableHiding: false, // Permanently hidden
      enableSorting: false,
    })
  );

  // Searchable contact info
  columns.push(
    appointmentColumnHelper.accessor((row) => {
      const contacts = row.appointment_contacts || [];
      return contacts.map(ac => {
        const contact = ac.contact;
        const selfDisplayName = relationshipTypeMap['SELF'] || 'Self';
        const isSelfContact = contact.relationship_to_owner === relationshipTypeMap['SELF'] ||
          (contact.first_name === selfDisplayName && contact.last_name === selfDisplayName);
        
        return [
          isSelfContact ? selfDisplayName : contact.first_name,
          isSelfContact ? '' : contact.last_name,
          contact.email,
          contact.phone,
          contact.relationship_to_owner
        ].filter(Boolean).join(' ');
      }).join(' ');
    }, {
      id: 'searchable_contact_info',
      header: 'Searchable Contact Info',
      enableHiding: false, // Permanently hidden
      enableSorting: false,
    })
  );

  // Searchable notes
  columns.push(
    appointmentColumnHelper.accessor((row) => {
      return [
        row.requester_notes_to_secretariat,
        row.secretariat_meeting_notes,
        row.secretariat_follow_up_actions,
        row.secretariat_notes_to_requester
      ].filter(Boolean).join(' ');
    }, {
      id: 'searchable_notes',
      header: 'Searchable Notes',
      enableHiding: false, // Permanently hidden
      enableSorting: false,
    })
  );

  // Searchable location info
  columns.push(
    appointmentColumnHelper.accessor((row) => {
      const location = row.location;
      if (!location) return '';
      return [
        location.name,
        location.city,
        location.state,
        location.country
      ].filter(Boolean).join(' ');
    }, {
      id: 'searchable_location_info',
      header: 'Searchable Location Info',
      enableHiding: false, // Permanently hidden
      enableSorting: false,
    })
  );

  // Searchable appointment instance info
  columns.push(
    appointmentColumnHelper.accessor((row) => {
      const contacts = row.appointment_contacts || [];
      return contacts.map(ac => {
        return [
          ac.course_attending,
          (ac as any).course_attending_other, // Type assertion for newer field
          ac.seva_type,
          ac.role_in_team_project,
          ac.role_in_team_project_other
        ].filter(Boolean).join(' ');
      }).join(' ');
    }, {
      id: 'searchable_appointment_instance_info',
      header: 'Searchable Appointment Instance Info',
      enableHiding: false, // Permanently hidden
      enableSorting: false,
    })
  );

  // ID column
  columns.push(
    appointmentColumnHelper.accessor('id', {
      id: 'id',
      header: 'ID',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue()}
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
      enableHiding: false, // Prevent Actions column from showing in column visibility menu
    })
  );

  return columns;
};

export const AdminAppointmentTable: React.FC<AdminAppointmentTableProps> = ({
  appointments,
  onRowClick,
  onEdit,
  selectedRows = [],
  onRowSelectionChange,
  statusMap = {},
  subStatusMap = {},
  relationshipTypeMap = {},
  showAttendeeCount = false,
  enableRowSelection = true,
  onRefresh,
  refreshing = false
}) => {
  // Create appointment-specific columns
  const columns = useMemo(
    () => createAppointmentColumns(onEdit, statusMap, subStatusMap, relationshipTypeMap, showAttendeeCount),
    [onEdit, statusMap, subStatusMap, relationshipTypeMap, showAttendeeCount]
  );

  // No longer need custom global filter since hidden columns provide comprehensive search

  // Convert selectedRows to the format expected by GenericTable
  const handleRowSelectionChange = (selectedIds: (string | number)[]) => {
    if (onRowSelectionChange) {
      // Convert back to numbers for appointment IDs
      const numericIds = selectedIds.map(id => typeof id === 'number' ? id : parseInt(String(id), 10)).filter(id => !isNaN(id));
      onRowSelectionChange(numericIds);
    }
  };

  // No need to define searchableFields since we're using hidden columns for comprehensive search
  // The hidden columns will automatically be included in the search

  return (
    <GenericTable
      data={appointments}
      columns={columns}
      onRowClick={onRowClick}
      selectedRows={selectedRows}
      onRowSelectionChange={handleRowSelectionChange}
      enableRowSelection={enableRowSelection}
      getRowId={(row) => row.id.toString()}
      emptyMessage="No appointments found for the selected filters."
      selectionMessage={`${selectedRows.length} appointment${selectedRows.length === 1 ? '' : 's'} selected`}
      enableSearch={true}
      searchPlaceholder="Search appointments..."
      showSearchResultsCount={true}
      searchResultsCountLabel="appointments"
      onRefresh={onRefresh}
      refreshing={refreshing}
      enableColumnVisibility={true}
      initialColumnVisibility={{
        searchable_requester_info: false,
        searchable_dignitary_info: false,
        searchable_contact_info: false,
        searchable_notes: false,
        searchable_location_info: false,
        searchable_appointment_instance_info: false,
      }}
      initialSorting={[{ id: 'id', desc: true }]}
      tableProps={{
        stickyHeader: true,
        size: 'medium',
        padding: 'normal'
      }}
    />
  );
};

export default AdminAppointmentTable; 