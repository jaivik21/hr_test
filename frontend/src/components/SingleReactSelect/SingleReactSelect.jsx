import { useMemo } from 'react';
import { Tooltip, useTheme } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import Select, { components as defaultComponents } from 'react-select';

// Hide the clear indicator (x icon) for single-select dropdowns
const ClearIndicator = () => null;

// Factory function to create CustomControl with value
// eslint-disable-next-line react/display-name
const createCustomControl = value => props =>
  (
    <Tooltip hasArrow label={value?.label || ''} placement="top">
      <div>
        <defaultComponents.Control {...props} />
      </div>
    </Tooltip>
  );

export const SingleReactSelect = ({
  name,
  value,
  options,
  onChange,
  customStyle,
  error = false,
  isDisabled,
  menuPosition = 'absolute',
  height = 'auto',
  minHeight = '32px',
  placeholder = 'Select',
  fontWeight = 500,
  fontSize = '14px',
  ...props
}) => {
  const theme = useTheme();

  // Memoize components to prevent re-renders
  const components = useMemo(
    () => ({
      Control: createCustomControl(value),
      ClearIndicator,
    }),
    [value],
  );

  return (
    <Select
      name={name}
      menuPosition={menuPosition}
      menuPlacement="auto"
      value={value || null}
      options={options || []}
      onChange={onChange}
      isDisabled={isDisabled}
      isClearable
      menuPortalTarget={document.body}
      components={components}
      placeholder={placeholder}
      styles={{
        option: (styles, { isFocused, isSelected }) => {
          return {
            ...styles,
            backgroundColor: isSelected
              ? theme?.colors?.primary['600']
              : isFocused
              ? theme?.colors?.primary['200']
              : '',
            color: isSelected ? '#fff' : 'black',
            ':active': {
              ...styles[':active'],
              backgroundColor: theme?.colors?.primary['300'],
            },
          };
        },
        menu: provided => ({
          ...provided,
          zIndex: 99,
        }),
        menuList: provided => ({
          ...provided,
          fontSize: fontSize,
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
            borderRadius: '2.5px',
            backgroundColor: '#efefef',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: `${theme?.colors?.primary['400']}`,
            borderRadius: '2.5px',
          },
        }),
        control: (baseStyles, { isDisabled }) => ({
          ...baseStyles,
          borderWidth: '1px',
          borderRadius: '0.375rem',
          '&:hover': {
            borderColor: theme?.colors?.primary['400'],
            borderWidth: '1px',
          },
          borderColor: error ? 'red' : theme?.colors?.primary['200'],
          boxShadow: 'none',
          opacity: isDisabled ? 0.6 : 1,
          cursor: isDisabled ? 'not-allowed' : 'default',
          pointerEvents: 'auto',
          minHeight: minHeight,
          height: height,
          fontSize: fontSize,
          fontWeight: fontWeight,
        }),
        placeholder: styles => ({
          ...styles,
          fontWeight: fontWeight,
          fontSize: fontSize,
        }),
        singleValue: styles => ({
          ...styles,
          fontWeight: fontWeight,
          fontSize: fontSize,
          color: '#191919',
        }),
        menuPortal: base => ({ ...base, zIndex: 9999, position: 'fixed' }),
        multiValue: styles => ({
          ...styles,
          backgroundColor: theme?.colors?.primary['500'],
        }),
        multiValueLabel: styles => ({
          ...styles,
          color: 'white',
        }),
        multiValueRemove: styles => ({
          ...styles,
          color: 'white',
          ':hover': {
            backgroundColor: theme?.colors?.primary['500'],
          },
        }),
        ...customStyle,
      }}
      {...props}
    />
  );
};

SingleReactSelect.propTypes = {
  name: PropTypes.any,
  value: PropTypes.any,
  options: PropTypes.array,
  onChange: PropTypes.func,
  customStyle: PropTypes.any,
  error: PropTypes.bool,
  isDisabled: PropTypes.bool,
  menuPosition: PropTypes.string,
  height: PropTypes.string,
  minHeight: PropTypes.string,
  fontSize: PropTypes.string,
  fontWeight: PropTypes.number,
  placeholder: PropTypes.string,
};
