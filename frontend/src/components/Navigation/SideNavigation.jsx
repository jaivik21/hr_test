import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Flex } from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';

import routePaths from '../../routes/routePaths';
import { INTERVIEW_MODULE_VAL } from '../../utils/constants/moduleConstants';
import { SIDEBAR_WIDTH, themeColor } from '../../utils/constants/constants';
import interviewsIcon from '../../assets/images/interviews.svg';
import candidatesIcon from '../../assets/images/candidates.svg';
import SidebarHeader from './SidebarHeader';
import NavItem from './NavItem';
import SidebarUserSection from './SidebarUserSection';

const SideNavigation = ({ open, toggle }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Memoize routes to prevent recreation on every render
  const routes = useMemo(
    () => [
      {
        title: 'Interviews',
        path: routePaths.InterviewDashboard,
        icon: interviewsIcon,
        key: INTERVIEW_MODULE_VAL,
        field_order: 1,
      },
      {
        title: 'Candidates',
        path: '#',
        icon: candidatesIcon,
        key: 'candidates',
        field_order: 2,
      },
    ],
    [],
  );

  // Memoize navigation handler
  const handleNavigate = useCallback(
    path => {
      navigate(path);
    },
    [navigate],
  );

  // Memoize active route check
  const isRouteActive = useCallback(
    route => {
      return (
        location.pathname === route.path ||
        (route.path === routePaths.InterviewDashboard &&
          location.pathname.includes('/interview-dashboard'))
      );
    },
    [location.pathname],
  );

  // Memoize routes with active state
  const routesWithActiveState = useMemo(() => {
    return routes.map(route => ({
      ...route,
      isActive: isRouteActive(route),
    }));
  }, [routes, isRouteActive]);

  return (
    <Box
      display="flex"
      width={open ? SIDEBAR_WIDTH : '60px'}
      position="fixed"
      borderRight="1px solid"
      transition="all 0.12s ease-in"
      borderRightColor={themeColor.STROKE_COLOR}
      top="0"
      bg={open ? 'white' : 'primary.500'}
      left="0"
      flexDirection="column"
      height="100%"
      overflow="hidden"
      boxShadow="none"
      zIndex={1300}>
      <SidebarHeader isOpen={open} onToggle={toggle} />

      <Box
        display="flex"
        flexDirection="column"
        height="100%"
        bg={open ? 'white' : 'primary.500'}>
        <Flex
          flexDirection="column"
          gap="16px"
          align="start"
          p={open ? '16px' : 0}
          transition="all 0.12s ease-in"
          flex="1"
          overflowY="auto"
          overflowX="hidden"
          className="custom_scrollbar">
          {routesWithActiveState.map(route => (
            <NavItem
              key={route.key}
              route={route}
              isActive={route.isActive}
              isOpen={open}
              onNavigate={handleNavigate}
            />
          ))}
        </Flex>

        <SidebarUserSection isOpen={open} />
      </Box>
    </Box>
  );
};

SideNavigation.propTypes = {
  open: PropTypes.bool,
  toggle: PropTypes.func,
};

export default React.memo(SideNavigation);
