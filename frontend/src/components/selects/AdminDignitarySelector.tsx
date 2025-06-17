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

// Admin-specific configuration
const adminConfig: DignitarySelectorConfig = {
  showRelationshipType: false, // Admins typically don't need relationship types
  showGurudevMeetingFields: false, // Simplified for admin workflow
  showAllFields: true,
  allowCreateNew: true,
  allowEditExisting: true,
  requireBioSummary: false, // More flexible for admins
  requireOrganization: false,
  maxDignitaries: 15, // Higher limit for admins
  title: "Select Dignitaries",
  description: "Select existing dignitaries or create new ones for this appointment.",
};

// Props interface for AdminDignitarySelector
export interface AdminDignitarySelectorProps {
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
  
  // Admin-specific options
  showRelationshipType?: boolean;
  showGurudevMeetingFields?: boolean;
  requireBioSummary?: boolean;
}

export const AdminDignitarySelector: React.FC<AdminDignitarySelectorProps> = ({
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
  showRelationshipType,
  showGurudevMeetingFields,
  requireBioSummary,
}) => {
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Create dignitary mutation for admins
  const createDignitaryMutation = useMutation<Dignitary, Error, any>({
    mutationFn: async (data: any) => {
      const { data: response } = await api.post<Dignitary>('/admin/dignitaries', data);
      return response;
    },
    onSuccess: (newDignitary) => {
      queryClient.invalidateQueries({ queryKey: ['admin-assigned-dignitaries'] });
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

  // Update dignitary mutation for admins
  const updateDignitaryMutation = useMutation<Dignitary, Error, { id: number, data: any }>({
    mutationFn: async ({ id, data }) => {
      const { data: response } = await api.patch<Dignitary>(`/admin/dignitaries/${id}`, data);
      return response;
    },
    onSuccess: (updatedDignitary) => {
      queryClient.invalidateQueries({ queryKey: ['admin-assigned-dignitaries'] });
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

  // Merge admin config with any overrides
  const finalConfig: DignitarySelectorConfig = {
    ...adminConfig,
    ...(maxDignitaries && { maxDignitaries }),
    ...(title && { title }),
    ...(description && { description }),
    ...(showRelationshipType !== undefined && { showRelationshipType }),
    ...(showGurudevMeetingFields !== undefined && { showGurudevMeetingFields }),
    ...(requireBioSummary !== undefined && { requireBioSummary }),
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

export default AdminDignitarySelector; 