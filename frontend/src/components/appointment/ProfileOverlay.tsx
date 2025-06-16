import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  Typography, 
  Alert, 
  Box,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ProfileFieldsForm, { ProfileFieldsFormRef } from '../ProfileFieldsForm';
import { UserUpdateData } from '../../models/types';
import { getMissingFieldsDisplay } from '../../utils/profileValidation';
import { CloseIconFilledCircleV2 } from '../iconsv2';

interface ProfileOverlayProps {
  userInfo: any;
  profileFormRef: React.RefObject<ProfileFieldsFormRef>;
  onSubmit: (data: UserUpdateData) => void;
  isSubmitting: boolean;
  fieldsToShow: string[];
  open: boolean;
  onClose?: () => void;
}

export const ProfileOverlay: React.FC<ProfileOverlayProps> = ({
  userInfo,
  profileFormRef,
  onSubmit,
  isSubmitting,
  fieldsToShow,
  open,
  onClose
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const missingFields = getMissingFieldsDisplay(userInfo);
  
  return (
    <Dialog 
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile} // Full screen on mobile
      disableEscapeKeyDown // Prevent closing with escape key
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 0, sm: 2 }, // No margin on mobile
          maxHeight: { xs: '100vh', sm: '90vh' },
          height: { xs: '100vh', sm: 'auto' }
        }
      }}
    >
      <DialogTitle sx={{ 
        pt: 2,
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Typography variant="h2" component="div" sx={{ fontWeight: 600 }}>
          Complete Your Profile First
        </Typography>
        {onClose && (
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ color: 'grey.500' }}
          >
            <CloseIconFilledCircleV2 />
          </IconButton>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ pb: 3 }}>
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
      </DialogContent>
    </Dialog>
  );
};

export default ProfileOverlay; 