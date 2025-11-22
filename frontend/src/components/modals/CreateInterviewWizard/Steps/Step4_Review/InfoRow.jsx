import React from 'react';
import PropTypes from 'prop-types';
import { Box, Text } from '@chakra-ui/react';

const InfoRow = ({ label, value }) => (
  <Box>
    <Text fontSize="sm" color="gray.600" fontWeight={500} mb={1}>
      {label}
    </Text>
    <Text fontSize="md" fontWeight={600} color="gray.900">
      {value || '-'}
    </Text>
  </Box>
);

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
};

export default React.memo(InfoRow);
