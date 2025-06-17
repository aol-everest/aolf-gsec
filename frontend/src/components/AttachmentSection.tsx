import React, { useState, useEffect } from 'react';
import { AppointmentAttachment } from '../models/types';
import { Box, Typography, Grid, Paper, Tooltip, Modal, IconButton, CircularProgress, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PreviewIcon from '@mui/icons-material/Preview';
import { useApi } from '../hooks/useApi';
import { CloseIconFilledCircleV2, DownloadFilledIconV2, EyeFilledIconV2, GenericFileIconV2, ImageIconV2, PDFIconV2, TextFileIconV2 } from './iconsv2';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

const AttachmentItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  height: '100%',
  position: 'relative',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
    '& .attachment-actions': {
      opacity: 1,
    },
  },
}));

const AttachmentActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  opacity: 0,
  transition: 'opacity 0.2s',
  zIndex: 1,
}));

const ActionButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  width: 32,
  height: 32,
  '&:hover': {
    backgroundColor: theme.palette.grey[100],
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
  width: '90%',
  maxWidth: '1200px',
  maxHeight: '95vh',
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
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const ModalActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'center',
}));

const ModalBody = styled(Box)({
  overflow: 'auto',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  minHeight: '400px',
});

const ModalImage = styled('img')({
  maxWidth: '100%',
  maxHeight: '75vh',
  objectFit: 'contain',
});

const PdfViewer = styled('iframe')({
  width: '100%',
  height: '75vh',
  border: 'none',
  borderRadius: '4px',
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
    return <PDFIconV2 fontSize="inherit" color="error" />;
  } else if (fileType.includes('image')) {
    return <ImageIconV2 fontSize="inherit" color="primary" />;
  } else if (fileType.includes('text') || fileType.includes('document')) {
    return <TextFileIconV2 fontSize="inherit" color="info" />;
  } else {
    return <GenericFileIconV2 fontSize="inherit" color="action" />;
  }
};

const AttachmentSection: React.FC<AttachmentSectionProps> = ({ attachments }) => {
  const api = useApi();
  const [selectedAttachment, setSelectedAttachment] = useState<AppointmentAttachment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [fullFileUrl, setFullFileUrl] = useState<string | null>(null);
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

  // Function to check if file type can be previewed
  const canPreviewFile = (fileType: string) => {
    return fileType.includes('image') || fileType.includes('pdf');
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
      if (fullFileUrl) {
        URL.revokeObjectURL(fullFileUrl);
      }
    };
  }, [attachments, api]);
  
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handlePreviewClick = (attachment: AppointmentAttachment, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!canPreviewFile(attachment.file_type)) {
      return;
    }

    setSelectedAttachment(attachment);
    setModalOpen(true);
    setModalLoading(true);
    
    // Load the full file
    api.get(`/appointments/attachments/${attachment.id}`, {
      responseType: 'blob'
    }).then(response => {
      // Revoke previous URL if exists
      if (fullFileUrl) {
        URL.revokeObjectURL(fullFileUrl);
      }
      
      const url = URL.createObjectURL(response.data as Blob);
      setFullFileUrl(url);
      setModalLoading(false);
    }).catch(error => {
      console.error('Error loading file:', error);
      setModalLoading(false);
      alert('Failed to load the file. Please try again.');
    });
  };

  const handleDownloadClick = (attachment: AppointmentAttachment, event: React.MouseEvent) => {
    event.stopPropagation();
    downloadAttachment(attachment);
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
    if (fullFileUrl) {
      URL.revokeObjectURL(fullFileUrl);
      setFullFileUrl(null);
    }
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

  const renderModalContent = () => {
    if (modalLoading) {
      return (
        <LoadingContainer>
          <CircularProgress size={60} />
        </LoadingContainer>
      );
    }

    if (!selectedAttachment || !fullFileUrl) {
      return (
        <Typography color="error" sx={{ textAlign: 'center' }}>
          Failed to load file
        </Typography>
      );
    }

    if (selectedAttachment.is_image) {
      return (
        <ModalImage
          src={fullFileUrl}
          alt={selectedAttachment.file_name}
        />
      );
    } else if (selectedAttachment.file_type.includes('pdf')) {
      return (
        <Box sx={{ width: '100%', height: '75vh', display: 'flex', flexDirection: 'column' }}>
          <PdfViewer
            src={`${fullFileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            title={selectedAttachment.file_name}
            onError={() => {
              // Fallback: open PDF in new tab if iframe fails
              window.open(fullFileUrl, '_blank');
            }}
          />
          <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}>
            If the PDF doesn't display properly, try the download button above or it will open in a new tab.
          </Typography>
        </Box>
      );
    }

    return (
      <Typography color="error" sx={{ textAlign: 'center' }}>
        Preview not available for this file type
      </Typography>
    );
  };

  return (
    <>
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={2}>
          {attachments.map((attachment) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={attachment.id}>
              <AttachmentItem>
                <AttachmentActions className="attachment-actions">
                  {canPreviewFile(attachment.file_type) && (
                    <Tooltip title="Preview">
                      <ActionButton
                        size="small"
                        onClick={(e) => handlePreviewClick(attachment, e)}
                      >
                        <EyeFilledIconV2 fontSize="small" />
                      </ActionButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Download">
                    <ActionButton
                      size="small"
                      onClick={(e) => handleDownloadClick(attachment, e)}
                    >
                      <DownloadFilledIconV2 fontSize="small" />
                    </ActionButton>
                  </Tooltip>
                </AttachmentActions>

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

      {/* File Viewer Modal */}
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
            <ModalActions>
              <PrimaryButton
                startIcon={<DownloadFilledIconV2 />}
                size="small"
                onClick={() => selectedAttachment && downloadAttachment(selectedAttachment)}
              >
                Download
              </PrimaryButton>
              <IconButton onClick={handleCloseModal} size="small">
                <CloseIconFilledCircleV2 />
              </IconButton>
            </ModalActions>
          </ModalHeader>
          <ModalBody>
            {renderModalContent()}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default AttachmentSection; 