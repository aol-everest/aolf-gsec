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
} from '@mui/material';
import Layout from '../components/Layout';
import { useForm, Controller } from 'react-hook-form';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminAppointmentsReviewRoute } from '../config/routes';
import { Appointment, Location } from '../models/types';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BusinessIcon from '@mui/icons-material/Business';
import { EnumSelect } from '../components/EnumSelect';
import { useEnums } from '../hooks/useEnums';

interface AppointmentFormData {
  appointment_date: string;
  appointment_time: string;
  location_id: number | null;
  status: string;
  sub_status: string;
  appointment_type: string;
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

  const { control, handleSubmit, reset } = useForm<AppointmentFormData>();

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

  // Add useEffect to reset form when appointment data is available
  useEffect(() => {
    if (appointment) {
      reset({
        appointment_date: appointment.appointment_date || appointment.preferred_date,
        appointment_time: appointment.appointment_time || appointment.preferred_time_of_day,
        location_id: appointment.location_id || null,
        status: appointment.status || '',
        sub_status: appointment.sub_status || '',
        appointment_type: appointment.appointment_type || '',
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

  // Separate attachments by type
  const businessCardAttachments = useMemo(() => {
    return attachments.filter(attachment => attachment.attachment_type === 'business_card');
  }, [attachments]);

  const generalAttachments = useMemo(() => {
    return attachments.filter(attachment => attachment.attachment_type === 'general');
  }, [attachments]);

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

  const onSubmit = (data: AppointmentFormData) => {
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

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFileUpload(event.target.files);
    }
  };

  const handleCameraInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFileUpload(event.target.files);
    }
  };

  const handleBusinessCardInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      await handleBusinessCardUpload(event.target.files);
    }
  };

