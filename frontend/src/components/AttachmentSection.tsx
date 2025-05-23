import React, { useState, useEffect } from 'react';
import { AppointmentAttachment } from '../models/types';
import { Box, Typography, Grid, Paper, Link, Tooltip, Modal, IconButton, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import { useApi } from '../hooks/useApi';

const AttachmentItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  height: '100%',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const ThumbnailContainer = styled(Box)({
  width: '100%',
  height: 150,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 8,
  overflow: 'hidden',
});

const Thumbnail = styled('img')({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
});

const FileIcon = styled(Box)({
  fontSize: 64,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
});

const FileName = styled(Typography)({
  width: '100%',
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

// Modal styles
const ModalContent = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: '1000px',
  maxHeight: '90vh',
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[24],
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}));

const ModalHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

const ModalBody = styled(Box)({
  overflow: 'auto',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
});

const ModalImage = styled('img')({
  maxWidth: '100%',
  maxHeight: '70vh',
  objectFit: 'contain',
});

// Add a loading container
const LoadingContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  width: '100%',
});

// Add cache duration constant (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Add interface for cached thumbnail
interface CachedThumbnail {
  thumbnail: string;
  timestamp: number;
}

// Add interface for thumbnail response
interface ThumbnailResponse {
  id: number;
  thumbnail: string;
}

interface AttachmentSectionProps {
  attachments: AppointmentAttachment[];
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) {
    return <PictureAsPdfIcon fontSize="inherit" color="error" />;
  } else if (fileType.includes('image')) {
    return <ImageIcon fontSize="inherit" color="primary" />;
  } else if (fileType.includes('text') || fileType.includes('document')) {
    return <DescriptionIcon fontSize="inherit" color="info" />;
  } else {
    return <InsertDriveFileIcon fontSize="inherit" color="action" />;
  }
};

