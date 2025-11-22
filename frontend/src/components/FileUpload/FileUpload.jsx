import { useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Image, Input, Text } from '@chakra-ui/react';
import { showToast } from '../Toast/ShowToast';
import FILE_UPLOAD from '../../utils/constants/fileUploadConstants';

const FileUpload = ({
  onFileChange,
  acceptedFileType = FILE_UPLOAD.ALLOWED_FILE_TYPE,
  fileAccept = FILE_UPLOAD.FILE_ACCEPT,
  maxFileSize = FILE_UPLOAD.MAX_FILE_SIZE,
  uploadIcon,
  iconAlt = 'Upload',
  iconWidth = FILE_UPLOAD.STYLING.UPLOAD_ICON_WIDTH,
  iconHeight = FILE_UPLOAD.STYLING.UPLOAD_ICON_HEIGHT,
  tooltip = FILE_UPLOAD.LABELS.UPLOAD_JD_TOOLTIP,
  showFileInfo = true,
  uploadedFile = null,
  invalidFileTitle = FILE_UPLOAD.TOAST.INVALID_FILE_TITLE,
  invalidFileMessage = FILE_UPLOAD.TOAST.INVALID_FILE_MESSAGE,
  fileTooLargeTitle = FILE_UPLOAD.TOAST.FILE_TOO_LARGE_TITLE,
  fileTooLargeMessage = FILE_UPLOAD.TOAST.FILE_TOO_LARGE_MESSAGE,
  fileUploadedTitle = FILE_UPLOAD.TOAST.FILE_UPLOADED_TITLE,
  fileUploadedMessage = fileName =>
    FILE_UPLOAD.TOAST.FILE_UPLOADED_MESSAGE(fileName),
  showSuccessToast = true,
  ...otherProps
}) => {
  const fileInputRef = useRef(null);

  const handleFileUpload = event => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type - check MIME type or file extension
      if (acceptedFileType) {
        // If acceptedFileType is provided, validate MIME type
        if (file.type !== acceptedFileType) {
          showToast('error', invalidFileTitle, invalidFileMessage);
          return;
        }
      } else if (fileAccept) {
        // If fileAccept is provided (like .csv,.xlsx), validate file extension
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        const acceptedExtensions = fileAccept
          .split(',')
          .map(ext => ext.trim().toLowerCase());
        if (!acceptedExtensions.includes(fileExtension)) {
          showToast('error', invalidFileTitle, invalidFileMessage);
          return;
        }
      }

      // Validate file size
      if (file.size > maxFileSize) {
        showToast('error', fileTooLargeTitle, fileTooLargeMessage);
        return;
      }

      // Call the callback with the file
      if (onFileChange) {
        onFileChange(file);
      }

      // Show success toast only if enabled
      if (showSuccessToast) {
        showToast('success', fileUploadedTitle, fileUploadedMessage(file.name));
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box {...otherProps}>
      <Image
        src={uploadIcon}
        alt={iconAlt}
        w={iconWidth}
        h={iconHeight}
        cursor="pointer"
        transition="all 0.2s"
        _hover={{ opacity: 0.7, transform: 'scale(1.1)' }}
        onClick={handleUploadClick}
        title={tooltip}
      />

      {/* Hidden File Input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept={fileAccept}
        onChange={handleFileUpload}
        display="none"
      />

      {/* Show uploaded file name */}
      {showFileInfo && uploadedFile && (
        <Text fontSize="sm" color="green.600" mt="8px">
          📄 {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
        </Text>
      )}
    </Box>
  );
};

FileUpload.propTypes = {
  onFileChange: PropTypes.func.isRequired,
  acceptedFileType: PropTypes.string,
  fileAccept: PropTypes.string,
  maxFileSize: PropTypes.number,
  uploadIcon: PropTypes.any.isRequired,
  iconAlt: PropTypes.string,
  iconWidth: PropTypes.string,
  iconHeight: PropTypes.string,
  tooltip: PropTypes.string,
  showFileInfo: PropTypes.bool,
  uploadedFile: PropTypes.object,
  invalidFileTitle: PropTypes.string,
  invalidFileMessage: PropTypes.string,
  fileTooLargeTitle: PropTypes.string,
  fileTooLargeMessage: PropTypes.string,
  fileUploadedTitle: PropTypes.string,
  fileUploadedMessage: PropTypes.func,
  showSuccessToast: PropTypes.bool,
};

export default FileUpload;
