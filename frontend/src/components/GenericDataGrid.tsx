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
  },
  '& .MuiDataGrid-columnHeader .MuiDataGrid-columnHeaderTitle': {
    overflow: 'visible',
    lineHeight: '1.43rem',
    whiteSpace: 'normal',
    display: 'block'
  }
};

const GenericDataGrid: React.FC<GenericDataGridProps> = ({
  rows,
  columns,
  loading = false,
  containerHeight = 600,
  ...props
}) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ height: containerHeight, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowHeight={() => 'auto'}
          disableRowSelectionOnClick
          paginationMode="client"
          pageSizeOptions={[10]}
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
            ...(props.sx || {})
          }}
          {...props}
        />
      </Box>
    </Paper>
  );
};

export default GenericDataGrid; 