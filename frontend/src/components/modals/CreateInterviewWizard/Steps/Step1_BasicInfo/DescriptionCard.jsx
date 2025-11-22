import { Box, Text } from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import TextAreaInputField from '../../../../TextAreaInputField/TextAreaInputField';
import { setInterviewField } from '../../../../../redux/slices/interviewSlice';

const DescriptionCard = () => {
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
        Description
      </Text>

      <TextAreaInputField
        label="Interview Description"
        name="description"
        placeholder="Enter"
        value={interviewData.description || ''}
        onChange={e => handleFieldChange('description', e.target.value)}
        rows={6}
        error={validationErrors.description}
      />
    </Box>
  );
};

export default DescriptionCard;
