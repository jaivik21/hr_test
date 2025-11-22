import React from 'react';
import { Box, HStack, Image, Text, VStack } from '@chakra-ui/react';

const RatingSelector = ({ ratings, selectedRating, onSelect }) => {
  return (
    <Box
      bg="secondary.50"
      borderRadius="lg"
      borderWidth={1}
      borderColor="secondary.200"
      p={4}>
      <VStack align="stretch" spacing={4}>
        <Text fontWeight={600} color="primaryText">
          How was your overall interview experience?
        </Text>

        {/* HStack for Icons */}
        <HStack justify="space-between" spacing={2}>
          {ratings.map(({ id, icon }) => {
            const isSelected = selectedRating === id;
            return (
              <Box
                key={id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(id)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(id);
                  }
                }}
                p={2}
                display="flex"
                alignItems="center"
                justifyContent="center"
                transition="all 0.2s ease"
                bg={isSelected ? 'primary.50' : 'white'}
                cursor="pointer"
                px={4}>
                <Image
                  src={icon}
                  alt="feedback icon"
                  boxSize="56px"
                  opacity="40%"
                />
              </Box>
            );
          })}
        </HStack>

        {/* HStack for Labels */}
        <HStack justify="space-between" spacing={2}>
          {ratings.map(({ id, label }) => (
            <Box key={id} w="56px" textAlign="center">
              <Text fontSize="xs" color="secondaryText" whiteSpace="nowrap">
                {label || ' '}
              </Text>
            </Box>
          ))}
        </HStack>
      </VStack>
    </Box>
  );
};

export default RatingSelector;

