import React, { useEffect, useRef, useState } from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Paper,
  Chip,
  Card,
  CardContent,
  Alert,
  Divider,
} from '@mui/material';
import { Controller, Control, UseFormGetValues, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Location } from '../models/types';
import { EnumSelect } from './EnumSelect';
import { getLocalDateString, getLocalTimeString, getTimeOptions, findTimeOption, parseUTCDate } from '../utils/dateUtils';
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
import { StatusMap, StatusSubStatusMapping, SubStatusMap } from '../models/types';

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

interface AdminAppointmentEditCardProps {
  control: Control<any>;
  validationErrors: ValidationErrors;
  locations: Location[];
  watchStatus: string;
  watchSubStatus: string;
  watchAppointmentDate: string;
  statusMap: StatusMap;
  subStatusMap: SubStatusMap;
  allSubStatusOptions: string[];
  statusSubStatusMapping: StatusSubStatusMapping | undefined;
  getValues: UseFormGetValues<any>;
  setValue: UseFormSetValue<any>;
  showNotesFields?: boolean;
  showBusinessCards?: boolean;
  showAttachments?: boolean;
  defaultAppointmentDetails?: boolean;
  appointmentId?: number;
  attachments?: Attachment[];
  onFileUpload?: (files: FileList, attachmentType?: string) => Promise<void>;
  onDeleteAttachment?: (attachment: Attachment) => void;
  onDownloadAttachment?: (attachmentId: number, fileName: string) => Promise<void>;
  onBusinessCardUpload?: (files: FileList) => Promise<void>;
  onCreateDignitaryFromBusinessCard?: () => Promise<void>;
  businessCardExtraction?: BusinessCardExtractionResponse | null;
  isExtractionDisabled?: boolean;
  extractionLoading?: boolean;
  extractionError?: string | null;
  dignitaryCreated?: boolean;
  dignitaryCreationError?: string | null;
  onDismissExtraction?: () => void;
  selectedFiles?: File[];
  onRemoveFile?: (index: number) => void;
  uploading?: boolean;
}

