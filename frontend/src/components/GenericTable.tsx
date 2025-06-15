import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
  TextField,
  InputAdornment,
  TablePagination,
  Button,
  Menu,
  MenuItem,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { SearchIconV2 } from './iconsv2';
import ClearIcon from '@mui/icons-material/Clear';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  FilterFn,
  RowSelectionState,
  ColumnDef,
  PaginationState,
  VisibilityState
} from '@tanstack/react-table';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { debugLog, createDebugLogger } from '../utils/debugUtils';
import { useDebounce } from '../hooks/useDebounce';
import { SecondaryButton } from './SecondaryButton';
import { ColumnsFilledIconV2 } from './iconsv2';

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
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchableFields?: (keyof T)[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  enablePagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  enableColumnVisibility?: boolean;
  initialColumnVisibility?: VisibilityState;
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

// Optimized global filter function using TanStack's built-in patterns
const createOptimizedGlobalFilter = <T extends Record<string, any>>(
  searchableFields?: (keyof T)[]
): FilterFn<T> => {
  return (row, columnId, value, addMeta) => {
    const searchValue = String(value).toLowerCase().trim();
    if (!searchValue) return true;
    
    // If specific fields are provided, search only those fields
    if (searchableFields && searchableFields.length > 0) {
      return searchableFields.some(field => {
        const fieldValue = row.original[field];
        if (fieldValue == null) return false;
        
        // Handle different types of field values
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(searchValue);
        } else if (typeof fieldValue === 'number') {
          return fieldValue.toString().includes(searchValue);
        } else if (typeof fieldValue === 'object' && fieldValue && 'name' in fieldValue) {
          // For objects with name property (like location)
          return String(fieldValue.name).toLowerCase().includes(searchValue);
        } else {
          return String(fieldValue).toLowerCase().includes(searchValue);
        }
      });
    }
    
    // Default behavior: search all row values
    const rowValues = Object.values(row.original);
    return rowValues.some(val => {
      if (val == null) return false;
      return String(val).toLowerCase().includes(searchValue);
    });
  };
};

// Standard column sizes for consistent table layouts
export const standardColumnSizes = {
  checkbox: { size: 50, minSize: 50, maxSize: 50 },
  id: { size: 50, minSize: 40, maxSize: 100 },
  small: { size: 80, minSize: 70, maxSize: 120 },
  medium: { size: 150, minSize: 100, maxSize: 200 },
  large: { size: 200, minSize: 150, maxSize: 300 },
  xlarge: { size: 250, minSize: 200, maxSize: 400 },
  actions: { size: 80, minSize: 80, maxSize: 80 },
  status: { size: 100, minSize: 80, maxSize: 120 },
  auto: { size: undefined, minSize: 50, maxSize: undefined },
};

