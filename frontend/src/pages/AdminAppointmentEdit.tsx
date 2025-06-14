import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { StatusMap, SubStatusMap, StatusSubStatusMapping, AppointmentTimeSlotDetailsMap } from '../models/types';
import { SecondaryButton } from '../components/SecondaryButton';
import { PrimaryButton } from '../components/PrimaryButton';
import WarningButton from '../components/WarningButton';
import { addMonths, addDays, subDays, format } from 'date-fns';

interface AppointmentFormData {
  appointment_date: string;
  appointment_time: string;
  duration: number;
  location_id: number | null;
  meeting_place_id: number | null;
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

const AdminAppointmentEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const api = useApi();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [businessCardExtraction, setBusinessCardExtraction] = useState<BusinessCardExtractionResponse | null>(null);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [dignitaryCreated, setDignitaryCreated] = useState(false);
  const [dignitaryCreationError, setDignitaryCreationError] = useState<string | null>(null);
  const [isExtractionDisabled, setIsExtractionDisabled] = useState(false);
  const [timeSlotDetailsMap, setTimeSlotDetailsMap] = useState<AppointmentTimeSlotDetailsMap | null>(null);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const theme = useTheme();
  
  // Extract prefilled values from location state if present
  const locationState = location.state as { 
    status?: string, 
    sub_status?: string,
    secretariat_meeting_notes?: string,
    secretariat_follow_up_actions?: string
  } | null;
  
  // Get redirect URL from query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const redirectTo = searchParams.get('redirectTo') || `/admin/appointments/review/${id}`;
  
  // Reference to AdminAppointmentEditCard component
  const appointmentEditCardRef = useRef<{ validate: () => ValidationErrors }>(null);
  
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

  // Function to handle redirecting back to the original URL with all parameters
  const handleRedirect = useCallback((stripAppointmentId: boolean = true) => {
    if (redirectTo) {
      try {
        // Parse the URL to properly handle all components
        const redirectUrl = new URL(redirectTo, window.location.origin);
        
        // Check if we need to strip out the appointmentId from the URL
        if (stripAppointmentId && redirectUrl.pathname.includes('/review/')) {
          // Extract the base path without the appointment ID
          const pathParts = redirectUrl.pathname.split('/');
          const reviewIndex = pathParts.indexOf('review');
          
          if (reviewIndex >= 0 && reviewIndex < pathParts.length - 1) {
            // Remove the appointmentId part but keep the 'review' part
            pathParts.splice(reviewIndex + 1, 1);
            redirectUrl.pathname = pathParts.join('/');
          }
        }
        
        debugLog(`Redirecting to: ${redirectUrl.pathname}${redirectUrl.search}`);
        navigate(redirectUrl.pathname + redirectUrl.search, { replace: true });
      } catch (e) {
        // Fallback if URL parsing fails
        navigate(redirectTo, { replace: true });
      }
    } else {
      // If stripAppointmentId is true, go to the general appointments page
      if (stripAppointmentId) {
        navigate('/admin/appointments/review', { replace: true });
      } else {
        navigate(`/admin/appointments/review/${id}`, { replace: true });
      }
    }
  }, [redirectTo, navigate, id]);