const AdminAppointmentEditCard: React.FC<AdminAppointmentEditCardProps> = ({
  control,
  validationErrors,
  locations,
  watchStatus,
  watchSubStatus,
  watchAppointmentDate,
  statusMap,
  subStatusMap,
  allSubStatusOptions,
  statusSubStatusMapping,
  getValues,
  setValue,
  showNotesFields = true,
  showBusinessCards = false,
  showAttachments = false,
  appointmentId,
  defaultAppointmentDetails = false,
  attachments = [],
  onFileUpload,
  onDeleteAttachment,
  onDownloadAttachment,
  onBusinessCardUpload,
  onCreateDignitaryFromBusinessCard,
  businessCardExtraction,
  isExtractionDisabled = false,
  extractionLoading = false,
  extractionError = null,
  dignitaryCreated = false,
  dignitaryCreationError = null,
  onDismissExtraction,
  selectedFiles = [],
  onRemoveFile,
  uploading = false,
}) => {
  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const businessCardInputRef = useRef<HTMLInputElement>(null);
  const businessCardCameraInputRef = useRef<HTMLInputElement>(null);

  const today = getLocalDateString();
  const now = getLocalTimeString();
  console.log('now', now);

  // Set default values for status and sub-status when defaultAppointmentDetails is true
  useEffect(() => {
    if (defaultAppointmentDetails) {
      // Set the default status value
      const defaultStatus = statusMap['COMPLETED'];
      setValue('status', defaultStatus);
      
      // Get the appropriate sub-status options for this status
      if (statusSubStatusMapping && statusSubStatusMapping[defaultStatus]) {
        // Use the default sub-status for this status
        const defaultSubStatus = statusSubStatusMapping[defaultStatus].default_sub_status || subStatusMap['NO_FURTHER_ACTION'];
        setValue('sub_status', defaultSubStatus);
      }
    }
  }, [defaultAppointmentDetails, statusMap, subStatusMap, statusSubStatusMapping, setValue]);

  // Generate time options in 15-minute increments
  const timeOptions = getTimeOptions();

  // Separate attachments by type
  const businessCardAttachments = React.useMemo(() => {
    return attachments.filter(attachment => attachment.attachment_type === 'business_card');
  }, [attachments]);

  const generalAttachments = React.useMemo(() => {
    return attachments.filter(attachment => attachment.attachment_type === 'general');
  }, [attachments]);

  // File handlers
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

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0 && onFileUpload) {
      onFileUpload(event.target.files);
    }
  };

  const handleCameraInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0 && onFileUpload) {
      onFileUpload(event.target.files);
    }
  };

  const handleBusinessCardInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0 && onBusinessCardUpload) {
      onBusinessCardUpload(event.target.files);
    }
  };

  const handleBusinessCardCameraInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0 && onBusinessCardUpload) {
      onBusinessCardUpload(event.target.files);
    }
  };

  // Get file icon based on file type
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

  // Render business card extraction UI
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
                onClick={onCreateDignitaryFromBusinessCard}
                sx={{ mr: 1 }}
                disabled={!onCreateDignitaryFromBusinessCard}
              >
                Create Contact
              </Button>
              <Button 
                variant="outlined"
                onClick={onDismissExtraction}
                disabled={!onDismissExtraction}
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
                  {extraction.social_media.map((handle, index) => (
                    <Chip key={index} label={handle} size="small" />
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

  return (
    <Grid container spacing={3}>
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
              value={defaultAppointmentDetails ? today : field.value}
              InputLabelProps={{ shrink: true }}
              error={!!validationErrors.appointment_date}
              helperText={validationErrors.appointment_date}
            />
          )}
        />
      </Grid>

      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="appointment_time"
          control={control}
          render={({ field }) => {
            const timeOption = findTimeOption(defaultAppointmentDetails ? now : field.value, timeOptions);
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
                    error={!!validationErrors.appointment_time}
                    helperText={validationErrors.appointment_time}
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
            <FormControl fullWidth error={!!validationErrors.location_id}>
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
              {validationErrors.location_id && (
                <FormHelperText error>{validationErrors.location_id}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>

      {/* Status */}
      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!validationErrors.status}>
              <EnumSelect
                enumType="appointmentStatus"
                label="Status"
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  
                  // When status changes, update sub-status to default for that status
                  const newStatus = e.target.value as string;
                  if (statusSubStatusMapping && statusSubStatusMapping[newStatus]) {
                    const defaultSubStatus = statusSubStatusMapping[newStatus].default_sub_status;
                    setValue('sub_status', defaultSubStatus);
                  }
                }}
              />
              {validationErrors.status && (
                <FormHelperText error>{validationErrors.status}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>

      {/* Sub-Status */}
      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="sub_status"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!validationErrors.sub_status}>
              <InputLabel>Sub-Status</InputLabel>
              <Select
                {...field}
                label="Sub-Status"
              >
                {allSubStatusOptions.map((option) => {
                  // Determine if this option should be disabled based on the API mapping
                  const isDisabled = Boolean(
                    watchStatus && 
                    statusSubStatusMapping && 
                    statusSubStatusMapping[watchStatus] && 
                    statusSubStatusMapping[watchStatus].valid_sub_statuses.length > 0 && 
                    !statusSubStatusMapping[watchStatus].valid_sub_statuses.includes(option)
                  );
                  
                  return (
                    <MenuItem 
                      key={option} 
                      value={option}
                      disabled={isDisabled}
                    >
                      {option}
                    </MenuItem>
                  );
                })}
              </Select>
              {validationErrors.sub_status && (
                <FormHelperText error>{validationErrors.sub_status}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>

      {/* Appointment Type */}
      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="appointment_type"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!validationErrors.appointment_type}>
              <EnumSelect
                enumType="appointmentType"
                label="Appointment Type"
                {...field}
              />
              {validationErrors.appointment_type && (
                <FormHelperText error>{validationErrors.appointment_type}</FormHelperText>
              )}
            </FormControl>
          )}
        />
      </Grid>

      {showNotesFields && (
        <>
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
                  error={!!validationErrors.secretariat_notes_to_requester}
                  helperText={
                    <span>
                      <span style={{ fontWeight: 'bold' }}>NOT FOR INTERNAL USE.</span> Please note: Above notes are shared with the Point of Contact.
                      {validationErrors.secretariat_notes_to_requester ? (
                        <>
                          <br />
                          {validationErrors.secretariat_notes_to_requester}
                        </>
                      ) : null}
                    </span>
                  }
                />
              )}
            />
          </Grid>

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
                  label="Internal Meeting Notes (Secretariat Internal)"
                  error={!!validationErrors.secretariat_meeting_notes}
                  helperText={
                    <span>
                      <span style={{ fontWeight: 'bold' }}>INTERNAL USE ONLY.</span> Please note: Above notes are for internal use only and are not shared with the Point of Contact.
                      {validationErrors.secretariat_meeting_notes ? (
                        <>
                          <br />
                          {validationErrors.secretariat_meeting_notes}
                        </>
                      ) : null}
                    </span>
                  }
                />  
              )}
            />
          </Grid>

          {(watchStatus === statusMap['APPROVED'] || watchStatus === statusMap['COMPLETED']) && watchAppointmentDate && parseUTCDate(watchAppointmentDate) <= new Date() && (
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
                    error={!!validationErrors.secretariat_follow_up_actions}
                    helperText={
                      <span>
                        <span style={{ fontWeight: 'bold' }}>INTERNAL USE ONLY.</span> Please note: Above notes are for internal use only and are not shared with the Point of Contact.
                        {validationErrors.secretariat_follow_up_actions ? (
                          <>
                            <br />
                            {validationErrors.secretariat_follow_up_actions}
                          </>
                        ) : null}
                      </span>
                    }
                  />
                )}
              />
            </Grid>
          )}
        </>
      )}

      {/* Business Cards Section */}
      {showBusinessCards && (watchStatus === statusMap['APPROVED'] || watchStatus === statusMap['COMPLETED']) && watchAppointmentDate && parseUTCDate(watchAppointmentDate) <= new Date() && (
        <Grid item xs={12}>
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
              disabled={uploading || extractionLoading || !onBusinessCardUpload}
            >
              Upload Business Card
            </Button>
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              onClick={handleTakeBusinessCardPhoto}
              disabled={uploading || extractionLoading || !onBusinessCardUpload}
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
            
            {extractionLoading && <CircularProgress size={24} sx={{ ml: 2 }} />}
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
        </Grid>
      )}

      {/* File Attachments Section */}
      {showAttachments && (
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
              disabled={uploading || !onFileUpload}
            >
              Choose Files
            </Button>
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              onClick={handleTakePhoto}
              disabled={uploading || !onFileUpload}
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
          
          {/* Selected Files before upload */}
          {selectedFiles.length > 0 && onRemoveFile && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Files ({selectedFiles.length})
              </Typography>
              <List dense>
                {selectedFiles.map((file, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {file.type.startsWith('image/') ? (
                        <ImageIcon />
                      ) : (
                        <InsertDriveFileIcon />
                      )}
                    </ListItemIcon>
                    <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(2)} KB`} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => onRemoveFile(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
          
          {/* Attachments List */}
          {attachments.length > 0 && (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
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
                              secondary={attachment.created_at}
                            />
                            <ListItemSecondaryAction>
                              {onDownloadAttachment && (
                                <IconButton 
                                  edge="end" 
                                  aria-label="download"
                                  onClick={() => onDownloadAttachment(attachment.id, attachment.file_name)}
                                  sx={{ mr: 1 }}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              )}
                              {onDeleteAttachment && (
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete"
                                  onClick={() => onDeleteAttachment(attachment)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
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
                              secondary={attachment.created_at}
                            />
                            <ListItemSecondaryAction>
                              {onDownloadAttachment && (
                                <IconButton 
                                  edge="end" 
                                  aria-label="download"
                                  onClick={() => onDownloadAttachment(attachment.id, attachment.file_name)}
                                  sx={{ mr: 1 }}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              )}
                              {onDeleteAttachment && (
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete"
                                  onClick={() => onDeleteAttachment(attachment)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </ListItemSecondaryAction>
                          </ListItem>
                          {index < generalAttachments.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </List>
              </CardContent>
            </Card>
          )}
          
          {attachments.length === 0 && !selectedFiles.length && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">No attachments yet</Typography>
            </Box>
          )}
        </Grid>
      )}
    </Grid>
  );
};

export default AdminAppointmentEditCard; 