// Mock data for interviewers - using fixed ID for API compatibility
import Avatar1 from '../assets/images/Avatar1.png';
import Avatar2 from '../assets/images/Avatar2.png';
import Avatar3 from '../assets/images/Avatar3.png';
export const FIXED_INTERVIEWER_ID = '3d6d42ff-8b6a-4d74-8e16-f5dcb8d55750';

export const interviewers = [
  {
    id: FIXED_INTERVIEWER_ID,
    name: 'Explorer Lina',
    avatar: Avatar1,
  },
  {
    id: FIXED_INTERVIEWER_ID,
    name: 'Empathetic Bob',
    avatar: Avatar2,
  },
  {
    id: FIXED_INTERVIEWER_ID,
    name: 'Strategic Sam',
    avatar: Avatar3,
  },
];

export default {
  FIXED_INTERVIEWER_ID,
  interviewers,
};
