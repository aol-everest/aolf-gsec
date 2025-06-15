import React, { useMemo } from 'react';
import { Typography, Link } from '@mui/material';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { GenericTable, TableCellComponents, standardColumnSizes } from './GenericTable';
import { EditIconV2 } from './iconsv2';
import AttachFileIcon from '@mui/icons-material/AttachFile';

// Location interface (you can import this from your types file)
interface Location {
  id: number;
  name: string;
  street_address: string;
  state: string;
  state_code?: string;
  city: string;
  country: string;
  country_code: string;
  zip_code: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  driving_directions?: string;
  secretariat_internal_notes?: string;
  parking_info?: string;
  attachment_path?: string;
  attachment_name?: string;
  attachment_file_type?: string;
  created_at: string;
  updated_at?: string;
  created_by: number;
  updated_by?: number;
  created_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  updated_by_user?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  attachment_thumbnail_path?: string;
  is_active: boolean;
}

interface LocationTableProps {
  locations: Location[];
  onRowClick?: (location: Location) => void;
  onEdit: (locationId: number) => void;
  selectedRows?: number[];
  onRowSelectionChange?: (selectedIds: number[]) => void;
  enableRowSelection?: boolean;
  baseUrl?: string; // API base URL for attachment links
  loading?: boolean;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchableFields?: (keyof Location)[];
}

// Create a column helper for locations
const locationColumnHelper = createColumnHelper<Location>();

// Create location-specific columns
const createLocationColumns = (
  onEdit: (locationId: number) => void,
  baseUrl: string = ''
): ColumnDef<Location, any>[] => {
  const columns: ColumnDef<Location, any>[] = [];

  // Name column
  columns.push(
    locationColumnHelper.accessor('name', {
      id: 'name',
      header: 'Name',
      cell: (info) => (
        <TableCellComponents.PrimaryText>
          {info.getValue()}
        </TableCellComponents.PrimaryText>
      ),
      size: 150,
      minSize: 100,
      maxSize: 200,
    })
  );

  // Address column
  columns.push(
    locationColumnHelper.accessor('street_address', {
      id: 'street_address',
      header: 'Address',
      cell: (info) => (
        <TableCellComponents.SecondaryText sx={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {info.getValue()}
        </TableCellComponents.SecondaryText>
      ),
      size: 200,
      minSize: 150,
      maxSize: 300,
    })
  );

  // City column
  columns.push(
    locationColumnHelper.accessor('city', {
      id: 'city',
      header: 'City',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue()}
        </TableCellComponents.SecondaryText>
      ),
      size: 120,
      minSize: 80,
      maxSize: 150,
    })
  );

  // State column
  columns.push(
    locationColumnHelper.accessor('state', {
      id: 'state',
      header: 'State',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue()}
        </TableCellComponents.SecondaryText>
      ),
      size: 120,
      minSize: 80,
      maxSize: 150,
    })
  );

  // Country column
  columns.push(
    locationColumnHelper.accessor('country', {
      id: 'country',
      header: 'Country',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue()}
        </TableCellComponents.SecondaryText>
      ),
      size: 120,
      minSize: 80,
      maxSize: 150,
    })
  );

  // Timezone column
  columns.push(
    locationColumnHelper.accessor('timezone', {
      id: 'timezone',
      header: 'Timezone',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue() || '-'}
        </TableCellComponents.SecondaryText>
      ),
      size: 150,
      minSize: 120,
      maxSize: 200,
    })
  );

  // Status column
  columns.push(
    locationColumnHelper.accessor('is_active', {
      id: 'is_active',
      header: 'Status',
      cell: (info) => (
        <TableCellComponents.StatusText active={info.getValue()}>
          {info.getValue() ? 'Active' : 'Inactive'}
        </TableCellComponents.StatusText>
      ),
      size: 100,
      minSize: 80,
      maxSize: 120,
    })
  );

  // Created By column
  columns.push(
    locationColumnHelper.accessor((row) => 
      row.created_by_user 
        ? `${row.created_by_user.first_name} ${row.created_by_user.last_name}`
        : 'System', 
    {
      id: 'created_by_name',
      header: 'Created By',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue()}
        </TableCellComponents.SecondaryText>
      ),
      size: 150,
      minSize: 120,
      maxSize: 200,
    })
  );

  // Updated By column
  columns.push(
    locationColumnHelper.accessor((row) => 
      row.updated_by_user 
        ? `${row.updated_by_user.first_name} ${row.updated_by_user.last_name}`
        : '-', 
    {
      id: 'updated_by_name',
      header: 'Updated By',
      cell: (info) => (
        <TableCellComponents.SecondaryText>
          {info.getValue()}
        </TableCellComponents.SecondaryText>
      ),
      size: 150,
      minSize: 120,
      maxSize: 200,
    })
  );

  // Attachment column
  columns.push(
    locationColumnHelper.accessor('attachment_path', {
      id: 'attachment',
      header: 'Attachment',
      cell: (info) => {
        const location = info.row.original;
        if (!location.attachment_path) return null;
        
        const isImage = location.attachment_file_type?.startsWith('image/');
        const attachmentUrl = `${baseUrl}/locations/${location.id}/attachment`;
        const thumbnailUrl = `${baseUrl}/locations/${location.id}/thumbnail`;
        
        return (
          <Link 
            href={attachmentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            {isImage ? (
              <img 
                src={thumbnailUrl} 
                alt={location.attachment_name}
                style={{ width: 24, height: 24, marginRight: 4, objectFit: 'cover' }}
              />
            ) : (
              <AttachFileIcon />
            )}
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              {location.attachment_name?.split('.').pop()?.toUpperCase()}
            </Typography>
          </Link>
        );
      },
      size: 120,
      minSize: 100,
      maxSize: 150,
      enableSorting: false,
    })
  );

  // Actions column
  columns.push(
    locationColumnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <TableCellComponents.ActionButton
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onEdit(info.row.original.id);
          }}
        >
          <EditIconV2 sx={{ width: 20, height: 20 }} />
        </TableCellComponents.ActionButton>
      ),
      size: 80,
      minSize: 80,
      maxSize: 80,
      enableSorting: false,
    })
  );

  return columns;
};

