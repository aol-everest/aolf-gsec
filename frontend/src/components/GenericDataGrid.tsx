import React from 'react';
import {
  DataGrid,
  GridColDef,
  DataGridProps,
} from '@mui/x-data-grid';
import { Box, Paper } from '@mui/material';

export interface GenericDataGridProps extends Omit<DataGridProps, 'rows' | 'columns'> {
  rows: any[];
  columns: GridColDef[];
  loading?: boolean;
  containerHeight?: number | string;
}

const GenericDataGridStyles = {
  '& .MuiDataGrid-cell': {
    whiteSpace: 'normal',
    lineHeight: 'normal',
    padding: '8px',
  },
  '& .MuiDataGrid-row': {
    alignItems: 'flex-start',
    minHeight: '52px !important',
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
  },
  '& .actions': { 
    color: 'text.secondary' 
  },
  '& .textPrimary': { 
    color: 'text.primary' 
  }
};

const GenericDataGrid: React.FC<GenericDataGridProps> = ({
  rows,
  columns,
  loading = false,
  containerHeight = 400,
  ...props
}) => {
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
          autoHeight
          disableRowSelectionOnClick
          paginationMode="client"
          pageSizeOptions={[5, 10, 25, 50, 100]}
          rowSelection={false}
          density="comfortable"
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
                page: 0,
              },
            },
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