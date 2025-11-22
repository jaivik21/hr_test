import { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Flex, SimpleGrid, HStack, IconButton } from '@chakra-ui/react';
import { FiList, FiBarChart2 } from 'react-icons/fi';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import {
  themeColor,
  PERIOD_OPTIONS,
  DEFAULT_PERIOD,
  CHART_LABELS,
  CHART_CONFIG,
  DEFAULT_VALUES,
  RESPONSIVE_STYLES,
} from '../../utils/constants/constants';
import {
  prepareChartData,
  createChartDataLabelsPlugin,
} from '../../utils/helper';
import { getOverallAnalysis } from '../../api/InterviewsService';
import { setLoadingState } from '../../redux/slices/loaderSlice';
import { useDispatch } from 'react-redux';
import { showToast } from '../Toast/ShowToast';
import { TOAST_ERROR_STATUS } from '../../utils/constants/titleConstant';
import { SingleReactSelect } from '../SingleReactSelect/SingleReactSelect';
import ChartCard from './ChartCard';
import MetricCard from './MetricCard';

// Register Chart.js components
ChartJS.register(ArcElement, ChartTooltip, Legend);

const VisualizationInterviewAnalysis = ({
  interviewId,
  viewMode,
  onViewModeChange,
}) => {
  const dispatch = useDispatch();
  const [analysisData, setAnalysisData] = useState(null);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);

  // Fetch data function defined outside useEffect
  const fetchData = useCallback(async () => {
    if (!interviewId) return;

    try {
      dispatch(setLoadingState(true));
      // VisualizationInterviewAnalysis is only shown when viewMode is 'chart', so never include candidates
      const response = await getOverallAnalysis(interviewId, {
        period: period?.value || period || DEFAULT_PERIOD.value,
        include_candidates: false, // Always false for chart/visualization view
      });

      const data = response?.body;
      if (data && data.ok) {
        setAnalysisData(data);
      }
    } catch (error) {
      showToast(
        TOAST_ERROR_STATUS,
        'Error loading analysis',
        error?.error || 'Failed to load interview analysis',
      );
    } finally {
      dispatch(setLoadingState(false));
    }
  }, [interviewId, period, dispatch]);

  // Fetch data when interviewId, period, or viewMode changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePeriodChange = useCallback(selectedOption => {
    setPeriod(selectedOption || DEFAULT_PERIOD);
  }, []);

  const formatDuration = duration => {
    // If duration is already a formatted string (e.g., "39m 14s"), return it as is
    if (typeof duration === 'string' && duration.includes('m')) {
      return duration;
    }
    // If it's a number (seconds), format it
    if (typeof duration === 'number') {
      const minutes = Math.floor(duration / 60);
      const secs = duration % 60;
      return `${minutes}m ${secs}s`;
    }
    return DEFAULT_VALUES.DURATION;
  };

  const parseCompletionRate = rate => {
    // If rate is already a formatted string (e.g., "900.0%"), extract the number
    if (typeof rate === 'string' && rate.includes('%')) {
      const numValue = parseFloat(rate.replace('%', ''));
      return isNaN(numValue)
        ? DEFAULT_VALUES.COMPLETION_RATE
        : Math.round(numValue);
    }
    // If it's a number, return it
    if (typeof rate === 'number') {
      return Math.round(rate);
    }
    return DEFAULT_VALUES.COMPLETION_RATE;
  };

  const metrics = analysisData?.metrics || {};
  const feedbackData = metrics?.candidate_sentiment || {};
  const statusData = metrics?.status || {};

  // Prepare Candidate Feedback chart data
  const feedbackChartData = useMemo(() => {
    const labels = [
      CHART_LABELS.FEEDBACK.POSITIVE,
      CHART_LABELS.FEEDBACK.NEUTRAL,
      CHART_LABELS.FEEDBACK.NEGATIVE,
    ];
    const data = [
      feedbackData.positive,
      feedbackData.neutral,
      feedbackData.negative,
    ];
    const colors = [
      themeColor.SUCCESS_COLOR,
      themeColor.WARNING_COLOR,
      themeColor.ERROR_COLOR,
    ];
    return prepareChartData(data, labels, colors);
  }, [feedbackData]);

  // Prepare Candidate Status chart data
  const statusChartData = useMemo(() => {
    const labels = [
      CHART_LABELS.STATUS.SHORTLISTED,
      CHART_LABELS.STATUS.POTENTIAL,
      CHART_LABELS.STATUS.REJECTED,
      CHART_LABELS.STATUS.NO_STATUS,
    ];
    const data = [
      statusData.shortlisted,
      statusData.potential,
      statusData.rejected,
      statusData.no_status,
    ];
    const colors = [
      themeColor.SUCCESS_COLOR,
      themeColor.WARNING_COLOR,
      themeColor.ERROR_COLOR,
      themeColor.INFO_COLOR,
    ];
    return prepareChartData(data, labels, colors);
  }, [statusData]);

  // Create plugin instance with theme colors and chart config
  const chartDataLabelsPlugin = useMemo(() => {
    return createChartDataLabelsPlugin(themeColor, CHART_CONFIG);
  }, []);

  // Chart options for both charts
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: CHART_CONFIG.LEGEND_PADDING,
            font: {
              size: CHART_CONFIG.LEGEND_FONT_SIZE,
              family: CHART_CONFIG.FONT_FAMILY,
            },
            color: themeColor.PRIMARY_TEXT_COLOR,
            boxWidth: CHART_CONFIG.LEGEND_BOX_SIZE,
            boxHeight: CHART_CONFIG.LEGEND_BOX_SIZE,
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: themeColor.PRIMARY_TEXT_COLOR,
          padding: CHART_CONFIG.TOOLTIP_PADDING,
          titleFont: {
            size: CHART_CONFIG.TOOLTIP_TITLE_FONT_SIZE,
          },
          bodyFont: {
            size: CHART_CONFIG.TOOLTIP_BODY_FONT_SIZE,
          },
        },
      },
      cutout: CHART_CONFIG.CUTOUT,
    }),
    [],
  );

  return (
    <Box
      w="100%"
      overflow="visible"
      bg={themeColor.WHITE_COLOR}
      p="1.5rem"
      borderRadius="lg"
      boxShadow="sm"
      position="relative">
      {/* Header Section - Responsive */}
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        justify="space-between"
        align={{ base: 'flex-start', sm: 'center' }}
        gap={RESPONSIVE_STYLES.headerGap}
        mb={RESPONSIVE_STYLES.headerMargin}>
        <Box w={{ base: '100%', sm: '150px' }}>
          <SingleReactSelect
            name="period"
            value={period}
            options={PERIOD_OPTIONS}
            onChange={handlePeriodChange}
            isClearable={false}
          />
        </Box>
        <HStack spacing="0.5rem">
          <IconButton
            aria-label="List view"
            icon={<FiList />}
            variant={viewMode === 'list' ? 'solid' : 'ghost'}
            onClick={() => onViewModeChange && onViewModeChange('list')}
            size={RESPONSIVE_STYLES.iconButtonSize}
          />
          <IconButton
            aria-label="Chart view"
            icon={<FiBarChart2 />}
            variant={viewMode === 'chart' ? 'solid' : 'ghost'}
            onClick={() => onViewModeChange && onViewModeChange('chart')}
            size={RESPONSIVE_STYLES.iconButtonSize}
          />
        </HStack>
      </Flex>

      {/* Main Content - Responsive Layout */}
      <Flex
        direction={{ base: 'column', lg: 'row' }}
        gap={RESPONSIVE_STYLES.mainGap}
        align="flex-start"
        overflow="visible"
        position="relative"
        zIndex={0}>
        {/* Left Column - Metrics stacked vertically */}
        <Box
          flex="0 0 auto"
          w={RESPONSIVE_STYLES.metricsWidth}
          overflow="visible">
          <Flex direction="column" gap={RESPONSIVE_STYLES.metricsGap}>
            <MetricCard
              title="Average Duration"
              value={formatDuration(metrics.average_duration)}
              tooltipLabel="Average time taken to complete the interview"
            />
            <MetricCard
              title="Interview Completion Rate"
              value={`${parseCompletionRate(metrics.completion_rate)}%`}
              tooltipLabel="Percentage of candidates who completed the interview"
            />
          </Flex>
        </Box>

        {/* Right Column - Charts side by side */}
        <Box
          flex="1"
          minW="0"
          w={{ base: '100%', lg: 'auto' }}
          overflow="visible"
          position="relative"
          zIndex={0}>
          <SimpleGrid
            columns={{ base: 1, md: 2 }}
            spacing={RESPONSIVE_STYLES.chartSpacing}>
            <ChartCard
              title="Candidate Feedback"
              tooltipLabel="Distribution of candidate feedback"
              chartData={feedbackChartData}
              plugins={[chartDataLabelsPlugin]}
              chartOptions={chartOptions}
            />
            <ChartCard
              title="Candidate Status"
              tooltipLabel="Distribution of candidate statuses"
              chartData={statusChartData}
              plugins={[chartDataLabelsPlugin]}
              chartOptions={chartOptions}
            />
          </SimpleGrid>
        </Box>
      </Flex>
    </Box>
  );
};

VisualizationInterviewAnalysis.propTypes = {
  interviewId: PropTypes.string.isRequired,
  viewMode: PropTypes.string,
  onViewModeChange: PropTypes.func,
};

export default VisualizationInterviewAnalysis;
