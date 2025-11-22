import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { sendInvite } from '../api/InterviewsService';
import { setLoadingState } from '../redux/slices/loaderSlice';
import { showToast } from '../components/Toast/ShowToast';
import {
  TOAST_SUCCESS_STATUS,
  TOAST_ERROR_STATUS,
} from '../utils/constants/titleConstant';
import messages from '../utils/constants/messages';
import { CANDIDATE_STATUS_OPTIONS } from '../utils/constants/constants';

/**
 * Custom hook for interview-related actions
 * Provides reusable functions for copying links, sending invites, and status handling
 */
export const useInterviewActions = () => {
  const dispatch = useDispatch();

  /**
   * Copy interview link to clipboard
   * @param {string} link - The interview link to copy (can be interview_link, candidate_link, or link)
   * @returns {Promise<void>}
   */
  const copyInterviewLink = useCallback(async link => {
    if (!link) {
      showToast(
        TOAST_ERROR_STATUS,
        'Error',
        messages.INTERVIEW_LINK_NOT_AVAILABLE,
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      showToast(
        TOAST_SUCCESS_STATUS,
        messages.LINK_COPIED,
        messages.INTERVIEW_LINK_COPIED_TO_CLIPBOARD,
      );
    } catch (error) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.COPY_FAILED,
        messages.FAILED_TO_COPY_INTERVIEW_LINK,
      );
    }
  }, []);

  /**
   * Send interview invite
   * @param {string} interviewId - The interview ID
   * @param {Object} options - Options for sending invite
   * @param {string} [options.candidate_id] - Optional candidate ID
   * @param {string} [options.email] - Optional email address
   * @param {boolean} [options.resend=true] - Whether to resend the invite
   * @returns {Promise<void>}
   */
  const sendInterviewInvite = useCallback(
    async (interviewId, options = {}) => {
      if (!interviewId) {
        showToast(TOAST_ERROR_STATUS, 'Error', messages.INTERVIEW_ID_REQUIRED);
        return;
      }

      try {
        dispatch(setLoadingState(true));

        const inviteOptions = {
          resend: options.resend !== undefined ? options.resend : true,
        };

        // Add optional candidate_id if available
        if (options.candidate_id) {
          inviteOptions.candidate_id = options.candidate_id;
        }

        // Add optional email if available
        if (options.email) {
          inviteOptions.email = options.email;
        }

        const response = await sendInvite(interviewId, inviteOptions);
        const data = response?.body;

        if (data && data.ok) {
          showToast(
            TOAST_SUCCESS_STATUS,
            messages.INVITE_SENT,
            messages.INTERVIEW_INVITE_SENT_SUCCESSFULLY,
          );
        } else {
          showToast(
            TOAST_ERROR_STATUS,
            messages.SEND_FAILED,
            data?.message || messages.FAILED_TO_SEND_INTERVIEW_INVITE,
          );
        }
      } catch (error) {
        showToast(
          TOAST_ERROR_STATUS,
          'Error',
          error?.error || messages.FAILED_TO_SEND_INTERVIEW_INVITE,
        );
      } finally {
        dispatch(setLoadingState(false));
      }
    },
    [dispatch],
  );

  /**
   * Map display status to API status value
   * @param {string} displayStatus - The display status string
   * @returns {string|null} - The API status value or null
   */
  const getStatusValue = useCallback(displayStatus => {
    if (!displayStatus) return null;
    const statusLower = displayStatus.toLowerCase();
    if (statusLower.includes('shortlist')) {
      return CANDIDATE_STATUS_OPTIONS.SHORTLISTED;
    }
    if (statusLower.includes('potential')) {
      return CANDIDATE_STATUS_OPTIONS.POTENTIAL;
    }
    if (statusLower.includes('reject')) {
      return CANDIDATE_STATUS_OPTIONS.REJECTED;
    }
    return null;
  }, []);

  return {
    copyInterviewLink,
    sendInterviewInvite,
    getStatusValue,
  };
};

export default useInterviewActions;