export const LocationTable: React.FC<LocationTableProps> = ({
  locations,
  onRowClick,
  onEdit,
  selectedRows = [],
  onRowSelectionChange,
  enableRowSelection = false,
  baseUrl = '',
  loading = false,
  enableSearch = false,
  searchPlaceholder = 'Search locations...',
  searchableFields = ['name', 'street_address', 'city', 'state', 'country']
}) => {
  // Create location-specific columns
  const columns = useMemo(
    () => createLocationColumns(onEdit, baseUrl),
    [onEdit, baseUrl]
  );

  // Convert selectedRows to the format expected by GenericTable
  const handleRowSelectionChange = (selectedIds: (string | number)[]) => {
    if (onRowSelectionChange) {
      // Convert back to numbers for location IDs
      const numericIds = selectedIds.map(id => typeof id === 'number' ? id : parseInt(String(id), 10)).filter(id => !isNaN(id));
      onRowSelectionChange(numericIds);
    }
  };

  return (
    <GenericTable
      data={locations}
      columns={columns}
      onRowClick={onRowClick}
      selectedRows={selectedRows}
      onRowSelectionChange={handleRowSelectionChange}
      enableRowSelection={enableRowSelection}
      getRowId={(row) => row.id.toString()}
      loading={loading}
      emptyMessage="No locations found."
      selectionMessage={`${selectedRows.length} location${selectedRows.length === 1 ? '' : 's'} selected`}
      enableColumnVisibility={true}
      initialColumnVisibility={{
        timezone: false,
        created_by_name: false,
      }}
      enableSearch={enableSearch}
      searchPlaceholder={searchPlaceholder}
      searchableFields={searchableFields}
      tableProps={{
        stickyHeader: true,
        size: 'medium',
        padding: 'normal'
      }}
    />
  );
};

export default LocationTable; 