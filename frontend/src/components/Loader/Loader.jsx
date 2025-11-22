import { Box, Spinner, Text } from '@chakra-ui/react';
import PropTypes from 'prop-types';

const Loader = ({ isLoading, text }) => {
  if (!isLoading) return null;

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="rgba(0, 0, 0, 0.5)"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      zIndex="9999">
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="primary.500"
        size="xl"
      />
      {text && (
        <Text mt={4} color="white" fontSize="lg">
          {text}
        </Text>
      )}
    </Box>
  );
};

Loader.propTypes = {
  isLoading: PropTypes.bool,
  text: PropTypes.string,
};

export default Loader;
