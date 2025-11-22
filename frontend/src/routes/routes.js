import StartInterview from '../pages/StartInterview'
import Instructions from '../pages/Instructions'
import Login from '../pages/auth/Login';

import InterviewDashboard from '../pages/InterviewDashboard';
import InterviewAnalysis from '../pages/InterviewAnalysis';
import CreateInterview from '../pages/Interviews/CreateInterview';
import routePaths from './routePaths';
import ThankYou from '../pages/ThankYou';
import Feedback from '../pages/Feedback'; 
import interviewSetup from '../pages/InterviewSetup';

const routes = [
  {
    path: routePaths.createInterview,
    component: CreateInterview,
    title: 'Interviews',
    key: 'create_interview',
    isPrivate: true,
    back: routePaths.InterviewDashboard,
  },
  {
    path: routePaths.login,
    component: Login,
    isPrivate: false,
    redirectWhenAuthenticated: true,
    key: 'login',
  },
  {
    path: routePaths.InterviewDashboard,
    component: InterviewDashboard,
    title: 'Interviews',
    key: 'interview_dashboard',
    isPrivate: true,
  },
  {
    path: routePaths.InterviewAnalysis,
    component: InterviewAnalysis,
    title: 'Interview Analysis',
    key: 'interview_analysis',
    isPrivate: true,
    back: routePaths.InterviewDashboard,
  },
  {
    path: routePaths.candidate,
    component: StartInterview,
    title: '',
    key: 'candidate',
  },
  {
    path: routePaths.instructions,
    component: Instructions,
    title: '',
    key: 'instructions',
  },
  {
    path: routePaths.thankyou,
    component: ThankYou,
    title: '',
    key: 'thankyou',
  },
  {
    path: routePaths.feedback,
    component: Feedback,
    title: '',
    key: 'feedback',
  },
  {
    path: routePaths.interviewSetup,
    component: interviewSetup,
    title: '',
    key: 'interviewSetup',
  },
];

export default routes;
