import React from 'react';
import { Box, Paper, Typography, Alert } from '@mui/material';
import ProfileFieldsForm, { ProfileFieldsFormRef } from '../ProfileFieldsForm';
import { UserUpdateData } from '../../models/types';
import { getMissingFieldsDisplay } from '../../utils/profileValidation';

interface ProfileOverlayProps {
  userInfo: any;
  profileFormRef: React.RefObject<ProfileFieldsFormRef>;
  onSubmit: (data: UserUpdateData) => void;
  isSubmitting: boolean;
  fieldsToShow: string[];
}

export const ProfileOverlay: React.FC<ProfileOverlayProps> = ({
  userInfo,
  profileFormRef,
  onSubmit,
  isSubmitting,
  fieldsToShow
}) => {
  const missingFields = getMissingFieldsDisplay(userInfo);
  
  return (
    <Box sx={{ position: 'relative' }}>
      {/* Semi-transparent overlay to indicate blocked progress */}
      <Box
        sx={{
          position: 'absolute',
          top: -24,
          left: -24,
          right: -24,
          bottom: -24,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            maxWidth: 800, 
            width: '100%',
            backgroundColor: 'background.paper',
            border: '2px solid #e0e0e0',
            boxShadow: '0 0 13px 0 rgba(0, 0, 0, 0.1)'
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            Complete Your Profile First
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Before proceeding with your appointment request, please complete the following required fields:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              {missingFields.map((field, index) => (
                <li key={index}>
                  <Typography variant="body2" component="span">{field}</Typography>
                </li>
              ))}
            </Box>
          </Alert>
          
          <ProfileFieldsForm
            ref={profileFormRef}
            initialData={userInfo}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            variant="onboarding"
            fieldsToShow={fieldsToShow}
            showNotificationPreferences={false}
            submitButtonText="Complete Profile & Continue"
            showCancelButton={false}
            showInternalButton={true}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default ProfileOverlay; 