  const handleBusinessCardCameraInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      await handleBusinessCardUpload(event.target.files);
    }
  };

  const handleChooseFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleTakePhoto = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleUploadBusinessCard = () => {
    if (businessCardInputRef.current) {
      businessCardInputRef.current.click();
    }
  };

  const handleTakeBusinessCardPhoto = () => {
    if (businessCardCameraInputRef.current) {
      businessCardCameraInputRef.current.click();
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon />;
    } else if (fileType === 'application/pdf') {
      return <PictureAsPdfIcon />;
    } else if (fileType.startsWith('text/')) {
      return <DescriptionIcon />;
    } else {
      return <InsertDriveFileIcon />;
    }
  };

  // Generate time options in 15-minute increments
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hourFormatted = hour.toString().padStart(2, '0');
        const minuteFormatted = minute.toString().padStart(2, '0');
        const value = `${hourFormatted}:${minuteFormatted}`;
        const label = `${hour % 12 === 0 ? 12 : hour % 12}:${minuteFormatted} ${hour < 12 ? 'AM' : 'PM'}`;
        options.push({ value, label });
      }
    }
    return options;
  }, []);

  // Helper function to find the time option object from a time string
  const findTimeOption = (timeString: string | null) => {
    if (!timeString) return null;
    return timeOptions.find(option => option.value === timeString) || null;
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

  const handleCreateDignitaryFromBusinessCard = async () => {
    if (!businessCardExtraction) return;
    
    try {
      await api.post(`/appointments/${id}/business-card/create-dignitary`, businessCardExtraction.extraction);
      setDignitaryCreated(true);
      setBusinessCardExtraction(null);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
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

  const renderBusinessCardExtraction = () => {
    if (!businessCardExtraction) return null;
    
    const { extraction } = businessCardExtraction;
    
    return (
      <Card variant="outlined" sx={{ mb: 3, mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <BusinessIcon sx={{ mr: 1 }} />
              Business Card Information
            </Typography>
            <Box>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<PersonAddIcon />}
                onClick={handleCreateDignitaryFromBusinessCard}
                sx={{ mr: 1 }}
              >
                Create Contact
              </Button>
              <Button 
                variant="outlined"
                onClick={handleDismissExtraction}
              >
                Dismiss
              </Button>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Name</Typography>
              <Typography variant="body1">{extraction.first_name} {extraction.last_name}</Typography>
            </Grid>
            
            {extraction.title && (
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Title</Typography>
                <Typography variant="body1">{extraction.title}</Typography>
              </Grid>
            )}
            
            {extraction.company && (
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Company</Typography>
                <Typography variant="body1">{extraction.company}</Typography>
              </Grid>
            )}
            
            {extraction.email && (
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                <Typography variant="body1">{extraction.email}</Typography>
              </Grid>
            )}
            
            {extraction.phone && (
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                <Typography variant="body1">{extraction.phone}</Typography>
              </Grid>
            )}
            
            {extraction.other_phone && (
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Other Phone</Typography>
                <Typography variant="body1">{extraction.other_phone}</Typography>
              </Grid>
            )}
            
            {extraction.website && (
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Website</Typography>
                <Typography variant="body1">{extraction.website}</Typography>
              </Grid>
            )}
            
            {extraction.address && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                <Typography variant="body1">{extraction.address}</Typography>
              </Grid>
            )}
            
            {extraction.social_media && extraction.social_media.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Social Media</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {extraction.social_media.map((social, index) => (
                    <Chip key={index} label={social} size="small" />
                  ))}
                </Box>
              </Grid>
            )}
            
            {extraction.extra_fields && extraction.extra_fields.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Additional Information</Typography>
                <Box sx={{ mt: 1 }}>
                  {extraction.extra_fields.map((field, index) => (
                    <Typography key={index} variant="body2">{field}</Typography>
                  ))}
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    );
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
            <form onSubmit={handleSubmit(onSubmit)}>
              <Grid container spacing={3}>
                {/* Dignitary Information (Read-only) */}
                <Grid item xs={12} sx={{ pb: 1 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Dignitary
                  </Typography>
                  <Typography>
                    {appointment.dignitary.honorific_title} {appointment.dignitary.first_name} {appointment.dignitary.last_name}
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    {appointment.dignitary.organization} - {appointment.dignitary.title_in_organization} | {appointment.dignitary.email} | {appointment.dignitary.phone}
                  </Typography>
                  {appointment.requester_notes_to_secretariat && (
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">Pre-meeting Notes</Typography>
                      <Typography>{appointment.requester_notes_to_secretariat}</Typography>
                    </Grid>
                  )}
                </Grid>

                {/* Appointment Date and Time */}
                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="appointment_date"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Appointment Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="appointment_time"
                    control={control}
                    render={({ field }) => {
                      const timeOption = findTimeOption(field.value);
                      return (
                        <Autocomplete
                          options={timeOptions}
                          getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                          isOptionEqualToValue={(option, value) => 
                            option.value === (typeof value === 'string' ? value : value.value)
                          }
                          value={timeOption}
                          onChange={(_, newValue) => {
                            field.onChange(newValue ? newValue.value : '');
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Appointment Time"
                              fullWidth
                              InputLabelProps={{ shrink: true }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <li {...props}>
                              {option.label}
                            </li>
                          )}
                          freeSolo={false}
                          disableClearable={false}
                        />
                      );
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="location_id"
                    control={control}
                    defaultValue={null}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Location</InputLabel>
                        <Select
                          {...field}
                          value={field.value || ''}
                          label="Location"
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {locations.map((location) => (
                            <MenuItem key={location.id} value={location.id}>
                              {`${location.name} - ${location.city}, ${location.state}, ${location.country}`}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* Status */}
                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="status"
                    control={control}
                    defaultValue={appointment?.status || ''}
                    render={({ field }) => (
                      <EnumSelect
                        enumType="appointmentStatus"
                        label="Status"
                        {...field}
                      />
                    )}
                  />
                </Grid>

                {/* Sub-Status */}
                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="sub_status"
                    control={control}
                    defaultValue={appointment?.sub_status || ''}
                    render={({ field }) => (
                      <EnumSelect
                        enumType="appointmentSubStatus"
                        label="Sub-Status"
                        {...field}
                      />
                    )}
                  />
                </Grid>

                {/* Appointment Type */}
                <Grid item xs={12} md={6} lg={4}>
                  <Controller
                    name="appointment_type"
                    control={control}
                    defaultValue={appointment?.appointment_type || ''}
                    render={({ field }) => (
                      <EnumSelect
                        enumType="appointmentType"
                        label="Appointment Type"
                        {...field}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="secretariat_notes_to_requester"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field} 
                        fullWidth
                        multiline
                        rows={4}
                        label="Notes to Point of Contact (shared with Point of Contact)"
                      />
                    )}
                  />
                </Grid>

                {appointment.status === 'Approved' && appointment.appointment_date && new Date(appointment.appointment_date) <= new Date() && (
                  <Grid item xs={12}>
                    <Controller
                      name="secretariat_follow_up_actions"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          multiline
                          rows={4}
                          label="Follow-up Actions (Secretariat Internal)"
                        />
                      )}
                    />
                  </Grid>
                )}

                {appointment.status === 'Approved' && appointment.appointment_date && new Date(appointment.appointment_date) <= new Date() && (
                  <Grid item xs={12}>
                    <Controller
                      name="secretariat_meeting_notes"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          multiline
                          rows={4}
                          label="Meeting Notes (Secretariat Internal)"
                        />  
                      )}
                    />
                  </Grid>
                )}

                {/* File Attachments Section */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                    Attachments
                  </Typography>
                  
                  {/* File Upload Buttons */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<AttachFileIcon />}
                      onClick={handleChooseFile}
                      disabled={uploading}
                    >
                      Choose Files
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<PhotoCameraIcon />}
                      onClick={handleTakePhoto}
                      disabled={uploading}
                    >
                      Take Photo
                    </Button>
                    
                    {/* Hidden file inputs */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileInputChange}
                      multiple
                    />
                    <input
                      type="file"
                      ref={cameraInputRef}
                      style={{ display: 'none' }}
                      onChange={handleCameraInputChange}
                      accept="image/*"
                      capture="environment"
                      multiple
                    />
                    
                    {uploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
                  </Box>
                  
                  {/* Business Cards Section */}
                  <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 3, mb: 1 }}>
                    Business Cards
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload or take photos of business cards for easy reference and automatic contact creation
                    {isExtractionDisabled && (
                      <Chip 
                        label="Extraction Disabled" 
                        color="warning" 
                        size="small" 
                        sx={{ ml: 2 }}
                      />
                    )}
                  </Typography>
                  
                  {isExtractionDisabled && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Business card information extraction is currently disabled. Cards will be uploaded as attachments only.
                    </Alert>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<ContactMailIcon />}
                      onClick={handleUploadBusinessCard}
                      disabled={uploading || extractionLoading}
                    >
                      Upload Business Card
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<PhotoCameraIcon />}
                      onClick={handleTakeBusinessCardPhoto}
                      disabled={uploading || extractionLoading}
                    >
                      Take Business Card Photo
                    </Button>
                    
                    <input
                      type="file"
                      ref={businessCardInputRef}
                      style={{ display: 'none' }}
                      onChange={handleBusinessCardInputChange}
                      accept="image/*"
                      multiple
                    />
                    <input
                      type="file"
                      ref={businessCardCameraInputRef}
                      style={{ display: 'none' }}
                      onChange={handleBusinessCardCameraInputChange}
                      accept="image/*"
                      capture="environment"
                      multiple
                    />
                  </Box>
                  
                  {/* Business Card Extraction Result */}
                  {businessCardExtraction && renderBusinessCardExtraction()}
                  
                  {extractionError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {extractionError}
                    </Alert>
                  )}
                  
                  {dignitaryCreationError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {dignitaryCreationError}
                    </Alert>
                  )}
                  
                  {dignitaryCreated && (
                    <Alert severity="success" sx={{ mb: 3 }}>
                      Contact created successfully from business card
                    </Alert>
                  )}
                  
                  {/* Attachments List */}
                  <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                      {attachments.length === 0 ? (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                          <Typography color="text.secondary">No attachments yet</Typography>
                        </Box>
                      ) : (
                        <List>
                          {/* Business Cards Section */}
                          {businessCardAttachments.length > 0 && (
                            <>
                              <ListItem>
                                <ListItemText 
                                  primary={
                                    <Typography variant="subtitle1" color="subtitle1" sx={{ fontWeight: 'bold' }}>
                                      Business Cards
                                    </Typography>
                                  } 
                                />
                              </ListItem>
                              {businessCardAttachments.map((attachment, index) => (
                                <React.Fragment key={attachment.id}>
                                  <ListItem>
                                    <ListItemIcon>
                                      {getFileIcon(attachment.file_type)}
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={attachment.file_name}
                                      secondary={new Date(attachment.created_at).toLocaleString()}
                                    />
                                    <ListItemSecondaryAction>
                                      <IconButton 
                                        edge="end" 
                                        aria-label="download"
                                        onClick={() => handleDownloadAttachment(attachment.id, attachment.file_name)}
                                        sx={{ mr: 1 }}
                                      >
                                        <DownloadIcon />
                                      </IconButton>
                                      <IconButton 
                                        edge="end" 
                                        aria-label="delete"
                                        onClick={() => handleDeleteAttachment(attachment)}
                                        color="error"
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                  {index < businessCardAttachments.length - 1 && <Divider />}
                                </React.Fragment>
                              ))}
                              {generalAttachments.length > 0 && <Divider />}
                            </>
                          )}
                          
                          {/* General Attachments Section */}
                          {generalAttachments.length > 0 && (
                            <>
                              <ListItem>
                                <ListItemText 
                                  primary={
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                      Other Attachments
                                    </Typography>
                                  } 
                                />
                              </ListItem>
                              {generalAttachments.map((attachment, index) => (
                                <React.Fragment key={attachment.id}>
                                  <ListItem>
                                    <ListItemIcon>
                                      {getFileIcon(attachment.file_type)}
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={attachment.file_name}
                                      secondary={new Date(attachment.created_at).toLocaleString()}
                                    />
                                    <ListItemSecondaryAction>
                                      <IconButton 
                                        edge="end" 
                                        aria-label="download"
                                        onClick={() => handleDownloadAttachment(attachment.id, attachment.file_name)}
                                        sx={{ mr: 1 }}
                                      >
                                        <DownloadIcon />
                                      </IconButton>
                                      <IconButton 
                                        edge="end" 
                                        aria-label="delete"
                                        onClick={() => handleDeleteAttachment(attachment)}
                                        color="error"
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                  {index < generalAttachments.length - 1 && <Divider />}
                                </React.Fragment>
                              ))}
                            </>
                          )}
                        </List>
                      )}
                    </CardContent>
                  </Card>
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