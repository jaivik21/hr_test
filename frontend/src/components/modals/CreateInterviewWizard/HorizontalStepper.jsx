import PropTypes from 'prop-types';
import {
  Box,
  Progress,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator,
} from '@chakra-ui/react';

const HorizontalStepper = ({ steps, activeStep, handleGoToStep, width }) => {
  const max = steps.length - 1;
  const progressPercent = max > 0 ? (activeStep / max) * 100 : 0;

  if (width <= 1000) {
    return (
      <Box px="24px" py="16px" w="full">
        <Progress
          value={progressPercent}
          height="3px"
          borderRadius="full"
          bg="gray.200"
          colorScheme="primary"
        />
      </Box>
    );
  }

  return (
    <Box px="24px" py="16px" w="full">
      <Stepper index={activeStep} size="lg" colorScheme="primary">
        {steps.map((step, index) => (
          <Step
            key={index}
            onClick={() => handleGoToStep(index)}
            cursor="pointer">
            <StepIndicator>
              <StepStatus
                complete={<StepIcon />}
                incomplete={<StepNumber />}
                active={<StepNumber />}
              />
            </StepIndicator>

            <Box flexShrink="0">
              <StepTitle fontSize="16px" fontWeight="600">
                {step.title}
              </StepTitle>
              <StepDescription fontSize="14px" fontWeight="400">
                {step.description}
              </StepDescription>
            </Box>

            {index < steps.length - 1 && <StepSeparator />}
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

HorizontalStepper.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      key: PropTypes.string.isRequired,
    }),
  ).isRequired,
  activeStep: PropTypes.number.isRequired,
  handleGoToStep: PropTypes.func.isRequired,
  width: PropTypes.number.isRequired,
};

export default HorizontalStepper;