const AttachmentSection: React.FC<AttachmentSectionProps> = ({ attachments }) => {
  const api = useApi();
  const [selectedAttachment, setSelectedAttachment] = useState<AppointmentAttachment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Function to get cache key for a thumbnail
  const getThumbnailCacheKey = (appointmentId: number, attachmentId: number) => {
    return `thumbnail_${appointmentId}_${attachmentId}`;
  };

  // Function to check if cached thumbnail is valid
  const isValidCache = (cached: CachedThumbnail) => {
    return cached && (Date.now() - cached.timestamp) < CACHE_DURATION;
  };

  // Load thumbnails when component mounts or attachments change
  useEffect(() => {
    const loadThumbnails = async () => {
      if (!attachments.length || !attachments[0].appointment_id) return;

      const appointmentId = attachments[0].appointment_id;
      const imageAttachments = attachments.filter(attachment => attachment.is_image);
      if (imageAttachments.length === 0) return;

      setLoading(true);

      try {
        // Check cache first
        const uncachedAttachments = imageAttachments.filter(att => {
          const cacheKey = getThumbnailCacheKey(appointmentId, att.id);
          const cached = localStorage.getItem(cacheKey);
          if (!cached) return true;

          const parsedCache = JSON.parse(cached) as CachedThumbnail;
          if (!isValidCache(parsedCache)) {
            localStorage.removeItem(cacheKey);
            return true;
          }

          // Use cached thumbnail
          setThumbnailUrls(prev => ({
            ...prev,
            [att.id]: `data:image/jpeg;base64,${parsedCache.thumbnail}`
          }));
          return false;
        });

        if (uncachedAttachments.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch uncached thumbnails
        const response = await api.get(`/appointments/${appointmentId}/attachments/thumbnails`);
        const thumbnails = response.data as ThumbnailResponse[];

        const newThumbnailUrls: Record<number, string> = {};
        thumbnails.forEach(({ id, thumbnail }) => {
          // Update URLs state
          newThumbnailUrls[id] = `data:image/jpeg;base64,${thumbnail}`;

          // Cache the thumbnail
          const cacheKey = getThumbnailCacheKey(appointmentId, id);
          localStorage.setItem(cacheKey, JSON.stringify({
            thumbnail,
            timestamp: Date.now()
          }));
        });

        setThumbnailUrls(prev => ({ ...prev, ...newThumbnailUrls }));
      } catch (error) {
        console.error('Error loading thumbnails:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThumbnails();

    // Cleanup function
    return () => {
      // Cleanup is handled by the browser for localStorage
      if (fullImageUrl) {
        URL.revokeObjectURL(fullImageUrl);
      }
    };
  }, [attachments, api]);
  
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleAttachmentClick = (attachment: AppointmentAttachment) => {
    if (attachment.is_image) {
      // For images, open in modal and load the full image
      setSelectedAttachment(attachment);
      setModalOpen(true);
      setModalLoading(true);
      
      // Load the full image
      api.get(`/appointments/attachments/${attachment.id}`, {
        responseType: 'blob'
      }).then(response => {
        // Revoke previous URL if exists
        if (fullImageUrl) {
          URL.revokeObjectURL(fullImageUrl);
        }
        
        const url = URL.createObjectURL(response.data as Blob);
        setFullImageUrl(url);
        setModalLoading(false);
      }).catch(error => {
        console.error('Error loading full image:', error);
        setModalLoading(false);
        alert('Failed to load the image. Please try again.');
      });
    } else {
      // For non-images, download the file
      downloadAttachment(attachment);
    }
  };

  const downloadAttachment = async (attachment: AppointmentAttachment) => {
    try {
      // Use the API instance to maintain authentication
      const response = await api.get(`/appointments/attachments/${attachment.id}`, {
        responseType: 'blob'
      });
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download the attachment. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAttachment(null);
  };

  // Function to handle thumbnail loading errors
  const handleThumbnailError = (attachmentId: number) => {
    // Remove the failed thumbnail URL
    setThumbnailUrls(prev => {
      const newUrls = { ...prev };
      delete newUrls[attachmentId];
      return newUrls;
    });
  };

  return (
    <>
      <Box sx={{ mt: 3 }}>
        {/* <Typography variant="h6" gutterBottom>
          Attachments
        </Typography> */}
        <Grid container spacing={2}>
          {attachments.map((attachment) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={attachment.id}>
              <AttachmentItem onClick={() => handleAttachmentClick(attachment)}>
                <ThumbnailContainer>
                  {attachment.is_image ? (
                    loading ? (
                      <LoadingContainer>
                        <CircularProgress size={40} />
                      </LoadingContainer>
                    ) : thumbnailUrls[attachment.id] ? (
                      <Thumbnail 
                        src={thumbnailUrls[attachment.id]} 
                        alt={attachment.file_name}
                        onError={() => handleThumbnailError(attachment.id)}
                      />
                    ) : (
                      <FileIcon>
                        <ImageIcon fontSize="inherit" color="primary" />
                      </FileIcon>
                    )
                  ) : (
                    <FileIcon>
                      {getFileIcon(attachment.file_type)}
                    </FileIcon>
                  )}
                </ThumbnailContainer>
                <Tooltip title={attachment.file_name}>
                  <FileName variant="body2">
                    {attachment.file_name}
                  </FileName>
                </Tooltip>
                <Typography variant="caption" color="textSecondary">
                  Uploaded on {new Date(attachment.created_at).toLocaleDateString()}
                </Typography>
              </AttachmentItem>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Image Viewer Modal */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        aria-labelledby="attachment-modal-title"
      >
        <ModalContent>
          <ModalHeader>
            <Typography id="attachment-modal-title" variant="h6" component="h2">
              {selectedAttachment?.file_name}
            </Typography>
            <IconButton onClick={handleCloseModal} size="small">
              <CloseIcon />
            </IconButton>
          </ModalHeader>
          <ModalBody>
            {modalLoading ? (
              <LoadingContainer>
                <CircularProgress size={60} />
              </LoadingContainer>
            ) : selectedAttachment && fullImageUrl ? (
              <ModalImage
                src={fullImageUrl}
                alt={selectedAttachment.file_name}
              />
            ) : (
              <Typography color="error">Failed to load image</Typography>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default AttachmentSection; 