import React, { useMemo } from 'react';
import { Typography, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { GenericTable, TableCellComponents, standardColumnSizes } from './GenericTable';
import { Appointment, StatusMap } from '../models/types';
import { formatDate } from '../utils/dateUtils';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { AppointmentStatusChip } from './AppointmentStatusChip';

interface Location {
  id: number;
  name: string;
  city: string;
  state: string;
}

interface AppointmentWithNames extends Appointment {
  dignitary_names?: string;
}

interface AdminAppointmentListTableProps {
  appointments: AppointmentWithNames[];
  onRowClick?: (appointment: AppointmentWithNames) => void;
  loading?: boolean;
  statusOptions: string[];
  subStatusOptions: string[];
  appointmentTypeOptions: string[];
  locations: Location[];
  onUpdateAppointment: (appointment: AppointmentWithNames) => Promise<void>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  enableColumnVisibility?: boolean;
}

// Create a column helper for appointments
const appointmentColumnHelper = createColumnHelper<AppointmentWithNames>();

// Status edit component
interface StatusEditCellProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

const StatusEditCell: React.FC<StatusEditCellProps> = ({ value, onChange, options }) => {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  return (
    <Select
      value={value}
      onChange={handleChange}
      fullWidth
      variant="standard"
      size="small"
    >
      {options.map((option: string) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </Select>
  );
};

// Create appointment-specific columns for admin list
const createAdminAppointmentColumns = (
  statusOptions: string[],
  subStatusOptions: string[],
  appointmentTypeOptions: string[],
  locations: Location[],
  onUpdateAppointment: (appointment: AppointmentWithNames) => Promise<void>
): ColumnDef<AppointmentWithNames, any>[] => {
  const columns: ColumnDef<AppointmentWithNames, any>[] = [];

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

  // Dignitary Names column
  columns.push(
    appointmentColumnHelper.accessor('dignitary_names', {
      id: 'dignitary_names',
      header: 'Dignitary',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue() || 'N/A'}
        </TableCellComponents.SecondaryText>
      ),
      size: 180,
      minSize: 150,
      maxSize: 250,
    })
  );

  // Requested Date & Time column
  columns.push(
    appointmentColumnHelper.accessor((row) => 
      `${formatDate(row.preferred_date, false)} ${row.preferred_time_of_day || ''}`, {
      id: 'preferred_date_and_time',
      header: 'Requested Date & Time',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue()}
        </TableCellComponents.SecondaryText>
      ),
      size: 160,
      minSize: 140,
      maxSize: 180,
    })
  );

  // Appointment Date column (editable)
  columns.push(
    appointmentColumnHelper.accessor('appointment_date', {
      id: 'appointment_date',
      header: 'Appointment Date',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue() ? formatDate(info.getValue(), false) : '-'}
        </TableCellComponents.SecondaryText>
      ),
      size: 140,
      minSize: 120,
      maxSize: 160,
    })
  );

  // Appointment Time column (editable)
  columns.push(
    appointmentColumnHelper.accessor('appointment_time', {
      id: 'appointment_time',
      header: 'Appointment Time',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue() || '-'}
        </TableCellComponents.SecondaryText>
      ),
      size: 140,
      minSize: 120,
      maxSize: 160,
    })
  );

  // Location column
  columns.push(
    appointmentColumnHelper.accessor((row) => {
      const location = row.location || locations.find(loc => loc.id === row.location_id);
      return location ? `${location.name} - ${location.city}, ${location.state}` : 'N/A';
    }, {
      id: 'location',
      header: 'Location',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue()}
        </TableCellComponents.SecondaryText>
      ),
      size: 200,
      minSize: 150,
      maxSize: 250,
    })
  );

  // Has Met Gurudev column
  columns.push(
    appointmentColumnHelper.accessor((row) => {
      if (row.appointment_dignitaries && row.appointment_dignitaries.length > 0) {
        const dignitariesHasMetGurudev = row.appointment_dignitaries.map((ad: any) => {
          const dig = ad.dignitary;
          return dig.has_dignitary_met_gurudev;
        });
        
        const yesCount = dignitariesHasMetGurudev.filter(Boolean).length;
        const noCount = dignitariesHasMetGurudev.length - yesCount;
        
        return `Yes: ${yesCount}, No: ${noCount}`;
      } else {
        return 'N/A';
      }
    }, {
      id: 'has_dignitary_met_gurudev',
      header: 'Met Gurudev?',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue()}
        </TableCellComponents.SecondaryText>
      ),
      size: 120,
      minSize: 100,
      maxSize: 140,
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
      size: 130,
      minSize: 110,
      maxSize: 150,
    })
  );

  // Sub-Status column
  columns.push(
    appointmentColumnHelper.accessor('sub_status', {
      id: 'sub_status',
      header: 'Sub-Status',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue() || '-'}
        </TableCellComponents.SecondaryText>
      ),
      size: 130,
      minSize: 110,
      maxSize: 150,
    })
  );

  // Appointment Type column
  columns.push(
    appointmentColumnHelper.accessor('appointment_type', {
      id: 'appointment_type',
      header: 'Type',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue() || '-'}
        </TableCellComponents.SecondaryText>
      ),
      size: 130,
      minSize: 110,
      maxSize: 150,
    })
  );

  // Requested On column
  columns.push(
    appointmentColumnHelper.accessor('created_at', {
      id: 'created_at',
      header: 'Requested On',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {formatDate(info.getValue(), true)}
        </TableCellComponents.SecondaryText>
      ),
      size: 140,
      minSize: 120,
      maxSize: 160,
    })
  );

  // Last Updated column
  columns.push(
    appointmentColumnHelper.accessor('updated_at', {
      id: 'updated_at',
      header: 'Last Updated',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue() ? formatDate(info.getValue(), true) : '-'}
        </TableCellComponents.SecondaryText>
      ),
      size: 140,
      minSize: 120,
      maxSize: 160,
    })
  );

  return columns;
};

export const AdminAppointmentListTable: React.FC<AdminAppointmentListTableProps> = ({
  appointments,
  onRowClick,
  loading = false,
  statusOptions,
  subStatusOptions,
  appointmentTypeOptions,
  locations,
  onUpdateAppointment,
  searchValue = '',
  onSearchChange,
  enableColumnVisibility = false
}) => {
  // Create appointment-specific columns
  const columns = useMemo(
    () => createAdminAppointmentColumns(
      statusOptions,
      subStatusOptions,
      appointmentTypeOptions,
      locations,
      onUpdateAppointment
    ),
    [statusOptions, subStatusOptions, appointmentTypeOptions, locations, onUpdateAppointment]
  );

  // Define searchable fields for appointments
  const searchableFields: (keyof AppointmentWithNames)[] = useMemo(() => [
    'id',
    'dignitary_names',
    'purpose',
    'status',
    'sub_status',
    'appointment_type',
    'preferred_date',
    'appointment_date',
    'appointment_time',
    'created_at',
    'updated_at',
    'location'
  ], []);

  return (
    <GenericTable
      data={appointments}
      columns={columns}
      onRowClick={onRowClick}
      loading={loading}
      emptyMessage="No appointments found."
      enableSearch={true}
      searchPlaceholder="Search appointments by ID, dignitary, status, type..."
      searchableFields={searchableFields}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      enablePagination={true}
      pageSize={10}
      pageSizeOptions={[10, 25, 50, 100]}
      tableProps={{
        stickyHeader: true,
        size: 'medium',
        padding: 'normal'
      }}
      containerProps={{
        maxHeight: '70vh'
      }}
      enableColumnVisibility={enableColumnVisibility}
    />
  );
};

export default AdminAppointmentListTable; 