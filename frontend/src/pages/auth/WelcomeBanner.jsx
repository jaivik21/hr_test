import { Box, Flex, Heading, Text } from '@chakra-ui/react';
import bgImage from '../../assets/images/Background.png';
import { themeColor } from '../../utils/constants/constants';

const WelcomeBanner = () => {
  return (
    <Flex
      w="100%"
      minH="100vh"
      position="relative"
      bgImage={bgImage}
      bgSize="cover"
      bgPosition="center"
      flexDirection="column"
      justifyContent="space-between"
      alignItems="center"
      px={{ base: '1.5rem', lg: '3rem' }}
      py={{ base: '2rem', lg: '3rem' }}
      boxSizing="border-box"
      overflow="hidden">
      <Box maxWidth="600px" width="100%" display="flex" justifyContent="center">
        <Text fontWeight="bold" fontSize="7xl">
          Logo
        </Text>
      </Box>

      <Box alignSelf="stretch">
        <Box maxWidth="680px">
          <Box mb="1.75rem">
            <Heading
              as="h1"
              fontSize="4xl"
              fontWeight="semibold"
              color={themeColor.PRIMARY_COLOR}>
              Welcome back!
              <br />
              Ready to discover your next great hire?
            </Heading>
          </Box>
          <Text fontSize="lg" color="gray.600" lineHeight="taller">
            Our platform helps you plan interviews, evaluate candidates, and
            make confident hiring choices faster. Keep every stakeholder aligned
            throughout the hiring process and focus on building great teams.
          </Text>
        </Box>
      </Box>
    </Flex>
  );
};

export default WelcomeBanner;
