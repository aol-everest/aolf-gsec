import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  Box,
} from '@mui/material';

export interface SelectableListItem {
  id: string | number;
  content: React.ReactNode;
}

export interface SelectableListProps {
  items: SelectableListItem[];
  selectedItemId?: string | number | null;
  onItemSelect: (itemId: string | number) => void;
  maxHeight?: number | string;
  selectionBarColor?: string;
  selectionBackgroundColor?: string;
  selectionHoverBackgroundColor?: string;
  itemSpacing?: number;
  disabled?: boolean;
  className?: string;
}

export const SelectableList: React.FC<SelectableListProps> = ({
  items,
  selectedItemId,
  onItemSelect,
  maxHeight = 300,
  selectionBarColor = '#DAA520', // Mustard yellow
  selectionBackgroundColor = 'rgba(218, 165, 32, 0.08)',
  selectionHoverBackgroundColor = 'rgba(218, 165, 32, 0.12)',
  itemSpacing = 1,
  disabled = false,
  className,
}) => {
  return (
    <List 
      sx={{ 
        maxHeight, 
        overflow: 'auto',
        ...(className && { className })
      }}
    >
      {items.map((item) => {
        const isSelected = selectedItemId === item.id;
        
        return (
          <ListItem key={item.id} disablePadding>
            <ListItemButton 
              onClick={() => !disabled && onItemSelect(item.id)}
              disabled={disabled}
              sx={{
                position: 'relative',
                borderRadius: 1,
                mb: itemSpacing,
                '&:hover': {
                  backgroundColor: isSelected 
                    ? selectionHoverBackgroundColor 
                    : 'rgba(0, 0, 0, 0.04)',
                },
                ...(isSelected && {
                  backgroundColor: selectionBackgroundColor,
                }),
                ...(disabled && {
                  opacity: 0.6,
                  cursor: 'not-allowed',
                }),
              }}
            >
              {/* Selection indicator bar */}
              {isSelected && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    backgroundColor: selectionBarColor,
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              
              <Box sx={{ flexGrow: 1, pl: isSelected ? 1 : 0 }}>
                {item.content}
              </Box>
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};

export default SelectableList; 