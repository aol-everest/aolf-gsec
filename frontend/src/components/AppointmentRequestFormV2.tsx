import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Box, Paper, Stepper, Step, StepLabel } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { UserUpdateData } from '../models/types';
import { isProfileComplete, getProfileCompletionFields } from '../utils/profileValidation';
import ProfileFieldsForm, { ProfileFieldsFormRef } from './ProfileFieldsForm';

// Import step components
import { getDisplaySteps, shouldShowProfileOverlay } from './appointment/stepConfig';
import { ProfileOverlay } from './appointment/ProfileOverlay';
import { StepNavigation } from './appointment/StepNavigation';
import { InitialInfoStep } from './appointment/steps/InitialInfoStep';

// Import types
import type { RequestTypeConfig } from '../models/types';

interface AppointmentRequestFormV2Props {
  // No showProfileStep prop - we always show 4 steps
}

export const AppointmentRequestFormV2: React.FC<AppointmentRequestFormV2Props> = () => {
  const { userInfo, updateUserInfo } = useAuth();
  const navigate = useNavigate();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const profileFormRef = useRef<ProfileFieldsFormRef>(null);
  
  // Check profile completion on mount and when userInfo changes
  useEffect(() => {
    setProfileCompleted(isProfileComplete(userInfo));
  }, [userInfo]);
  
  // Forms for each step
  const pocForm = useForm({
    defaultValues: {
      pocFirstName: userInfo?.first_name || '',
      pocLastName: userInfo?.last_name || '',
      pocEmail: userInfo?.email || '',
      requestType: '',
      numberOfAttendees: 1,
    }
  });
  
  // Update form when userInfo changes
  useEffect(() => {
    if (userInfo) {
      pocForm.setValue('pocFirstName', userInfo.first_name || '');
      pocForm.setValue('pocLastName', userInfo.last_name || '');
      pocForm.setValue('pocEmail', userInfo.email || '');
    }
  }, [userInfo, pocForm]);
  
  // Fetch request type configurations
  const { data: requestTypeConfigs = [], isLoading: isLoadingRequestTypes } = useQuery<RequestTypeConfig[]>({
    queryKey: ['request-type-configurations'],
    queryFn: async () => {
      const { data } = await api.get<RequestTypeConfig[]>('/request-types/configurations');
      return data;
    },
  });
  
  // Get selected request type config
  const selectedRequestTypeConfig = requestTypeConfigs.find(
    c => c.request_type === pocForm.watch('requestType')
  ) || null;
  
  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updateData: UserUpdateData) => {
      const { data } = await api.patch('/users/me/update', updateData);
      return data;
    },
    onSuccess: (data) => {
      enqueueSnackbar('Profile updated successfully', { variant: 'success' });
      updateUserInfo(data as any);
      setProfileCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      enqueueSnackbar('Error updating profile', { variant: 'error' });
    }
  });
  
  // Navigation handlers
  const handleNext = async () => {
    // Validate current step
    switch (activeStep) {
      case 0: // Initial Information
        const isValid = await pocForm.trigger();
        if (!isValid) {
          enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
          return;
        }
        break;
      // Add other step validations here
    }
    
    setActiveStep(prev => Math.min(prev + 1, 3));
  };
  
  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };
  
  const handleSubmit = async () => {
    // Final submission logic
    enqueueSnackbar('Appointment request submitted!', { variant: 'success' });
    navigate('/home');
  };
  
  // Get display steps (always 4)
  const displaySteps = getDisplaySteps(selectedRequestTypeConfig);
  const showProfileOverlay = shouldShowProfileOverlay(profileCompleted, activeStep);
  
  // Render current step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <InitialInfoStep
            form={pocForm}
            userInfo={userInfo}
            requestTypeConfigs={requestTypeConfigs}
            selectedRequestTypeConfig={selectedRequestTypeConfig}
            isLoadingRequestTypes={isLoadingRequestTypes}
          />
        );
      case 1:
        return <div>Attendee Information Step (To be implemented)</div>;
      case 2:
        return <div>Appointment Details Step (To be implemented)</div>;
      case 3:
        return <div>Review & Submit Step (To be implemented)</div>;
      default:
        return null;
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Always show 4-step stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
        {displaySteps.map((label: string) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Paper sx={{ p: 3, position: 'relative' }}>
        {/* Show profile overlay if profile is incomplete */}
        <ProfileOverlay
          open={showProfileOverlay}
          userInfo={userInfo}
          profileFormRef={profileFormRef}
          onSubmit={(data) => updateProfileMutation.mutate(data)}
          isSubmitting={updateProfileMutation.isPending}
          fieldsToShow={getProfileCompletionFields(userInfo)}
        />
        
        {/* Main step content */}
        <Box sx={{ opacity: showProfileOverlay ? 0.3 : 1 }}>
          {renderStepContent()}
          
          <StepNavigation
            activeStep={activeStep}
            totalSteps={4}
            onNext={handleNext}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isNextDisabled={showProfileOverlay}
            hideBack={activeStep === 0}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default AppointmentRequestFormV2; 