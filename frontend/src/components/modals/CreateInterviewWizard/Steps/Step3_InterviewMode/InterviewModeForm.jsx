import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Box, Flex, HStack, Text, Spinner } from '@chakra-ui/react';
import SelectField from '../../../../../components/SelectField/SelectField';
import { showToast } from '../../../../../components/Toast/ShowToast';
import {
  generateQuestions,
  updateInterview,
} from '../../../../../api/InterviewService';
import QuestionList from './QuestionList';
import Pagination from './Pagination';
import AutomatedOptionCard from './AutomatedOptionCard';
import {
  INTERVIEW_MODE,
  AUTOMATED_OPTION,
  MODE_STYLES,
  MODE_COLORS,
  TOAST_MESSAGES,
  AUTOMATED_OPTIONS,
} from '../../../../../utils/constants/interviewModeConstants';

const InterviewModeForm = ({ next, previous }) => {
  // Redux selectors
  const interviewData = useSelector(
    state => state.interview.createInterviewData,
  );
  const createdInterview = useSelector(
    state => state.interview.createdInterview,
  );

  // UI-only field - keep in component state (not in Redux)
  const [interviewMode, setInterviewMode] = useState(INTERVIEW_MODE.AUTOMATED);
  const [automatedOption, setAutomatedOption] = useState(
    AUTOMATED_OPTION.DYNAMIC,
  );
  const [errors, setErrors] = useState({});
  const [questions, setQuestions] = useState([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasFetchedPredefined, setHasFetchedPredefined] = useState(false);

  // Memoize interview ID and question count
  const interviewId = useMemo(() => {
    return (
      createdInterview?.id ||
      createdInterview?.uuid ||
      createdInterview?.interview_id
    );
  }, [createdInterview]);

  const questionCount = useMemo(() => {
    return interviewData?.question_count || 3;
  }, [interviewData?.question_count]);

  // Initialize questions for manual mode when mode changes
  useEffect(() => {
    if (interviewMode === INTERVIEW_MODE.MANUAL) {
      const emptyQuestions = Array.from(
        { length: parseInt(questionCount) || 3 },
        (_, i) => ({
          id: '',
          question: '',
          depth_level: 'medium',
        }),
      );
      setQuestions(emptyQuestions);
    }
  }, [interviewMode, questionCount]);

  // Memoize fetch function
  const fetchPredefinedQuestions = useCallback(async () => {
    if (!interviewId) {
      showToast('error', 'Error', TOAST_MESSAGES.INTERVIEW_ID_NOT_FOUND);
      return;
    }

    setIsLoadingQuestions(true);
    try {
      const response = await generateQuestions(
        interviewId,
        parseInt(questionCount) || 3,
      );
      if (response.body?.ok && response.body?.questions) {
        setQuestions(response.body.questions);
        setHasFetchedPredefined(true);
        showToast('success', 'Success', TOAST_MESSAGES.QUESTIONS_GENERATED);
      } else {
        showToast('error', 'Error', TOAST_MESSAGES.QUESTIONS_GENERATE_FAILED);
      }
    } catch (error) {
      showToast(
        'error',
        'Error',
        error.error || TOAST_MESSAGES.QUESTIONS_GENERATE_FAILED,
      );
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [interviewId, questionCount]);

  // Memoize handlers
  const handlePredefinedSelect = useCallback(() => {
    setAutomatedOption(AUTOMATED_OPTION.PREDEFINED);
    if (interviewId && !hasFetchedPredefined) {
      fetchPredefinedQuestions();
    } else if (!interviewId) {
      showToast('error', 'Error', TOAST_MESSAGES.INTERVIEW_ID_NOT_FOUND);
    }
  }, [interviewId, hasFetchedPredefined, fetchPredefinedQuestions]);

  const handleDynamicSelect = useCallback(() => {
    setAutomatedOption(AUTOMATED_OPTION.DYNAMIC);
  }, []);

  const handleFieldChange = useCallback(value => {
    setInterviewMode(value);
    setErrors(prev => {
      if (prev.interviewMode) {
        return { ...prev, interviewMode: '' };
      }
      return prev;
    });
  }, []);

  const handleQuestionChange = useCallback((index, value) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], question: value };
      return copy;
    });
  }, []);

  // Extract validation logic
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (
      !interviewMode ||
      (interviewMode !== INTERVIEW_MODE.AUTOMATED &&
        interviewMode !== INTERVIEW_MODE.MANUAL)
    ) {
      newErrors.interviewMode = TOAST_MESSAGES.SELECT_MODE;
    }
    if (interviewMode === INTERVIEW_MODE.AUTOMATED && !automatedOption) {
      newErrors.automatedOption = TOAST_MESSAGES.CHOOSE_OPTION;
    }
    if (interviewMode === INTERVIEW_MODE.MANUAL) {
      const emptyQuestions = questions.filter(
        q => !q.question || q.question.trim() === '',
      );
      if (emptyQuestions.length > 0) {
        newErrors.questions = TOAST_MESSAGES.FILL_QUESTIONS;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [interviewMode, automatedOption, questions]);

  // Extract payload building logic
  const buildUpdatePayload = useCallback(() => {
    const payload = {
      interview_id: interviewId,
      name: interviewData.name,
      objective: interviewData.description || interviewData.name,
    };

    if (interviewMode === INTERVIEW_MODE.AUTOMATED) {
      payload.mode =
        automatedOption === AUTOMATED_OPTION.PREDEFINED
          ? INTERVIEW_MODE.AUTOMATED
          : 'dynamic';
      payload.auto_question_generate = 'true';
      payload.manual_questions = [];
    } else {
      payload.mode = INTERVIEW_MODE.MANUAL;
      payload.auto_question_generate = 'false';
      payload.manual_questions = questions.map(q => ({
        id: q.id || '',
        question: q.question,
        depth_level: q.depth_level || 'medium',
      }));
    }

    return payload;
  }, [interviewId, interviewData, interviewMode, automatedOption, questions]);

  const handleNext = useCallback(async () => {
    if (!validateForm()) {
      showToast('error', 'Validation Error', TOAST_MESSAGES.VALIDATION_ERROR);
      return;
    }

    if (!interviewId) {
      showToast('error', 'Error', TOAST_MESSAGES.INTERVIEW_ID_NOT_FOUND);
      return;
    }

    setIsUpdating(true);
    try {
      const updatePayload = buildUpdatePayload();
      const response = await updateInterview(updatePayload);

      if (response.body?.ok || response.status === 200) {
        showToast('success', 'Success', TOAST_MESSAGES.MODE_UPDATED);
        next();
      } else {
        showToast('error', 'Error', TOAST_MESSAGES.MODE_UPDATE_FAILED);
      }
    } catch (error) {
      showToast(
        'error',
        'Error',
        error.error || TOAST_MESSAGES.MODE_UPDATE_FAILED,
      );
    } finally {
      setIsUpdating(false);
    }
  }, [validateForm, interviewId, buildUpdatePayload, next]);

  const handlePrevious = useCallback(() => {
    previous();
  }, [previous]);

  // Memoize question list props
  const questionListProps = useMemo(
    () => ({
      questions,
      onQuestionChange: handleQuestionChange,
      isLoading: isLoadingQuestions,
    }),
    [questions, handleQuestionChange, isLoadingQuestions],
  );

  return (
    <Box mt={6} pb={6}>
      <Box>
        <Text fontSize="lg" fontWeight="700" mb={4}>
          Mode Selection
        </Text>

        <SelectField
          label="Select Mode"
          value={interviewMode}
          onChange={e => handleFieldChange(e.target.value)}
          options={[
            { value: INTERVIEW_MODE.AUTOMATED, label: 'Automated' },
            { value: INTERVIEW_MODE.MANUAL, label: 'Manual' },
          ]}
          required
          error={errors.interviewMode}
          selectProps={{ maxW: '360px' }}
        />

        {/* Automated Flow */}
        {interviewMode === INTERVIEW_MODE.AUTOMATED && (
          <Box mt={4}>
            <Box
              p={MODE_STYLES.CONTAINER_PADDING}
              border="1px solid"
              borderColor={MODE_COLORS.BORDER}
              bg={MODE_COLORS.BACKGROUND}
              borderRadius={MODE_STYLES.CONTAINER_BORDER_RADIUS}>
              <HStack spacing={4} align="stretch">
                {AUTOMATED_OPTIONS.map(option => (
                  <AutomatedOptionCard
                    key={option.key}
                    title={option.title}
                    description={option.description}
                    isSelected={automatedOption === option.key}
                    onSelect={
                      option.key === AUTOMATED_OPTION.PREDEFINED
                        ? handlePredefinedSelect
                        : handleDynamicSelect
                    }
                  />
                ))}
              </HStack>
              {errors.automatedOption && (
                <Text color="red.500" fontSize="sm" mt={2}>
                  {errors.automatedOption}
                </Text>
              )}
            </Box>

            {/* Automated: Predefined -> show preview of questions */}
            {automatedOption === AUTOMATED_OPTION.PREDEFINED && (
              <Box
                mt={6}
                p={MODE_STYLES.CONTAINER_PADDING}
                border="1px solid"
                borderColor={MODE_COLORS.BORDER}
                bg={MODE_COLORS.BACKGROUND}
                borderRadius={MODE_STYLES.CONTAINER_BORDER_RADIUS}>
                <Text fontWeight="700" mb={3}>
                  Questions
                </Text>

                {isLoadingQuestions ? (
                  <Flex justify="center" align="center" py={8}>
                    <Spinner size="lg" color="primary.500" />
                    <Text ml={4}>Generating questions...</Text>
                  </Flex>
                ) : (
                  <>
                    <QuestionList {...questionListProps} />
                    <Pagination currentPage={1} totalPages={10} />
                  </>
                )}
              </Box>
            )}

            {/* Automated: Dynamic -> note only */}
            {automatedOption === AUTOMATED_OPTION.DYNAMIC && (
              <Text fontSize="sm" color="gray.600" mt={6}>
                Note: In Dynamic Mode, the AI will generate and ask questions on
                the spot based on the job description and candidate responses.
              </Text>
            )}
          </Box>
        )}

        {/* Manual Flow */}
        {interviewMode === INTERVIEW_MODE.MANUAL && (
          <Box mt={4}>
            <Box
              p={MODE_STYLES.CONTAINER_PADDING}
              border="1px solid"
              borderColor={MODE_COLORS.BORDER}
              bg={MODE_COLORS.BACKGROUND}
              borderRadius={MODE_STYLES.CONTAINER_BORDER_RADIUS}>
              <Text fontWeight="700" mb={3}>
                Questions
              </Text>
              <QuestionList {...questionListProps} />
              {errors.questions && (
                <Text color="red.500" fontSize="sm" mt={2}>
                  {errors.questions}
                </Text>
              )}
              <Pagination currentPage={1} totalPages={10} />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

InterviewModeForm.propTypes = {
  next: PropTypes.func.isRequired,
  previous: PropTypes.func.isRequired,
};

export default React.memo(InterviewModeForm);
