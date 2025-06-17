import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useApi } from '../../hooks/useApi';
import { Dignitary } from '../../models/types';
import GenericDignitarySelector, { 
  GenericDignitarySelectorProps, 
  DignitaryFormData,
  SelectedDignitary,
  DignitarySelectorConfig 
} from './GenericDignitarySelector';

// User-specific configuration
const userConfig: DignitarySelectorConfig = {
  showRelationshipType: true,
  showGurudevMeetingFields: true,
  showAllFields: true,
  allowCreateNew: true,
  allowEditExisting: true,
  requireBioSummary: true,
  requireOrganization: false,
  maxDignitaries: 8,
  title: "Select Dignitaries",
  description: "Select existing dignitaries or create new ones for this appointment request.",
};

// Props interface for UserDignitarySelector
export interface UserDignitarySelectorProps {
  // Required props
  dignitaries: Dignitary[];
  selectedDignitaries: SelectedDignitary[];
  onDignitaryAdd: (dignitary: SelectedDignitary) => void;
  onDignitaryRemove: (index: number) => void;
  
  // Optional customization
  maxDignitaries?: number;
  title?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export const UserDignitarySelector: React.FC<UserDignitarySelectorProps> = ({
  dignitaries,
  selectedDignitaries,
  onDignitaryAdd,
  onDignitaryRemove,
  maxDignitaries,
  title,
  description,
  required = false,
  disabled = false,
  error,
}) => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Create dignitary mutation for users
  const createDignitaryMutation = useMutation<Dignitary, Error, any>({
    mutationFn: async (data: any) => {
      const { data: response } = await api.post<Dignitary>('/dignitaries/new', data);
      return response;
    },
    onSuccess: (newDignitary) => {
      queryClient.invalidateQueries({ queryKey: ['assigned-dignitaries'] });
      enqueueSnackbar('New dignitary created successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      console.error('Failed to create dignitary:', error);
      enqueueSnackbar(`Failed to create dignitary: ${error.response?.data?.detail || 'Unknown error'}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Update dignitary mutation for users
  const updateDignitaryMutation = useMutation<Dignitary, Error, { id: number, data: any }>({
    mutationFn: async ({ id, data }) => {
      const { data: response } = await api.patch<Dignitary>(`/dignitaries/update/${id}`, data);
      return response;
    },
    onSuccess: (updatedDignitary) => {
      queryClient.invalidateQueries({ queryKey: ['assigned-dignitaries'] });
      enqueueSnackbar('Dignitary updated successfully', { variant: 'success' });
    },
    onError: (error: any) => {
      console.error('Failed to update dignitary:', error);
      enqueueSnackbar(`Failed to update dignitary: ${error.response?.data?.detail || 'Unknown error'}`, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    }
  });

  // Handle dignitary creation
  const handleDignitaryCreate = async (formData: any): Promise<Dignitary> => {
    return createDignitaryMutation.mutateAsync(formData);
  };

  // Handle dignitary update
  const handleDignitaryUpdate = async (id: number, formData: any): Promise<Dignitary> => {
    return updateDignitaryMutation.mutateAsync({ id, data: formData });
  };

  // Merge user config with any overrides
  const finalConfig: DignitarySelectorConfig = {
    ...userConfig,
    ...(maxDignitaries && { maxDignitaries }),
    ...(title && { title }),
    ...(description && { description }),
  };

  return (
    <GenericDignitarySelector
      dignitaries={dignitaries}
      selectedDignitaries={selectedDignitaries}
      onDignitaryAdd={onDignitaryAdd}
      onDignitaryRemove={onDignitaryRemove}
      onDignitaryCreate={handleDignitaryCreate}
      onDignitaryUpdate={handleDignitaryUpdate}
      config={finalConfig}
      required={required}
      disabled={disabled}
      error={error}
    />
  );
};

export default UserDignitarySelector; 