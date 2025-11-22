// Interview Mode Constants
export const INTERVIEW_MODE = {
  AUTOMATED: 'automated',
  MANUAL: 'manual',
};

export const AUTOMATED_OPTION = {
  PREDEFINED: 'predefined',
  DYNAMIC: 'dynamic',
};

export const MODE_STYLES = {
  CONTAINER_PADDING: '16px',
  CONTAINER_BORDER_RADIUS: '10px',
  OPTION_PADDING: '12px 14px',
  OPTION_BORDER_RADIUS: '8px',
  PAGINATION_BUTTON_SIZE: '28px',
  PAGE_SELECT_WIDTH: '64px',
};

export const MODE_COLORS = {
  BORDER: '#C7D2FE',
  BACKGROUND: '#EEF1FF',
  TEXTAREA_BORDER: '#DADCE0',
  DIVIDER: '#E5E7EB',
};

export const TOAST_MESSAGES = {
  INTERVIEW_ID_NOT_FOUND:
    'Interview ID not found. Please complete previous steps.',
  QUESTIONS_GENERATED: 'Questions generated successfully',
  QUESTIONS_GENERATE_FAILED: 'Failed to generate questions',
  MODE_UPDATED: 'Interview mode updated successfully',
  MODE_UPDATE_FAILED: 'Failed to update interview mode',
  VALIDATION_ERROR: 'Please complete all required fields',
  SELECT_MODE: 'Please select a mode',
  CHOOSE_OPTION: 'Choose Predefined or Dynamic',
  FILL_QUESTIONS: 'Please fill all questions',
};

// Automated Options Configuration
export const AUTOMATED_OPTIONS = [
  {
    key: AUTOMATED_OPTION.PREDEFINED,
    title: 'Predefined',
    description: 'Choose from existing question templates.',
  },
  {
    key: AUTOMATED_OPTION.DYNAMIC,
    title: 'Dynamic',
    description: 'AI will generate new questions based on the job description.',
  },
];

export default {
  INTERVIEW_MODE,
  AUTOMATED_OPTION,
  MODE_STYLES,
  MODE_COLORS,
  TOAST_MESSAGES,
  AUTOMATED_OPTIONS,
};
