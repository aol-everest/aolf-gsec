import React from 'react';
import { Chip, Avatar, IconButton, Box } from '@mui/material';

interface PersonSelectionChipProps {
  id: string | number;
  firstName: string;
  lastName: string;
  displayName: string;
  onDelete: () => void;
  maxDisplayNameLength?: number;
  onEdit?: () => void;
  editIcon?: React.ReactNode;
}

// Common styling constants
const CHIP_STYLES = {
  height: '42px',
  borderRadius: '56px',
  border: '1px solid #E9E9E9',
  background: '#F7F7F7',
  fontFamily: 'Work Sans',
  fontWeight: 400,
  color: '#6F7283',
  cursor: 'default',
  '&:hover': {
    background: 'linear-gradient(135deg, #FEFEFE 0%, #F7F7F7 100%)',
    // boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
  },
} as const;

const AVATAR_STYLES = {
  width: 28,
  height: 28,
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6F7283',
  background: 'linear-gradient(135deg, #F9F9F9 0%, #E5E5E5 100%)',
  border: '1px solid #E5E5E5',
} as const;

const LABEL_STYLES = {
  fontWeight: 600,
  fontSize: '15px',
  lineHeight: '22px',
} as const;

const BUTTON_STYLES = {
  width: 20,
  height: 20,
  minWidth: 20,
  padding: 0,
  color: '#6F7283',
  '&:hover': {
    backgroundColor: 'rgba(111, 114, 131, 0.15)',
    color: '#5A5D6B',
  },
} as const;

export const PersonSelectionChip: React.FC<PersonSelectionChipProps> = ({
  id,
  firstName,
  lastName,
  displayName,
  onDelete,
  maxDisplayNameLength = 25,
  onEdit,
  editIcon,
}) => {
  const truncatedDisplayName = displayName.length > maxDisplayNameLength 
    ? `${displayName.substring(0, maxDisplayNameLength)}...`
    : displayName;

  const avatarContent = `${firstName[0]}${lastName[0]}`;

  if (onEdit && editIcon) {
    // Custom chip-like component with edit and delete buttons
    return (
      <Box
        sx={{
          ...CHIP_STYLES,
          display: 'inline-flex',
          alignItems: 'center',
          pl: 1,
          pr: 1,
          gap: 1,
          mr: 2
        }}
      >
        <Avatar sx={AVATAR_STYLES}>
          {avatarContent}
        </Avatar>
        
        <Box sx={{ 
          ...LABEL_STYLES,
          flex: 1,
        }}>
          {truncatedDisplayName}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={onEdit} sx={BUTTON_STYLES}>
            {React.cloneElement(editIcon as React.ReactElement, { 
              style: { fontSize: '16px' } 
            })}
          </IconButton>
          
          <IconButton size="small" onClick={onDelete} sx={BUTTON_STYLES}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </IconButton>
        </Box>
      </Box>
    );
  }

  // Standard chip without edit functionality
  return (
    <Chip
      label={truncatedDisplayName}
      onDelete={onDelete}
      variant="outlined"
      avatar={<Avatar sx={AVATAR_STYLES}>{avatarContent}</Avatar>}
      sx={{
        ...CHIP_STYLES,
        pl: 1,
        pr: 1.5,
        '& .MuiChip-label': {
          ...LABEL_STYLES,
          px: 1,
        },
        '& .MuiChip-avatar': {
          marginLeft: '0px',
          marginRight: '4px',
          height: '28px',
          width: '28px',
        },
        '& .MuiChip-deleteIcon': {
          color: '#6F7283',
          marginLeft: '4px',
          marginRight: '0px',
          fontSize: '20px',
          '&:hover': {
            color: '#5A5D6B',
            backgroundColor: 'rgba(111, 114, 131, 0.1)',
          },
        },
      }}
    />
  );
};

export default PersonSelectionChip; 