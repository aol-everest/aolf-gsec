import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { PersonSelectionChip } from '../PersonSelectionChip';

export interface AttendeeItem {
  id: number | string;
  displayName: string;
  subtitle?: string;
  metadata?: Record<string, any>;
}

interface AttendeeListProps {
  title: string;
  items: AttendeeItem[];
  currentCount: number;
  requiredCount: number;
  onEdit?: (index: number, item: AttendeeItem) => void;
  onDelete?: (index: number, item: AttendeeItem) => void;
  emptyMessage?: string;
  itemLabelSingular?: string;
  itemLabelPlural?: string;
}

export const AttendeeList: React.FC<AttendeeListProps> = ({
  title,
  items,
  currentCount,
  requiredCount,
  onEdit,
  onDelete,
  emptyMessage = 'No attendees added yet',
  itemLabelSingular = 'attendee',
  itemLabelPlural = 'attendees'
}) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
        {title} ({currentCount} of {requiredCount})
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {items.map((item, index) => (
          <PersonSelectionChip
            key={item.id}
            id={typeof item.id === 'number' ? item.id : parseInt(item.id)}
            firstName={item.metadata?.firstName || ''}
            lastName={item.metadata?.lastName || ''}
            displayName={item.displayName}
            onDelete={() => onDelete?.(index, item)}
            onEdit={onEdit ? () => onEdit(index, item) : undefined}
            editIcon={<EditIcon />}
          />
        ))}
      </Box>
      
      {currentCount < requiredCount && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Please add {requiredCount - currentCount} more {requiredCount - currentCount === 1 ? itemLabelSingular : itemLabelPlural}
        </Typography>
      )}
    </Box>
  );
};

export default AttendeeList; 