import PropTypes from 'prop-types';
import {
  FormControl,
  Textarea,
  FormLabel,
  FormErrorMessage,
} from '@chakra-ui/react';

const TextAreaField = ({
  name,
  placeholder,
  value,
  onChange,
  customStyle,
  errorText = '',
  isDisabled = false,
  rows = 1,
  isInvalid,
  isRequired,
  formLabel,
  labelFontWeight = 600,
  inputProps = {},
  fontWeight = 600,
  fontSize = '14px',
  ...props
}) => {
  return (
    <FormControl
      isInvalid={isInvalid || false}
      isRequired={isRequired || false}
      {...props}>
      {formLabel && (
        <FormLabel fontWeight={labelFontWeight}>{formLabel || ''}</FormLabel>
      )}
      <Textarea
        name={name || ''}
        placeholder={placeholder || 'Enter'}
        value={value || ''}
        onChange={onChange}
        isDisabled={isDisabled}
        rows={rows}
        boxShadow="none"
        borderColor={'var(--chakra-colors-primary-200)'}
        _hover={{
          borderColor: 'var(--chakra-colors-primary-400)',
        }}
        _focus={{
          borderColor: 'var(--chakra-colors-primary-500)',
        }}
        _placeholder={{ fontWeight: 500 }}
        className="custom_scrollbar"
        overflowY="auto"
        customStyle={customStyle}
        fontWeight={fontWeight}
        fontSize={fontSize}
        {...inputProps}
      />
      <FormErrorMessage>{errorText}</FormErrorMessage>
    </FormControl>
  );
};

TextAreaField.propTypes = {
  isInvalid: PropTypes.bool,
  isRequired: PropTypes.bool,
  name: PropTypes.any,
  formLabel: PropTypes.any,
  value: PropTypes.any,
  placeholder: PropTypes.array,
  onChange: PropTypes.func,
  customStyle: PropTypes.any,
  errorText: PropTypes.any,
  isDisabled: PropTypes.bool,
  rows: PropTypes.number,
  labelFontWeight: PropTypes.number,
  inputProps: PropTypes.any,
  fontWeight: PropTypes.number,
  fontSize: PropTypes.string,
};

export default TextAreaField;
