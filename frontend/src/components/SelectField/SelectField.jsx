import PropTypes from 'prop-types';
import {
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Select,
  Box,
} from '@chakra-ui/react';

const SelectField = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  required,
  error,
  helperText,
  disabled,
  layout,
  width,
  noGap,
  controlProps = {},
  selectProps = {},
  labelFontWeight = 600,
  fontWeight = 500,
  fontSize = '14px',
}) => {
  return (
    <FormControl
      display={layout === 'horizontal' ? 'flex' : 'block'}
      alignItems={layout === 'horizontal' ? 'center' : 'auto'}
      mt={layout === 'horizontal' || noGap ? '0' : '1rem'}
      isInvalid={!!error}
      w={width || null}
      isRequired={required}
      isDisabled={disabled}
      {...controlProps}>
      {label && (
        <FormLabel
          mb={layout === 'horizontal' ? '0' : '0.3rem'}
          fontWeight={labelFontWeight}>
          {label}
        </FormLabel>
      )}
      <Box>
        <Select
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          fontWeight={fontWeight}
          fontSize={fontSize}
          borderColor="primary.200"
          _hover={{
            borderColor: 'primary.400',
          }}
          _focus={{
            borderColor: 'primary.500',
            borderWidth: '2px',
            boxShadow: 'none',
          }}
          {...selectProps}>
          {options.map(option => {
            // Support both object format {value, label} and simple string format
            if (typeof option === 'string') {
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            }
            return (
              <option key={option.value} value={option.value}>
                {option.label || option.value}
              </option>
            );
          })}
        </Select>
        {helperText && !error ? (
          <FormHelperText>{helperText}</FormHelperText>
        ) : null}
        <FormErrorMessage>{error}</FormErrorMessage>
      </Box>
    </FormControl>
  );
};

SelectField.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
          .isRequired,
        label: PropTypes.string,
      }),
    ]),
  ),
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  layout: PropTypes.string,
  width: PropTypes.string,
  noGap: PropTypes.bool,
  controlProps: PropTypes.object,
  selectProps: PropTypes.object,
  labelFontWeight: PropTypes.number,
  fontWeight: PropTypes.number,
  fontSize: PropTypes.string,
};

export default SelectField;
