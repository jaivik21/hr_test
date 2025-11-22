/**
 * Centralized regex patterns for validation
 * All regex patterns used across the application should be defined here
 */

// Phone number validation - accepts only digits
export const PHONE_NUMBER_REGEX = /^[0-9]*$/;

// Number validation - accepts only digits
export const NUMBER_REGEX = /^[0-9]*$/;

// GST (Goods and Services Tax) validation - Indian GST format
// Format: 2 digits (state code) + 10 alphanumeric characters
export const GST_REGEX =
  /^([0][1-9]|[1-2][0-9]|[3][0-5])([a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1})+/;

// PAN (Permanent Account Number) validation - Indian PAN format
// Format: 5 letters + 4 digits + 1 letter
export const PAN_REGEX = /^([a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1})+$/;

// Alphabetic validation - accepts only letters and spaces
export const ALPHABETIC_REGEX = /^[a-zA-Z ]*$/;

// Email validation - standard email format
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Name validation - accepts letters, spaces, hyphens, apostrophes, and periods
// Allows common name formats like "John Doe", "Mary-Jane", "O'Brien", "Dr. Smith"
export const NAME_REGEX = /^[a-zA-Z\s\-'\.]+$/;

// 10-digit phone number validation
export const PHONE_10_DIGIT_REGEX = /^\d{10}$/;

export default {
  PHONE_NUMBER_REGEX,
  NUMBER_REGEX,
  GST_REGEX,
  PAN_REGEX,
  ALPHABETIC_REGEX,
  EMAIL_REGEX,
  NAME_REGEX,
  PHONE_10_DIGIT_REGEX,
};
