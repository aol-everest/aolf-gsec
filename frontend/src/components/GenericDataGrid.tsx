import React from 'react';
import {
  DataGrid,
  GridColDef,
  DataGridProps,
  GridDensity,
  GridToolbarDensitySelector,
  GridToolbarContainer,
} from '@mui/x-data-grid';
import { Box, Paper } from '@mui/material';

export interface GenericDataGridProps extends Omit<DataGridProps, 'rows' | 'columns'> {
  rows: any[];
  columns: GridColDef[];
  loading?: boolean;
  containerHeight?: number | string;
  defaultDensity?: GridDensity;
}

const GenericDataGridStyles = {
  '& .MuiDataGrid-cell': {
    whiteSpace: 'normal',
    lineHeight: 'normal',
    padding: '8px',
  },
  '& .MuiDataGrid-row': {
    alignItems: 'flex-start',
  },
  '& .MuiDataGrid-columnHeader .MuiDataGrid-columnHeaderTitle': {
    overflow: 'visible',
    lineHeight: '1.43rem',
    whiteSpace: 'normal',
    display: 'block'
  },
  '& .MuiDataGrid-columnHeaders': {
    minHeight: '54px !important',
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
      <GridToolbarDensitySelector />
    </GridToolbarContainer>
  );
}

const GenericDataGrid: React.FC<GenericDataGridProps> = ({
  rows,
  columns,
  loading = false,
  containerHeight = 800,
  initialState,
  defaultDensity = 'comfortable',
  slots,
  slotProps,
  ...props
}) => {
  const mergedInitialState = {
    pagination: {
      paginationModel: {
        pageSize: DEFAULT_PAGE_SIZE,
        page: 0,
      },
    },
    density: defaultDensity,
    ...initialState,
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box 
        sx={{ 
          width: '100%',
          height: containerHeight,
        }}
      >
        <DataGrid
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
          sx={{
            ...GenericDataGridStyles,
            ...(props.sx || {}),
          }}
          {...props}
        />
      </Box>
    </Paper>
  );
};

export default GenericDataGrid; 