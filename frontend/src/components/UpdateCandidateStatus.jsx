import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Spinner,
  Box,
} from '@chakra-ui/react';
import { FiMoreVertical } from 'react-icons/fi';
import { updateResponseStatus } from '../api/InterviewsService';
import { setLoadingState } from '../redux/slices/loaderSlice';
import { useDispatch } from 'react-redux';
import { showToast } from './Toast/ShowToast';
import {
  TOAST_SUCCESS_STATUS,
  TOAST_ERROR_STATUS,
} from '../utils/constants/titleConstant';
import messages from '../utils/constants/messages';
import {
  themeColor,
  CANDIDATE_STATUS_OPTIONS,
  STATUS_LABELS,
} from '../utils/constants/constants';

/**
 * Reusable component for updating candidate response status
 * Can be used multiple times for different candidates
 */
const UpdateCandidateStatus = ({
  responseId,
  currentStatus,
  onStatusUpdate,
  size = 'sm',
  variant = 'ghost',
}) => {
  const dispatch = useDispatch();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async newStatus => {
    if (!responseId) {
      showToast(TOAST_ERROR_STATUS, 'Error', 'Response ID is required');
      return;
    }

    if (newStatus === currentStatus) {
      return; // No change needed
    }

    try {
      setIsUpdating(true);
      dispatch(setLoadingState(true));

      const response = await updateResponseStatus(responseId, newStatus);
      const data = response?.body;

      if (data && data.ok) {
        showToast(
          TOAST_SUCCESS_STATUS,
          'Status Updated',
          `Candidate status updated to ${STATUS_LABELS[newStatus]} successfully`,
        );

        // Call the callback if provided
        if (onStatusUpdate) {
          onStatusUpdate(newStatus, data);
        }
      } else {
        showToast(
          TOAST_ERROR_STATUS,
          'Update Failed',
          data?.message || 'Failed to update candidate status',
        );
      }
    } catch (error) {
      showToast(
        TOAST_ERROR_STATUS,
        'Error',
        error?.error || messages.SOMETHING_WENT_WRONG_ERROR,
      );
    } finally {
      setIsUpdating(false);
      dispatch(setLoadingState(false));
    }
  };

  const isShortlisted = currentStatus === CANDIDATE_STATUS_OPTIONS.SHORTLISTED;
  const isPotential = currentStatus === CANDIDATE_STATUS_OPTIONS.POTENTIAL;
  const isRejected = currentStatus === CANDIDATE_STATUS_OPTIONS.REJECTED;

  return (
    <Menu>
      <MenuButton
        as={IconButton}
        icon={isUpdating ? <Spinner size="sm" /> : <FiMoreVertical />}
        variant={variant}
        size={size}
        aria-label="Update candidate status"
        isDisabled={isUpdating}
        color={themeColor.PRIMARY_TEXT_COLOR}
      />
      <MenuList>
        <MenuItem
          icon={
            <Box
              w="8px"
              h="8px"
              borderRadius="full"
              bg={themeColor.SUCCESS_COLOR}
            />
          }
          onClick={() =>
            handleStatusUpdate(CANDIDATE_STATUS_OPTIONS.SHORTLISTED)
          }
          isDisabled={isShortlisted}
          color={
            isShortlisted
              ? themeColor.SUCCESS_COLOR
              : themeColor.PRIMARY_TEXT_COLOR
          }>
          {STATUS_LABELS[CANDIDATE_STATUS_OPTIONS.SHORTLISTED]}
        </MenuItem>
        <MenuItem
          icon={
            <Box
              w="8px"
              h="8px"
              borderRadius="full"
              bg={themeColor.WARNING_COLOR}
            />
          }
          onClick={() => handleStatusUpdate(CANDIDATE_STATUS_OPTIONS.POTENTIAL)}
          isDisabled={isPotential}
          color={
            isPotential
              ? themeColor.WARNING_COLOR
              : themeColor.PRIMARY_TEXT_COLOR
          }>
          {STATUS_LABELS[CANDIDATE_STATUS_OPTIONS.POTENTIAL]}
        </MenuItem>
        <MenuItem
          icon={
            <Box
              w="8px"
              h="8px"
              borderRadius="full"
              bg={themeColor.ERROR_COLOR}
            />
          }
          onClick={() => handleStatusUpdate(CANDIDATE_STATUS_OPTIONS.REJECTED)}
          isDisabled={isRejected}
          color={
            isRejected ? themeColor.ERROR_COLOR : themeColor.PRIMARY_TEXT_COLOR
          }>
          {STATUS_LABELS[CANDIDATE_STATUS_OPTIONS.REJECTED]}
        </MenuItem>
      </MenuList>
    </Menu>
  );
};

UpdateCandidateStatus.propTypes = {
  responseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  currentStatus: PropTypes.string,
  onStatusUpdate: PropTypes.func,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  variant: PropTypes.string,
};

export default UpdateCandidateStatus;
