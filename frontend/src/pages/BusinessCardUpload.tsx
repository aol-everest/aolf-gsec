import React, { useState, useRef, useEffect } from 'react';
import {
  Typography,
  Container,
  Box,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  useTheme,
  Snackbar,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import Layout from '../components/Layout';
import { useApi } from '../hooks/useApi';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import { HomeRoute } from '../config/routes';

interface BusinessCardExtraction {
  honorific_title?: string;
  first_name: string;
  last_name: string;
  title?: string;
  company?: string;
  primary_domain?: string;
  primary_domain_other?: string;
  phone?: string;
  other_phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  street_address?: string;
  city?: string;
  state?: string;
  country?: string;
  has_dignitary_met_gurudev?: boolean;
  bio?: string;
  social_media?: Record<string, string>;
  additional_info?: Record<string, string>;
  secretariat_notes?: string;
  file_path?: string;
  file_name?: string;
  file_type?: string;
  is_image?: boolean;
  thumbnail_path?: string;
  attachment_uuid?: string;
}

interface BusinessCardExtractionResponse {
  extraction: BusinessCardExtraction;
  attachment_uuid: string;
}

interface DignitaryResponse {
  id: number;
  first_name: string;
  last_name: string;
  // Add other fields as needed
}

const BusinessCardUpload: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const api = useApi();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [extraction, setExtraction] = useState<BusinessCardExtraction | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [honorificTitleOptions, setHonorificTitleOptions] = useState<string[]>([]);
  const [primaryDomainOptions, setPrimaryDomainOptions] = useState<string[]>([]);
  const [showDomainOther, setShowDomainOther] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdDignitaryId, setCreatedDignitaryId] = useState<number | null>(null);
  const [createdDignitaryName, setCreatedDignitaryName] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [socialMediaEntries, setSocialMediaEntries] = useState<{key: string; value: string}[]>([]);
  const [additionalInfoEntries, setAdditionalInfoEntries] = useState<{key: string; value: string}[]>([]);
  const [newSocialMediaKey, setNewSocialMediaKey] = useState('');
  const [newSocialMediaValue, setNewSocialMediaValue] = useState('');
  const [newAdditionalInfoKey, setNewAdditionalInfoKey] = useState('');
  const [newAdditionalInfoValue, setNewAdditionalInfoValue] = useState('');

  // Fetch honorific title and primary domain options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [honorificResponse, domainResponse] = await Promise.all([
          api.get<string[]>('/dignitaries/honorific-title-options'),
          api.get<string[]>('/dignitaries/primary-domain-options'),
        ]);
        
        setHonorificTitleOptions(honorificResponse.data);
        setPrimaryDomainOptions(domainResponse.data);
      } catch (error) {
        console.error('Failed to fetch dropdown options:', error);
        enqueueSnackbar('Failed to load form options', { variant: 'error' });
      }
    };
    
    fetchOptions();
  }, [enqueueSnackbar, api]);

  // Update showDomainOther when extraction changes
  useEffect(() => {
    if (extraction?.primary_domain === 'Other') {
      setShowDomainOther(true);
    }
  }, [extraction]);

  // Update dictionary entries when extraction changes
  useEffect(() => {
    if (extraction) {
      // Convert social_media dictionary to array of key-value entries
      if (extraction.social_media) {
        const entries = Object.entries(extraction.social_media).map(([key, value]) => ({
          key,
          value: value || ''
        }));
        setSocialMediaEntries(entries);
      } else {
        setSocialMediaEntries([]);
      }
      
      // Convert additional_info dictionary to array of key-value entries
      if (extraction.additional_info) {
        const entries = Object.entries(extraction.additional_info).map(([key, value]) => ({
          key,
          value: value || ''
        }));
        setAdditionalInfoEntries(entries);
      } else {
        setAdditionalInfoEntries([]);
      }
    }
  }, [extraction]);

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleTakePhoto = () => {
    cameraInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setExtraction(null);
    
    try {
      // Create preview URL
      const fileUrl = URL.createObjectURL(file);
      setPreviewUrl(fileUrl);
      
      // Upload the file and extract data
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post<BusinessCardExtractionResponse>(
        '/admin/business-card/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      setExtraction(response.data.extraction);
      enqueueSnackbar('Business card information extracted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error uploading business card:', error);
      enqueueSnackbar('Failed to process business card', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (extraction) {
      setExtraction({ ...extraction, [name]: value });
    }
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const name = e.target.name as string;
    const value = e.target.value;
    
    if (extraction) {
      setExtraction({ ...extraction, [name]: value });
      
      if (name === 'primary_domain') {
        setShowDomainOther(value === 'Other');
      }
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (extraction) {
      setExtraction({ ...extraction, [name]: checked });
    }
  };

  // Update extraction with the latest entries before submitting
  const updateDictionariesInExtraction = () => {
    if (!extraction) return null;
    
    // Convert social media entries back to dictionary
    const socialMediaDict: Record<string, string> = {};
    socialMediaEntries.forEach(entry => {
      if (entry.key && entry.key.trim() !== '') {
        socialMediaDict[entry.key] = entry.value;
      }
    });
    
    // Convert additional info entries back to dictionary
    const additionalInfoDict: Record<string, string> = {};
    additionalInfoEntries.forEach(entry => {
      if (entry.key && entry.key.trim() !== '') {
        additionalInfoDict[entry.key] = entry.value;
      }
    });
    
    // Return the updated extraction object instead of updating state
    return {
      ...extraction,
      social_media: socialMediaDict,
      additional_info: additionalInfoDict
    };
  };
  
  // Add new social media entry
  const handleAddSocialMedia = () => {
    if (newSocialMediaKey.trim() === '') return;
    
    setSocialMediaEntries([
      ...socialMediaEntries,
      { key: newSocialMediaKey, value: newSocialMediaValue }
    ]);
    
    setNewSocialMediaKey('');
    setNewSocialMediaValue('');
  };
  
  // Add new additional info entry
  const handleAddAdditionalInfo = () => {
    if (newAdditionalInfoKey.trim() === '') return;
    
    setAdditionalInfoEntries([
      ...additionalInfoEntries,
      { key: newAdditionalInfoKey, value: newAdditionalInfoValue }
    ]);
    
    setNewAdditionalInfoKey('');
    setNewAdditionalInfoValue('');
  };
  
  // Update social media entry
  const handleUpdateSocialMedia = (index: number, field: 'key' | 'value', value: string) => {
    const updatedEntries = [...socialMediaEntries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      [field]: value
    };
    setSocialMediaEntries(updatedEntries);
  };
  
  // Update additional info entry
  const handleUpdateAdditionalInfo = (index: number, field: 'key' | 'value', value: string) => {
    const updatedEntries = [...additionalInfoEntries];
    updatedEntries[index] = {
      ...updatedEntries[index],
      [field]: value
    };
    setAdditionalInfoEntries(updatedEntries);
  };
  
  // Remove social media entry
  const handleRemoveSocialMedia = (index: number) => {
    const updatedEntries = [...socialMediaEntries];
    updatedEntries.splice(index, 1);
    setSocialMediaEntries(updatedEntries);
  };
  
  // Remove additional info entry
  const handleRemoveAdditionalInfo = (index: number) => {
    const updatedEntries = [...additionalInfoEntries];
    updatedEntries.splice(index, 1);
    setAdditionalInfoEntries(updatedEntries);
  };

  const handleSaveDignitaryClick = async () => {
    if (!extraction) return;
    
    // Get updated extraction with dictionaries
    const updatedExtraction = updateDictionariesInExtraction();
    if (!updatedExtraction) return;
    
    try {
      setSaveInProgress(true);
      
      // Use the updated extraction for the API call
      const response = await api.post<DignitaryResponse>('/admin/business-card/create-dignitary', updatedExtraction);
      
      if (response.data && response.data.id) {
        setCreatedDignitaryId(response.data.id);
        const fullName = `${response.data.first_name} ${response.data.last_name}`;
        setCreatedDignitaryName(fullName);
        setSuccessMessage(`Dignitary "${fullName}" has been created successfully with ID: ${response.data.id}`);
        
        // Clear the form data but keep success message
        setExtraction(null);
        setPreviewUrl(null);
        setSocialMediaEntries([]);
        setAdditionalInfoEntries([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error creating dignitary:', error);
      enqueueSnackbar('Failed to create dignitary', { variant: 'error' });
    } finally {
      setSaveInProgress(false);
    }
  };

  const handleResetForm = () => {
    setExtraction(null);
    setPreviewUrl(null);
    setSocialMediaEntries([]);
    setAdditionalInfoEntries([]);
    setNewSocialMediaKey('');
    setNewSocialMediaValue('');
    setNewAdditionalInfoKey('');
    setNewAdditionalInfoValue('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    setSuccessMessage(null);
    setCreatedDignitaryId(null);
    setCreatedDignitaryName(null);
  };

  const handleGoHome = () => {
    navigate(HomeRoute.path || '/home');
  };

  const renderFileUploadSection = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upload Business Card
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ContactMailIcon />}
            onClick={handleChooseFile}
            disabled={uploading}
          >
            Choose Business Card
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
            accept="image/*"
          />
          <input
            type="file"
            ref={cameraInputRef}
            style={{ display: 'none' }}
            onChange={handleCameraInputChange}
            accept="image/*"
            capture="environment"
          />
          
          {uploading && <CircularProgress size={24} sx={{ ml: 2 }} />}
        </Box>
        
        {previewUrl && (
          <Box sx={{ maxWidth: 400, mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Business Card Preview:
            </Typography>
            <img 
              src={previewUrl} 
              alt="Business Card Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: 300, 
                objectFit: 'contain',
                border: `1px solid ${theme.palette.divider}`
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderExtractionForm = () => {
    if (!extraction) return null;
    
    return (
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Edit Dignitary Information
            </Typography>
            <Button 
              variant="outlined" 
              color="secondary" 
              onClick={handleResetForm}
              startIcon={<ArrowBackIcon />}
            >
              Upload Different Card
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Basic Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Honorific Title</InputLabel>
                <Select
                  name="honorific_title"
                  value={extraction.honorific_title || '(Not Applicable)'}
                  label="Honorific Title"
                  onChange={handleSelectChange}
                >
                  {honorificTitleOptions.map((title) => (
                    <MenuItem key={title} value={title}>
                      {title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4.5}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={extraction.first_name || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4.5}>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={extraction.last_name || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={extraction.email || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={extraction.phone || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Other Phone"
                name="other_phone"
                value={extraction.other_phone || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Fax"
                name="fax"
                value={extraction.fax || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            {/* Professional Information */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }} gutterBottom>
                Professional Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title / Position"
                name="title"
                value={extraction.title || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Organization / Company"
                name="company"
                value={extraction.company || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Primary Domain</InputLabel>
                <Select
                  name="primary_domain"
                  value={extraction.primary_domain || ''}
                  label="Primary Domain"
                  onChange={handleSelectChange}
                >
                  {primaryDomainOptions.map((domain) => (
                    <MenuItem key={domain} value={domain}>
                      {domain}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {showDomainOther && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Specify Domain"
                  name="primary_domain_other"
                  value={extraction.primary_domain_other || ''}
                  onChange={handleInputChange}
                />
              </Grid>
            )}
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Website / LinkedIn"
                name="website"
                value={extraction.website || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            {/* Address Information */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }} gutterBottom>
                Location Information
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                name="street_address"
                value={extraction.street_address || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={extraction.city || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State / Province"
                name="state"
                value={extraction.state || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Country"
                name="country"
                value={extraction.country || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            {/* Additional Information */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }} gutterBottom>
                Additional Information
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Bio"
                name="bio"
                value={extraction.bio || ''}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Secretariat Notes"
                name="secretariat_notes"
                value={extraction.secretariat_notes || ''}
                onChange={handleInputChange}
                placeholder="Add additional notes for secretariat use"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={extraction.has_dignitary_met_gurudev || false}
                    onChange={handleCheckboxChange}
                    name="has_dignitary_met_gurudev"
                    color="primary"
                  />
                }
                label="Has met Gurudev"
              />
            </Grid>
            
            {/* Social Media Section */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }} gutterBottom>
                Social Media Profiles
              </Typography>
            </Grid>
            
            {socialMediaEntries.map((entry, index) => (
              <Grid item xs={12} key={`social-media-${index}`} container spacing={1} alignItems="center">
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Platform"
                    value={entry.key}
                    onChange={(e) => handleUpdateSocialMedia(index, 'key', e.target.value)}
                    placeholder="e.g., Twitter, LinkedIn"
                  />
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Profile"
                    value={entry.value}
                    onChange={(e) => handleUpdateSocialMedia(index, 'value', e.target.value)}
                    placeholder="e.g., username or URL"
                  />
                </Grid>
                <Grid item xs={2}>
                  <IconButton color="error" onClick={() => handleRemoveSocialMedia(index)}>
                    <CloseIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            
            <Grid item xs={12} container spacing={1} alignItems="center">
              <Grid item xs={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="New Platform"
                  value={newSocialMediaKey}
                  onChange={(e) => setNewSocialMediaKey(e.target.value)}
                  placeholder="e.g., Twitter, LinkedIn"
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="New Profile"
                  value={newSocialMediaValue}
                  onChange={(e) => setNewSocialMediaValue(e.target.value)}
                  placeholder="e.g., username or URL"
                />
              </Grid>
              <Grid item xs={2}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddSocialMedia}
                  disabled={!newSocialMediaKey.trim()}
                >
                  Add
                </Button>
              </Grid>
            </Grid>
            
            {/* Additional Info Section */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Divider />
              <Typography variant="subtitle1" color="primary" sx={{ mt: 2 }} gutterBottom>
                Additional Details
              </Typography>
            </Grid>
            
            {additionalInfoEntries.map((entry, index) => (
              <Grid item xs={12} key={`additional-info-${index}`} container spacing={1} alignItems="center">
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Field"
                    value={entry.key}
                    onChange={(e) => handleUpdateAdditionalInfo(index, 'key', e.target.value)}
                    placeholder="e.g., Language, Interests"
                  />
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Value"
                    value={entry.value}
                    onChange={(e) => handleUpdateAdditionalInfo(index, 'value', e.target.value)}
                  />
                </Grid>
                <Grid item xs={2}>
                  <IconButton color="error" onClick={() => handleRemoveAdditionalInfo(index)}>
                    <CloseIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            
            <Grid item xs={12} container spacing={1} alignItems="center">
              <Grid item xs={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="New Field"
                  value={newAdditionalInfoKey}
                  onChange={(e) => setNewAdditionalInfoKey(e.target.value)}
                  placeholder="e.g., Language, Interests"
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="New Value"
                  value={newAdditionalInfoValue}
                  onChange={(e) => setNewAdditionalInfoValue(e.target.value)}
                />
              </Grid>
              <Grid item xs={2}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddAdditionalInfo}
                  disabled={!newAdditionalInfoKey.trim()}
                >
                  Add
                </Button>
              </Grid>
            </Grid>
            
            {/* Submit Button */}
            <Grid item xs={12} sx={{ mt: 2, textAlign: 'right' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSaveDignitaryClick}
                disabled={saveInProgress || !extraction.first_name || !extraction.last_name}
              >
                {saveInProgress ? <CircularProgress size={24} /> : 'Create Dignitary'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderSuccessSection = () => {
    if (!successMessage) return null;
    
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
            <Typography variant="h6" color="success.dark" gutterBottom align="center">
              Success!
            </Typography>
            <Typography variant="body1" color="text.primary" paragraph align="center">
              {successMessage}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
              >
                Home
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleResetForm}
              >
                Upload Another Business Card
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <Container maxWidth="lg">
        <Box>
          <Typography variant="h4" gutterBottom>
            Business Card Upload
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Upload a business card to extract dignitary information and create a new dignitary record.
          </Typography>
          
          {renderSuccessSection()}
          {!successMessage && renderFileUploadSection()}
          {!successMessage && renderExtractionForm()}
        </Box>
      </Container>
    </Layout>
  );
};

export default BusinessCardUpload; 