  // Debug log function
  const debugLog = (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AppointmentEdit] ${message}`, data || '');
    }
  };

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
      const { data } = await api.get<Location[]>('/admin/locations/all');
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
      console.log('appointment', appointment);
      // console.log('locationState', locationState);
      // console.log('meeting_place_id', appointment.meeting_place_id);
      reset({
        appointment_date: appointment.appointment_date || appointment.preferred_date,
        appointment_time: appointment.appointment_time,
        duration: appointment.duration || 15,
        location_id: appointment.location_id || null,
        meeting_place_id: appointment.meeting_place_id || null,
        status: locationState?.status || appointment.status || '',
        sub_status: locationState?.sub_status || appointment.sub_status || '',
        appointment_type: appointment.appointment_type || null,
        requester_notes_to_secretariat: appointment.requester_notes_to_secretariat,
        secretariat_follow_up_actions: locationState?.secretariat_follow_up_actions || appointment.secretariat_follow_up_actions,
        secretariat_meeting_notes: locationState?.secretariat_meeting_notes || appointment.secretariat_meeting_notes,
        secretariat_notes_to_requester: appointment.secretariat_notes_to_requester,
      });      
    }
  }, [appointment, reset, locationState]);

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
      // When saving, strip the appointment ID from the redirect URL
      handleRedirect(true);
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      enqueueSnackbar('Failed to update appointment', { variant: 'error' });
    },
  });

  // Handle validation results from the AdminAppointmentEditCard component
  const handleValidationResult = (errors: ValidationErrors) => {
    setValidationErrors(errors);
    setShowValidationSummary(Object.keys(errors).length > 0);
  };

  const onSubmit = (data: AppointmentFormData) => {
    // Use the validate method from the AdminAppointmentEditCard ref instead of local validateForm
    const validationErrors = appointmentEditCardRef.current?.validate() || {};
    
    // If there are validation errors, prevent submission
    if (Object.keys(validationErrors).length > 0) {
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

  // Fetch time slot data
  const fetchTimeSlotData = async (dateStr?: string, locationId: number | null = null) => {
    try {
      setIsLoadingTimeSlots(true);
      
      // Use the selected date if provided, otherwise use the current date
      const selectedDate = dateStr || format(new Date(), 'yyyy-MM-dd');
      
      // Calculate date range: 15 days before and 45 days after the selected date
      const startDate = format(subDays(new Date(selectedDate), 15), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(selectedDate), 45), 'yyyy-MM-dd');
      
      // Build query params
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });
      
      // NOTE: We are not filtering by location here because we want to show all time slots for the selected date
      // Add location filter if provided
      // if (locationId) {
      //   params.append('location_id', locationId.toString());
      // }
      
      // Fetch time slot data using the new combined endpoint
      const { data: combinedData } = await api.get<AppointmentTimeSlotDetailsMap>(
        `/admin/stats/appointments/detailed?${params.toString()}`
      );

      // console.log('combinedData 2025-04-03 04:30', combinedData.dates['2025-04-03'].time_slots['04:30']);
      
      setTimeSlotDetailsMap(combinedData);
      
      // For backward compatibility, also maintain the older data structures
      // Convert the combined data back to the previous formats
      
      // Convert to stats map format
      const statsAppointments: Record<string, Record<string, { appointment_count: number; people_count: number }>> = {};
      const totals: Record<string, number> = {};
      
      Object.entries(combinedData.dates).forEach(([dateKey, dateData]) => {
        // Store the total count
        totals[dateKey] = dateData.appointment_count;
        statsAppointments[dateKey] = {};
        
        // Process each time slot
        Object.entries(dateData.time_slots).forEach(([timeKey, appointmentsData]) => {
          // Count appointments and people
          const appointmentCount = Object.keys(appointmentsData).length;
          const peopleCount = Object.values(appointmentsData).reduce((sum, count) => sum + count, 0);
          
          // Store in statsAppointments
          statsAppointments[dateKey][timeKey] = {
            appointment_count: appointmentCount,
            people_count: peopleCount
          };
        });
      });
      
      // Convert to ID map format
      const idsAppointments: Record<string, Record<string, number[]>> = {};
      
      Object.entries(combinedData.dates).forEach(([dateKey, dateData]) => {
        idsAppointments[dateKey] = {};
        
        // Process each time slot
        Object.entries(dateData.time_slots).forEach(([timeKey, appointmentsData]) => {
          // Extract appointment IDs as numbers
          idsAppointments[dateKey][timeKey] = Object.keys(appointmentsData).map(id => parseInt(id, 10));
        });
      });
      
      Object.entries(combinedData.dates).forEach(([dateKey, dateData]) => {
        // Convert stats
        const timeSlotsData: Record<string, { appointment_count: number; people_count: number }> = {};
        
        Object.entries(dateData.time_slots).forEach(([timeKey, appointmentsData]) => {
          const appointmentCount = Object.keys(appointmentsData).length;
          const peopleCount = Object.values(appointmentsData).reduce((sum, count) => sum + count, 0);
          
          timeSlotsData[timeKey] = {
            appointment_count: appointmentCount,
            people_count: peopleCount
          };
        });
        
        // Convert IDs
        const idTimeSlots: Record<string, number[]> = {};
        
        Object.entries(dateData.time_slots).forEach(([timeKey, appointmentsData]) => {
          idTimeSlots[timeKey] = Object.keys(appointmentsData).map(id => parseInt(id, 10));
        });
      });
      
    } catch (error) {
      console.error('Error fetching time slot data:', error);
      enqueueSnackbar('Failed to load time slot availability data', { variant: 'error' });
    } finally {
      setIsLoadingTimeSlots(false);
    }
  };

  // Trigger time slot data fetch when appointment data changes
  useEffect(() => {
    if (appointment && appointment.appointment_date) {
      // Check if we already have the data for this date to avoid redundant API calls
      if (timeSlotDetailsMap && 
          timeSlotDetailsMap.dates && 
          timeSlotDetailsMap.dates[appointment.appointment_date]) {
        // We already have the data for this date
        return;
      }
      
      // Only fetch if we don't already have the data
      fetchTimeSlotData(appointment.appointment_date);
    }
  }, [appointment, timeSlotDetailsMap]);
  
  // Update the useEffect that watches for date changes to use the new combined data structure
  useEffect(() => {
    const watchAppointmentDate = watch('appointment_date');
    
    if (watchAppointmentDate) {
      // If we already have the data for this date in the combined map, no need to fetch again
      if (timeSlotDetailsMap && 
          timeSlotDetailsMap.dates && 
          timeSlotDetailsMap.dates[watchAppointmentDate]) {
        // We already have the data for this date
        return;
      }
      
      // Fetch time slot data for the selected date
      fetchTimeSlotData(watchAppointmentDate, getValues('location_id'));
    }
  }, [watch, fetchTimeSlotData, getValues, timeSlotDetailsMap]);

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
          <Typography variant="h1" gutterBottom>
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
              <Grid container spacing={2}>
                {/* Dignitary Information (Read-only) */}
                <Grid item xs={12} sx={{ pb: 1 }}>
                  <AppointmentDignitaryDisplay appointment={appointment} />
                </Grid>

                {/* AdminAppointmentEditCard Component */}
                <Grid item xs={12}>
                  <AdminAppointmentEditCard
                    ref={appointmentEditCardRef}
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
                    appointmentId={id ? Number(id) : undefined}
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
                    timeSlotDetailsMap={timeSlotDetailsMap}
                    isLoadingTimeSlots={isLoadingTimeSlots}
                    currentAppointmentId={id ? Number(id) : undefined}
                    initialFormValues={appointment ? {
                      appointment_date: appointment.appointment_date || appointment.preferred_date,
                      appointment_time: appointment.appointment_time,
                      duration: appointment.duration || 15,
                      location_id: appointment.location_id || null,
                      meeting_place_id: appointment.meeting_place_id || null,
                      status: locationState?.status || appointment.status || '',
                      sub_status: locationState?.sub_status || appointment.sub_status || '',
                      appointment_type: appointment.appointment_type || null,
                      requester_notes_to_secretariat: appointment.requester_notes_to_secretariat,
                      secretariat_follow_up_actions: locationState?.secretariat_follow_up_actions || appointment.secretariat_follow_up_actions,
                      secretariat_meeting_notes: locationState?.secretariat_meeting_notes || appointment.secretariat_meeting_notes,
                      secretariat_notes_to_requester: appointment.secretariat_notes_to_requester,
                      // Include preferred date fields for date range validation
                      preferred_date: appointment.preferred_date,
                      preferred_start_date: appointment.preferred_start_date,
                      preferred_end_date: appointment.preferred_end_date,
                      preferred_time_of_day: appointment.preferred_time_of_day,
                    } : undefined}
                    onValidationResult={handleValidationResult}
                  />
                </Grid>

                {/* Buttons */}
                <Grid item xs={12}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 2, 
                    justifyContent: {
                      xs: 'center',   // Center on phones
                      sm: 'center',   // Center on small tablets
                      md: 'flex-end' // Left-align on desktop and larger
                    }, 
                    alignItems: 'center' 
                  }}>
                    <SecondaryButton
                      size="medium"
                      onClick={() => handleRedirect(false)}
                    >
                      Cancel
                    </SecondaryButton>
                    <PrimaryButton
                      size="medium"
                      type="submit"
                    >
                      Save Changes
                    </PrimaryButton>
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
          <SecondaryButton onClick={cancelDeleteAttachment}>
            Cancel
          </SecondaryButton>
          <WarningButton onClick={confirmDeleteAttachment} color="error" autoFocus>
            Delete
          </WarningButton>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default AdminAppointmentEdit; 
