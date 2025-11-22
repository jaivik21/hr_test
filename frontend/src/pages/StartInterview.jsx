import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Image,
} from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setInterviewDetails, setStartInterviewResponse, setCandidateEmail, setCandidateName } from '../redux/slices/candidateSlice';
import interviewDescriptionIcon from '../assets/Interview Description.svg';
import { getInterviewDataApi, startInterviewApi } from '../api/candidateService';
import Loader from '../components/Loader/Loader';
import InfoCard from '../components/candidate/InfoCard';
import PreventBack from '../components/PreventBack/PreventBack';
import InputField from '../components/InputField/InputField';
import { showToast } from '../components/Toast/ShowToast';
import { TOAST_ERROR_STATUS } from '../utils/constants/titleConstant';
import messages from '../utils/constants/messages';
import { EMAIL_REGEX, NAME_REGEX } from '../utils/constants/regexPatterns';

const StartInterview = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // new states for API data
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  // Fetch interview from backend
  useEffect(() => {
    const fetchInterview = async () => {
      try {
        setLoading(true);

        // Get interviewId from URL query parameter (e.g., ?id=123)
        // const interviewId = searchParams.get('id');

        // if (!interviewId) {
        //   showToast(
        //     TOAST_ERROR_STATUS,
        //     messages.VALIDATION_ERROR,
        //     'Interview ID is required in the URL (e.g., /candidate?id=123)',
        //   );
        //   setLoading(false);
        //   return;
        // }

        // Default to hardcoded interview ID for testing if not provided
        const interviewId = searchParams.get('id') || '138324f3-ff3f-4c83-a588-d62f02366421';

        const response = await getInterviewDataApi(interviewId);        

        // API Service returns { body, status, error }
        if (response.error) {
          showToast(
            TOAST_ERROR_STATUS,
            messages.ERROR_LOADING_INTERVIEW_DETAILS,
            response.error,
          );
          return;
        }

        // API returns interview object directly: { ok, id, name, description, is_open }
        const interviewData = response.body?.data || response.body;
        if (!interviewData || !interviewData.id) {
          showToast(
            TOAST_ERROR_STATUS,
            messages.ERROR_LOADING_INTERVIEW_DETAILS,
            'No interview found with the provided ID',
          );
          return;
        }
        
        // Check if response is ok (if ok field exists)
        if (interviewData.ok === false) {
          showToast(
            TOAST_ERROR_STATUS,
            messages.ERROR_LOADING_INTERVIEW_DETAILS,
            messages.FAILED_TO_LOAD_INTERVIEW_DETAILS,
          );
          return;
        }

        setInterview(interviewData);

        // Store interview details in Redux for later use
        try {
          dispatch(setInterviewDetails(interviewData));
        } catch (e) {
          // non-fatal - just log
          console.warn('Failed to save interview details to redux', e);
        }
      } catch (err) {
        console.error("API Error:", err);
        showToast(
          TOAST_ERROR_STATUS,
          messages.ERROR_LOADING_INTERVIEW_DETAILS,
          err?.error || messages.FAILED_TO_LOAD_INTERVIEW_DETAILS,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [searchParams]);

  const handleNavigate = async () => {
    // Validate form fields
    if (!name.trim()) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.VALIDATION_ERROR,
        'Please enter your name',
      );
      return;
    }
    // Name validation
    if (!NAME_REGEX.test(name.trim())) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.VALIDATION_ERROR,
        'Please enter a valid name (letters, spaces, hyphens, apostrophes, and periods only)',
      );
      return;
    }
    if (!email.trim()) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.VALIDATION_ERROR,
        messages.EMAIL_ERROR,
      );
      return;
    }
    // Email validation
    if (!EMAIL_REGEX.test(email.trim())) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.VALIDATION_ERROR,
        messages.EMAIL_ERROR,
      );
      return;
    }

    // Get interviewId from URL or use default
    const interviewId = searchParams.get('id') || '138324f3-ff3f-4c83-a588-d62f02366421';

    try {
      setSubmitting(true);

      const response = await startInterviewApi(interviewId, name.trim(), email.trim());

      // API Service returns { body, status, error }
      if (response.error) {
        showToast(
          TOAST_ERROR_STATUS,
          messages.SOMETHING_WENT_WRONG_ERROR,
          response.error,
        );
        setSubmitting(false);
        return;
      }

      // store start interview response in redux for later steps
      try {
        // prefer response.body (API wrapper uses body/data)
        const payload = response.body?.data || response.body || null;
        if (payload) 
          dispatch(setStartInterviewResponse(payload));
        // Also store candidate email and name for later uses
        dispatch(setCandidateEmail(email.trim()));
        dispatch(setCandidateName(name.trim()));
      } catch (e) {
        // non-fatal - just log
        // eslint-disable-next-line no-console
        console.warn('Failed to save start interview response to redux', e);
      }

      // On success, navigate to Instructions page
      // You can also store response_id and session_token from response.body if needed
      navigate("/Instructions");
    } catch (err) {
      console.error("Submit Error:", err);
      showToast(
        TOAST_ERROR_STATUS,
        messages.SOMETHING_WENT_WRONG_ERROR,
        err?.error || 'Failed to start interview. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <>
      <PreventBack />
      <Loader isLoading={loading || submitting} text={loading ? "Loading interview details..." : "Starting interview..."} />
      <Box
        p={4} minH="100vh"
        bg="secondary.100">
        <Box maxW="800px" mx="auto">
          {/* Header Section */}
          <VStack align="stretch" spacing={2} mb={8} textAlign="center">
            <Heading
              size="xl"
              color="primary.500"
              fontWeight={700}>
              Start Interview
            </Heading>
            <Text color="secondaryText" fontSize="md">
              Interview ID: {interview?.id || "N/A"}
            </Text>
          </VStack>

        <VStack align="stretch" spacing={6}>
          {/* Interview Description Card */}
          <InfoCard>
            <HStack spacing={3} align="center" mb={3}>
              <Image
                src={interviewDescriptionIcon}
                alt="Interview description icon"
                boxSize="24px"
              />
              <Heading size="md" color="primaryText" fontWeight={600}>
                Interview Description
              </Heading>
            </HStack>
            <VStack align="stretch" spacing={3}>
              {interview ? (
                <>
                  {/* 🔥 Dynamic Title */}
                  <Text color="primaryText" fontSize="md" lineHeight="1.6">
                    Welcome to your{" "}
                    <Text as="span" fontWeight={600} color="primary.500">
                      {interview?.name || "Interview"}
                    </Text>{" "}
                    Interview!
                  </Text>

                  {/* 🔥 Dynamic Description */}
                  <Text color="primaryText" fontSize="md" lineHeight="1.6">
                    {interview?.description || interview?.job_description || "No description available"}
                  </Text>

                  {/* 🔥 Dynamic Questions Count */}
                  <Text color="primaryText" fontSize="md" lineHeight="1.6">
                    This interview will include{" "}
                    <Text as="span" fontWeight={600}>
                      {interview?.question_count || "N/A"} questions.
                    </Text>
                  </Text>
                  {/* 🔥 Dynamic Duration */}
                  <Text color="primaryText" fontSize="md" lineHeight="1.6">
                    It will take approximately{" "}
                    <Text as="span" fontWeight={600}>
                      {interview?.time_duration || "N/A"} minutes
                    </Text>{" "}
                    to complete.
                  </Text>

                  <Text color="primaryText" fontSize="md" lineHeight="1.6">
                    Please ensure you are in a quiet environment.
                  </Text>
                </>
              ) : (
                <Text color="secondaryText" fontSize="md">
                  Loading interview details...
                </Text>
              )}
            </VStack>
          </InfoCard>

          {/* Candidate Details Card */}
          <InfoCard>
            <Heading size="md" color="primaryText" mb={4} fontWeight={600}>
              Candidate Details
            </Heading>
            <HStack align="stretch" spacing={4}>
              <InputField
                label="Name"
                name="name"
                type="text"
                value={name}
                handleChange={(e) => setName(e.target.value)}
                placeholder="Enter Candidate Name"
                required={true}
                flex={1}
                inputProps={{ size: 'md' }}
              />
              <InputField
                label="Email"
                name="email"
                type="email"
                value={email}
                handleChange={(e) => setEmail(e.target.value)}
                placeholder="Demo@example.com"
                required={true}
                flex={1}
                inputProps={{ size: 'md' }}
              />
            </HStack>
          </InfoCard>
          {/* Proceed Button */}
          <Box mt={2}>
            <Button
              bg="primary.500"
              color="white"
              size="lg"
              width="100%"
              height="56px"
              fontSize="md"
              fontWeight={500}
              borderRadius="md"
              onClick={handleNavigate}
              _hover={{
                bg: 'primary.600',
              }}
              overflow="visible">
              <HStack spacing={3}>
                <Text>Proceed to Interview Set up</Text>
              </HStack>
            </Button>
          </Box>

          {/* Footer Text */}
          <Text
            color="secondaryText"
            fontSize="sm"
            textAlign="center"
            mt={4}>
            You'll verify your camera and screen permissions in the next step.
          </Text>
        </VStack>
      </Box>
    </Box>
    </>
  );
};

export default StartInterview;