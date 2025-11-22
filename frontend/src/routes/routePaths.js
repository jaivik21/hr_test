const routePaths = {
  home: '/',
  candidate: '/candidate',
  instructions: '/instructions',
  thankyou: '/thankyou',
  feedback: '/feedback',
  interviewSetup: '/interviewSetup',
  login: '/login',
  forgotPassword: '/forgot-password',
  InterviewDashboard: '/interview-dashboard',
  InterviewAnalysis: '/interview-analysis/:interviewId',
  // Helper function to generate interview analysis path
  getInterviewAnalysisPath: interviewId => `/interview-analysis/${interviewId}`,
  createInterview: '/interviews/create',
  // Add more routes as needed
};

export default routePaths;
