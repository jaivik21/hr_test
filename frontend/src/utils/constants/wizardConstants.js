// Interview Wizard Step Keys
export const WIZARD_STEP_KEYS = {
  BASIC_INFO: 'basic_info',
  JOB_DESCRIPTION: 'job_description',
  INTERVIEW_MODE: 'interview_mode',
  REVIEW: 'review',
};

// Wizard Layout Constants
export const WIZARD_LAYOUT = {
  MOBILE_BREAKPOINT: 1000,
  CONTENT_MAX_HEIGHT: 'calc(100vh - 250px)',
  FOOTER_PADDING: '120px',
};

// Wizard Button Styles
export const WIZARD_BUTTON_STYLES = {
  BASE: {
    h: '44px',
    px: '16px',
    fontSize: '16px',
    fontWeight: '500',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  OUTLINE: {
    bg: 'white',
    borderColor: 'primary.500',
    borderWidth: '1px',
    color: 'primary.500',
    _hover: { bg: 'primary.50', borderColor: 'primary.600' },
  },
  PRIMARY: {
    bg: 'primary.500',
    color: 'white',
    _hover: { bg: 'primary.600' },
  },
};

// Wizard Steps Configuration
export const WIZARD_STEPS = [
  {
    title: 'Basic Info',
    description: 'Provide basic info',
    key: WIZARD_STEP_KEYS.BASIC_INFO,
  },
  {
    title: 'Job Description',
    description: 'Provide job description',
    key: WIZARD_STEP_KEYS.JOB_DESCRIPTION,
  },
  {
    title: 'Interview Mode',
    description: 'Select how questions will be generated',
    key: WIZARD_STEP_KEYS.INTERVIEW_MODE,
  },
  {
    title: 'Review',
    description: 'Review of Interview',
    key: WIZARD_STEP_KEYS.REVIEW,
  },
];

export default {
  WIZARD_STEP_KEYS,
  WIZARD_LAYOUT,
  WIZARD_BUTTON_STYLES,
  WIZARD_STEPS,
};
