import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Text, Flex } from '@chakra-ui/react';
import { ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { ACCORDION_STYLES } from '../../utils/constants/accordionConstants';

const AccordionItem = ({
  title,
  isOpen,
  onToggle,
  children,
  defaultOpen = false,
}) => {
  // Memoize expanded state calculation
  const expanded = useMemo(() => {
    return isOpen !== undefined ? isOpen : defaultOpen;
  }, [isOpen, defaultOpen]);

  // Memoize toggle handler to prevent re-renders
  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle(!expanded);
    }
  }, [onToggle, expanded]);

  return (
    <Box
      mb={4}
      bg="white"
      borderRadius={ACCORDION_STYLES.BORDER_RADIUS}
      border="1px solid"
      borderColor="gray.200"
      overflow="hidden"
      boxShadow="sm">
      {/* Header Section */}
      <Flex
        justify="space-between"
        align="center"
        px={ACCORDION_STYLES.PADDING_X}
        py={ACCORDION_STYLES.PADDING_Y}
        cursor="pointer"
        onClick={handleToggle}
        bg="primary.100"
        borderTopRadius={ACCORDION_STYLES.BORDER_RADIUS}
        borderBottom={expanded ? '1px solid' : 'none'}
        borderBottomColor={expanded ? 'gray.200' : 'transparent'}
        _hover={{ bg: 'primary.400' }}
        transition={ACCORDION_STYLES.TRANSITION}
        role="button"
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}>
        <Text fontSize="lg" fontWeight="600" color="gray.800">
          {title}
        </Text>
        {expanded ? (
          <ChevronUpIcon fontSize="20px" color="gray.600" />
        ) : (
          <ChevronDownIcon fontSize="20px" color="gray.600" />
        )}
      </Flex>

      {/* Body Section with smooth animation */}
      <Box
        maxHeight={expanded ? '10000px' : '0'}
        overflow="hidden"
        transition={ACCORDION_STYLES.TRANSITION}
        opacity={expanded ? 1 : 0}>
        {expanded && (
          <Box
            px={ACCORDION_STYLES.PADDING_X}
            py={ACCORDION_STYLES.PADDING_Y}
            bg="white">
            {children}
          </Box>
        )}
      </Box>
    </Box>
  );
};

AccordionItem.propTypes = {
  title: PropTypes.string.isRequired,
  isOpen: PropTypes.bool,
  onToggle: PropTypes.func,
  children: PropTypes.node.isRequired,
  defaultOpen: PropTypes.bool,
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(AccordionItem);
