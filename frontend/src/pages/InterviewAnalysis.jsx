import { useState, useEffect } from 'react';
import { Box, Text, Heading, Flex } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { themeColor } from '../utils/constants/constants';
import HistoricalInterviewAnalysis from '../components/interviews/HistoricalInterviewAnalysis';
import VisualizationInterviewAnalysis from '../components/interviews/VisualizationInterviewAnalysis';
import { getOverallAnalysis } from '../api/InterviewsService';
import { setLoadingState } from '../redux/slices/loaderSlice';
import { showToast } from '../components/Toast/ShowToast';
import { TOAST_ERROR_STATUS } from '../utils/constants/titleConstant';
import messages from '../utils/constants/messages';

const InterviewAnalysis = () => {
  const { interviewId } = useParams();
  const dispatch = useDispatch();
  const [interviewDetails, setInterviewDetails] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' for table, 'chart' for visualization

  useEffect(() => {
    fetchInterviewDetails();
  }, [interviewId]);

  const fetchInterviewDetails = async () => {
    if (!interviewId) return;

    try {
      dispatch(setLoadingState(true));
      const response = await getOverallAnalysis(interviewId, {
        period: 'weekly',
        include_candidates: false,
      });

      const data = response?.body;
      if (data && data.ok) {
        setInterviewDetails({
          name: data.interview.name || 'Untitled Interview',
          description:
            data.interview.description || data.interview.description || '',
          interviewer:
            data.interview.interviewer_name || data.interview.interviewer || '',
        });
      }
    } catch (error) {
      showToast(
        TOAST_ERROR_STATUS,
        messages.ERROR_LOADING_INTERVIEW_DETAILS,
        error?.error || messages.FAILED_TO_LOAD_INTERVIEW_DETAILS,
      );
    } finally {
      dispatch(setLoadingState(false));
    }
  };

  return (
    <Box px={{ base: '1rem', md: '2rem' }} py="2rem">
      {/* Interview Details Section */}
      {interviewDetails && (
        <Box mb="2rem" bg="white" borderRadius="lg" p="1.5rem" boxShadow="sm">
          <Flex justify="space-between" align="flex-start" mb="1rem">
            <Heading size="md" color={themeColor.PRIMARY_TEXT_COLOR}>
              {interviewDetails.name}
            </Heading>
            {interviewDetails.interviewer && (
              <Text fontSize="sm" color={themeColor.SECONDARY_TEXT_COLOR}>
                Interviewer used:{' '}
                <Text as="span" fontWeight="semibold">
                  {interviewDetails.interviewer}
                </Text>
              </Text>
            )}
          </Flex>
          {interviewDetails.description && (
            <Box>
              <Text
                fontSize="sm"
                fontWeight="semibold"
                mb="0.5rem"
                color={themeColor.SECONDARY_TEXT_COLOR}>
                Interview Description
              </Text>
              <Text fontSize="sm" lineHeight="1.6">
                {interviewDetails.description}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* View Mode Switching - List or Chart */}
      {viewMode === 'list' ? (
        <HistoricalInterviewAnalysis
          interviewId={interviewId}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      ) : (
        <VisualizationInterviewAnalysis
          interviewId={interviewId}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}
    </Box>
  );
};

export default InterviewAnalysis;
