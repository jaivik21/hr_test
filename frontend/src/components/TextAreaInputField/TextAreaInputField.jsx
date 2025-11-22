import PropTypes from 'prop-types';
import {
  Box,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Text,
  Textarea,
} from '@chakra-ui/react';

const TextAreaInputField = ({
  label,
  name,
  value,
  onChange,
  placeholder = 'Enter',
  error,
  required = true,
  rows = 6,
  inputProps = {},
  ...otherProps
}) => {
  return (
    <Box>
      <FormControl isRequired={required} isInvalid={!!error}>
        <FormLabel
          fontSize="14px"
          fontWeight="500"
          color="secondaryText"
          mb="8px"
          requiredIndicator={
            <Text as="span" color="error.500" ml="4px">
              *
            </Text>
          }>
          {label}
        </FormLabel>
        <Textarea
          name={name}
          placeholder={placeholder}
          value={value || ''}
          onChange={onChange}
          rows={rows}
          boxShadow="none"
          borderColor={error ? 'error.500' : 'var(--chakra-colors-primary-200)'}
          _hover={{
            borderColor: error
              ? 'error.500'
              : 'var(--chakra-colors-primary-400)',
          }}
          _focus={{
            borderColor: error
              ? 'error.500'
              : 'var(--chakra-colors-primary-500)',
            boxShadow: error
              ? '0 0 0 1px var(--chakra-colors-error-500)'
              : '0 0 0 1px var(--chakra-colors-primary-500)',
          }}
          _placeholder={{ fontWeight: 500 }}
          className="custom_scrollbar"
          overflowY="auto"
          fontSize="14px"
          fontWeight="600"
          {...inputProps}
          {...otherProps}
        />
        {error && <FormErrorMessage>{error}</FormErrorMessage>}
      </FormControl>
    </Box>
  );
};

TextAreaInputField.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  rows: PropTypes.number,
  inputProps: PropTypes.object,
};

export default TextAreaInputField;
