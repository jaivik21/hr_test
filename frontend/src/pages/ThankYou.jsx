import React from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../components/candidate/PageContainer';
import PreventBack from '../components/PreventBack/PreventBack';

const ThankYou = () => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate("/Feedback");
  }

  return (
    <>
      <PreventBack />
      <PageContainer maxW="480px">
        <VStack spacing={4} textAlign="center">
          <Heading size="lg" color="primaryText" fontWeight={700}>
            Thank You for Your Time!
          </Heading>
          <Text color="secondaryText" fontSize="md" lineHeight="1.6">
            We appreciate your effort and the insights you shared during this interview.
          </Text>

          <Box
            width="100%"
            bg="secondary.100"
            borderRadius="lg"
            borderWidth={1}
            borderColor="secondary.200"
            p={4}>
            <Text color="primary.500" fontSize="sm" lineHeight="1.6" textAlign="left">
              Your responses have been submitted successfully. Our team will review your interview and get back to you soon.
            </Text>
          </Box>

          <VStack spacing={2}>
            <Text color="primaryText" fontWeight={600}>
              We'd love your feedback!
            </Text>
            <Text color="secondaryText" fontSize="sm">
              Tell us about your experience so we can make future interviews even better.
            </Text>
          </VStack>

          <Button
            width="100%"
            size="md"
            height="48px"
            fontWeight={600}
            onClick={handleNavigate}>
            Provide Feedback
          </Button>
        </VStack>
      </PageContainer>
    </>
  );
};

export default ThankYou;