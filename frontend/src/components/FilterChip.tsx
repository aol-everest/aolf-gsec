import React from 'react';
import { Chip, ChipProps, Theme, useTheme, Box } from '@mui/material';
import { CrossCircleFilledIconV2 } from './iconsv2';

interface FilterChipProps<T extends string | number = string | number> extends Omit<ChipProps, 'onClick' | 'onDelete'> {
  /**
   * The label to display on the chip
   */
  label: string;
  
  /**
   * The value associated with this chip
   */
  value: T;
  
  /**
   * The currently selected value (for toggle mode)
   */
  selectedValue?: T | null;
  
  /**
   * Count to display next to the label
   */
  count?: number;
  
  /**
   * Function to get the color for the chip based on its value
   */
  getColor?: (value: T, theme: Theme) => string;
  
  /**
   * Callback when the chip is clicked (toggle mode)
   */
  onToggle?: (value: T) => void;
  
  /**
   * Callback when the chip is deleted (delete mode)
   */
  onDelete?: () => void;
  
  /**
   * Icon to display on the chip
   */
  icon?: React.ReactElement;
  
  /**
   * Size variant for the chip
   */
  size?: 'small' | 'medium';
  
  /**
   * Whether the chip is in selected state (for delete mode)
   */
  selected?: boolean;
}

/**
 * A reusable chip component for filtering data with toggle or delete functionality
 */
export function FilterChip<T extends string | number = string | number>({
  label,
  value,
  selectedValue,
  count,
  getColor,
  onToggle,
  onDelete,
  icon,
  size = 'medium',
  selected = false,
  ...chipProps
}: FilterChipProps<T>) {
  const theme = useTheme();
  
  // Determine if this is delete mode or toggle mode
  const isDeleteMode = !!onDelete;
  const isToggleMode = !!onToggle;
  
  // For toggle mode, determine if selected
  const isSelected = isToggleMode ? value === selectedValue : selected;
  
  // Determine the display label
  const displayLabel = count !== undefined ? `${label} (${count})` : label;
  
  // Determine the color
  const color = getColor ? getColor(value, theme) : '#3D8BE8';
  
  // Size-specific styles
  const sizeStyles = {
    small: {
      height: 'auto', // Let MUI's size="small" handle the height
      fontSize: '0.75rem',
      borderRadius: '8px',
    },
    medium: {
      height: '32px',
      fontSize: '0.81rem',
      borderRadius: '13px',
    }
  };
  
  // Icon size based on chip size
  const iconSize = size === 'small' ? '14px' : '16px';
  
  const currentSizeStyles = sizeStyles[size];
  
  // Base styles matching the current design patterns
  const baseStyles = {
    pl: 0.5,
    pr: 0.5,
    color: isSelected ? '#3D8BE8' : '#9598A6',
    border: `1px solid ${isSelected ? 'rgba(61, 139, 232, 0.2)' : 'rgba(149, 152, 166, 0.2)'}`,
    fontWeight: isSelected ? '600' : '500',
    backgroundColor: isSelected ? 'rgba(61, 139, 232, 0.1)' : '#fff',
    cursor: 'pointer',
    '&:hover': {
      color: '#3D8BE8',
      border: '1px solid rgba(61, 139, 232, 0.2)',
      fontWeight: '500',
      backgroundColor: 'rgba(61, 139, 232, 0.1)',
    },
    '&.MuiChip-filled': {
      color: '#3D8BE8',
      fontWeight: '600',
      border: '1px solid rgba(61, 139, 232, 0.2)',
    },
    ...currentSizeStyles,
    ...chipProps.sx
  };
  
  const handleClick = () => {
    if (isToggleMode && onToggle) {
      onToggle(value);
    }
  };
  
  const handleDelete = () => {
    if (isDeleteMode && onDelete) {
      onDelete();
    }
  };
  
  return (
    <Chip
      label={displayLabel}
      onClick={isToggleMode ? handleClick : undefined}
      onDelete={isDeleteMode ? handleDelete : undefined}
      variant={isSelected ? 'filled' : 'outlined'}
      icon={icon}
      size={size === 'small' ? 'small' : undefined}
      deleteIcon={isDeleteMode ? <CrossCircleFilledIconV2 sx={{ width: iconSize, height: iconSize }} /> : undefined}
      sx={baseStyles}
      {...chipProps}
    />
  );
}

/**
 * A group of filter chips with a common toggle handler
 */
export function FilterChipGroup<T extends string | number>({
  options,
  selectedValue,
  getLabel,
  getCount,
  getColor,
  onToggle,
  getIcon,
  size = 'medium',
  ...chipProps
}: {
  /**
   * Array of option values
   */
  options: T[];
  
  /**
   * Currently selected value
   */
  selectedValue: T | null;
  
  /**
   * Function to get the label for an option
   */
  getLabel: (option: T) => string;
  
  /**
   * Function to get the count for an option
   */
  getCount?: (option: T) => number;
  
  /**
   * Function to get the color for an option
   */
  getColor?: (option: T, theme: Theme) => string;
  
  /**
   * Callback when an option is toggled
   */
  onToggle: (value: T | null) => void;
  
  /**
   * Function to get the icon for an option
   */
  getIcon?: (option: T) => React.ReactElement | undefined;
  
  /**
   * Size variant for all chips
   */
  size?: 'small' | 'medium';
  
  /**
   * Props to pass to each chip
   */
  [key: string]: any;
}) {
  const handleToggle = (value: T) => {
    onToggle(value === selectedValue ? null : value);
  };
  
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {options.map((option) => (
        <FilterChip<T>
          key={option.toString()}
          label={getLabel(option)}
          value={option}
          selectedValue={selectedValue}
          count={getCount ? getCount(option) : undefined}
          getColor={getColor}
          onToggle={handleToggle}
          icon={getIcon ? getIcon(option) : undefined}
          size={size}
          {...chipProps}
        />
      ))}
    </Box>
  );
} 