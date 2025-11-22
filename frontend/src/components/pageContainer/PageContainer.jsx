import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Flex, Heading } from '@chakra-ui/react';
import { ChevronLeftIcon } from '@chakra-ui/icons';

import SideNavigation from '../Navigation/SideNavigation';
import Storage from '../../services/Storage';

const PageContainer = ({ children, title, back }) => {
  const isLSSidebarOpen = Storage.getIsSideBarOpen() === 'true';
  const [sidebarOpen, setSidebarOpen] = useState(isLSSidebarOpen !== false);

  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    Storage.setIsSideBarOpen(!sidebarOpen);
  };

  const handleGoBack = () => {
    if (back) {
      navigate(back, { state: location?.state });
    }
  };

  return (
    <Flex width="100%" height="100vh">
      <SideNavigation open={sidebarOpen} toggle={toggleSidebar} />
      <Flex
        flexDirection="column"
        width="100%"
        h="100%"
        ml={sidebarOpen ? '269px' : '60px'}
        overflowX="hidden"
        transition="all 0.1s ease-in">
        {(back || title) && (
          <Flex
            width={sidebarOpen ? 'calc(100% - 269px)' : 'calc(100% - 60px)'}
            zIndex={1200}
            bg={'gray.50'}
            position="fixed"
            align="center"
            height={'60px'}
            px={6}
            py={3}
            transition="all 0.1s ease-in">
            <Box display="flex" alignItems="center">
              {back && (
                <Button
                  onClick={handleGoBack}
                  variant="outline"
                  colorScheme="gray"
                  size="xl"
                  rounded="full"
                  mr={4}>
                  <ChevronLeftIcon colorScheme="gray" fontSize="4xl" />
                </Button>
              )}
              {title && (
                <Heading as="h1" fontSize="24px" fontWeight="600">
                  {title}
                </Heading>
              )}
            </Box>
          </Flex>
        )}
        <Box
          mt={back || title ? '60px' : 0}
          width="100%"
          height="calc(100vh - 60px)"
          p={6}
          bg={'#FBFBFB'}
          transition="all 0.1s ease-in"
          overflowX="hidden"
          overflowY="auto"
          className="custom_scrollbar">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
};

PageContainer.propTypes = {
  children: PropTypes.node,
  back: PropTypes.string,
  title: PropTypes.string,
};

export default PageContainer;
