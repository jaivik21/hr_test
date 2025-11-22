import React from 'react';
import { Box, Image } from '@chakra-ui/react';

const IconBox = ({ icon, alt, size = '48px', iconSize = '24px', marginLeft = 0 }) => {
  return (
    <Box
      w={size}
      h={size}
      borderRadius="full"
      bgGradient="linear(to-br, indigo.500, indigoDark)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      marginLeft={marginLeft}>
      <Image
        src={icon}
        alt={alt}
        boxSize={iconSize}
        objectFit="contain"
      />
    </Box>
  );
};

export default IconBox;

