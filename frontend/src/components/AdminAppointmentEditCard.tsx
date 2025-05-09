import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Controller, Control, UseFormGetValues, UseFormSetValue, UseFormWatch, useWatch } from 'react-hook-form';
import { Location, MeetingPlace } from '../models/types';
import { EnumSelect } from './EnumSelect';
import { getLocalDateString, getLocalTimeString, findTimeOption, parseUTCDate, isTimeOffHours, getDurationOptions } from '../utils/dateUtils';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BusinessIcon from '@mui/icons-material/Business';
import { StatusMap, StatusSubStatusMapping, SubStatusMap } from '../models/types';
import { defaultTimeOptions } from '../utils/dateUtils';
import { formatFileSize } from '../utils/fileUtils';
import SecondaryButton from './SecondaryButton';
import { PrimaryButton } from './PrimaryButton';
import { DownloadIconV2, ImageIconV2, PDFIconV2, TextFileIconV2, TrashIconV2, GenericFileIconV2 } from './iconsv2';
// import { statusSubStatusMapping } from '../constants/appointmentStatuses';
import { AppointmentTimeSlotDetailsMap } from '../models/types';
import { debugLog } from '../utils/debugUtils';
import { useApi } from '../hooks/useApi';
import { useQuery } from '@tanstack/react-query';

