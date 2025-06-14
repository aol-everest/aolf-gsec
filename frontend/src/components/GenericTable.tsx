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
  useTheme,
  Checkbox,
  IconButton,
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
  RowSelectionState,
  ColumnDef
} from '@tanstack/react-table';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { debugLog, createDebugLogger } from '../utils/debugUtils';

interface GenericTableProps<T extends Record<string, any>> {
  data: T[];
  columns: ColumnDef<T, any>[];
  onRowClick?: (row: T) => void;
  selectedRows?: (string | number)[];
  onRowSelectionChange?: (selectedIds: (string | number)[]) => void;
  enableRowSelection?: boolean;
  globalFilterFn?: FilterFn<T>;
  getRowId?: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  selectionMessage?: string;
  showSelectionInfo?: boolean;
  tableProps?: {
    stickyHeader?: boolean;
    size?: 'small' | 'medium';
    padding?: 'normal' | 'checkbox' | 'none';
  };
  containerProps?: {
    maxHeight?: number | string;
    sx?: any;
  };
}

// Create a generic column helper factory
export const createGenericColumnHelper = <T extends Record<string, any>>() => createColumnHelper<T>();

// Default global filter function for basic text search
const createDefaultGlobalFilter = <T extends Record<string, any>>(): FilterFn<T> => 
  (row, columnId, value) => {
    const searchValue = String(value).toLowerCase();
    const rowValues = Object.values(row.original).map(val => 
      val ? String(val).toLowerCase() : ''
    );
    return rowValues.some(val => val.includes(searchValue));
  };

// Common styling utilities
export const defaultTableStyles = {
  // Standard text styles
  primaryText: {
    fontSize: '14px',
    color: '#31364e',
    fontWeight: 500,
    fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
  },
  secondaryText: {
    fontSize: '14px',
    color: '#6f7283',
    fontWeight: 400,
    fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
  },
  // Action button styles
  actionButton: {
    borderRadius: '12px',
    border: '1px solid #e9e9e9',
    width: 40,
    height: 40,
    backgroundColor: '#f7f7f7',
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.08)',
    }
  },
  // Status styles
  activeStatus: {
    fontSize: '14px',
    color: 'success.main',
    fontWeight: 'medium',
    fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
  },
  inactiveStatus: {
    fontSize: '14px',
    color: 'error.main',
    fontWeight: 'medium',
    fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
  }
};

// Helper components for common cell types
export const TableCellComponents = {
  PrimaryText: ({ children, sx = {}, ...props }: any) => (
    <Typography sx={{ ...defaultTableStyles.primaryText, ...sx }} {...props}>
      {children}
    </Typography>
  ),
  SecondaryText: ({ children, sx = {}, ...props }: any) => (
    <Typography sx={{ ...defaultTableStyles.secondaryText, ...sx }} {...props}>
      {children}
    </Typography>
  ),
  StatusText: ({ active, children, sx = {}, ...props }: { active: boolean; children: React.ReactNode; sx?: any }) => (
    <Typography 
      variant="body2" 
      sx={{ 
        ...(active ? defaultTableStyles.activeStatus : defaultTableStyles.inactiveStatus),
        ...sx 
      }} 
      {...props}
    >
      {children}
    </Typography>
  ),
  ActionButton: ({ children, onClick, sx = {}, ...props }: any) => (
    <IconButton 
      size="small"
      onClick={onClick}
      sx={{ ...defaultTableStyles.actionButton, ...sx }}
      {...props}
    >
      {children}
    </IconButton>
  )
};

// Standard column sizes
export const standardColumnSizes = {
  small: { size: 80, minSize: 60, maxSize: 100 },
  medium: { size: 120, minSize: 100, maxSize: 150 },
  large: { size: 180, minSize: 150, maxSize: 220 },
  extraLarge: { size: 250, minSize: 200, maxSize: 300 },
  actions: { size: 80, minSize: 80, maxSize: 80 },
  id: { size: 50, minSize: 40, maxSize: 100 },
  status: { size: 100, minSize: 80, maxSize: 120 },
  checkbox: { size: 50, minSize: 50, maxSize: 50 }
};

