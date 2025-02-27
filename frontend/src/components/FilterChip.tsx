import React from 'react';
import { Chip, ChipProps, Theme, useTheme, Box } from '@mui/material';

interface FilterChipProps<T extends string | number = string | number> extends Omit<ChipProps, 'onClick'> {
  /**
   * The label to display on the chip
   */
  label: string;
  
  /**
   * The value associated with this chip
   */
  value: T;
  
  /**
   * The currently selected value
   */
  selectedValue: T | null;
  
  /**
   * Count to display next to the label
   */
  count?: number;
  
  /**
   * Function to get the color for the chip based on its value
   */
  getColor?: (value: T, theme: Theme) => string;
  
  /**
   * Callback when the chip is clicked
   */
  onToggle: (value: T) => void;
  
  /**
   * Icon to display on the chip
   */
  icon?: React.ReactElement;
}

/**
 * A reusable chip component for filtering data
 */
export function FilterChip<T extends string | number = string | number>({
  label,
  value,
  selectedValue,
  count,
  getColor,
  onToggle,
  icon,
  ...chipProps
}: FilterChipProps<T>) {
  const theme = useTheme();
  const isSelected = value === selectedValue;
  
  // Determine the display label
  const displayLabel = count !== undefined ? `${label} (${count})` : label;
  
  // Determine the color
  const color = getColor ? getColor(value, theme) : theme.palette.primary.main;
  
  return (
    <Chip
      label={displayLabel}
      onClick={() => onToggle(value)}
      variant={isSelected ? 'filled' : 'outlined'}
      icon={icon}
      sx={{ 
        cursor: 'pointer',
        '&:hover': {
          opacity: 0.8,
        },
        bgcolor: isSelected ? (chipProps.color === 'default' ? color : undefined) : 'white',
        color: isSelected && chipProps.color === 'default' ? 'white' : color,
        border: `1px solid ${color}`,
        borderRadius: '10px',
        ...chipProps.sx
      }}
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
   * Props to pass to each chip
   */
  [key: string]: any;
}) {
  const theme = useTheme();
  
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
          {...chipProps}
        />
      ))}
    </Box>
  );
} 