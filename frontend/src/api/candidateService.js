import Api from "./APIService";
import { CANDIDATE_ROUTE } from '../utils/constants/apiRoutes';

export const getInterviewDataApi = (interviewId) => {
  // Pass interview_id as query parameter (API expects interview_id)
  return Api.get(CANDIDATE_ROUTE.CANDIDATE, { interview_id: interviewId });
};

export const startInterviewApi = (interviewId, candidateName, candidateEmail) => {
  // POST request to start interview with candidate details
  const body = {
    interview_id: interviewId,
    candidate_name: candidateName,
    candidate_email: candidateEmail,
  };
  return Api.post(CANDIDATE_ROUTE.STARTINTERVIEW, body);
};

export const getCurrentQuestionApi = (responseId) => {
  // GET request to fetch current question for the interview
  return Api.get(CANDIDATE_ROUTE.GETCURRENTQUESTION, {
    response_id: responseId,
  });
};

export const submitAnswerApi = (responseId, questionText, transcript) => {
  // POST request to submit candidate's answer to a question
  const body = {
    response_id: responseId,
    question: questionText,
    transcript: transcript,
  };
  return Api.post(CANDIDATE_ROUTE.SUBMITANSWER, body);
};

export const endInterviewApi = (responseId, reason = 'Interview completed') => {
  // POST request to end the interview
  const body = {
    response_id: responseId,
    reason: reason, // Reason for ending the interview
  };
  return Api.post(CANDIDATE_ROUTE.ENDINTERVIEW, body);
};

export const updateTabSwitchCountApi = (interviewId, responseId, tabSwitchCount) => {
  // POST request to update tab switch count
  const body = {
    interview_id: interviewId,
    response_id: responseId,
    tab_switch_count: tabSwitchCount,
  };
  return Api.post(CANDIDATE_ROUTE.TABSWITCHCOUNT, body);
};

export const submitFeedbackApi = (interviewId, email, feedback, satisfaction, responseId) => {
  // POST request to submit candidate feedback
  const body = {
    interview_id: interviewId,
    email: email,
    feedback: feedback || '', // Optional feedback text
    satisfaction: satisfaction, // Rating from 1-5
    response_id: responseId, // Response ID from the interview
  };
  return Api.post(CANDIDATE_ROUTE.FEEDBACK, body);
};

export const uploadCandidateImageApi = (responseId, imageFile) => {
  // POST request to upload candidate image
  // Create FormData for multipart/form-data upload
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('response_id', responseId);
  
  // Use multipart/form-data content type
  return Api.post(CANDIDATE_ROUTE.CANDIDATEIMAGE, formData, {}, 'multipart/form-data');
};

export const uploadCandidateVideoApi = (responseId, videoFile) => {
  // POST request to upload candidate video
  // Create FormData for multipart/form-data upload
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('response_id', responseId);
  
  // Use multipart/form-data content type
  return Api.post(CANDIDATE_ROUTE.CANDIDATEVIDEO, formData, {}, 'multipart/form-data');
};