import {
  PHONE_NUMBER_REGEX,
  NUMBER_REGEX,
  GST_REGEX,
  PAN_REGEX,
  ALPHABETIC_REGEX,
} from '../utils/constants/regexPatterns';

export default class Validation {
  // add email validation logic here
  static emailValidator(control) {
    const value = control.value;
    control.nullValue = false;
    control.invalidEmail = false;
    if (value === '') {
      control.nullValue = true;
    }

    let lastAtPos = value.lastIndexOf('@');
    let lastDotPos = value.lastIndexOf('.');
    if (
      !(
        lastAtPos < lastDotPos &&
        lastAtPos > 0 &&
        value.indexOf('@@') == -1 &&
        lastDotPos > 2 &&
        value.length - lastDotPos > 2
      )
    ) {
      control.invalidEmail = true;
    } else {
      control.invalidEmail = false;
    }
    return control;
  }

  static notNullValidator(control) {
    const value = control.value;
    control.nullValue = false;
    if (value === '' || value === null || value === undefined) {
      control.nullValue = true;
    } else {
      control.nullValue = false;
    }
    return control;
  }

  // add password validation logic here
  static passwordValidator(control) {
    const value = control.value;
    control.nullPassword = false;
    if (value === '' || value.trim() === '') {
      control.nullPassword = true;
    }
    return control;
  }

  static validateLength(control, length) {
    const value = control.value;
    if (value !== null && value !== '') {
      if (value.length === length) {
        control.invalidLength = null;
      } else {
        control.invalidLength = true;
      }
    } else if (value === null || value === '') {
      control.invalidLength = null;
    }
    return control;
  }

  static validatePhoneNumber(control) {
    const value = control.value;
    if (!(value === null || value === '')) {
      if (value.length !== 10) {
        control.invalidPhone = true;
        return control;
      }
      if (!value.match(PHONE_NUMBER_REGEX)) {
        control.invalidPhone = true;
      } else {
        control.invalidPhone = null;
      }
    } else {
      control.invalidPhone = null;
    }
    return control;
  }

  static validateNumber(control) {
    const value = control.value;
    if (value !== null) {
      if (!value.match(NUMBER_REGEX)) {
        control.invalidNumber = true;
      } else {
        control.invalidNumber = null;
      }
    }
    return control;
  }

  static maxLengthValidator(control, length) {
    let value = control.value ? control.value : '';
    if (value.length > length) {
      control.invalidLength = true;
    } else {
      control.invalidLength = null;
    }
    return control;
  }

  static minLengthValidator(control, length) {
    let value = control.value ? control.value : '';
    if (value.length < length) {
      control.invalidMinLength = true;
    } else {
      control.invalidMinLength = null;
    }
    return control;
  }

  static validateGST(control) {
    const value = control.value;
    if (!(value === null || value === '')) {
      if (value.length !== 15) {
        control.invalidGST = true;
        return control;
      }
      const isRegexMatched = value.match(GST_REGEX) ? true : false;
      if (!isRegexMatched) {
        control.invalidGST = true;
      } else {
        control.invalidGST = null;
      }
    } else {
      control.invalidGST = null;
    }
    return control;
  }

  static validatePAN(control) {
    const value = control.value;
    if (!(value === null || value === '')) {
      if (value.length !== 10) {
        control.invalidPAN = true;
        return control;
      }
      const isRegexMatched = value.match(PAN_REGEX) ? true : false;
      if (!isRegexMatched) {
        control.invalidPAN = true;
      } else {
        control.invalidPAN = null;
      }
    } else {
      control.invalidPAN = null;
    }
    return control;
  }

  static validateAlphabetic(control) {
    const value = control.value;
    if (!(value === null || value === '')) {
      const isRegexMatched = value.match(ALPHABETIC_REGEX) ? true : false;
      if (isRegexMatched) {
        control.invalidAlphabetic = null;
      } else {
        control.invalidAlphabetic = true;
      }
    } else {
      control.invalidAlphabetic = null;
    }

    return control;
  }
}
