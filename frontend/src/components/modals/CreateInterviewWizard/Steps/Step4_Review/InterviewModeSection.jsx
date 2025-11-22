import React from 'react';
import PropTypes from 'prop-types';
import { Box, Text, VStack } from '@chakra-ui/react';
import InfoRow from './InfoRow';
import {
  INTERVIEW_MODE,
  AUTOMATED_OPTION,
} from '../../../../../utils/constants/interviewModeConstants';

const InterviewModeSection = ({
  interviewMode,
  automatedOption,
  questions,
  isLoadingQuestions,
}) => {
  const modeLabel =
    interviewMode === INTERVIEW_MODE.AUTOMATED ? 'Automated' : 'Manual';
  const typeLabel =
    automatedOption === AUTOMATED_OPTION.PREDEFINED ? 'Predefined' : 'Dynamic';

  const shouldShowQuestions =
    (interviewMode === INTERVIEW_MODE.AUTOMATED &&
      automatedOption === AUTOMATED_OPTION.PREDEFINED) ||
    interviewMode === INTERVIEW_MODE.MANUAL;

  return (
    <VStack align="stretch" spacing={4}>
      <InfoRow label="Mode" value={modeLabel} />

      {interviewMode === INTERVIEW_MODE.AUTOMATED && (
        <InfoRow label="Type" value={typeLabel} />
      )}

      {shouldShowQuestions && (
        <Box>
          <Text fontSize="sm" color="gray.600" fontWeight={500} mb={3}>
            Questions
          </Text>
          {isLoadingQuestions ? (
            <Text fontSize="md" color="gray.500">
              Loading questions...
            </Text>
          ) : questions.length > 0 ? (
            <VStack align="stretch" spacing={3}>
              {questions.map((q, idx) => (
                <Text
                  key={q.id || idx}
                  fontSize="md"
                  color="gray.700"
                  lineHeight="1.6">
                  {idx + 1}. {q.question || q.question_text || '-'}
                </Text>
              ))}
            </VStack>
          ) : (
            <Text fontSize="md" color="gray.500">
              No questions available
            </Text>
          )}
        </Box>
      )}
    </VStack>
  );
};

InterviewModeSection.propTypes = {
  interviewMode: PropTypes.string.isRequired,
  automatedOption: PropTypes.string.isRequired,
  questions: PropTypes.array.isRequired,
  isLoadingQuestions: PropTypes.bool,
};

export default React.memo(InterviewModeSection);