interface ValidationErrors {
  appointment_date?: string;
  appointment_time?: string;
  location_id?: string;
  meeting_place_id?: string;
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

type UploadStrategy = 'immediate' | 'deferred';

export interface AdminAppointmentEditCardRef {
  validate: () => ValidationErrors;
}

interface AdminAppointmentEditCardProps {
  control: Control<any>;
  validationErrors: ValidationErrors;
  locations: Location[];
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
  uploadStrategy?: UploadStrategy;
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
  onFileSelect?: (files: File[]) => void;
  initialFormValues?: Record<string, any>;
  onValidationResult?: (errors: ValidationErrors) => void;
  validateOnChange?: boolean;
  timeSlotDetailsMap?: AppointmentTimeSlotDetailsMap | null;
  currentAppointmentId?: number;
  isLoadingTimeSlots?: boolean;
}

// Common file types and their corresponding icons
const fileTypeIcons: Record<string, React.ReactNode> = {
  'image': <ImageIconV2 sx={{ width: 20, height: 20 }} />,
  'application/pdf': <PDFIconV2 sx={{ width: 20, height: 20 }} />,
  'text': <TextFileIconV2 sx={{ width: 20, height: 20 }} />,
  'default': <GenericFileIconV2 sx={{ width: 20, height: 20 }} />
};

// File type validation
const allowedFileTypes = [
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// BusinessCardExtraction component (extracted for reusability)
interface BusinessCardExtractionProps {
  extraction: BusinessCardExtraction;
  onCreateContact?: () => void;
  onDismiss?: () => void;
}

const BusinessCardExtractionDisplay: React.FC<BusinessCardExtractionProps> = ({
  extraction,
  onCreateContact,
  onDismiss
}) => {
  return (
    <Card variant="outlined" sx={{ mb: 3, mt: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
            <BusinessIcon sx={{ mr: 1 }} />
            Business Card Information
          </Typography>
          <Box>
            <PrimaryButton 
              size="small"
              startIcon={<PersonAddIcon />}
              onClick={onCreateContact}
              sx={{ mr: 1 }}
              disabled={!onCreateContact}
            >
              Create Contact
            </PrimaryButton>
            <SecondaryButton 
              size="small"
              onClick={onDismiss}
              disabled={!onDismiss}
            >
              Dismiss
            </SecondaryButton>
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

const AdminAppointmentEditCard = forwardRef<AdminAppointmentEditCardRef, AdminAppointmentEditCardProps>(({
  control,
  validationErrors,
  locations,
  statusMap,
  subStatusMap,
  allSubStatusOptions,
  statusSubStatusMapping,
  getValues,
  setValue,
  showNotesFields = true,
  showBusinessCards = false,
  showAttachments = false,
  defaultAppointmentDetails = false,
  appointmentId,
  attachments = [],
  uploadStrategy = 'immediate',
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
  onFileSelect,
  initialFormValues,
  onValidationResult,
  validateOnChange = false,
  timeSlotDetailsMap,
  currentAppointmentId,
  isLoadingTimeSlots = false,
}, ref) => {
  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const businessCardInputRef = useRef<HTMLInputElement>(null);
  const businessCardCameraInputRef = useRef<HTMLInputElement>(null);
  const [localSelectedFiles, setLocalSelectedFiles] = useState<File[]>([]);
  const [initialSetupComplete, setInitialSetupComplete] = useState(false);
  
  // State for off-hours warning dialog
  const [showOffHoursWarning, setShowOffHoursWarning] = useState<boolean>(false);
  const [selectedOffHoursTime, setSelectedOffHoursTime] = useState<string | null>(null);

  // Manage watch variables internally instead of receiving them as props
  const watchStatus = useWatch({ control, name: 'status' });
  const watchSubStatus = useWatch({ control, name: 'sub_status' });
  const watchAppointmentDate = useWatch({ control, name: 'appointment_date' });
  const watchAppointmentTime = useWatch({ control, name: 'appointment_time' });
  const watchDuration = useWatch({ control, name: 'duration' });

  const today = getLocalDateString();
  const now = getLocalTimeString();

  const api = useApi();
  
  // Watch for location_id changes to fetch meeting places
  const watchLocationId = useWatch({ control, name: 'location_id' });
  
  // Query for fetching meeting places based on selected location
  const { 
    data: meetingPlaces = [], 
    isLoading: isLoadingMeetingPlaces,
    refetch: refetchMeetingPlaces 
  } = useQuery({
    queryKey: ['location', watchLocationId, 'meetingPlaces'],
    queryFn: async () => {
      if (!watchLocationId) return [];
      try {
        const { data } = await api.get<MeetingPlace[]>(`/locations/${watchLocationId}/meeting_places`);
        return data;
      } catch (error) {
        console.error("Error fetching meeting places:", error);
        return [];
      }
    },
    enabled: !!watchLocationId, // Only run query when a location is selected
  });

  // Reset meeting_place_id when location changes
  useEffect(() => {
    // Skip during initial setup to avoid overriding initialFormValues
    if (!initialSetupComplete) return;
    
    // Clear meeting place when location changes
    setValue('meeting_place_id', null);
  }, [watchLocationId, setValue, initialSetupComplete]);
  
  // Effect to handle meeting place selection after meeting places have loaded
  useEffect(() => {
    // Only run this effect if we have loaded meeting places and we're in edit mode
    if (!isLoadingMeetingPlaces && meetingPlaces.length > 0 && initialFormValues && initialFormValues.meeting_place_id) {
      // Check if the initial meeting_place_id is available in the loaded meeting places
      const initialMeetingPlaceId = initialFormValues.meeting_place_id;
      const meetingPlaceExists = meetingPlaces.some(mp => mp.id === initialMeetingPlaceId);
      
      if (meetingPlaceExists) {
        // Re-set the value to ensure it's properly selected in the dropdown
        setValue('meeting_place_id', initialMeetingPlaceId);
      }
    }
  }, [meetingPlaces, isLoadingMeetingPlaces, initialFormValues, setValue]);

  // Handle initial form values if provided by parent
  useEffect(() => {
    if (initialFormValues && !initialSetupComplete) {
      console.log('Setting initialFormValues in AdminAppointmentEditCard:', initialFormValues);
      Object.entries(initialFormValues).forEach(([field, value]) => {
        if (value !== undefined && value !== null) {
          setValue(field, value);
        }
      });
      setInitialSetupComplete(true);
    }
  }, [initialFormValues, setValue, initialSetupComplete]);

  // Add a date/time comparison effect to automatically set status based on selected date and time
  useEffect(() => {
    // Skip this effect if we have initialFormValues with a specified sub_status
    if (!initialSetupComplete || (initialFormValues && initialFormValues.sub_status)) return;

    // Only do this if we have both a date and time selected
    const appointmentDate = getValues('appointment_date');
    const appointmentTime = getValues('appointment_time');
    
    if (appointmentDate && appointmentTime && statusMap) {
      // Convert selected date and time to a Date object
      const selectedDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      const currentDateTime = new Date(`${today}T${now}`);

      // Compare with current date/time
      if (selectedDateTime > currentDateTime) {
        // Future date: set status to Approved & sub-status to Scheduled
        if (
          statusMap['APPROVED'] && 
          subStatusMap && 
          subStatusMap['SCHEDULED'] && 
          statusSubStatusMapping && 
          statusSubStatusMapping[statusMap['APPROVED']] &&
          statusSubStatusMapping[statusMap['APPROVED']].valid_sub_statuses.includes(subStatusMap['SCHEDULED'])
        ) {
          setValue('status', statusMap['APPROVED']);
          setValue('sub_status', subStatusMap['SCHEDULED']);
        }
      } else {
        // Past or current date: set status to Completed & sub-status to No Further Action
        if (
          statusMap['COMPLETED'] && 
          subStatusMap && 
          subStatusMap['NO_FURTHER_ACTION'] && 
          statusSubStatusMapping && 
          statusSubStatusMapping[statusMap['COMPLETED']] &&
          statusSubStatusMapping[statusMap['COMPLETED']].valid_sub_statuses.includes(subStatusMap['NO_FURTHER_ACTION'])
        ) {
          setValue('status', statusMap['COMPLETED']);
          setValue('sub_status', subStatusMap['NO_FURTHER_ACTION']);
        }
      }
    }
  }, [watchAppointmentDate, watchAppointmentTime, statusMap, subStatusMap, statusSubStatusMapping, setValue, getValues, today, now, initialSetupComplete, initialFormValues]);

  // Validate form based on status and substatus combinations
  const validateForm = (): ValidationErrors => {
    const data = getValues();
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
    
    // Report validation results to parent component if callback provided
    if (onValidationResult) {
      onValidationResult(errors);
    }
    
    return errors;
  };

  // Expose validateForm as a public method via ref
  useImperativeHandle(ref, () => ({
    validate: validateForm
  }), [validateForm]);

  // Trigger validation when specific fields change if validateOnChange is true
  useEffect(() => {
    if (validateOnChange) {
      validateForm();
    }
  }, [watchStatus, watchSubStatus, watchAppointmentDate, validateOnChange]);

  // Handle initial form values if provided by parent
  useEffect(() => {
    if (initialFormValues && !initialSetupComplete) {
      Object.entries(initialFormValues).forEach(([field, value]) => {
        if (value !== undefined && value !== null) {
          setValue(field, value);
        }
      });
      setInitialSetupComplete(true);
    }
  }, [initialFormValues, setValue, initialSetupComplete]);

  // Set default values for status and sub-status when defaultAppointmentDetails is true
  // and there are no existing values
  useEffect(() => {
    // Skip this effect if we have initialFormValues with a specified sub_status
    if (defaultAppointmentDetails && !initialSetupComplete && !(initialFormValues && initialFormValues.sub_status)) {
      const existingStatus = getValues('status');
      const existingSubStatus = getValues('sub_status');
      
      // Only set defaults if values don't already exist
      if (!existingStatus && statusMap && 'COMPLETED' in statusMap) {
        const defaultStatus = statusMap['COMPLETED'];
        setValue('status', defaultStatus);
        
        // Only set default sub_status if it doesn't already exist
        if (!existingSubStatus && statusSubStatusMapping && statusSubStatusMapping[defaultStatus]) {
          const defaultSubStatus = statusSubStatusMapping[defaultStatus].default_sub_status || 
            (subStatusMap && 'NO_FURTHER_ACTION' in subStatusMap ? subStatusMap['NO_FURTHER_ACTION'] : '');
          setValue('sub_status', defaultSubStatus);
        }
      }
      
      // Set default date and time if they're not already set
      const currentDate = getValues('appointment_date');
      const currentTime = getValues('appointment_time');
      
      if (!currentDate) {
        setValue('appointment_date', today);
      }
      
      if (!currentTime) {
        setValue('appointment_time', now);
      }
      
      setInitialSetupComplete(true);
    }
  }, [defaultAppointmentDetails, statusMap, subStatusMap, statusSubStatusMapping, setValue, getValues, today, now, initialSetupComplete, initialFormValues]);

  // Unified status-substatus relationship management
  useEffect(() => {
    // Skip this effect during initial setup to avoid overriding initialFormValues
    if (!initialSetupComplete) return;
    
    // Skip this effect if the initialFormValues.sub_status is set to maintain the passed value
    if (initialFormValues && initialFormValues.sub_status && Object.keys(initialFormValues).includes('status') && 
        getValues('status') === initialFormValues.status) {
      return;
    }
    
    if (watchStatus && statusSubStatusMapping && statusSubStatusMapping[watchStatus]) {
      const { default_sub_status, valid_sub_statuses } = statusSubStatusMapping[watchStatus];
      
      // Only set default if current sub_status is not valid for the new status
      const currentSubStatus = getValues('sub_status');
      
      if (!currentSubStatus || !valid_sub_statuses.includes(currentSubStatus)) {
        console.log(`Setting sub_status to default: ${default_sub_status}`);
        setValue('sub_status', default_sub_status);
      }
    }
  }, [watchStatus, statusSubStatusMapping, getValues, setValue, initialSetupComplete, initialFormValues]);

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
    if (event.target.files && event.target.files.length > 0) {
      if (uploadStrategy === 'immediate' && onFileUpload) {
        onFileUpload(event.target.files);
      } else {
        // For deferred uploads, store files locally
        const files = Array.from(event.target.files).filter(file => {
          const validation = validateFileBeforeUpload(file);
          return validation.valid;
        });

        if (files.length > 0) {
          setLocalSelectedFiles(prev => [...prev, ...files]);
          if (onFileSelect) {
            onFileSelect(files);
          }
        }
      }
    }
  };

  const handleCameraInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      if (uploadStrategy === 'immediate' && onFileUpload) {
        onFileUpload(event.target.files);
      } else {
        // For deferred uploads, store files locally
        const files = Array.from(event.target.files).filter(file => {
          const validation = validateFileBeforeUpload(file);
          return validation.valid;
        });

        if (files.length > 0) {
          setLocalSelectedFiles(prev => [...prev, ...files]);
          if (onFileSelect) {
            onFileSelect(files);
          }
        }
      }
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

  const handleLocalRemoveFile = (index: number) => {
    setLocalSelectedFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Get the files to display based on whether we're using parent-managed or local files
  const filesToDisplay = onRemoveFile ? selectedFiles : localSelectedFiles;
  const handleRemoveFile = onRemoveFile || handleLocalRemoveFile;

  // Validate file size and type before upload
  const validateFileBeforeUpload = (file: File): { valid: boolean; message?: string } => {
    // Check file size (max 10MB)
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        message: `File size exceeds 10MB (${formatFileSize(file.size)})`
      };
    }

    // Check file type if needed
    if (!allowedFileTypes.includes(file.type)) {
      return {
        valid: false,
        message: `File type ${file.type} is not allowed`
      };
    }

    return { valid: true };
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return fileTypeIcons['image'];
    } else if (fileType === 'application/pdf') {
      return fileTypeIcons['application/pdf'];
    } else if (fileType.startsWith('text/')) {
      return fileTypeIcons['text'];
    } else {
      return fileTypeIcons['default'];
    }
  };

  // Add a helper function to check if a time slot is available using the new combined data structure
  const checkTimeSlotAvailability = (
    date: string,
    time: string,
    timeSlotDetailsMap: AppointmentTimeSlotDetailsMap | null | undefined,
    currentAppointmentId?: number
  ): { isAvailable: boolean; appointments: number } => {
    if (!timeSlotDetailsMap || !timeSlotDetailsMap.dates || !timeSlotDetailsMap.dates[date]) {
      // If we don't have data for this date, assume it's available
      return { isAvailable: true, appointments: 0 };
    }

    const dateData = timeSlotDetailsMap.dates[date];
    if (!dateData.time_slots || !dateData.time_slots[time]) {
      // If we don't have data for this time slot, assume it's available
      return { isAvailable: true, appointments: 0 };
    }

    const timeSlotData = dateData.time_slots[time];
    
    // Count appointments that are not the current one
    const appointmentIds = Object.keys(timeSlotData).map(id => parseInt(id, 10));
    const filteredAppointments = currentAppointmentId 
      ? appointmentIds.filter(id => id !== currentAppointmentId)
      : appointmentIds;
    
    return { isAvailable: filteredAppointments.length === 0, appointments: filteredAppointments.length };
  };

  // Duration options
  const durationOptions = getDurationOptions();

  // Function to get time slot occupancy data
  const getTimeSlotOccupancy = (timeSlot: string, duration?: number): { appointment_count: number; people_count: number } => {
    // Default empty data
    const defaultData = { appointment_count: 0, people_count: 0 };
    
    const selectedDate = getValues('appointment_date');
    
    // If we don't have a date or time slot details, return default data
    if (!selectedDate || !timeSlotDetailsMap || !timeSlotDetailsMap.dates[selectedDate]) {
      return defaultData;
    }
    
    const dateData = timeSlotDetailsMap.dates[selectedDate];
    
    // Calculate overlapping time slots
    const overlappingSlots = new Set<string>();
    const [startHour, startMinute] = timeSlot.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = startMinutes + (duration || getValues('duration') || 15);
    
    // Check all 15-minute slots that fall within our duration
    for (let minute = startMinutes; minute < endMinutes; minute += 15) {
      const slotHour = Math.floor(minute / 60);
      const slotMinute = minute % 60;
      const slot = `${slotHour.toString().padStart(2, '0')}:${slotMinute.toString().padStart(2, '0')}`;
      if (dateData.time_slots[slot]) {
        overlappingSlots.add(slot);
      }
    }
    
    // Count unique appointments and people across all overlapping slots
    const appointmentIds = new Set<number>();
    let totalPeopleCount = 0;
    const seenAppointments = new Set<number>();

    overlappingSlots.forEach(slot => {
      const timeSlotData = dateData.time_slots[slot];
      Object.entries(timeSlotData).forEach(([appointmentId, count]) => {
        const id = parseInt(appointmentId, 10);
        // Skip current appointment
        if (currentAppointmentId && id === currentAppointmentId) {
          return;
        }
        appointmentIds.add(id);
        // Only count people once per appointment
        if (!seenAppointments.has(id)) {
          totalPeopleCount += count;
          seenAppointments.add(id);
        }
      });
    });
    
    return {
      appointment_count: appointmentIds.size,
      people_count: totalPeopleCount
    };
  };

  return (
    <Grid container spacing={3}>
      {/* Appointment Date and Time */}
      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="appointment_date"
          control={control}
          render={({ field }) => {
            // Calculate appointment count for the selected date using the combined data structure
            let appointmentCount = 0;
            
            if (timeSlotDetailsMap && field.value && timeSlotDetailsMap.dates[field.value]) {
              // Get the appointment count from the combined data structure
              appointmentCount = timeSlotDetailsMap.dates[field.value].appointment_count;
              
              // If we have the current appointment ID, check if we need to subtract it
              if (currentAppointmentId) {
                // Check if current appointment is on this date by looking at all time slots
                const dateData = timeSlotDetailsMap.dates[field.value];
                let isCurrentAppointmentOnThisDate = false;
                
                // Look through all time slots to see if any of them contain the current appointment
                Object.values(dateData.time_slots).forEach(timeSlotData => {
                  // NOTE: We use hasOwnProperty to check if the current appointment ID is in the time slot data
                  // This is because some appointments might have 0 dignitaries
                  if (timeSlotData.hasOwnProperty(currentAppointmentId.toString())) {
                    isCurrentAppointmentOnThisDate = true;
                  }
                });
                
                // If current appointment is on this date, subtract 1
                if (isCurrentAppointmentOnThisDate) {
                  appointmentCount = Math.max(0, appointmentCount - 1);
                }
              }
            }
            
            return (
              <TextField
                {...field}
                fullWidth
                label="Appointment Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                error={!!validationErrors.appointment_date}
                helperText={
                  <>
                    {validationErrors.appointment_date || ''}
                    {appointmentCount > 0 && (
                      <Box component="span" sx={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        color: 'primary.main',
                        fontWeight: 'bold'
                      }}>
                        <Alert severity="info" sx={{ mt: 0.5, pl: 1.3, pr: 1.3, pb: 0.5, pt: 0.5, color: 'text.primary', fontWeight: '500', backgroundColor: 'info.light' }}>
                            {appointmentCount} other {appointmentCount === 1 ? 'appointment' : 'appointments'} currently scheduled for this date.
                        </Alert>
                      </Box>
                    )}
                  </>
                }
                onChange={(e) => {
                  field.onChange(e);
                  // Reset appointment time when date changes to avoid conflicts
                  if (field.value !== e.target.value) {
                    setValue('appointment_time', '');
                  }
                }}
              />
            );
          }}
        />
      </Grid>

      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="appointment_time"
          control={control}
          render={({ field }) => {
            const timeOption = findTimeOption(field.value, defaultTimeOptions);
            
            return (
              <>
                <Autocomplete
                  options={defaultTimeOptions}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                  isOptionEqualToValue={(option, value) => 
                    option.value === (typeof value === 'string' ? value : value.value)
                  }
                  value={timeOption}
                  onChange={(_, newValue) => {
                    if (newValue) {
                      // Check if selected time is outside normal hours
                      if (isTimeOffHours(newValue.value)) {
                        setSelectedOffHoursTime(newValue.value);
                        setShowOffHoursWarning(true);
                      } else {
                        // Normal hours, set directly
                        field.onChange(newValue.value);
                      }
                    } else {
                      field.onChange('');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Appointment Time"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      error={!!validationErrors.appointment_time}
                      helperText={
                        <>
                          {validationErrors.appointment_time || ''}
                          {field.value && (() => {
                            // debugLog('field.value', field.value);
                            const occupancyData = getTimeSlotOccupancy(field.value);
                            return occupancyData.appointment_count > 0 ? (
                              <Alert severity="warning" sx={{ mt: 0.5, pl: 1.3, pr: 1.3, pb: 0.5, pt: 0.5, color: 'text.primary', fontWeight: '500', backgroundColor: 'warning.light' }}>
                                This time slot already has {occupancyData.appointment_count} other {occupancyData.people_count === 0 && 'placeholder'} {occupancyData.appointment_count === 1 ? 'appointment' : 'appointments'}
                                {occupancyData.people_count > 0 ? (' with ' + occupancyData.people_count.toString() + (occupancyData.people_count === 1 ? ' dignitary' : ' dignitaries')) : ''} scheduled.
                              </Alert>
                            ) : null;
                          })()}
                        </>
                      }
                    />
                  )}
                  renderOption={(props, option) => {
                    // Check if this time slot has appointments (excluding current appointment)
                    const occupancyData = getTimeSlotOccupancy(option.value, 15);
                    const hasAppointments = occupancyData.appointment_count > 0;
                    const appointmentCount = occupancyData.appointment_count;
                    const peopleCount = occupancyData.people_count;
                    
                    // Check if time is outside normal hours
                    const isOutsideNormalHours = isTimeOffHours(option.value);
                    
                    return (
                      <li 
                        {...props} 
                        style={{
                          ...(props.style || {}),
                          color: isOutsideNormalHours ? '#9e9e9e' : undefined,
                          fontWeight: hasAppointments ? 'bold' : undefined,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>{option.label}</span>
                        {hasAppointments && (
                          <Chip 
                            size="small" 
                            color="primary" 
                            label={`${appointmentCount} ${peopleCount > 0 ? ' (Dignitaries: ' + peopleCount + ')' : ''}`} 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </li>
                    );
                  }}
                  freeSolo={false}
                  disableClearable={false}
                />
                
                {/* Off-hours warning dialog */}
                <Dialog
                  open={showOffHoursWarning}
                  onClose={() => setShowOffHoursWarning(false)}
                >
                  <DialogTitle>Unusual Time Selected</DialogTitle>
                  <DialogContent>
                    <DialogContentText>
                      You've selected a time outside normal appointment hours (8am-10pm).
                      Are you sure you want to schedule an appointment at this time?
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <SecondaryButton onClick={() => setShowOffHoursWarning(false)}>
                      Cancel
                    </SecondaryButton>
                    <PrimaryButton onClick={() => {
                      // Set the field value after confirmation
                      if (selectedOffHoursTime) {
                        const nameField = 'appointment_time';
                        setValue(nameField, selectedOffHoursTime);
                      }
                      setShowOffHoursWarning(false);
                    }}>
                      Confirm
                    </PrimaryButton>
                  </DialogActions>
                </Dialog>
              </>
            );
          }}
        />
      </Grid>


      <Grid item xs={12} md={6} lg={4}>
        <Controller
            name="duration"
            control={control}
            defaultValue={15}
            render={({ field }) => (
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel id="duration-select-label">Duration</InputLabel>
                <Select
                  {...field}
                  labelId="duration-select-label"
                  label="Duration"
                  value={field.value || 15}
                >
                  {durationOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
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

      {/* Meeting Place - Show only when a location is selected */}
      <Grid item xs={12} md={6} lg={4}>
        <Controller
          name="meeting_place_id"
          control={control}
          defaultValue={null}
          render={({ field }) => (
            <FormControl fullWidth error={!!validationErrors.meeting_place_id}>
              <InputLabel>Meeting Place</InputLabel>
              <Select
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  // Convert empty string to null
                  const value = e.target.value === '' ? null : e.target.value;
                  field.onChange(value);
                }}
                label="Meeting Place"
                disabled={!watchLocationId || isLoadingMeetingPlaces}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {meetingPlaces.map((meetingPlace) => (
                  <MenuItem key={meetingPlace.id} value={meetingPlace.id}>
                    {meetingPlace.name}
                    {meetingPlace.is_default && (
                      <Chip
                        label="Default"
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </MenuItem>
                ))}
              </Select>
              {isLoadingMeetingPlaces && watchLocationId && (
                <FormHelperText>Loading meeting places...</FormHelperText>
              )}
              {!isLoadingMeetingPlaces && watchLocationId && meetingPlaces.length === 0 && (
                <FormHelperText>No meeting places available for this location</FormHelperText>
              )}
              {!watchLocationId && (
                <FormHelperText>Select a location first</FormHelperText>
              )}
              {validationErrors.meeting_place_id && (
                <FormHelperText error>{validationErrors.meeting_place_id}</FormHelperText>
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
                value={field.value || ''}
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
          
          <Grid item xs={12}>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 2, 
              justifyContent: {
                xs: 'center',   // Center on phones
                sm: 'center',   // Center on small tablets
                md: 'flex-start' // Left-align on desktop and larger
              }, 
              alignItems: 'center' 
            }}>
              <SecondaryButton
                size="small"
                startIcon={<ContactMailIcon />}
                onClick={handleUploadBusinessCard}
                disabled={uploading || extractionLoading || !onBusinessCardUpload}
              >
                Upload Business Card
              </SecondaryButton>
              <input
                type="file"
                ref={businessCardInputRef}
                style={{ display: 'none' }}
                onChange={handleBusinessCardInputChange}
                accept="image/*"
                multiple
              />
              <SecondaryButton
                size="small"
                startIcon={<PhotoCameraIcon />}
                onClick={handleTakeBusinessCardPhoto}
                disabled={uploading || extractionLoading || !onBusinessCardUpload}
              >
                Take Business Card Photo
              </SecondaryButton>
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
          </Grid>
          
          {/* Business Card Extraction Result */}
          {businessCardExtraction && (
            <BusinessCardExtractionDisplay 
              extraction={businessCardExtraction.extraction}
              onCreateContact={onCreateDignitaryFromBusinessCard}
              onDismiss={onDismissExtraction}
            />
          )}
          
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
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 2, 
                justifyContent: {
                  xs: 'center',   // Center on phones
                  sm: 'center',   // Center on small tablets
                  md: 'flex-start' // Left-align on desktop and larger
                }, 
                alignItems: 'center' 
              }}>
                <SecondaryButton
                  size="small"
                  startIcon={<AttachFileIcon />}
                  onClick={handleChooseFile}
                  disabled={uploading}
                >
                  Choose Files
                </SecondaryButton>
                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileInputChange}
                  multiple
                />
                <SecondaryButton
                  size="small"
                  startIcon={<PhotoCameraIcon />}
                  onClick={handleTakePhoto}
                  disabled={uploading}
                >
                  Take Photo
                </SecondaryButton>
                <input
                  type="file"
                  ref={cameraInputRef}
                  style={{ display: 'none' }}
                  onChange={handleCameraInputChange}
                  accept="image/*"
                  capture="environment"
                  multiple
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              {uploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
            </Grid>
          </Grid>

          {/* Selected Files before upload */}
          {filesToDisplay.length > 0 && handleRemoveFile && (
            <Paper variant="outlined" sx={{ mt: 2, p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Files ({filesToDisplay.length})
              </Typography>
              <List dense>
                {filesToDisplay.map((file, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {file.type.startsWith('image/') ? (
                        <ImageIcon />
                      ) : (
                        <InsertDriveFileIcon />
                      )}
                    </ListItemIcon>
                    <ListItemText primary={file.name} secondary={`${formatFileSize(file.size)}`} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleRemoveFile(index)}>
                        <TrashIconV2 sx={{ width: 20, height: 20 }} />
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
                                  <DownloadIconV2 sx={{ width: 20, height: 20 }} />
                                </IconButton>
                              )}
                              {onDeleteAttachment && (
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete"
                                  onClick={() => onDeleteAttachment(attachment)}
                                  color="error"
                                >
                                  <TrashIconV2 sx={{ width: 20, height: 20 }} />
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
                                  <DownloadIconV2 sx={{ width: 20, height: 20 }} />
                                </IconButton>
                              )}
                              {onDeleteAttachment && (
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete"
                                  onClick={() => onDeleteAttachment(attachment)}
                                  color="error"
                                >
                                  <TrashIconV2 sx={{ width: 20, height: 20 }} />
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
          
          {attachments.length === 0 && filesToDisplay.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">No attachments yet</Typography>
            </Box>
          )}
        </Grid>
      )}
    </Grid>
  );
});

export default AdminAppointmentEditCard; 