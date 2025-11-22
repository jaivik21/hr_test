import { useState, useCallback, useMemo } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// Import All Steps
import BasicInfoForm from './Steps/Step1_BasicInfo/BasicInfoForm';
import JobDescriptionForm from './Steps/Step2_JobDescription/JobDescriptionForm';
import InterviewModeForm from './Steps/Step3_InterviewMode/InterviewModeForm';
import ReviewForm from './Steps/Step4_Review/ReviewForm';
import HorizontalStepper from './HorizontalStepper';
import WizardFooter from './WizardFooter';

import useViewport from '../../../hooks/useViewport';
import Storage from '../../../services/Storage';
import routePaths from '../../../routes/routePaths';
import { createInterview } from '../../../api/InterviewService';
import {
  setCreating,
  setCreateError,
  setCreatedInterview,
  setValidationErrors,
  clearValidationErrors,
} from '../../../redux/slices/interviewSlice';
import { showToast } from '../../Toast/ShowToast';
import {
  validateStep1BasicInfo,
  validateStep2JobDescription,
  validateCompleteInterviewData,
} from '../../../utils/validateInterviewForm';
import {
  WIZARD_STEP_KEYS,
  WIZARD_LAYOUT,
  WIZARD_STEPS,
} from '../../../utils/constants/wizardConstants';

// Helper function to update step (Storage + State)
const updateStep = (stepIndex, setActiveStep) => {
  Storage.setInterviewStep(stepIndex);
  setActiveStep(stepIndex);
};

// Helper function to handle validation errors
const handleValidationErrors = (validation, dispatch) => {
  if (!validation.isValid) {
    dispatch(setValidationErrors(validation.errors));
    return false;
  }
  dispatch(setValidationErrors({}));
  return true;
};

const CreateInterviewWizard = () => {
  const { width } = useViewport();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux selectors
  const interviewData = useSelector(
    state => state.interview.createInterviewData,
  );
  const isCreating = useSelector(state => state.interview.isCreating);

  // State for interview creation
  const [activeStep, setActiveStep] = useState(Storage.getInterviewStep() || 0);
  const [createInterviewHandler, setCreateInterviewHandler] = useState(null);

  // Memoize validation function
  const validateStep = useCallback(
    stepIndex => {
      const stepKey = WIZARD_STEPS[stepIndex]?.key;

      if (stepKey === WIZARD_STEP_KEYS.BASIC_INFO) {
        const validation = validateStep1BasicInfo(interviewData);
        return handleValidationErrors(validation, dispatch);
      }

      if (stepKey === WIZARD_STEP_KEYS.JOB_DESCRIPTION) {
        const validation = validateStep2JobDescription(interviewData);
        return handleValidationErrors(validation, dispatch);
      }

      return true;
    },
    [interviewData, dispatch],
  );

  // Extract API call logic
  const handleCreateInterviewAPI = useCallback(async () => {
    // Final validation: Ensure all required fields from both steps are present
    const completeValidation = validateCompleteInterviewData(interviewData);

    if (!handleValidationErrors(completeValidation, dispatch)) {
      return false;
    }

    dispatch(setCreating(true));
    dispatch(setCreateError(null));

    try {
      // Call API - service handles FormData conversion (Redux has only API fields)
      const response = await createInterview(interviewData);

      dispatch(setCreatedInterview(response.body));
      dispatch(clearValidationErrors());
      showToast('success', 'Success', 'Interview created successfully!');

      return true;
    } catch (error) {
      dispatch(setCreateError(error.error));
      showToast('error', 'Error', error.error || 'Failed to create interview');
      return false;
    } finally {
      dispatch(setCreating(false));
    }
  }, [interviewData, dispatch]);

  const handleNext = useCallback(async () => {
    // Validate current step
    if (!validateStep(activeStep)) {
      return;
    }

    // If on Step 2 (Job Description), call the API
    if (WIZARD_STEPS[activeStep]?.key === WIZARD_STEP_KEYS.JOB_DESCRIPTION) {
      const success = await handleCreateInterviewAPI();
      if (success) {
        updateStep(activeStep + 1, setActiveStep);
      }
    } else {
      // For other steps, just move forward
      updateStep(activeStep + 1, setActiveStep);
    }
  }, [activeStep, validateStep, handleCreateInterviewAPI]);

  const handlePrevious = useCallback(() => {
    updateStep(activeStep - 1, setActiveStep);
  }, [activeStep]);

  const handleClose = useCallback(() => {
    Storage.clearInterviewStep();
    dispatch(clearValidationErrors());
    navigate(routePaths.createInterview);
  }, [dispatch, navigate]);

  const handleGoToStep = useCallback(stepIndex => {
    if (stepIndex >= 0 && stepIndex < WIZARD_STEPS.length) {
      updateStep(stepIndex, setActiveStep);
    }
  }, []);

  const handleStartEditing = useCallback(() => {
    updateStep(0, setActiveStep);
  }, []);

  const handleCreateInterview = useCallback(async () => {
    if (createInterviewHandler) {
      await createInterviewHandler();
    }
  }, [createInterviewHandler]);

  // Memoize step content to prevent unnecessary re-renders
  const stepContent = useMemo(() => {
    const activeStepKey = WIZARD_STEPS[activeStep]?.key;

    switch (activeStepKey) {
      case WIZARD_STEP_KEYS.BASIC_INFO:
        return <BasicInfoForm />;
      case WIZARD_STEP_KEYS.JOB_DESCRIPTION:
        return <JobDescriptionForm />;
      case WIZARD_STEP_KEYS.INTERVIEW_MODE:
        return (
          <InterviewModeForm next={handleNext} previous={handlePrevious} />
        );
      case WIZARD_STEP_KEYS.REVIEW:
        return (
          <ReviewForm
            previous={handlePrevious}
            onStartEditing={handleStartEditing}
            onCreateHandlerRef={setCreateInterviewHandler}
          />
        );
      default:
        return null;
    }
  }, [activeStep, handleNext, handlePrevious, handleStartEditing]);

  return (
    <Box overflow="hidden" height="100%">
      <Box>
        <Box position="relative" w="full">
          {/* Stepper */}
          <HorizontalStepper
            steps={WIZARD_STEPS}
            activeStep={activeStep}
            handleGoToStep={handleGoToStep}
            width={width}
          />

          {/* Mobile Step Indicator */}
          {width <= WIZARD_LAYOUT.MOBILE_BREAKPOINT && (
            <Text mb={4}>
              Step {activeStep + 1}:{' '}
              <b>{WIZARD_STEPS[activeStep]?.description}</b>
            </Text>
          )}

          {/* Content Area - With bottom padding for fixed footer */}
          <Box
            maxHeight={WIZARD_LAYOUT.CONTENT_MAX_HEIGHT}
            overflowY="auto"
            className="custom_scrollbar"
            mt={4}
            pb={WIZARD_LAYOUT.FOOTER_PADDING}>
            {stepContent}
          </Box>

          {/* Footer Buttons - Extracted to separate component */}
          <WizardFooter
            activeStep={activeStep}
            totalSteps={WIZARD_STEPS.length}
            width={width}
            isCreating={isCreating}
            onClose={handleClose}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onCreate={handleCreateInterview}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default CreateInterviewWizard;
