import { INTERVIEWS_ROUTES } from '../utils/constants/apiRoutes';
import { FORM_DATA_OPTIONS } from '../utils/constants/apiConstants';
import { postFormData, postJson } from '../utils/helper';
import APIService from './APIService';

export async function getInterviews(params) {
  return APIService.get(INTERVIEWS_ROUTES.LIST_INTERVIEWS, params);
}

export async function toggleInterviewStatus(interviewId) {
  const requestBody = {
    interview_id: interviewId,
  };
  return postJson(INTERVIEWS_ROUTES.TOGGLE_INTERVIEW_STATUS, requestBody);
}

export async function addCandidates(interviewId, candidates) {
  const requestBody = {
    interview_id: interviewId,
    candidates: candidates.map(candidate => ({
      name: candidate.name,
      email: candidate.email,
      phone_number: candidate.phone_number,
    })),
  };
  return postJson(INTERVIEWS_ROUTES.ADD_CANDIDATE, requestBody);
}

export async function checkEmailHistory(email) {
  return APIService.get(INTERVIEWS_ROUTES.PREVIOUSLY_APPEARED_CANDIDATES, {
    email,
  });
}

export async function bulkUploadCandidates(interviewId, file) {
  const requestData = {
    file: file,
    interview_id: interviewId,
  };
  return postFormData(
    INTERVIEWS_ROUTES.BULK_UPLOAD,
    requestData,
    FORM_DATA_OPTIONS.CREATE,
  );
}

export async function getPreviouslyAppearedCandidateHistory(email) {
  return APIService.get(INTERVIEWS_ROUTES.PREVIOUSLY_APPEARED_CANDIDATES, {
    email,
  });
}

export async function getOverallAnalysis(interviewId, params = {}) {
  const includeCandidates =
    params.include_candidates !== undefined ? params.include_candidates : true;

  const defaultParams = {
    interview_id: interviewId,
    period: params.period || 'all',
    include_candidates: includeCandidates,
  };

  // Only add pagination parameters when include_candidates is true
  if (includeCandidates) {
    defaultParams.page = params.page || 1;
    defaultParams.page_size = params.page_size || 10;

    // Add search parameter if provided
    if (params.search) {
      defaultParams.search = params.search;
    }

    // Add sort parameters if provided
    if (params.sort_field) {
      defaultParams.sort_field = params.sort_field;
    }
    if (params.sort_order) {
      defaultParams.sort_order = params.sort_order;
    }

    // Add status filter if provided
    if (params.status) {
      defaultParams.status = params.status;
    }

    // Add date filters if provided
    if (params.date_type) {
      defaultParams.date_type = params.date_type;
    }
    if (params.date_from) {
      defaultParams.date_from = params.date_from;
    }
    if (params.date_to) {
      defaultParams.date_to = params.date_to;
    }
  }

  return APIService.get(INTERVIEWS_ROUTES.GET_OVERALL_ANALYSIS, defaultParams);
}

export async function updateResponseStatus(responseId, status) {
  const requestBody = {
    response_id: responseId,
    status: status,
  };
  return postJson(INTERVIEWS_ROUTES.UPDATE_RESPONSE_STATUS, requestBody);
}

export async function sendInvite(interviewId, options = {}) {
  const requestBody = {
    interview_id: interviewId,
    resend: options.resend || false,
  };

  // Add optional parameters only if provided
  if (options.candidate_id) {
    requestBody.candidate_id = options.candidate_id;
  }

  if (options.email) {
    requestBody.email = options.email;
  }

  return postJson(INTERVIEWS_ROUTES.SEND_INVITE, requestBody);
}

export default {
  getInterviews,
  toggleInterviewStatus,
  addCandidates,
  checkEmailHistory,
  bulkUploadCandidates,
  getPreviouslyAppearedCandidateHistory,
  getOverallAnalysis,
  updateResponseStatus,
  sendInvite,
};
