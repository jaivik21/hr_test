import PropTypes from 'prop-types';
import { Box, FormControl, FormLabel, Text } from '@chakra-ui/react';
import TextField from '../TextField/TextField';

const InputField = ({
  label,
  name,
  type = 'text',
  value,
  handleChange,
  placeholder,
  error,
  required = true,
  flex,
  inputProps = {},
  ...otherProps
}) => {
  return (
    <Box flex={flex}>
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
        <TextField
          name={name}
          type={type}
          value={value || ''}
          handleChange={handleChange}
          placeholder={placeholder}
          error={error}
          inputProps={inputProps}
          {...otherProps}
        />
      </FormControl>
    </Box>
  );
};

InputField.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  flex: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  inputProps: PropTypes.object,
};

export default InputField;
