import React from 'react';
import PropTypes from 'prop-types';
import { Box, Radio, Text, VStack } from '@chakra-ui/react';
import {
  MODE_STYLES,
  MODE_COLORS,
} from '../../../../../utils/constants/interviewModeConstants';

const AutomatedOptionCard = ({ title, description, isSelected, onSelect }) => {
  return (
    <Box
      flex="1"
      bg="white"
      borderRadius={MODE_STYLES.OPTION_BORDER_RADIUS}
      p={MODE_STYLES.OPTION_PADDING}
      border="1px solid"
      borderColor={MODE_COLORS.BORDER}
      cursor="pointer"
      onClick={onSelect}
      outline={isSelected ? '2px solid' : 'none'}
      outlineColor={isSelected ? 'primary.500' : 'transparent'}>
      <Radio isChecked={isSelected} onChange={onSelect} colorScheme="primary">
        <VStack align="start" spacing={1} ml={2}>
          <Text fontWeight={600}>{title}</Text>
          <Text fontSize="sm" color="gray.600">
            {description}
          </Text>
        </VStack>
      </Radio>
    </Box>
  );
};

AutomatedOptionCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  isSelected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default React.memo(AutomatedOptionCard);
