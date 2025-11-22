import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  createInterviewData: {
    // Only API fields (snake_case) - no UI-only fields
    name: '',
    duration_minutes: '',
    question_count: '',
    interviewer_id: '',
    description: '',
    job_description: '',
    jd_file: null,
  },

  // API States
  isCreating: false,
  createError: null,
  createdInterview: null,

  // Validation Errors
  validationErrors: {},
};

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    setInterviewField: (state, action) => {
      const { field, value } = action.payload;
      state.createInterviewData[field] = value;
      // Clear error for this field when user types
      if (state.validationErrors[field]) {
        const newErrors = { ...state.validationErrors };
        delete newErrors[field];
        state.validationErrors = newErrors;
      }
    },
    setMultipleInterviewFields: (state, action) => {
      state.createInterviewData = {
        ...state.createInterviewData,
        ...action.payload,
      };
    },
    resetInterviewData: state => {
      state.createInterviewData = initialState.createInterviewData;
    },
    // API Action Reducers
    setCreating: (state, action) => {
      state.isCreating = action.payload;
    },
    setCreateError: (state, action) => {
      state.createError = action.payload;
    },
    setCreatedInterview: (state, action) => {
      state.createdInterview = action.payload;
    },
    // Validation Error Reducers
    setValidationErrors: (state, action) => {
      state.validationErrors = action.payload;
    },
    clearValidationErrors: state => {
      state.validationErrors = {};
    },
    clearFieldError: (state, action) => {
      const { field } = action.payload;
      const newErrors = { ...state.validationErrors };
      delete newErrors[field];
      state.validationErrors = newErrors;
    },
  },
});

export const {
  setInterviewField,
  setMultipleInterviewFields,
  resetInterviewData,
  setCreating,
  setCreateError,
  setCreatedInterview,
  setValidationErrors,
  clearValidationErrors,
  clearFieldError,
} = interviewSlice.actions;

export default interviewSlice.reducer;
