import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Text, Tooltip } from '@chakra-ui/react';
import { themeColor } from '../../utils/constants/constants';

const NavItem = ({ route, isActive, isOpen, onNavigate }) => {
  const handleClick = useCallback(() => {
    if (route.path !== '#' && onNavigate) {
      onNavigate(route.path);
    }
  }, [route.path, onNavigate]);

  if (isOpen) {
    return (
      <Box
        role="button"
        transition="all 0.12s ease-in"
        display="flex"
        alignItems="center"
        onClick={handleClick}
        _hover={{ cursor: 'pointer', bg: '#EEF1FF' }}
        bg={isActive ? '#EEF1FF' : 'transparent'}
        width="100%"
        px="12px"
        py="10px"
        borderRadius="5px"
        data-group
        minHeight="44px"
        borderRight={isActive ? '1px solid' : '1px solid transparent'}
        borderRightColor={isActive ? themeColor.PRIMARY_COLOR : 'transparent'}>
        <Box
          as="img"
          src={route.icon}
          alt={`${route.title} icon`}
          boxSize="20px"
        />
        <Box pl="10px" flex="1">
          <Text
            _groupHover={{ fontWeight: 600 }}
            fontWeight={isActive ? 700 : 500}
            fontSize="14px"
            whiteSpace="normal"
            wordBreak="break-word"
            lineHeight="20px"
            color={isActive ? themeColor.PRIMARY_TEXT_COLOR : 'primaryText'}>
            {route.title}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Tooltip hasArrow label={route.title} bg="primary.700" placement="right">
      <Box
        aria-label={route.title}
        role="button"
        display="flex"
        transition="all 0.1s ease-in"
        onClick={handleClick}
        _hover={{
          cursor: 'pointer',
          bg: isActive ? themeColor.SECONDARY_COLOR : '#C7D2FE',
        }}
        bg={isActive ? themeColor.SECONDARY_COLOR : 'transparent'}
        borderLeft="none"
        borderRadius="6px"
        width="60px"
        alignItems="center"
        justifyContent="center"
        minHeight="40px"
        data-group>
        <Box
          as="img"
          src={route.icon}
          alt={`${route.title} icon`}
          boxSize="24px"
        />
      </Box>
    </Tooltip>
  );
};

NavItem.propTypes = {
  route: PropTypes.shape({
    title: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    key: PropTypes.string.isRequired,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

export default React.memo(NavItem);