// Standard table cell components for reusability
export const TableCellComponents = {
  // Basic text cell
  TextCell: ({ value }: { value: any }) => (
    <Typography variant="body2" sx={{ fontWeight: 400 }}>
      {value || '-'}
    </Typography>
  ),
  
  // Number cell with formatting
  NumberCell: ({ value }: { value: number | null | undefined }) => (
    <Typography variant="body2" sx={{ fontWeight: 400, textAlign: 'right' }}>
      {value != null ? value.toLocaleString() : '-'}
    </Typography>
  ),
  
  // Date cell with formatting  
  DateCell: ({ value }: { value: string | Date | null | undefined }) => (
    <Typography variant="body2" sx={{ fontWeight: 400 }}>
      {value ? new Date(value).toLocaleDateString() : '-'}
    </Typography>
  ),
  
  // Status chip cell
  StatusCell: ({ value, color = 'default' }: { value: string; color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }) => (
    <Typography 
      variant="body2" 
      sx={{ 
        fontWeight: 500,
        px: 1,
        py: 0.5,
        borderRadius: 1,
        backgroundColor: `${color}.light`,
        color: `${color}.dark`,
        display: 'inline-block'
      }}
    >
      {value || '-'}
    </Typography>
  ),

  // Legacy components for backward compatibility
  PrimaryText: ({ children, sx = {}, ...props }: any) => (
    <Typography 
      variant="body2" 
      sx={{ 
        fontSize: '14px',
        color: '#31364e',
        fontWeight: 500,
        fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
        ...sx 
      }} 
      {...props}
    >
      {children}
    </Typography>
  ),
  
  SecondaryText: ({ children, sx = {}, ...props }: any) => (
    <Typography 
      variant="body2" 
      sx={{ 
        fontSize: '14px',
        color: '#6f7283',
        fontWeight: 400,
        fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
        ...sx 
      }} 
      {...props}
    >
      {children}
    </Typography>
  ),

  StatusText: ({ active, children, sx = {}, ...props }: { active: boolean; children: React.ReactNode; sx?: any }) => (
    <Typography 
      variant="body2" 
      sx={{ 
        fontSize: '14px',
        color: active ? 'success.main' : 'error.main',
        fontWeight: 'medium',
        fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
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
      sx={{ 
        borderRadius: '12px',
        border: '1px solid #e9e9e9',
        width: 40,
        height: 40,
        backgroundColor: '#f7f7f7',
        '&:hover': {
          backgroundColor: 'rgba(0,0,0,0.08)',
        },
        ...sx 
      }}
      {...props}
    >
      {children}
    </IconButton>
  ),
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
  enableSearch = false,
  searchPlaceholder = 'Search...',
  searchableFields,
  searchValue = '',
  onSearchChange,
  enablePagination = false,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50, 100],
  enableColumnVisibility = false,
  initialColumnVisibility,
  tableProps = {},
  containerProps = {}
}: GenericTableProps<T>) {
  const logger = createDebugLogger('GenericTable');
  const theme = useTheme();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState(searchValue);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  });
  const prevSelectedRowsRef = React.useRef<(string | number)[]>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialColumnVisibility || {});
  const [columnVisibilityMenuAnchor, setColumnVisibilityMenuAnchor] = useState<null | HTMLElement>(null);

  // Default table props
  const {
    stickyHeader = true,
    size = 'medium',
    padding = 'normal'
  } = tableProps;

  // Search input state (this is just for UI display, actual filtering is handled by TanStack)
  const [searchInput, setSearchInput] = useState(searchValue || '');

  // Debounced global filter that integrates with TanStack's filtering system
  const debouncedGlobalFilter = useDebounce(searchInput, 300);

  // Sync external searchValue with internal globalFilter
  useEffect(() => {
    if (searchValue !== globalFilter) {
      setGlobalFilter(searchValue);
    }
  }, [searchValue]);

  // Handle global filter change with external callback
  const handleGlobalFilterChange = useCallback((value: any) => {
    const stringValue = String(value || '');
    setGlobalFilter(stringValue);
    onSearchChange?.(stringValue);
  }, [onSearchChange]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setGlobalFilter('');
    onSearchChange?.('');
  }, [onSearchChange]);

  // Create the global filter function
  const finalGlobalFilterFn = useMemo(() => {
    if (globalFilterFn) {
      logger('🔍 [SEARCH] Using custom global filter function');
      return globalFilterFn;
    }
    
    logger('🔍 [SEARCH] Using optimized global filter function');
    return createOptimizedGlobalFilter<T>(searchableFields);
  }, [globalFilterFn, searchableFields]);

  // Update row selection when selectedRows prop changes
  React.useEffect(() => {
    // Check if selectedRows actually changed by comparing with previous value
    const prevSelectedRows = prevSelectedRowsRef.current;
    const selectedRowsChanged = selectedRows.length !== prevSelectedRows.length ||
      selectedRows.some((id, index) => id !== prevSelectedRows[index]);

    if (!selectedRowsChanged) {
      logger('📋 [ROW SELECTION] selectedRows prop unchanged, skipping');
      return;
    }

    logger(`📋 [ROW SELECTION] selectedRows prop changed: ${JSON.stringify({
      selectedRowsCount: selectedRows.length,
      selectedRows: selectedRows.slice(0, 5), // Only log first 5 to avoid spam
      currentRowSelectionCount: Object.keys(rowSelection).filter(key => rowSelection[key]).length,
      dataCount: data.length
    })}`);

    // Update the ref with current selectedRows
    prevSelectedRowsRef.current = [...selectedRows];

    // Only update if there's actually a change to prevent infinite loops
    const currentSelectedIds = Object.keys(rowSelection).filter(key => rowSelection[key]);
    const newSelectedIds = selectedRows.map(id => String(id));
    
    // Check if the selection has actually changed
    const hasChanged = currentSelectedIds.length !== newSelectedIds.length ||
      currentSelectedIds.some(id => !newSelectedIds.includes(id)) ||
      newSelectedIds.some(id => !currentSelectedIds.includes(id));
    
    if (hasChanged) {
      logger('📋 [ROW SELECTION] Internal selection state changed, updating rowSelection');
      const newRowSelection: RowSelectionState = {};
      selectedRows.forEach(id => {
        const itemExists = data.some(item => getRowId(item) === String(id));
        if (itemExists) {
          newRowSelection[String(id)] = true;
        }
      });
      setRowSelection(newRowSelection);
    } else {
      logger('📋 [ROW SELECTION] Internal selection state unchanged, skipping update');
    }
  }, [selectedRows, data, getRowId]);

  // Handle row selection change
  const handleRowSelectionChange = React.useCallback((updater: any) => {
    logger('📋 [ROW SELECTION] handleRowSelectionChange called:', {
      updaterType: typeof updater,
      currentSelectionCount: Object.keys(rowSelection).filter(key => rowSelection[key]).length
    });

    const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
    const newSelectionCount = Object.keys(newSelection).filter(key => newSelection[key]).length;
    
    logger('📋 [ROW SELECTION] New selection computed:', {
      newSelectionCount,
      willCallOnRowSelectionChange: !!onRowSelectionChange
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
      
      logger('📋 [ROW SELECTION] Calling onRowSelectionChange with:', {
        selectedIdsCount: selectedIds.length,
        selectedIds: selectedIds.slice(0, 5) // Only log first 5 to avoid spam
      });
      
      onRowSelectionChange(selectedIds);
    }
  }, [rowSelection, onRowSelectionChange]);

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

  // Table configuration with TanStack's built-in filtering and pagination
  const table = useReactTable({
    data,
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onSortingChange: setSorting,
    onRowSelectionChange: enableRowSelection ? handleRowSelectionChange : undefined,
    onPaginationChange: enablePagination ? setPagination : undefined,
    onGlobalFilterChange: () => {}, // Let TanStack handle this internally
    onColumnVisibilityChange: enableColumnVisibility ? setColumnVisibility : undefined,
    state: {
      sorting,
      rowSelection,
      globalFilter: debouncedGlobalFilter, // Use debounced value for actual filtering
      ...(enablePagination && { pagination }),
      ...(enableColumnVisibility && { columnVisibility }),
    },
    globalFilterFn: finalGlobalFilterFn,
    enableRowSelection: enableRowSelection,
    enableHiding: enableColumnVisibility,
    getRowId: getRowId,
  });

  // Update search input when external searchValue changes
  useEffect(() => {
    if (searchInput !== searchValue) {
      setSearchInput(searchValue || '');
    }
  }, [searchValue]);

  // Only call onSearchChange when the debounced value changes (not on every keystroke)
  useEffect(() => {
    if (onSearchChange && debouncedGlobalFilter !== searchValue) {
      onSearchChange(debouncedGlobalFilter);
    }
  }, [debouncedGlobalFilter, onSearchChange, searchValue]);

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
      {/* Search bar and controls */}
      {(enableSearch || enableColumnVisibility) && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          {enableSearch && (
            <TextField
              fullWidth
              placeholder={searchPlaceholder}
              variant="outlined"
              size="small"
              value={searchInput}
              onChange={(e) => {
                const value = e.target.value;
                setSearchInput(value); // Only update UI state immediately
                // Actual filtering and onSearchChange happens through debounced effect
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIconV2 />
                  </InputAdornment>
                ),
                endAdornment: searchInput && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchInput('');
                        // Clear will be handled by the effect when debouncedGlobalFilter updates
                      }}
                      edge="end"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          )}
          
          {enableColumnVisibility && (
            <>
              <SecondaryButton
                size="small"
                startIcon={<ColumnsFilledIconV2 />}
                onClick={(e) => setColumnVisibilityMenuAnchor(e.currentTarget)}
                sx={{
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Columns
              </SecondaryButton>
              
              <Menu
                anchorEl={columnVisibilityMenuAnchor}
                open={Boolean(columnVisibilityMenuAnchor)}
                onClose={() => setColumnVisibilityMenuAnchor(null)}
                PaperProps={{
                  sx: {
                    maxHeight: 300,
                    minWidth: 200,
                  }
                }}
              >
                <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 600 }}>
                  Show/Hide Columns
                </Typography>
                <Divider />
                {table.getAllLeafColumns()
                  .filter(column => column.getCanHide())
                  .map(column => (
                    <MenuItem key={column.id} sx={{ py: 0.5 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={column.getIsVisible()}
                            onChange={column.getToggleVisibilityHandler()}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2">
                            {typeof column.columnDef.header === 'string' 
                              ? column.columnDef.header 
                              : column.id}
                          </Typography>
                        }
                        sx={{ margin: 0, width: '100%' }}
                      />
                    </MenuItem>
                  ))}
              </Menu>
            </>
          )}
        </Box>
      )}

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

      {/* Pagination */}
      {enablePagination && (
        <TablePagination
          component="div"
          count={table.getFilteredRowModel().rows.length}
          page={table.getState().pagination.pageIndex}
          onPageChange={(_, page) => table.setPageIndex(page)}
          rowsPerPage={table.getState().pagination.pageSize}
          onRowsPerPageChange={(e) => table.setPageSize(Number(e.target.value))}
          rowsPerPageOptions={pageSizeOptions}
          showFirstButton
          showLastButton
          sx={{
            borderTop: '1px solid rgba(56, 56, 56, 0.1)',
            backgroundColor: '#fff',
            '& .MuiTablePagination-toolbar': {
              paddingLeft: 2,
              paddingRight: 2,
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '14px',
              color: '#6f7283',
              fontFamily: 'Work Sans, -apple-system, Roboto, Helvetica, sans-serif',
            },
          }}
        />
      )}
    </Box>
  );
}

export default GenericTable; 