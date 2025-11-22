import React from 'react';
import PropTypes from 'prop-types';
import { Box, IconButton, Text } from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { themeColor } from '../../utils/constants/constants';

const SidebarHeader = ({ isOpen, onToggle }) => {
  if (isOpen) {
    return (
      <Box
        px="16px"
        py="12px"
        bg={themeColor.BG_COLOR}
        height="77px"
        borderBottom="1px solid"
        borderBottomColor={themeColor.STROKE_COLOR}
        display="flex"
        alignItems="center"
        width="100%">
        <IconButton
          onClick={onToggle}
          icon={<HamburgerIcon fontSize={20} />}
          variant="unstyled"
          color={themeColor.PRIMARY_TEXT_COLOR}
          aria-label="Toggle sidebar"
        />
        <Text
          ml="12px"
          fontSize="18px"
          fontWeight="700"
          color={themeColor.PRIMARY_TEXT_COLOR}
          lineHeight="24px">
          LOGO
        </Text>
      </Box>
    );
  }

  return (
    <Box
      height="64px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="primary.500">
      <IconButton
        onClick={onToggle}
        icon={<HamburgerIcon color="white" fontSize={20} />}
        variant="unstyled"
        aria-label="Toggle sidebar"
      />
    </Box>
  );
};

SidebarHeader.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default React.memo(SidebarHeader);
