import React, { useState } from 'react';
import {
  DataGrid,
  GridColDef,
  DataGridProps,
  GridDensity,
  GridToolbarDensitySelector,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridRowHeightParams,
  GridToolbarQuickFilter,
} from '@mui/x-data-grid';
import { Box, Paper } from '@mui/material';

export interface GenericDataGridProps extends Omit<DataGridProps, 'rows' | 'columns'> {
  rows: any[];
  columns: GridColDef[];
  loading?: boolean;
  containerHeight?: number | string;
  defaultDensity?: GridDensity;
  defaultVisibleColumns?: string[];
  customRowHeight?: number;
}

const GenericDataGridStyles = {
  '& .MuiDataGrid-cell': {
    padding: '8px',
  },
  '& .MuiDataGrid-columnHeader .MuiDataGrid-columnHeaderTitle': {
    overflow: 'visible',
    lineHeight: '1.43rem',
    whiteSpace: 'normal',
    display: 'block'
  },
  '& .MuiDataGrid-columnHeader': {
    minHeight: '56px !important',
  },
  '& .MuiDataGrid-virtualScroller': {
    overflow: 'auto',
    minHeight: '300px',
  },
  '& .MuiDataGrid-footerContainer': {
    minHeight: '52px',
    borderTop: '1px solid rgba(224, 224, 224, 1)',
  },
  '& .actions': { 
    color: 'text.secondary' 
  },
  '& .textPrimary': { 
    color: 'text.primary' 
  },
  '& .MuiDataGrid-toolbarContainer': {
    padding: '8px',
    gap: '8px',
  }
};

const DEFAULT_PAGE_SIZE = 10;

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      <GridToolbarQuickFilter />
    </GridToolbarContainer>
  );
}

const GenericDataGrid: React.FC<GenericDataGridProps> = ({
  rows,
  columns,
  loading = false,
  containerHeight = 800,
  initialState,
  defaultDensity = 'standard',
  defaultVisibleColumns,
  customRowHeight,
  slots,
  slotProps,
  ...props
}) => {
  const [currentDensity, setCurrentDensity] = useState<GridDensity>(defaultDensity);

  const getDensitySettings = (density: GridDensity) => {
    switch (density) {
      case 'comfortable':
        return {
          sx: {
            '& .MuiDataGrid-cell': {
              whiteSpace: 'normal !important',
              overflow: 'hidden',
              textOverflow: 'wrap',
              fontSize: '1rem',
              lineHeight: '1.5',
              padding: '12px 8px',
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-row': {              
              maxHeight: '130px !important',
            },
          },
        };
      case 'standard':
        return {
          sx: {
            '& .MuiDataGrid-cell': {
              whiteSpace: 'normal !important',
              overflow: 'hidden',
              textOverflow: 'wrap',
              fontSize: '0.875rem',
              lineHeight: '1.43',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-row': {
              maxHeight: '100px !important',
            },
          },
        };
      case 'compact':
        return {
          sx: {
            '& .MuiDataGrid-cell': {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '0.81rem',
              lineHeight: '1.33',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-row': {
              maxHeight: '56px !important',
            },
          },
        };
      default:
        return {};
    }
  };

  const mergedInitialState = {
    pagination: {
      paginationModel: {
        pageSize: DEFAULT_PAGE_SIZE,
        page: 0,
      },
    },
    density: defaultDensity,
    columns: {
      columnVisibilityModel: defaultVisibleColumns?.reduce((acc, field) => ({
        ...acc,
        [field]: true,
      }), columns.reduce((acc, col) => ({
        ...acc,
        [col.field]: false,
      }), {})),
    },
    ...initialState,
  };

  const densitySettings = getDensitySettings(currentDensity);

  const getRowHeight = (params: GridRowHeightParams) => {
    if (customRowHeight) {
      return customRowHeight;
    }
    
    const densityRowHeights = {
      compact: 56,
      standard: 100,
      comfortable: 130,
    };
  
    return Math.min(densityRowHeights[currentDensity] || 100, params.model.size || 100);
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box 
        sx={{ 
          width: '100%',
        }}
      >
        <DataGrid
          getRowHeight={getRowHeight}
          rows={rows}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          paginationMode="client"
          pageSizeOptions={[5, 10, 25, 50, 100]}
          rowSelection={false}
          initialState={mergedInitialState}
          slots={{
            toolbar: CustomToolbar,
            ...slots,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { 
                debounceMs: 300,
              },
            },
            ...slotProps,
          }}
          onDensityChange={(newDensity) => setCurrentDensity(newDensity)}
          {...densitySettings}
          sx={{
            ...GenericDataGridStyles,
            ...densitySettings.sx,
            ...(props.sx || {}),
          }}
          {...props}
        />
      </Box>
    </Paper>
  );
};

export default GenericDataGrid; 