export function GenericTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  selectedRows = [],
  onRowSelectionChange,
  enableRowSelection = false,
  globalFilterFn,
  getRowId = (row) => row.id?.toString() || Math.random().toString(),
  loading = false,
  emptyMessage = 'No data available',
  selectionMessage,
  showSelectionInfo = true,
  tableProps = {},
  containerProps = {}
}: GenericTableProps<T>) {
  const logger = createDebugLogger('GenericTable');
  const theme = useTheme();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Default table props
  const {
    stickyHeader = true,
    size = 'medium',
    padding = 'normal'
  } = tableProps;

  // Update row selection when selectedRows prop changes
  React.useEffect(() => {
    logger('📋 [TABLE DEBUG] selectedRows prop changed:', {
      selectedRows,
      count: selectedRows.length,
      dataCount: data.length
    });
    
    const newRowSelection: RowSelectionState = {};
    selectedRows.forEach(id => {
      const itemExists = data.some(item => getRowId(item) === String(id));
      logger(`📋 [TABLE DEBUG] Looking for item ID ${id} exists: ${itemExists}`);
      if (itemExists) {
        newRowSelection[String(id)] = true;
      }
    });
    
    logger('📋 [TABLE DEBUG] Setting new row selection:', newRowSelection);
    setRowSelection(newRowSelection);
  }, [selectedRows, data, getRowId]);

  // Handle row selection change
  const handleRowSelectionChange = (updater: any) => {
    logger('📋 [TABLE DEBUG] handleRowSelectionChange called with:', {
      updaterType: typeof updater,
      currentRowSelection: rowSelection,
      dataCount: data.length
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
          // Try to convert to number if possible, otherwise keep as string
          const numericId = Number(key);
          return !isNaN(numericId) ? numericId : key;
        });
      
      logger('📋 [TABLE DEBUG] Final selectedIds:', selectedIds);
      onRowSelectionChange(selectedIds);
    }
  };

  // Add selection column if row selection is enabled
  const finalColumns = useMemo(() => {
    if (!enableRowSelection) return columns;

    const columnHelper = createGenericColumnHelper<T>();
    const selectionColumn = columnHelper.display({
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
      ...standardColumnSizes.checkbox,
      enableSorting: false,
    });

    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

  // Create the global filter function
  const finalGlobalFilterFn = useMemo(
    () => globalFilterFn || createDefaultGlobalFilter<T>(),
    [globalFilterFn]
  );

  // Create table instance
  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection,
    onRowSelectionChange: enableRowSelection ? handleRowSelectionChange : undefined,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: finalGlobalFilterFn,
    getRowId,
    debugTable: false,
  });

  if (loading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading...</Typography>
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>{emptyMessage}</Typography>
      </Paper>
    );
  }

  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Selection info */}
      {enableRowSelection && showSelectionInfo && selectedCount > 0 && (
        <Box sx={{ 
          mb: 1, 
          p: 2, 
          backgroundColor: 'rgba(255, 255, 255, 0.81)',
          border: '1px solid rgba(56, 56, 56, 0.1)',
          borderRadius: 2,
        }}>
          <Typography variant="body2" color="primary.dark">
            {selectionMessage || `${selectedCount} item${selectedCount === 1 ? '' : 's'} selected`}
          </Typography>
        </Box>
      )}

      <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: 2,
          border: '1px solid rgba(56, 56, 56, 0.1)',
          boxShadow: '0px 12px 16px -4px rgba(81, 77, 74, 0.08), 0px -1px 6px -2px rgba(81, 77, 74, 0.03)',
          width: '100%',
          overflow: 'auto',
          backgroundColor: '#fff',
          ...containerProps.sx,
          ...(containerProps.maxHeight && { maxHeight: containerProps.maxHeight })
        }}
      >
        <Table 
          stickyHeader={stickyHeader}
          size={size}
          sx={{ 
            width: '100%',
            tableLayout: 'fixed',
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
                      padding: padding === 'normal' ? '12px 16px' : '8px 12px',
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
                onClick={() => onRowClick?.(row.original)}
                sx={{ 
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': onRowClick ? {
                    backgroundColor: theme.palette.action.hover,
                  } : {},
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
                      padding: padding === 'normal' ? '16px' : '12px',
                      borderBottom: '1px solid #e9e9e9',
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
}

export default GenericTable; 