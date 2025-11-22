import PropTypes from 'prop-types';
import { Box, Flex, Text } from '@chakra-ui/react';
import { themeColor, RESPONSIVE_STYLES } from '../../utils/constants/constants';
import { InfoTooltip } from './InfoTooltip';

/**
 * Reusable Metric Card Component
 * Displays a metric with title, value, and optional tooltip
 */
const MetricCard = ({ title, value, tooltipLabel }) => (
  <Box
    bg="white"
    borderRadius="lg"
    p={RESPONSIVE_STYLES.cardPadding}
    boxShadow="sm"
    position="relative"
    borderLeft="4px solid"
    borderColor={themeColor.PRIMARY_COLOR}
    overflow="visible">
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
    <Text
      fontSize={RESPONSIVE_STYLES.cardValueSize}
      fontWeight="bold"
      color={themeColor.PRIMARY_COLOR}>
      {value}
    </Text>
  </Box>
);

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tooltipLabel: PropTypes.string.isRequired,
};

export default MetricCard;
