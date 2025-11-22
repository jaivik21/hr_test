import React from 'react';
import PropTypes from 'prop-types';
import { Box, Text, Textarea, VStack } from '@chakra-ui/react';
import { MODE_COLORS } from '../../../../../utils/constants/interviewModeConstants';

const QuestionList = ({
  questions,
  onQuestionChange,
  isLoading,
  emptyMessage,
}) => {
  if (isLoading) {
    return null; // Loading handled by parent
  }

  if (questions.length === 0) {
    return (
      <Text color="gray.500" py={4}>
        {emptyMessage || 'No questions available. Please try again.'}
      </Text>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {questions.map((q, idx) => (
        <Box key={q.id || idx}>
          <Text fontWeight="600" mb={2}>
            Question {idx + 1}
          </Text>
          <Textarea
            value={q.question || ''}
            onChange={e => onQuestionChange(idx, e.target.value)}
            placeholder="e.g. Can you tell me about a challenging project you've worked on?"
            bg="white"
            borderColor={MODE_COLORS.TEXTAREA_BORDER}
            _hover={{ borderColor: 'gray.400' }}
            _focus={{
              borderColor: 'primary.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)',
            }}
            resize="none"
          />
        </Box>
      ))}
    </VStack>
  );
};

QuestionList.propTypes = {
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      question: PropTypes.string,
    }),
  ).isRequired,
  onQuestionChange: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  emptyMessage: PropTypes.string,
};

export default React.memo(QuestionList);
