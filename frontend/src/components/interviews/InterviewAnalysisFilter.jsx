import PropTypes from 'prop-types';
import { useEffect } from 'react';
import {
  Box,
  Text,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  IconButton,
  useDisclosure,
} from '@chakra-ui/react';
import { FiFilter, FiCalendar } from 'react-icons/fi';
import { SingleReactSelect } from '../SingleReactSelect/SingleReactSelect';
import { themeColor, DATE_TYPE_OPTIONS } from '../../utils/constants/constants';

const InterviewAnalysisFilter = ({
  dateType,
  fromDate,
  toDate,
  onDateTypeChange,
  onFromDateChange,
  onToDateChange,
  onResetFilter,
  onApplyFilter,
  appliedDateType,
  appliedFromDate,
  appliedToDate,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Sync temporary values with applied values when popover opens (only once)
  useEffect(() => {
    if (isOpen) {
      // Sync only when popover first opens to show current applied filters
      // Use a ref-like approach to only sync on open, not on every change
      if (appliedDateType !== undefined) {
        const currentValue = dateType?.value;
        const appliedValue = appliedDateType?.value;
        if (currentValue !== appliedValue) {
          onDateTypeChange(appliedDateType);
        }
      }
      if (appliedFromDate !== undefined && fromDate !== appliedFromDate) {
        onFromDateChange(appliedFromDate || '');
      }
      if (appliedToDate !== undefined && toDate !== appliedToDate) {
        onToDateChange(appliedToDate || '');
      }
    }
    // Only sync when popover opens, not when applied values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleApply = () => {
    if (onApplyFilter) {
      // The parent will handle validation and return success status
      // We'll close the popover after a short delay to allow validation
      const shouldClose = onApplyFilter();
      if (shouldClose !== false) {
        // Close popover if validation passes (default behavior)
        setTimeout(() => {
          onClose();
        }, 100);
      }
      // If validation fails, parent will show error and popover stays open
    } else {
      onClose();
    }
  };

  const handleReset = () => {
    if (onResetFilter) {
      const shouldClose = onResetFilter();
      if (shouldClose !== false) {
        setTimeout(() => {
          onClose();
        }, 100);
      }
    } else {
      onClose();
    }
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      closeOnBlur={false}
      closeOnEsc={true}>
      <PopoverTrigger>
        <IconButton aria-label="Filter" icon={<FiFilter />} variant="ghost" />
      </PopoverTrigger>
      <PopoverContent w="450px" maxW="90vw">
        <PopoverHeader fontWeight="bold" color={themeColor.PRIMARY_TEXT_COLOR}>
          Filter By
        </PopoverHeader>
        <PopoverCloseButton />
        <PopoverBody>
          <Box mb={4}>
            <Text fontSize="sm" mb={2} fontWeight="medium">
              Date Type
            </Text>
            <SingleReactSelect
              name="dateType"
              value={dateType}
              options={DATE_TYPE_OPTIONS}
              onChange={onDateTypeChange}
              placeholder="Select Date Type"
              isClearable={true}
            />
          </Box>
          <Flex gap={3} mb={4}>
            <Box flex={1} minW="0">
              <Text fontSize="sm" mb={2} fontWeight="medium">
                From
              </Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FiCalendar color={themeColor.SECONDARY_TEXT_COLOR} />
                </InputLeftElement>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={e => onFromDateChange(e.target.value)}
                  placeholder="dd-mm-yyyy"
                  size="sm"
                  isDisabled={!dateType}
                />
              </InputGroup>
            </Box>
            <Box flex={1} minW="0">
              <Text fontSize="sm" mb={2} fontWeight="medium">
                To
              </Text>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <FiCalendar color={themeColor.SECONDARY_TEXT_COLOR} />
                </InputLeftElement>
                <Input
                  type="date"
                  value={toDate}
                  onChange={e => onToDateChange(e.target.value)}
                  placeholder="dd-mm-yyyy"
                  size="sm"
                  isDisabled={!dateType}
                />
              </InputGroup>
            </Box>
          </Flex>
        </PopoverBody>
        <PopoverFooter display="flex" justifyContent="flex-end" pt={4}>
          <Button
            variant="ghost"
            mr={3}
            onClick={handleReset}
            color={themeColor.PRIMARY_COLOR}
            size="sm">
            Reset
          </Button>
          <Button
            bg={themeColor.PRIMARY_COLOR}
            color={themeColor.WHITE_COLOR}
            onClick={handleApply}
            _hover={{ bg: themeColor.PRIMARY_COLOR }}
            size="sm">
            Apply
          </Button>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
};

InterviewAnalysisFilter.propTypes = {
  dateType: PropTypes.object,
  fromDate: PropTypes.string,
  toDate: PropTypes.string,
  onDateTypeChange: PropTypes.func.isRequired,
  onFromDateChange: PropTypes.func.isRequired,
  onToDateChange: PropTypes.func.isRequired,
  onResetFilter: PropTypes.func,
  onApplyFilter: PropTypes.func,
  appliedDateType: PropTypes.object,
  appliedFromDate: PropTypes.string,
  appliedToDate: PropTypes.string,
};

export default InterviewAnalysisFilter;
