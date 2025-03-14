import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, Box, Button, CircularProgress, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';

// Types of files that can be displayed in browsers
const VIEWABLE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/svg+xml'
];

// Define location interface
interface Location {
  id: number;
  name: string;
  attachment_name?: string;
  attachment_file_type?: string;
}

const LocationAttachmentView: React.FC = () => {
  const { locationId } = useParams<{ locationId: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const api = useApi();
  
  const [attachmentData, setAttachmentData] = useState<{
    url: string;
    fileName: string;
    fileType: string;
    location: {
      id: number;
      name: string;
    };
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication status
    if (authLoading) {
      return; // Wait for auth to finish loading
    }
    
    if (isAuthenticated === false) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    // If authenticated, fetch location information
    if (isAuthenticated && locationId) {
      fetchLocationInfo();
    }
  }, [isAuthenticated, authLoading, locationId, navigate]);

  const fetchLocationInfo = async () => {
    try {
      setLoading(true);
      // First get location details to check if it has an attachment
      const response = await api.get(`/locations/${locationId}`);
      const location = response.data as Location;
      
      if (!location.attachment_name) {
        setError('This location does not have any attachment.');
        setLoading(false);
        return;
      }
      
      // Get the base URL from the api instance
      const baseURL = api.defaults.baseURL || '';
      
      // Set the attachment data
      setAttachmentData({
        url: `${baseURL}/locations/${locationId}/attachment`,
        fileName: location.attachment_name || 'file',
        fileType: location.attachment_file_type || 'application/octet-stream',
        location: {
          id: location.id,
          name: location.name
        }
      });
      
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load attachment information');
      setLoading(false);
    }
  };

  const downloadAttachment = () => {
    if (attachmentData) {
      window.open(attachmentData.url, '_blank');
    }
  };

  const isViewableInBrowser = () => {
    return attachmentData && VIEWABLE_MIME_TYPES.includes(attachmentData.fileType);
  };

  if (authLoading || loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" mt={2}>Loading attachment...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h1">
            {attachmentData?.location.name} - Attachment
          </Typography>
          <Box>
            <Button
              startIcon={<ArrowBackIcon />}
              variant="outlined"
              onClick={() => navigate(-1)}
              sx={{ mr: 1 }}
            >
              Go Back
            </Button>
            <Button
              startIcon={<DownloadIcon />}
              variant="contained"
              onClick={downloadAttachment}
            >
              Download
            </Button>
          </Box>
        </Box>

        <Typography variant="body1" gutterBottom>
          <strong>File Name:</strong> {attachmentData?.fileName}
        </Typography>

        {isViewableInBrowser() ? (
          <Box mt={3} sx={{ width: '100%', height: '70vh', overflow: 'auto' }}>
            {attachmentData?.fileType.startsWith('image/') ? (
              <img 
                src={attachmentData.url} 
                alt={attachmentData.fileName} 
                style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
              />
            ) : (
              <iframe 
                src={attachmentData?.url} 
                width="100%" 
                height="100%" 
                title={attachmentData?.fileName || 'attachment'}
                style={{ border: 'none' }}
              />
            )}
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            This file type ({attachmentData?.fileType}) cannot be previewed in the browser. Please use the download button to view it.
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default LocationAttachmentView; 