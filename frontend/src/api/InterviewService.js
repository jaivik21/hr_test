import { INTERVIEW_ROUTES } from '../utils/constants/apiRoutes';
import { FORM_DATA_OPTIONS } from '../utils/constants/apiConstants';
import { QUESTION_GENERATION } from '../utils/constants/interviewServiceConstants';
import { postFormData, postJson } from '../utils/helper';

export async function createInterview(interviewData) {
  return postFormData(
    INTERVIEW_ROUTES.CREATE_INTERVIEW,
    interviewData,
    FORM_DATA_OPTIONS.CREATE,
  );
}

export async function generateQuestions(interviewId, questionCount) {
  const requestBody = {
    interview_id: interviewId,
    question_count: questionCount,
    question_mode: QUESTION_GENERATION.MODE,
    auto_question_generate: QUESTION_GENERATION.AUTO_GENERATE,
  };

  return postJson(INTERVIEW_ROUTES.GENERATE_QUESTIONS, requestBody);
}

export async function updateInterview(updateData) {
  return postFormData(
    INTERVIEW_ROUTES.UPDATE_INTERVIEW,
    updateData,
    FORM_DATA_OPTIONS.UPDATE,
  );
}

export default {
  createInterview,
  generateQuestions,
  updateInterview,
};
