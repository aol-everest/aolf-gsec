import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Card,
  CardContent,
  Autocomplete,
  Alert,
  Snackbar,
  Chip,
  FormHelperText,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Collapse,
  useMediaQuery,
} from '@mui/material';
import Layout from '../components/Layout';
import { useForm, Controller } from 'react-hook-form';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminAppointmentsReviewRoute } from '../config/routes';
import { Appointment, Location, AppointmentDignitary } from '../models/types';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BusinessIcon from '@mui/icons-material/Business';
import { EnumSelect } from '../components/EnumSelect';
import { useEnums } from '../hooks/useEnums';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';
import { formatHonorificTitle } from '../utils/formattingUtils';
import { formatDate, formatDateWithTimezone, parseUTCDate } from '../utils/dateUtils';
import AdminAppointmentEditCard from '../components/AdminAppointmentEditCard';
import AppointmentDignitaryDisplay from '../components/AppointmentDignitaryDisplay';

interface AppointmentFormData {
  appointment_date: string;
  appointment_time: string;
  location_id: number | null;
  status: string;
  sub_status: string;
  appointment_type: string | null;
  requester_notes_to_secretariat: string;
  secretariat_follow_up_actions: string;
  secretariat_meeting_notes: string;
  secretariat_notes_to_requester: string;
}

interface Attachment {
  id: number;
  appointment_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_by: number;
  created_at: string;
  attachment_type: string;
}

interface BusinessCardExtraction {
  first_name: string;
  last_name: string;
  title?: string;
  company?: string;
  phone?: string;
  other_phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  address?: string;
  social_media?: string[];
  extra_fields?: string[];
}

interface BusinessCardExtractionResponse {
  extraction: BusinessCardExtraction;
  attachment_id: number;
  appointment_id: number;
}

// Define validation errors interface
interface ValidationErrors {
  appointment_date?: string;
  appointment_time?: string;
  location_id?: string;
  status?: string;
  sub_status?: string;
  appointment_type?: string;
  secretariat_notes_to_requester?: string;
  secretariat_follow_up_actions?: string;
  secretariat_meeting_notes?: string;
}

// Status to substatus mapping
interface StatusSubStatusMapping {
  [key: string]: {
    default_sub_status: string;
    valid_sub_statuses: string[];
  }
}

// Add interfaces for the new maps
interface StatusMap {
  [key: string]: string;
}

interface SubStatusMap {
  [key: string]: string;
}

const AppointmentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const businessCardInputRef = useRef<HTMLInputElement>(null);
  const businessCardCameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [businessCardExtraction, setBusinessCardExtraction] = useState<BusinessCardExtractionResponse | null>(null);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [dignitaryCreated, setDignitaryCreated] = useState(false);
  const [dignitaryCreationError, setDignitaryCreationError] = useState<string | null>(null);
  const [isExtractionDisabled, setIsExtractionDisabled] = useState(false);
  const theme = useTheme();
  
  // Add state for validation errors
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  const { 
    control, 
    handleSubmit, 
    reset, 
    watch, 
    setValue,
    formState: { errors }, 
    trigger, 
    getValues 
  } = useForm<AppointmentFormData>({
    mode: 'onSubmit',
  });

  // The following watch variables are now handled internally by AdminAppointmentEditCard
  // Keep them for the validateForm function which still needs them
  const watchStatus = watch('status');
  const watchSubStatus = watch('sub_status');
  const watchAppointmentDate = watch('appointment_date');

  // Fetch status map from the API
  const { data: statusMap = {} } = useQuery<StatusMap>({
    queryKey: ['status-map'],
    queryFn: async () => {
      const { data } = await api.get<StatusMap>('/appointments/status-options-map');
      return data;
    },
  });

  // Fetch substatus map from the API  
  const { data: subStatusMap = {} } = useQuery<SubStatusMap>({
    queryKey: ['sub-status-map'],
    queryFn: async () => {
      const { data } = await api.get<SubStatusMap>('/appointments/sub-status-options-map');
      return data;
    },
  });

  // Fetch status-substatus mapping from the API
  const { data: statusSubStatusMapping } = useQuery<StatusSubStatusMapping>({
    queryKey: ['status-substatus-mapping'],
    queryFn: async () => {
      const { data } = await api.get<StatusSubStatusMapping>('/appointments/status-substatus-mapping');
      return data;
    },
  });

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get<Location[]>('/locations/all');
      return data;
    },
  });

  // Fetch appointment
  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const { data } = await api.get<Appointment>(`/admin/appointments/${id}`);
      return data;
    },
    enabled: !!id,
    refetchOnMount: true,
  });

  // Fetch all substatus options
  const { values: allSubStatusOptions = [] } = useEnums('appointmentSubStatus');

  // Add useEffect to reset form when appointment data is available
  useEffect(() => {
    if (appointment) {
      reset({
        appointment_date: appointment.appointment_date || appointment.preferred_date,
        appointment_time: appointment.appointment_time || appointment.preferred_time_of_day,
        location_id: appointment.location_id || null,
        status: appointment.status || '',
        sub_status: appointment.sub_status || '',
        appointment_type: appointment.appointment_type || null,
        requester_notes_to_secretariat: appointment.requester_notes_to_secretariat,
        secretariat_follow_up_actions: appointment.secretariat_follow_up_actions,
        secretariat_meeting_notes: appointment.secretariat_meeting_notes,
        secretariat_notes_to_requester: appointment.secretariat_notes_to_requester,
      });
    }
  }, [appointment, reset]);

  // Check if business card extraction is enabled
  useEffect(() => {
    const checkExtractionStatus = async () => {
      try {
        const { data } = await api.get<{ enabled: boolean }>('/appointments/business-card/extraction-status');
        setIsExtractionDisabled(!data.enabled);
      } catch (error) {
        console.error('Error checking business card extraction status:', error);
        // Default to enabled if we can't check
        setIsExtractionDisabled(false);
      }
    };
    
    checkExtractionStatus();
  }, [api]);

  // Fetch attachments
  const { data: attachments = [], refetch: refetchAttachments } = useQuery<Attachment[]>({
    queryKey: ['appointment-attachments', id],
    queryFn: async () => {
      const { data } = await api.get<Attachment[]>(`/appointments/${id}/attachments`);
      return data;
    },
    enabled: !!id,
    refetchOnMount: true,
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const { data: response } = await api.patch(`/admin/appointments/update/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-attachments', id] });
      enqueueSnackbar('Appointment updated successfully', { variant: 'success' });
      navigate(AdminAppointmentsReviewRoute.path || '');
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      enqueueSnackbar('Failed to update appointment', { variant: 'error' });
    },
  });


  // ----------------------------------------------------------------------------------------------------------------------------------------------
  // VALIDATION RULES
  // ----------------------------------------------------------------------------------------------------------------------------------------------

  // Validate form based on status and substatus combinations
  const validateForm = (data: AppointmentFormData): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    // Common validation for all statuses
    if (!data.status) {
      errors.status = 'Status is required';
    }

    // Specific validation based on status and substatus combinations
    if (data.status === statusMap['APPROVED']) {
      if (!data.appointment_type) {
        errors.appointment_type = 'Appointment type is required for Approved status';
      }
      
      if (data.sub_status === subStatusMap['SCHEDULED']) {
        if (!data.appointment_date) {
          errors.appointment_date = 'Appointment date is required for Scheduled appointments';
        }
        
        if (!data.appointment_time) {
          errors.appointment_time = 'Appointment time is required for Scheduled appointments';
        }
        
        if (!data.location_id) {
          errors.location_id = 'Location is required for Scheduled appointments';
        }
      }
    }

    if (data.status === statusMap['COMPLETED']) {
      if (!data.appointment_date) {
        errors.appointment_date = 'Appointment date is required for Completed appointments';
      }

      if (data.appointment_date && parseUTCDate(data.appointment_date) > new Date()) {
        errors.appointment_date = 'Appointment date cannot be in the future for Completed appointments';
      }

      if (!data.location_id) {
        errors.location_id = 'Location is required for Completed appointments';
      }

      if (data.sub_status === subStatusMap['FOLLOW_UP_REQUIRED'] && !data.secretariat_follow_up_actions) {
        errors.secretariat_follow_up_actions = 'Follow-up actions are required for Completed appointments';
      }
    }
    
    if (data.status === statusMap['REJECTED']) {
      if (data.sub_status === subStatusMap['DARSHAN_LINE'] && (!data.secretariat_notes_to_requester || !data.secretariat_notes_to_requester.trim())) {
        errors.secretariat_notes_to_requester = 'Please add notes about Darshan Line in the notes to requester input';
      }
    }
    
    if (data.status === statusMap['PENDING']) {
      if (data.sub_status === subStatusMap['NEED_MORE_INFO'] && (!data.secretariat_notes_to_requester || !data.secretariat_notes_to_requester.trim())) {
        errors.secretariat_notes_to_requester = 'Notes to requester are required when requesting more information';
      }
    }
    
    return errors;
  };

  const onSubmit = (data: AppointmentFormData) => {
    // Validate form data based on status and substatus
    const validationErrors = validateForm(data);
    
    // If there are validation errors, prevent submission
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors(validationErrors);
      setShowValidationSummary(true);
      
      // Show error notification
      enqueueSnackbar('Please fix the errors before submitting', { variant: 'error' });
      return;
    }
    
    // Clear validation errors and proceed with submission
    setValidationErrors({});
    setShowValidationSummary(false);
    updateAppointmentMutation.mutate(data);
  };

  const handleFileUpload = async (files: FileList, attachmentType: string = 'general') => {
    if (!id || !files.length) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('attachment_type', attachmentType);
        
        await api.post(`/appointments/${id}/attachments`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      });

      await Promise.all(uploadPromises);
      
      enqueueSnackbar(`${files.length} file(s) uploaded successfully`, { variant: 'success' });
      refetchAttachments();
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (error) {
      console.error('Error uploading files:', error);
      enqueueSnackbar('Failed to upload files', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: number, fileName: string) => {
    try {
      const response = await api.get(`/appointments/attachments/${attachmentId}`, {
        responseType: 'blob',
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      enqueueSnackbar('Failed to download attachment', { variant: 'error' });
    }
  };

  const handleDeleteAttachment = (attachment: Attachment) => {
    setAttachmentToDelete(attachment);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    
    try {
      await api.delete(`/appointments/attachments/${attachmentToDelete.id}`);
      enqueueSnackbar('Attachment deleted successfully', { variant: 'success' });
      refetchAttachments();
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      enqueueSnackbar('Failed to delete attachment', { variant: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    }
  };

  const cancelDeleteAttachment = () => {
    setDeleteDialogOpen(false);
    setAttachmentToDelete(null);
  };

  const handleBusinessCardUpload = async (files: FileList) => {
    if (!id || !files.length) return;

    setUploading(true);
    setExtractionLoading(true);
    setExtractionError(null);
    setBusinessCardExtraction(null);
    
    try {
      const file = files[0]; // Only process the first file
      const formData = new FormData();
      formData.append('file', file);
      
      const { data } = await api.post<BusinessCardExtractionResponse>(
        `/appointments/${id}/attachments/business-card`, 
        formData, 
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Check if extraction is disabled (empty first_name and last_name)
      if (data.extraction.first_name === "" && data.extraction.last_name === "") {
        setExtractionError("Business card information extraction is currently disabled. The card has been uploaded as an attachment.");
        enqueueSnackbar('Business card uploaded as an attachment. Extraction is disabled.', { variant: 'info' });
        setIsExtractionDisabled(true);
      } else {
        setBusinessCardExtraction(data);
        enqueueSnackbar('Business card uploaded and information extracted successfully', { variant: 'success' });
        setIsExtractionDisabled(false);
      }
      
      refetchAttachments();
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (error) {
      console.error('Error uploading business card:', error);
      setExtractionError('Failed to extract information from business card');
      enqueueSnackbar('Failed to extract information from business card', { variant: 'error' });
      
      // Still upload the file as a regular attachment
      try {
        const formData = new FormData();
        formData.append('file', files[0]);
        formData.append('attachment_type', 'business_card');
        
        await api.post(`/appointments/${id}/attachments`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        refetchAttachments();
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      } catch (uploadError) {
        console.error('Error uploading business card as regular attachment:', uploadError);
      }
    } finally {
      setUploading(false);
      setExtractionLoading(false);
    }
  };

  // This function will create a new dignitary from business card extraction
  // and associate it with the appointment through the appointment_dignitaries structure
  const handleCreateDignitaryFromBusinessCard = async () => {
    if (!businessCardExtraction) return;
    
    try {
      // Pass both the extraction data and the attachment_id
      const extractionWithAttachmentId = {
        ...businessCardExtraction.extraction,
        attachment_id: businessCardExtraction.attachment_id
      };
      
      // The backend API should handle adding the new dignitary to the appointment_dignitaries array
      // instead of replacing the deprecated dignitary field
      await api.post(`/appointments/${id}/business-card/create-dignitary`, extractionWithAttachmentId);
      setDignitaryCreated(true);
      setBusinessCardExtraction(null);
      // Make sure to invalidate both appointments and the specific appointment queries
      // to ensure we get the updated appointment with the new dignitary in appointment_dignitaries
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      enqueueSnackbar('Dignitary created successfully from business card', { variant: 'success' });
    } catch (error) {
      console.error('Error creating dignitary from business card:', error);
      setDignitaryCreationError('Failed to create dignitary from business card');
      enqueueSnackbar('Failed to create dignitary from business card', { variant: 'error' });
    }
  };

  const handleDismissExtraction = () => {
    setBusinessCardExtraction(null);
  };

  if (isLoading || !appointment) {
    return (
      <Layout>
        <Container>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container>
        <Box>
          <Typography variant="h4" gutterBottom>
            Edit Appointment
          </Typography>
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            <Paper elevation={0} sx={{ p: 0, mb: 2, border: 'none', boxShadow: 'none', borderRadius: 0, bgcolor: 'transparent' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" gutterBottom color="primary">
                  Request #: {appointment.id}
                </Typography>
              </Box>
            </Paper>
            
            {/* Validation Summary */}
            {showValidationSummary && Object.keys(validationErrors).length > 0 && (
              <Alert 
                severity="error" 
                sx={{ mb: 3 }}
                onClose={() => setShowValidationSummary(false)}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Please fix the following errors:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  {Object.entries(validationErrors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={3}>
                {/* Dignitary Information (Read-only) */}
                <Grid item xs={12} sx={{ pb: 1 }}>
                  <AppointmentDignitaryDisplay appointment={appointment} />
                </Grid>

                {/* AdminAppointmentEditCard Component */}
                <Grid item xs={12}>
                  <AdminAppointmentEditCard
                    control={control}
                    validationErrors={validationErrors}
                    locations={locations}
                    statusMap={statusMap}
                    subStatusMap={subStatusMap}
                    allSubStatusOptions={allSubStatusOptions}
                    statusSubStatusMapping={statusSubStatusMapping}
                    getValues={getValues}
                    setValue={setValue}
                    showNotesFields={true}
                    showBusinessCards={true}
                    showAttachments={true}
                    appointmentId={Number(id)}
                    attachments={attachments}
                    uploadStrategy="immediate"
                    onFileUpload={handleFileUpload}
                    onDeleteAttachment={handleDeleteAttachment}
                    onDownloadAttachment={handleDownloadAttachment}
                    onBusinessCardUpload={handleBusinessCardUpload}
                    onCreateDignitaryFromBusinessCard={handleCreateDignitaryFromBusinessCard}
                    businessCardExtraction={businessCardExtraction}
                    isExtractionDisabled={isExtractionDisabled}
                    extractionLoading={extractionLoading}
                    extractionError={extractionError}
                    dignitaryCreated={dignitaryCreated}
                    dignitaryCreationError={dignitaryCreationError}
                    onDismissExtraction={handleDismissExtraction}
                    uploading={uploading}
                    initialFormValues={appointment ? {
                      appointment_date: appointment.appointment_date || appointment.preferred_date,
                      appointment_time: appointment.appointment_time || appointment.preferred_time_of_day,
                      location_id: appointment.location_id || null,
                      status: appointment.status || '',
                      sub_status: appointment.sub_status || '',
                      appointment_type: appointment.appointment_type || null,
                      requester_notes_to_secretariat: appointment.requester_notes_to_secretariat,
                      secretariat_follow_up_actions: appointment.secretariat_follow_up_actions,
                      secretariat_meeting_notes: appointment.secretariat_meeting_notes,
                      secretariat_notes_to_requester: appointment.secretariat_notes_to_requester,
                    } : undefined}
                  />
                </Grid>

                {/* Buttons */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate(AdminAppointmentsReviewRoute.path || '')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                    >
                      Save Changes
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Box>
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDeleteAttachment}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the attachment "{attachmentToDelete?.file_name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteAttachment} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeleteAttachment} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default AppointmentEdit; 