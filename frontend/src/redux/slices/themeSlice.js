import { createSlice } from '@reduxjs/toolkit';

// Fixed color palette from Figma - no dynamic theming
const initialState = {
  // Primary colors
  primaryColor: '#2A2B67', // Primary from Figma
  secondaryColor: '#C7D2FE', // Secondary from Figma
  accentColor: '#35E6FF', // Accent from Figma

  // Status colors
  successColor: '#00A123', // Success from Figma
  warningColor: '#FF8800', // Warning from Figma
  errorColor: '#C70600', // Error from Figma
  dangerColor: '#C70600', // Alias for error
  infoColor: '#3B82F6', // Info (kept for compatibility)

  // Background colors
  bgColor: '#F9FAFB', // Bg from Figma
  paleSkyColor: '#F5F7FA', // Light gray-blue (compatibility)
  riverBedColor: '#475569', // Dark gray (compatibility)

  // Text colors
  primaryTextColor: '#12121A', // Primary Text Color from Figma
  secondaryTextColor: '#575757', // Secondary Text Color from Figma
  lightTextColor: '#9B9B9B', // Light Text Color from Figma

  // Border/Stroke colors
  strokeColor: '#CFCFCF', // Stroke Color from Figma

  // Utility colors
  whiteColor: '#FFFFFF', // White from Figma
  lightColor: '#F9FAFB', // Same as bgColor
  darkColor: '#0F172A', // Dark (compatibility)
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    // Keeping this reducer for backward compatibility, but it won't change colors
    setThemeColor: state => {
      // Theme colors are now fixed, this action does nothing
      // Kept for backward compatibility only
      return state;
    },
  },
});

export const { setThemeColor } = themeSlice.actions;

export default themeSlice.reducer;
