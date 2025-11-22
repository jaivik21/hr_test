export const CANDIDATE_ROUTE = {
  CANDIDATE: '/api/interview/check-interview',
  STARTINTERVIEW: '/api/interview/start-interview',
  FEEDBACK: '/api/feedback/candidate-feedback',
  GETCURRENTQUESTION: '/api/interview/get-current-question',
  SUBMITANSWER: '/api/interview/submit-answer',
  ENDINTERVIEW: '/api/interview/end-interview',
  CANDIDATEIMAGE: '/api/media/upload-candidate-image',
  CANDIDATEVIDEO: '/api/media/upload-candidate-video',
  TABSWITCHCOUNT: '/api/interview/tab-switch-count',
};  
// Interview API Routes
export const INTERVIEW_ROUTES = {
  CREATE_INTERVIEW: '/api/interview/create-interview',
  GENERATE_QUESTIONS: '/api/interview/generate-questions',
  UPDATE_INTERVIEW: '/api/interview/update-interview',
};

// Interviews API Routes
export const INTERVIEWS_ROUTES = {
  LIST_INTERVIEWS: '/api/interview/list-interviews',
  TOGGLE_INTERVIEW_STATUS: '/api/interview/toggle-interview-status',
  ADD_CANDIDATE: '/api/interview/add-candidate',
  BULK_UPLOAD: '/api/interview/bulk-upload',
  PREVIOUSLY_APPEARED_CANDIDATES:
    '/api/interview/previously-appeared-candidates',
  GET_OVERALL_ANALYSIS: '/api/interview/get-overall-analysis',
  UPDATE_RESPONSE_STATUS: '/api/interview/update-response-status',
  SEND_INVITE: '/api/interview/send-invite',
};

export default {
  INTERVIEW_ROUTES,
  INTERVIEWS_ROUTES,
  CANDIDATE_ROUTE,
};
