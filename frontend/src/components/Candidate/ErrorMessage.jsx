import React from 'react';
import { Box, Text } from '@chakra-ui/react';

const ErrorMessage = ({ message, fontSize = 'sm' }) => {
  if (!message) return null;

  return (
    <Box
      bg="red.50"
      borderWidth={1}
      borderColor="red.200"
      borderRadius="md"
      p={fontSize === 'md' ? 4 : 3}>
      <Text color="red.600" fontSize={fontSize} fontWeight={500}>
        {message}
      </Text>
    </Box>
  );
};

export default ErrorMessage;

