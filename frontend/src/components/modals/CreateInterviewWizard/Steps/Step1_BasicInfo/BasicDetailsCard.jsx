import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Text,
  FormErrorMessage,
} from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import InputField from '../../../../InputField/InputField';
import InterviewerCard from '../../../../InterviewerCard/InterviewerCard';
import { setInterviewField } from '../../../../../redux/slices/interviewSlice';
import { interviewers } from '../../../../../mocks/interviewers';

const BasicDetailsCard = () => {
  const dispatch = useDispatch();
  const interviewData = useSelector(
    state => state.interview.createInterviewData,
  );
  const validationErrors = useSelector(
    state => state.interview.validationErrors,
  );

  const handleFieldChange = (field, value) => {
    dispatch(setInterviewField({ field, value }));
  };

  return (
    <Box bg="white" p="24px" borderRadius="10px" w="full">
      <Text
        fontSize="20px"
        fontWeight="700"
        color="primaryText"
        mb="16px"
        lineHeight="1.5">
        Basic Details
      </Text>

      {/* Three fields in a row with equal widths */}
      <Flex gap="16px" mb="24px">
        <InputField
          label="Interview Title"
          name="name"
          type="text"
          value={interviewData.name || ''}
          handleChange={e => handleFieldChange('name', e.target.value)}
          placeholder="e.g., Frontend Developer Interview"
          error={validationErrors.name}
          flex="1"
        />

        <InputField
          label="No. of Questions"
          name="question_count"
          type="number"
          value={interviewData.question_count || ''}
          handleChange={e =>
            handleFieldChange('question_count', e.target.value)
          }
          placeholder="3"
          error={validationErrors.question_count}
          flex="1"
          inputProps={{ min: 1 }}
        />

        <InputField
          label="Duration (minutes)"
          name="duration_minutes"
          type="number"
          value={interviewData.duration_minutes || ''}
          handleChange={e =>
            handleFieldChange('duration_minutes', e.target.value)
          }
          placeholder="10"
          error={validationErrors.duration_minutes}
          flex="1"
          inputProps={{ min: 1 }}
        />
      </Flex>

      {/* Select an Interviewer */}
      <Box>
        <FormControl isRequired isInvalid={!!validationErrors.interviewer_id}>
          <FormLabel
            fontSize="14px"
            fontWeight="500"
            color="secondaryText"
            mb="8px"
            requiredIndicator={
              <Text as="span" color="error.500" ml="4px">
                *
              </Text>
            }>
            Select an Interviewer
          </FormLabel>
          <Flex gap="16px" mt="16px">
            {interviewers.map(interviewer => (
              <InterviewerCard
                key={interviewer.name}
                interviewer={interviewer}
                isSelected={interviewData.interviewer_id === interviewer.id}
                onSelect={selected =>
                  handleFieldChange('interviewer_id', selected.id)
                }
              />
            ))}
          </Flex>
          {validationErrors.interviewer_id && (
            <FormErrorMessage mt="8px">
              {validationErrors.interviewer_id}
            </FormErrorMessage>
          )}
        </FormControl>
      </Box>
    </Box>
  );
};

export default BasicDetailsCard;
