import PropTypes from 'prop-types';
import { Box, Flex, Text } from '@chakra-ui/react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { themeColor } from '../../utils/constants/constants';
import { InfoTooltip } from './InfoTooltip';

// Register Chart.js components
ChartJS.register(ArcElement, ChartTooltip, Legend);

// Responsive style constants for chart card
const RESPONSIVE_STYLES = {
  cardPadding: { base: '1rem', md: '1.5rem' },
  cardTitleSize: { base: 'sm', md: 'md' },
  chartHeight: { base: '280px', sm: '320px', md: '360px' },
  chartPadding: { base: '30px', sm: '40px', md: '50px' },
};

/**
 * Reusable Chart Card Component
 * Displays a chart with title and tooltip in a styled card
 */
const ChartCard = ({
  title,
  tooltipLabel,
  chartData,
  plugins,
  chartOptions,
}) => (
  <Box
    bg="white"
    borderRadius="lg"
    p={RESPONSIVE_STYLES.cardPadding}
    boxShadow="sm"
    overflow="visible"
    position="relative"
    zIndex={1}>
    <Flex
      justify="space-between"
      align="center"
      mb={{ base: '0.75rem', md: '1rem' }}>
      <Text
        fontSize={RESPONSIVE_STYLES.cardTitleSize}
        fontWeight="semibold"
        color={themeColor.PRIMARY_TEXT_COLOR}>
        {title}
      </Text>
      <InfoTooltip label={tooltipLabel} />
    </Flex>
    <Box
      h={RESPONSIVE_STYLES.chartHeight}
      position="relative"
      p={RESPONSIVE_STYLES.chartPadding}
      overflow="visible">
      <Doughnut data={chartData} options={chartOptions} plugins={plugins} />
    </Box>
  </Box>
);

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  tooltipLabel: PropTypes.string.isRequired,
  chartData: PropTypes.object.isRequired,
  plugins: PropTypes.array.isRequired,
  chartOptions: PropTypes.object.isRequired,
};

export default ChartCard;
