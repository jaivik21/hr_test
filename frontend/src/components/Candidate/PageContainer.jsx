import React from 'react';
import { Box } from '@chakra-ui/react';

const PageContainer = ({ children, maxW = '480px', ...props }) => {
  return (
    <Box
      minH="100vh"
      bg="secondary.100"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
      py={8}>
      <Box
        maxW={maxW}
        width="100%"
        bg="white"
        borderRadius="2xl"
        boxShadow="sm"
        borderWidth={1}
        borderColor="stroke"
        p={{ base: 6, md: 8 }}
        {...props}>
        {children}
      </Box>
    </Box>
  );
};

export default PageContainer;

