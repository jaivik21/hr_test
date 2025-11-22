import { createSlice } from '@reduxjs/toolkit';
import {
  getInterviews,
  toggleInterviewStatus,
} from '../../api/InterviewsService';
import { setLoadingState } from './loaderSlice';

export const fetchInterviews = params => async dispatch => {
  try {
    dispatch(setLoadingState(true));
    const response = await getInterviews(params);
    const body = response?.body || {};
    const interviews = Array.isArray(body?.interviews)
      ? body.interviews
      : body?.data || [];

    dispatch(setInterviews(interviews));
    dispatch(setLoadingState(false));
    return { success: true, data: interviews };
  } catch (error) {
    dispatch(setLoadingState(false));
    dispatch(setInterviewsError(error?.error || 'Failed to fetch interviews'));
    return {
      success: false,
      error: error?.error || 'Failed to fetch interviews',
    };
  }
};

const initialState = {
  interviews: [],
  loading: false,
  error: null,
};

const interviewsSlice = createSlice({
  name: 'interviews',
  initialState,
  reducers: {
    setInterviews(state, action) {
      state.interviews = action.payload;
      state.loading = false;
      state.error = null;
    },
    setInterviewsError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    clearInterviews(state) {
      state.interviews = [];
      state.error = null;
    },
    updateInterviewStatus(state, action) {
      const { interviewId, isOpen } = action.payload;
      const interview = state.interviews.find(item => item.id === interviewId);
      if (interview) {
        interview.is_open = isOpen;
      }
    },
  },
});

export const toggleInterview = interviewId => async (dispatch, getState) => {
  try {
    const state = getState();
    const interview = state.interviews.interviews.find(
      item => item.id === interviewId,
    );
    if (!interview) return { success: false, error: 'Interview not found' };

    dispatch(setLoadingState(true));
    const response = await toggleInterviewStatus(interviewId);
    const body = response?.body || {};

    // Use the is_open value from API response
    if (body.ok && typeof body.is_open === 'boolean') {
      dispatch(updateInterviewStatus({ interviewId, isOpen: body.is_open }));
    }
    dispatch(setLoadingState(false));

    return { success: true, data: body };
  } catch (error) {
    dispatch(setLoadingState(false));
    return {
      success: false,
      error: error?.error || 'Failed to toggle interview status',
    };
  }
};

export const {
  setInterviews,
  setInterviewsError,
  clearInterviews,
  updateInterviewStatus,
} = interviewsSlice.actions;

export default interviewsSlice.reducer;
