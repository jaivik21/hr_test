import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  IoEyeOutline as ViewIcon,
  IoEyeOffOutline as ViewOffIcon,
} from 'react-icons/io5';
import {
  Box,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
} from '@chakra-ui/react';

const TextField = ({
  label,
  name,
  type,
  value,
  placeholder,
  handleChange,
  onKeyDown,
  required,
  error,
  helperText,
  disabled,
  layout,
  width,
  noGap,
  icon,
  isDisabled,
  controlProps = {},
  inputProps = {},
  labelFontWeight = 600,
  fontWeight = 500,
  fontSize = '14px',
}) => {
  const [show, setShow] = useState(false);
  const handleShowClick = () => setShow(!show);
  const inputRef = useRef(null);

  const handleInputFocus = () => {
    if (inputRef.current) {
      // Check if the picker is already open using a custom property
      if (inputRef.current.isPickerOpen) {
        inputRef.current.isPickerOpen = false;
      } else {
        inputRef.current.isPickerOpen = true;
        inputRef.current.showPicker(); // Show the date picker
      }
    }
  };
  return (
    <FormControl
      display={layout === 'horizontal' ? 'flex' : 'block'}
      alignItems={layout === 'horizontal' ? 'center' : 'auto'}
      mt={layout === 'horizontal' || noGap ? '0' : '1rem'}
      isInvalid={error}
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
        {type === 'password' ? (
          <>
            <InputGroup>
              <Input
                type={show ? 'text' : 'password'}
                name={name}
                value={value}
                onKeyDown={onKeyDown !== null ? onKeyDown : () => {}}
                onChange={handleChange}
                placeholder={placeholder}
                fontWeight={fontWeight}
                fontSize={fontSize}
                _placeholder={{ fontWeight: 500 }}
                {...inputProps}
              />
              <InputRightElement width="4.5rem">
                <IconButton
                  variant="text"
                  color="gray.400"
                  icon={
                    show ? <Icon as={ViewIcon} /> : <Icon as={ViewOffIcon} />
                  }
                  h="1.75rem"
                  onClick={handleShowClick}
                />
              </InputRightElement>
            </InputGroup>
            {helperText && !error ? (
              <FormHelperText>{helperText}</FormHelperText>
            ) : null}
            <FormErrorMessage>{error}</FormErrorMessage>
          </>
        ) : (
          <>
            <InputGroup>
              <Input
                type={type}
                name={name}
                value={value}
                borderColor={'var(--chakra-colors-primary-200)'}
                _hover={{
                  borderColor: 'var(--chakra-colors-primary-400)',
                }}
                _focus={{
                  borderColor: 'var(--chakra-colors-primary-500)',
                }}
                _placeholder={{ fontWeight: 500 }}
                onChange={handleChange}
                placeholder={placeholder}
                isDisabled={isDisabled}
                onKeyDown={onKeyDown !== null ? onKeyDown : () => {}}
                {...inputProps}
                ref={inputRef}
                onClick={handleInputFocus}
                fontWeight={fontWeight}
                fontSize={fontSize}
              />
              {icon && <InputLeftElement>{icon}</InputLeftElement>}
            </InputGroup>

            {helperText && !error ? (
              <FormHelperText>{helperText}</FormHelperText>
            ) : null}
            <FormErrorMessage>{error}</FormErrorMessage>
          </>
        )}
      </Box>
    </FormControl>
  );
};

TextField.propTypes = {
  label: PropTypes.any,
  name: PropTypes.any,
  type: PropTypes.string,
  value: PropTypes.string,
  placeholder: PropTypes.string,
  handleChange: PropTypes.func,
  onKeyDown: PropTypes.func,
  required: PropTypes.bool,
  error: PropTypes.string,
  helperText: PropTypes.string,
  disabled: PropTypes.bool,
  layout: PropTypes.string,
  width: PropTypes.string,
  noGap: PropTypes.bool,
  icon: PropTypes.any,
  isDisabled: PropTypes.bool,
  controlProps: PropTypes.any,
  inputProps: PropTypes.any,
  labelFontWeight: PropTypes.number,
  fontWeight: PropTypes.number,
  fontSize: PropTypes.string,
};

export default TextField;
