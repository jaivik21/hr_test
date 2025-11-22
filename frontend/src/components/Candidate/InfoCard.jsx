import React from 'react';
import { Box } from '@chakra-ui/react';

const InfoCard = ({ children, ...props }) => {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      p={6}
      boxShadow="sm"
      borderWidth={1}
      borderColor="stroke"
      {...props}>
      {children}
    </Box>
  );
};

export default InfoCard;

