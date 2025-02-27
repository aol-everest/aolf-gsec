import React from 'react';
import { Theme } from '@mui/material';
import { FilterChipGroup } from './FilterChip';
import { useEnums, EnumType } from '../hooks/useEnums';

interface EnumFilterChipGroupProps {
  /**
   * The type of enum to fetch and display as filter chips
   */
  enumType: EnumType;
  
  /**
   * The currently selected value
   */
  selectedValue: string | null;
  
  /**
   * Callback when a value is toggled
   */
  onToggle: (value: string | null) => void;
  
  /**
   * Function to get the count for an option
   */
  getCount?: (option: string) => number;
  
  /**
   * Function to get the color for an option
   */
  getColor?: (option: string, theme: Theme) => string;
  
  /**
   * Function to get the icon for an option
   */
  getIcon?: (option: string) => React.ReactElement | undefined;
  
  /**
   * Additional props to pass to the FilterChipGroup
   */
  [key: string]: any;
}

/**
 * A component that combines FilterChipGroup with useEnums to create 
 * a group of filter chips based on enum values from the backend
 */
export const EnumFilterChipGroup: React.FC<EnumFilterChipGroupProps> = ({
  enumType,
  selectedValue,
  onToggle,
  getCount,
  getColor,
  getIcon,
  ...chipProps
}) => {
  const { values, isLoading } = useEnums(enumType);
  
  // If still loading, don't render anything
  if (isLoading) {
    return null;
  }
  
  return (
    <FilterChipGroup
      options={values}
      selectedValue={selectedValue}
      getLabel={(option) => option}
      getCount={getCount}
      getColor={getColor}
      onToggle={onToggle}
      getIcon={getIcon}
      {...chipProps}
    />
  );
};