import React from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Autocomplete,
  Box,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { SearchIconV2, CloseIconFilledCircleV2 } from './iconsv2';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  variant?: 'simple' | 'autocomplete';
  suggestions?: string[];
  maxSuggestions?: number;
  iconVariant?: 'default' | 'v2' | 'filled';
  clearButtonVariant?: 'icon' | 'text';
  clearButtonText?: string;
  sx?: any;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  fullWidth = true,
  size = 'small',
  variant = 'simple',
  suggestions = [],
  maxSuggestions = 10,
  iconVariant = 'default',
  clearButtonVariant = 'icon',
  clearButtonText = 'Clear',
  sx = {},
  disabled = false,
  autoFocus = false,
}) => {
  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  const getSearchIcon = () => {
    switch (iconVariant) {
      case 'v2':
        return <SearchIconV2 />;
      default:
        return <SearchIcon />;
    }
  };

  const getClearIcon = () => {
    switch (iconVariant) {
      case 'filled':
        return <CloseIconFilledCircleV2 sx={{ color: 'text.secondary', width: '1.2rem', height: '1.2rem' }} />;
      default:
        return <ClearIcon />;
    }
  };

  const getClearButton = () => {
    if (!value) return null;

    if (clearButtonVariant === 'text') {
      return (
        <InputAdornment position="end">
          <Box component="span" 
            onClick={handleClear}
            sx={{ 
              cursor: 'pointer',
              color: 'primary.main',
              fontSize: '0.875rem',
              fontWeight: 500,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            {clearButtonText}
          </Box>
        </InputAdornment>
      );
    }

    return (
      <InputAdornment position="end">
        <IconButton
          size="small"
          onClick={handleClear}
          edge="end"
          disabled={disabled}
        >
          {getClearIcon()}
        </IconButton>
      </InputAdornment>
    );
  };

  const defaultSx = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#FFFFFF',
      '& fieldset': {
        borderColor: '#E0E0E0',
      },
      '&:hover fieldset': {
        borderColor: '#BDBDBD',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#3D8BE8',
      },
    },
    ...sx
  };

  if (variant === 'autocomplete') {
    return (
      <Autocomplete
        freeSolo
        options={suggestions}
        inputValue={value}
        onInputChange={(event, newInputValue) => {
          onChange(newInputValue || '');
        }}
        onChange={(event, newValue) => {
          if (newValue) {
            onChange(newValue as string);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            fullWidth={fullWidth}
            size={size}
            disabled={disabled}
            autoFocus={autoFocus}
            sx={defaultSx}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  {getSearchIcon()}
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {getClearButton()}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        filterOptions={(options, { inputValue }) => {
          const filtered = options.filter(option =>
            option.toLowerCase().includes(inputValue.toLowerCase())
          );
          return filtered.slice(0, maxSuggestions);
        }}
        noOptionsText="No matching suggestions"
        disabled={disabled}
      />
    );
  }

  return (
    <TextField
      fullWidth={fullWidth}
      placeholder={placeholder}
      variant="outlined"
      size={size}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      autoFocus={autoFocus}
      sx={defaultSx}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            {getSearchIcon()}
          </InputAdornment>
        ),
        endAdornment: getClearButton()
      }}
    />
  );
};

export default SearchBox; 