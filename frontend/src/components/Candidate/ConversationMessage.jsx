import React from 'react';
import { Box, Stack, Text } from '@chakra-ui/react';

const ConversationMessage = ({ entry }) => {
  if (!entry || !entry.sender || !entry.message) {
    return null;
  }

  const isAI = entry.sender === 'AI';

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems={isAI ? 'flex-start' : 'flex-end'}
      gap={2}>
      <Stack direction={isAI ? 'row' : 'row-reverse'} spacing={2} alignItems="flex-start">
        <Text
          fontSize="xs"
          fontWeight={600}
          bgGradient={
            isAI ? 'linear(to-br, indigo.500, indigoDark)' : 'linear(to-br, grayLight)'
          }
          color={isAI ? 'white' : 'primaryText'}
          textAlign="center"
          w="32px"
          h="32px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center">
          {entry.sender}
        </Text>
        <Box
          maxW="80%"
          width="auto"
          bg={isAI ? 'indigoLight' : 'primary.50'}
          color="primaryText"
          borderRadius="1rem"
          px={5}
          py={4}
          boxShadow={isAI ? 'none' : 'sm'}>
          <Text fontSize="sm" lineHeight="1.7">
            {entry.message}
          </Text>
          <Text fontSize="xs" color="secondaryText" textAlign="right" mt={2}>
            {entry.time}
          </Text>
        </Box>
      </Stack>
    </Box>
  );
};

export default ConversationMessage;

