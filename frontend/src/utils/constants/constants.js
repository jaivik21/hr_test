// Fixed theme colors based on Figma design (Accurate hex codes from Figma)
export const themeColor = {
  // Primary colors
  PRIMARY_COLOR: '#2A2B67', // Primary from Figma
  SECONDARY_COLOR: '#C7D2FE', // Secondary from Figma
  ACCENT_COLOR: '#35E6FF', // Accent from Figma

  // Status colors
  SUCCESS_COLOR: '#00A123', // Success from Figma
  WARNING_COLOR: '#FF8800', // Warning from Figma
  ERROR_COLOR: '#C70600', // Error from Figma
  DANGER_COLOR: '#C70600', // Alias for error (same as ERROR_COLOR)
  INFO_COLOR: '#3B82F6', // Info (kept for compatibility)

  // Background colors
  BG_COLOR: '#F9FAFB', // Bg from Figma
  PALE_SKY_COLOR: '#F5F7FA', // Light gray-blue (kept for compatibility)
  RIVER_BED_COLOR: '#475569', // Dark gray (kept for compatibility)
  BG_SUCCESS_COLOR: '#D4FFE6',
  BG_CLOSE_COLOR: '#E6E6E6',

  // Text colors
  PRIMARY_TEXT_COLOR: '#12121A', // Primary Text Color from Figma
  SECONDARY_TEXT_COLOR: '#575757', // Secondary Text Color from Figma
  LIGHT_TEXT_COLOR: '#9B9B9B', // Light Text Color from Figma
  QUESTION_COUNT_COLOR: '#DA7F00',

  // Border/Stroke colors
  STROKE_COLOR: '#CFCFCF', // Stroke Color from Figma

  // Utility colors
  WHITE_COLOR: '#FFFFFF', // White from Figma
  LIGHT_COLOR: '#F9FAFB', // Same as BG_COLOR
  DARK_COLOR: '#0F172A', // Dark (kept for compatibility)

  TAG_BG_COLOR: '#EEF1FF', // Border Color from Figma

  BG_COLOR_ORANGE: '#FFF5E9',
};

// Responsive style constants for visualization components
export const RESPONSIVE_STYLES = {
  cardPadding: { base: '1rem', md: '1.5rem' },
  cardTitleSize: { base: 'sm', md: 'md' },
  cardValueSize: { base: 'xl', md: '2xl' },
  chartHeight: { base: '280px', sm: '320px', md: '360px' },
  chartPadding: { base: '20px', sm: '30px', md: '40px' },
  iconSize: { base: 'sm', md: 'md' },
  headerGap: { base: '1rem', sm: '0' },
  headerMargin: { base: '1.5rem', md: '2rem' },
  mainGap: { base: '1rem', md: '1.5rem' },
  metricsGap: { base: '1rem', md: '1.5rem' },
  metricsWidth: { base: '100%', lg: '300px' },
  chartSpacing: { base: '1rem', md: '1.5rem' },
  iconButtonSize: { base: 'sm', md: 'md' },
};

// Add more constants as needed
export const APP_NAME = 'AI Foloup HR';
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_DEBOUNCE_TIME = 300;

export const defaultListTextColorStaticVal = '--chakra-colors-gray-800';

// Phone code options for country code selection
export const PHONE_CODE_OPTIONS = [
  { value: '+91', label: '+91' },
  { value: '+1', label: '+1' },
  { value: '+44', label: '+44' },
];
export const InterviewTabs = {
  ALL: 'all',
  OPEN: 'open',
  CLOSE: 'close',
};
export const InterviewTabLabels = {
  ALL: 'All Interviews',
  OPEN: 'Open',
  CLOSE: 'Close',
};

// Interview dashboard tabs
export const INTERVIEW_TABS = [
  InterviewTabs.ALL,
  InterviewTabs.OPEN,
  InterviewTabs.CLOSE,
];
export const INTERVIEW_TAB_LABELS = [
  InterviewTabLabels.ALL,
  InterviewTabLabels.OPEN,
  InterviewTabLabels.CLOSE,
];

