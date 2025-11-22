import { Box, Flex, Button } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import { WIZARD_BUTTON_STYLES } from '../../../utils/constants/wizardConstants';

// Combine base styles with variant styles
const outlineButtonStyles = {
  ...WIZARD_BUTTON_STYLES.BASE,
  ...WIZARD_BUTTON_STYLES.OUTLINE,
};

const primaryButtonStyles = {
  ...WIZARD_BUTTON_STYLES.BASE,
  ...WIZARD_BUTTON_STYLES.PRIMARY,
};

const WizardFooter = ({
  activeStep,
  totalSteps,
  width,
  isCreating,
  onClose,
  onPrevious,
  onNext,
  onCreate,
}) => {
  const isLastStep = activeStep === totalSteps - 1;
  const isFirstStep = activeStep === 0;

  return (
    <Box
      position="fixed"
      bottom="0"
      left={0}
      right="0"
      bg="white"
      minH="84px"
      py="20px"
      px="24px"
      zIndex={1100}
      ml={width > 768 ? '60px' : '0'}
      width={width > 768 ? 'calc(100% - 60px)' : '100%'}
      boxShadow="0 -1px 3px rgba(0,0,0,0.1)"
      display="flex"
      alignItems="center">
      <Flex justify="flex-end" gap={4} w="100%">
        {/* Previous Button - Show for steps 1, 2, 3 */}
        {!isFirstStep && (
          <Button
            variant="outline"
            colorScheme="primary"
            onClick={onPrevious}
            {...outlineButtonStyles}>
            Previous
          </Button>
        )}

        {/* Close Button - Show only for first step */}
        {isFirstStep && (
          <Button
            variant="outline"
            colorScheme="primary"
            onClick={onClose}
            {...outlineButtonStyles}
            borderRadius="5px">
            Close
          </Button>
        )}

        {/* Next/Create Button */}
        {isLastStep ? (
          <Button
            onClick={onCreate}
            isLoading={isCreating}
            loadingText="Creating..."
            {...primaryButtonStyles}>
            Create
          </Button>
        ) : (
          <Button
            onClick={onNext}
            isLoading={isCreating}
            loadingText="Creating..."
            {...primaryButtonStyles}
            borderRadius="5px">
            Save & Next
          </Button>
        )}
      </Flex>
    </Box>
  );
};

WizardFooter.propTypes = {
  activeStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  isCreating: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onPrevious: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
};

export default WizardFooter;
