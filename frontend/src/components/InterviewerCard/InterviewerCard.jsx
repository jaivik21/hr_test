import PropTypes from 'prop-types';
import { Box, Image, Text, Flex, Icon } from '@chakra-ui/react';
import { InfoOutlineIcon } from '@chakra-ui/icons';

const InterviewerCard = ({ interviewer, isSelected, onSelect }) => {
  return (
    <Flex
      direction="column"
      align="center"
      gap="6px"
      cursor="pointer"
      onClick={() => onSelect(interviewer)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(interviewer);
        }
      }}>
      {/* Avatar Container with Info Icon */}
      <Box position="relative">
        <Box
          w="61px"
          h="75px"
          borderRadius="12px"
          overflow="hidden"
          border={isSelected ? '3px solid' : '2px solid'}
          borderColor={isSelected ? 'primary.500' : 'transparent'}
          transition="all 0.2s"
          _hover={{
            borderColor: isSelected ? 'primary.600' : 'gray.300',
            transform: 'scale(1.05)',
          }}>
          <Image
            src={interviewer.avatar}
            alt={interviewer.name}
            objectFit="cover"
            w="100%"
            h="100%"
          />
        </Box>

        {/* Info Icon - Top Right */}
        <Flex
          position="absolute"
          top="0"
          right="0"
          w="16px"
          h="16px"
          bg="white"
          borderRadius="full"
          align="center"
          justify="center"
          boxShadow="sm">
          <Icon as={InfoOutlineIcon} color="gray.500" boxSize="12px" />
        </Flex>
      </Box>

      {/* Name */}
      <Text
        fontSize="12px"
        fontWeight="400"
        color="primaryText"
        textAlign="center"
        lineHeight="1.5">
        {interviewer.name}
      </Text>
    </Flex>
  );
};

InterviewerCard.propTypes = {
  interviewer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    avatar: PropTypes.string.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default InterviewerCard;
