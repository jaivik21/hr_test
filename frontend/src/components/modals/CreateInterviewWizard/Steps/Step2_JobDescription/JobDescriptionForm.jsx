import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { setInterviewField } from '../../../../../redux/slices/interviewSlice';
import FileUpload from '../../../../FileUpload/FileUpload';
import uploadIcon from '../../../../../assets/images/upload-jd.svg';
import FILE_UPLOAD from '../../../../../utils/constants/fileUploadConstants';

const JobDescriptionForm = () => {
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

  const handleFileChange = file => {
    dispatch(setInterviewField({ field: 'jd_file', value: file }));
  };

  return (
    <Box>
      {/* Main Heading */}
      <Text
        fontSize="20px"
        fontWeight="700"
        color="primaryText"
        mb="24px"
        lineHeight="1.5">
        {FILE_UPLOAD.LABELS.DESCRIPTION}
      </Text>

      {/* Job Description Field */}
      <FormControl isRequired isInvalid={!!validationErrors.job_description}>
        <Flex justify="space-between" align="center" mb="8px">
          <FormLabel
            fontSize="14px"
            fontWeight="500"
            color="secondaryText"
            mb={0}
            requiredIndicator={
              <Text as="span" color="error.500" ml="4px">
                *
              </Text>
            }>
            {FILE_UPLOAD.LABELS.JOB_DESCRIPTION}
          </FormLabel>
          <FileUpload
            onFileChange={handleFileChange}
            uploadIcon={uploadIcon}
            iconAlt="Upload JD"
            tooltip={FILE_UPLOAD.LABELS.UPLOAD_JD_TOOLTIP}
            uploadedFile={interviewData.jd_file}
          />
        </Flex>

        <Textarea
          name="job_description"
          placeholder="Enter"
          value={interviewData.job_description || ''}
          onChange={e => handleFieldChange('job_description', e.target.value)}
          minH={FILE_UPLOAD.STYLING.TEXTAREA_MIN_HEIGHT}
          fontSize={FILE_UPLOAD.STYLING.TEXTAREA_FONT_SIZE}
          borderColor={
            validationErrors.job_description ? 'error.500' : 'gray.300'
          }
          borderRadius="8px"
          _hover={{
            borderColor: validationErrors.job_description
              ? 'error.500'
              : 'gray.400',
          }}
          _focus={{
            borderColor: validationErrors.job_description
              ? 'error.500'
              : 'primary.500',
            boxShadow: validationErrors.job_description
              ? '0 0 0 1px var(--chakra-colors-error-500)'
              : '0 0 0 1px var(--chakra-colors-primary-500)',
          }}
          resize="vertical"
        />
      </FormControl>
    </Box>
  );
};

export default JobDescriptionForm;
