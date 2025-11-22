import PropTypes from 'prop-types';
import { Box, Tooltip, Icon } from '@chakra-ui/react';
import { FiInfo } from 'react-icons/fi';
import { themeColor } from '../../utils/constants/constants';

// Responsive style constants
const RESPONSIVE_STYLES = {
  iconSize: { base: 'sm', md: 'md' },
};

/**
 * Reusable Info Tooltip Component
 * Displays an info icon with a tooltip on hover
 */
const InfoTooltip = ({ label }) => (
  <Tooltip
    label={label}
    placement="top"
    hasArrow
    closeOnClick={false}
    shouldWrapChildren
    portalProps={{ appendToParentPortal: false }}
    gutter={8}>
    <Box as="span" display="inline-flex">
      <Icon
        as={FiInfo}
        color={themeColor.SECONDARY_TEXT_COLOR}
        cursor="help"
        fontSize={RESPONSIVE_STYLES.iconSize}
      />
    </Box>
  </Tooltip>
);

InfoTooltip.propTypes = {
  label: PropTypes.string.isRequired,
};

export { InfoTooltip };
