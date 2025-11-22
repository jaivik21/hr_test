import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Text } from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../../../../../components/Toast/ShowToast';
import { resetInterviewData } from '../../../../../redux/slices/interviewSlice';
import Storage from '../../../../../services/Storage';
import routePaths from '../../../../../routes/routePaths';
import { interviewers } from '../../../../../mocks/interviewers';
import { generateQuestions } from '../../../../../api/InterviewService';
import AccordionItem from '../../../../../components/Accordion/Accordion';
import BasicInfoSection from './BasicInfoSection';
import InterviewModeSection from './InterviewModeSection';
import {
  INTERVIEW_MODE,
  AUTOMATED_OPTION,
} from '../../../../../utils/constants/interviewModeConstants';

// Helper function to calculate mode and option from createdInterview
const calculateModeAndOption = createdInterview => {
  const mode = createdInterview?.mode || INTERVIEW_MODE.AUTOMATED;
  const autoOption =
    createdInterview?.auto_question_generate === 'true'
      ? mode === 'dynamic'
        ? AUTOMATED_OPTION.DYNAMIC
        : AUTOMATED_OPTION.PREDEFINED
      : null;

  return {
    mode:
      mode === INTERVIEW_MODE.MANUAL
        ? INTERVIEW_MODE.MANUAL
        : INTERVIEW_MODE.AUTOMATED,
    autoOption: autoOption || AUTOMATED_OPTION.PREDEFINED,
  };
};

const ReviewForm = ({ previous, onStartEditing, onCreateHandlerRef }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const interviewData = useSelector(
    state => state.interview.createInterviewData,
  );
  const createdInterview = useSelector(
    state => state.interview.createdInterview,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collapsible sections state
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(true);
  const [isJobDescriptionOpen, setIsJobDescriptionOpen] = useState(true);
  const [isInterviewModeOpen, setIsInterviewModeOpen] = useState(true);

  // Interview mode and questions state
  const [interviewMode, setInterviewMode] = useState(INTERVIEW_MODE.AUTOMATED);
  const [automatedOption, setAutomatedOption] = useState(
    AUTOMATED_OPTION.PREDEFINED,
  );
  const [questions, setQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Memoize computed values
  const selectedInterviewer = useMemo(() => {
    return interviewers.find(
      interviewer => interviewer.id === interviewData.interviewer_id,
    );
  }, [interviewData.interviewer_id]);

  const interviewId = useMemo(() => {
    return (
      createdInterview?.id ||
      createdInterview?.uuid ||
      createdInterview?.interview_id
    );
  }, [createdInterview]);

  const handleSubmit = useCallback(async () => {
    try {
      setIsSubmitting(true);

      // TODO: Replace with actual API call for final submission
      // The interview is already created in Step 2, this is just final confirmation

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      showToast('success', 'Success', 'Interview created successfully!');

      // Clear wizard state
      Storage.clearInterviewStep();
      dispatch(resetInterviewData());

      // Navigate back to interviews
      navigate(routePaths.createInterview);
    } catch (error) {
      showToast(
        'error',
        'Error',
        error.message || 'Failed to create interview',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, navigate]);

  // Expose submit handler to parent component - Fixed: pass handleSubmit directly, not a function
  useEffect(() => {
    if (onCreateHandlerRef) {
      onCreateHandlerRef(handleSubmit);
    }
    return () => {
      if (onCreateHandlerRef) {
        onCreateHandlerRef(null);
      }
    };
  }, [onCreateHandlerRef, handleSubmit]);

  // Fetch questions when component mounts if mode is automated-predefined
  useEffect(() => {
    const fetchQuestionsForReview = async () => {
      if (!interviewId) return;

      const { mode, autoOption } = calculateModeAndOption(createdInterview);
      setInterviewMode(mode);
      setAutomatedOption(autoOption);

      // If automated-predefined, fetch questions
      if (
        mode === INTERVIEW_MODE.AUTOMATED &&
        autoOption === AUTOMATED_OPTION.PREDEFINED
      ) {
        setIsLoadingQuestions(true);
        try {
          const questionCount = interviewData?.question_count || 3;
          const response = await generateQuestions(
            interviewId,
            parseInt(questionCount),
          );
          if (response.body?.ok && response.body?.questions) {
            setQuestions(response.body.questions);
          }
        } catch (error) {
          console.error('Failed to fetch questions:', error);
        } finally {
          setIsLoadingQuestions(false);
        }
      } else if (
        mode === INTERVIEW_MODE.MANUAL &&
        createdInterview?.manual_questions
      ) {
        setQuestions(createdInterview.manual_questions);
      }
    };

    fetchQuestionsForReview();
  }, [interviewId, createdInterview, interviewData?.question_count]);

  const handlePrevious = useCallback(() => {
    previous();
  }, [previous]);

  // Memoize accordion toggle handlers
  const handleBasicInfoToggle = useCallback(isOpen => {
    setIsBasicInfoOpen(isOpen);
  }, []);

  const handleJobDescriptionToggle = useCallback(isOpen => {
    setIsJobDescriptionOpen(isOpen);
  }, []);

  const handleInterviewModeToggle = useCallback(isOpen => {
    setIsInterviewModeOpen(isOpen);
  }, []);

  return (
    <Box mt={6} pb={6} w="100%">
      {/* Basic Information Section */}
      <AccordionItem
        title="Basic Information"
        isOpen={isBasicInfoOpen}
        onToggle={handleBasicInfoToggle}
        defaultOpen={true}>
        <BasicInfoSection
          interviewData={interviewData}
          selectedInterviewer={selectedInterviewer}
        />
      </AccordionItem>

      {/* Job Description Section */}
      <AccordionItem
        title="Job Description"
        isOpen={isJobDescriptionOpen}
        onToggle={handleJobDescriptionToggle}
        defaultOpen={true}>
        <Text
          fontSize="md"
          color="gray.700"
          whiteSpace="pre-wrap"
          lineHeight="1.6">
          {interviewData.job_description || '-'}
        </Text>
      </AccordionItem>

      {/* Interview Mode Section */}
      <AccordionItem
        title="Interview Mode"
        isOpen={isInterviewModeOpen}
        onToggle={handleInterviewModeToggle}
        defaultOpen={true}>
        <InterviewModeSection
          interviewMode={interviewMode}
          automatedOption={automatedOption}
          questions={questions}
          isLoadingQuestions={isLoadingQuestions}
        />
      </AccordionItem>
    </Box>
  );
};

ReviewForm.propTypes = {
  previous: PropTypes.func.isRequired,
  onStartEditing: PropTypes.func,
  onCreateHandlerRef: PropTypes.func,
};

export default React.memo(ReviewForm);
