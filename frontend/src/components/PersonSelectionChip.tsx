import React from 'react';
import { Chip, Avatar } from '@mui/material';

interface PersonSelectionChipProps {
  id: string | number;
  firstName: string;
  lastName: string;
  displayName: string;
  onDelete: () => void;
}

export const PersonSelectionChip: React.FC<PersonSelectionChipProps> = ({
  id,
  firstName,
  lastName,
  displayName,
  onDelete,
}) => {
  return (
    <Chip
      key={id}
      label={displayName}
      onDelete={onDelete}
      variant="outlined"
      avatar={
        <Avatar sx={{ 
          width: 28,
          height: 28,
          fontSize: '0.75rem',
          fontWeight: 600,
          bgcolor: '#D7D7D7',
          color: 'white',
        }}>
          {firstName[0]}{lastName[0]}
        </Avatar>
      }
      sx={{
        height: '42px',
        borderRadius: '56px',
        border: '1px solid #E9E9E9',
        background: 'linear-gradient(135deg, #F9F9F9 0%, #E1E1E1 100%)',
        fontFamily: 'Work Sans',
        fontWeight: 400,
        color: '#6F7283',
        pl: 1,
        pr: 1.5,
        '& .MuiChip-label': {
          fontWeight: 600,
          fontSize: '15px',
          lineHeight: '22px',
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
        '&:hover': {
          background: 'linear-gradient(135deg, #EEEEEE 0%, #E0E0E0 100%)',
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
        },
      }}
    />
  );
};

export default PersonSelectionChip; 