import React, { useState } from 'react';
import {
  Button,
  Heading,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectInterviewDetails, selectStartInterviewResponse, selectCandidateEmail } from '../redux/slices/candidateSlice';
import { submitFeedbackApi } from '../api/candidateService';
import Loader from '../components/Loader/Loader';
import PageContainer from '../components/candidate/PageContainer';
import RatingSelector from '../components/candidate/RatingSelector';
import { showToast } from '../components/Toast/ShowToast';
import { TOAST_ERROR_STATUS } from '../utils/constants/titleConstant';
import messages from '../utils/constants/messages';

import ratingVeryPoor from '../assets/😞.svg';
import ratingPoor from '../assets/😕.svg';
import ratingAverage from '../assets/😐.svg';
import ratingGood from '../assets/🙂.svg';
import ratingExcellent from '../assets/😄.svg';
import PreventBack from '../components/PreventBack/PreventBack';

const ratings = [
  { id: 'very-poor', label: 'Needs Improvement', icon: ratingVeryPoor, value: 1 },
  { id: 'poor', label: '', icon: ratingPoor, value: 2 },
  { id: 'average', label: '', icon: ratingAverage, value: 3 },
  { id: 'good', label: '', icon: ratingGood, value: 4 },
  { id: 'excellent', label: 'Excellent', icon: ratingExcellent, value: 5 },
];

const Feedback = () => {
  const [selectedRating, setSelectedRating] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const interviewDetails = useSelector(selectInterviewDetails);
  const startInterviewResponse = useSelector(selectStartInterviewResponse);
  const candidateEmail = useSelector(selectCandidateEmail);

  const handleSelectRating = ratingId => {
    setSelectedRating(ratingId);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedRating) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.VALIDATION_ERROR,
        'Please select a rating',
      );
      return;
    }

    // Get interview_id and email from Redux
    // Extract from startInterviewResponse first, then fallback to interviewDetails
    const currentInterviewId = startInterviewResponse?.interview_id || interviewDetails?.id;
    const email = candidateEmail || startInterviewResponse?.candidate_email || startInterviewResponse?.email;

    if (!currentInterviewId) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.ERROR_LOADING_INTERVIEW_DETAILS,
        'Interview ID not found. Please try again.',
      );
      return;
    }

    if (!email) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.VALIDATION_ERROR,
        'Email not found. Please try again.',
      );
      return;
    }

    // Get satisfaction value from selected rating
    const selectedRatingObj = ratings.find(r => r.id === selectedRating);
    const satisfaction = selectedRatingObj?.value || 1;

    try {
      setSubmitting(true);

      // Get response_id from startInterviewResponse
      const currentResponseId = startInterviewResponse?.response_id;

      const response = await submitFeedbackApi(
        currentInterviewId,
        email,
        feedback.trim(),
        satisfaction,
        currentResponseId
      );

      // API Service returns { body, status, error }
      if (response.error) {
        showToast(
          TOAST_ERROR_STATUS,
          messages.SOMETHING_WENT_WRONG_ERROR,
          response.error || 'Failed to submit feedback. Please try again.',
        );
        setSubmitting(false);
        return;
      }

      // On success, you can navigate to a thank you page or show success message
      // For now, just navigate back or show success
      navigate('/thankyou');
    } catch (err) {
      console.error('Submit Feedback Error:', err);
      showToast(
        TOAST_ERROR_STATUS,
        messages.SOMETHING_WENT_WRONG_ERROR,
        err?.error || 'Failed to submit feedback. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <>
      <PreventBack />
      <Loader isLoading={submitting} text="Submitting feedback..." />
      <PageContainer maxW="520px">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <VStack spacing={2} textAlign="center">
            <Heading size="lg" color="primaryText" fontWeight={700}>
              We'd love your feedback!
            </Heading>
            <Text color="secondaryText" fontSize="md">
              Your thoughts help us improve future interviews.
            </Text>
          </VStack>

          {/* Rating Section */}
          <RatingSelector
            ratings={ratings}
            selectedRating={selectedRating}
            onSelect={handleSelectRating}
          />

          {/* Feedback Textarea */}
          <VStack align="stretch" spacing={3}>
            <Text fontWeight={600} color="primaryText">
              Tell us a bit more about your experience
            </Text>
            <Textarea
              value={feedback}
              onChange={event => setFeedback(event.target.value)}
              placeholder="What did you like about the interview process? Any suggestions for improvement?"
              bg="white"
              borderColor="stroke"
              _hover={{ borderColor: 'stroke' }}
              _focus={{ borderColor: 'primary.500', boxShadow: 'none' }}
              resize="none"
              minH="140px"
            />
          </VStack>

          {/* Submit Button */}
          <VStack spacing={2}>
            <Button
              width="100%"
              height="48px"
              fontWeight={600}
              isDisabled={!selectedRating || submitting}
              onClick={handleSubmitFeedback}
              _disabled={{
                bg: 'gray.300',
                cursor: 'not-allowed',
              }}>
              Submit Feedback
            </Button>
            <Text fontSize="xs" color="secondaryText">
              Thank you for helping us improve your experience!
            </Text>
          </VStack>
        </VStack>
      </PageContainer>
    </>
  );
};

export default Feedback;