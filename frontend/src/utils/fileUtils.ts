
// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};

const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

const isPdfFile = (file: File): boolean => {
  return file.type === 'application/pdf';
};

export { formatFileSize, getFileExtension, isImageFile, isPdfFile };