// Interview Card constants
export const INTERVIEW_CARD_CONSTANTS = {
  UNTITLED_INTERVIEW: 'Untitled Interview',
  OPEN: 'Open',
  CLOSED: 'Closed',
  QUESTIONS: 'questions',
  SENT: 'Sent',
  GIVEN: 'Given',
  SHORTLISTED: 'Shortlisted',
  PENDING: 'Pending',
  CREATED_ON: 'Created on',
  EDIT_INTERVIEW: 'Edit interview',
  ADD_CANDIDATES: 'Add Candidates',
  ASSIGN_CANDIDATES: 'Assign Candidates',
  MORE_ACTIONS: 'More actions',
  CLOSE: 'Close',
  REOPEN: 'Reopen',
  VIEW: 'View',
  SHARE: 'Share',
  MINUTES: 'min',
};

// Status mapping: API value -> Display value
export const STATUS_DISPLAY_MAP = {
  no_status: 'No Status',
  shortlisted: 'Shortlisted',
  shortlist: 'Shortlisted',
  potential: 'Potential',
  rejected: 'Rejected',
  'No Status': 'No Status',
  Shortlisted: 'Shortlisted',
  Shortlist: 'Shortlisted',
  Potential: 'Potential',
  Rejected: 'Rejected',
};

// Reverse mapping: Display value -> API value
export const STATUS_API_MAP = {
  'No Status': 'no_status',
  Shortlisted: 'shortlisted',
  Shortlist: 'shortlisted',
  Potential: 'potential',
  Rejected: 'rejected',
};

// Status filter options for dropdown
export const STATUS_FILTER_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'Shortlisted', label: 'Shortlisted' },
  { value: 'Potential', label: 'Potential' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'No Status', label: 'No Status' },
];

// Candidate status options for API
export const CANDIDATE_STATUS_OPTIONS = {
  SHORTLISTED: 'shortlisted',
  POTENTIAL: 'potential',
  REJECTED: 'rejected',
};

// Status labels for display
export const STATUS_LABELS = {
  [CANDIDATE_STATUS_OPTIONS.SHORTLISTED]: 'Shortlist',
  [CANDIDATE_STATUS_OPTIONS.POTENTIAL]: 'Potential',
  [CANDIDATE_STATUS_OPTIONS.REJECTED]: 'Reject',
};

// Period options for interview analysis
export const PERIOD_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

// Default period value
export const DEFAULT_PERIOD = { value: 'weekly', label: 'Weekly' };

// Date type options for interview analysis filter
export const DATE_TYPE_OPTIONS = [
  { value: 'sent_date', label: 'Sent Date' },
  { value: 'given_date', label: 'Given Date' },
];

// Chart labels
export const CHART_LABELS = {
  FEEDBACK: {
    POSITIVE: 'Positive',
    NEUTRAL: 'Neutral',
    NEGATIVE: 'Negative',
  },
  STATUS: {
    SHORTLISTED: 'Shortlisted',
    POTENTIAL: 'Potential',
    REJECTED: 'Rejected',
    NO_STATUS: 'No Status',
  },
};

// Chart configuration constants
export const CHART_CONFIG = {
  CUTOUT: '70%',
  LABEL_OFFSET: 30,
  CONNECTOR_LINE_WIDTH: 1.5,
  FONT_SIZE: 16,
  FONT_FAMILY: 'Arial, sans-serif',
  LEGEND_PADDING: 12,
  LEGEND_FONT_SIZE: 13,
  LEGEND_BOX_SIZE: 12,
  TOOLTIP_PADDING: 10,
  TOOLTIP_TITLE_FONT_SIZE: 14,
  TOOLTIP_BODY_FONT_SIZE: 12,
};

// Default values
export const DEFAULT_VALUES = {
  DURATION: '0m 0s',
  COMPLETION_RATE: 0,
};

// Layout constants
export const SIDEBAR_WIDTH = 269;
