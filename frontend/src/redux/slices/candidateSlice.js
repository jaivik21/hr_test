import { createSlice } from '@reduxjs/toolkit';

const initialState = {
	// store the interview details from GET API
	interviewDetails: null,
	// store the response returned when candidate starts the interview
	startInterviewResponse: null,
	// store candidate email for feedback submission
	candidateEmail: null,
	// store candidate name
	candidateName: null,
};

const candidateSlice = createSlice({
	name: 'candidate',
	initialState,
	reducers: {
		setInterviewDetails(state, action) {
			state.interviewDetails = action.payload || null;
		},
		setStartInterviewResponse(state, action) {
			const payload = action.payload || null;
			state.startInterviewResponse = payload;
		},
		setCandidateEmail(state, action) {
			state.candidateEmail = action.payload || null;
		},
		setCandidateName(state, action) {
			state.candidateName = action.payload || null;
		},
		clearCandidateState(state) {
			state.interviewDetails = null;
			state.startInterviewResponse = null;
			state.candidateEmail = null;
			state.candidateName = null;
		},
	},
});

export const { setInterviewDetails, setStartInterviewResponse, setCandidateEmail, setCandidateName, clearCandidateState } = candidateSlice.actions;

export const selectInterviewDetails = (state) => state?.candidate?.interviewDetails || null;
export const selectStartInterviewResponse = (state) => state?.candidate?.startInterviewResponse || null;
export const selectCandidateEmail = (state) => state?.candidate?.candidateEmail || null;
export const selectCandidateName = (state) => state?.candidate?.candidateName || null;

export default candidateSlice.reducer;

