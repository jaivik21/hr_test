// File Upload Constants
export const FILE_UPLOAD = {
  // File Type
  ALLOWED_FILE_TYPE: 'application/pdf',
  FILE_ACCEPT: '.pdf',

  // File Size (in bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILE_SIZE_MB: 10,

  // Toast Messages
  TOAST: {
    INVALID_FILE_TITLE: 'Invalid File',
    INVALID_FILE_MESSAGE: 'Please upload a PDF file',
    FILE_TOO_LARGE_TITLE: 'File Too Large',
    FILE_TOO_LARGE_MESSAGE: 'File size should not exceed 10MB',
    FILE_UPLOADED_TITLE: 'File Uploaded',
    FILE_UPLOADED_MESSAGE: fileName => `${fileName} uploaded successfully`,
  },

  // Labels
  LABELS: {
    DESCRIPTION: 'Description',
    JOB_DESCRIPTION: 'Job Description',
    UPLOAD_JD_TOOLTIP: 'Upload Job Description (PDF)',
  },

  // Styling
  STYLING: {
    TEXTAREA_MIN_HEIGHT: '400px',
    TEXTAREA_FONT_SIZE: '14px',
    UPLOAD_ICON_WIDTH: '24px',
    UPLOAD_ICON_HEIGHT: '24px',
  },
};

export default FILE_UPLOAD;
