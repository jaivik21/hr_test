import React from 'react';
import PropTypes from 'prop-types';
import { Box, Text, Flex, VStack } from '@chakra-ui/react';
import InfoRow from './InfoRow';

const BasicInfoSection = ({ interviewData, selectedInterviewer }) => {
  return (
    <VStack align="stretch" spacing={5}>
      {/* Top row - Title, No. of Questions, Duration in a grid */}
      <Flex gap={6} flexWrap="wrap" align="flex-start">
        <Box flex="1" minW="200px">
          <InfoRow label="Title" value={interviewData.name} />
        </Box>

        <Box flex="1" minW="150px">
          <InfoRow
            label="No. of Questions"
            value={interviewData.question_count}
          />
        </Box>

        <Box flex="1" minW="150px">
          <InfoRow
            label="Duration"
            value={
              interviewData.duration_minutes
                ? `${interviewData.duration_minutes} minutes`
                : null
            }
          />
        </Box>
      </Flex>

      {/* Interviewer */}
      <InfoRow label="Interviewer" value={selectedInterviewer?.name} />

      {/* Interview Description */}
      <Box>
        <Text fontSize="sm" color="gray.600" fontWeight={500} mb={2}>
          Interview Description
        </Text>
        <Text
          fontSize="md"
          color="gray.700"
          whiteSpace="pre-wrap"
          lineHeight="1.6">
          {interviewData.description || '-'}
        </Text>
      </Box>
    </VStack>
  );
};

BasicInfoSection.propTypes = {
  interviewData: PropTypes.object.isRequired,
  selectedInterviewer: PropTypes.object,
};

export default React.memo(BasicInfoSection);
