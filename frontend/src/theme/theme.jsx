import { extendTheme } from '@chakra-ui/react';
import { breakpoints } from './foundations/breakpoints';

// Fixed color palette - Accurate hex codes from Figma
const COLORS = {
  // Primary colors
  primary: '#2A2B67', // Primary(2A2B67) from Figma
  secondary: '#C7D2FE', // Secondary(C7D2FE) from Figma
  accent: '#35E6FF', // Accent(35E6FF) from Figma

  // Status colors
  success: '#00A123', // Succed(00A123) from Figma
  warning: '#FF8800', // Warning(FF8800) from Figma
  error: '#C70600', // Error(C70600) from Figma
  info: '#3B82F6', // Info (kept for compatibility)

  // Background colors
  bg: '#F9FAFB', // Bg(F9FAFB) from Figma
  paleSky: '#F5F7FA', // Light gray-blue (compatibility)
  riverBed: '#475569', // Dark gray (compatibility)

  // Text colors
  primaryText: '#12121A', // Primary Text Color(12121A) from Figma
  secondaryText: '#575757', // Secondary Text Color(575757) from Figma
  lightText: '#9B9B9B', // Light Text Color(9B9B9B) from Figma

  // Border/Stroke colors
  stroke: '#CFCFCF', // Stroke Color(CFCFCF) from Figma

  // White variants
  white: '#FFFFFF', // White(FFFFFF) from Figma
  white20: 'rgba(255, 255, 255, 0.2)',

  // Additional utility colors
  light: '#F9FAFB',         // Same as bg
  dark: '#0F172A',          // Dark (compatibility)
  darkSecondary: '#1F2937', // Dark secondary (for gradients)
  
  // Avatar/Message colors
  indigo: '#6366F1',        // Indigo (AI avatar gradient start)
  indigoDark: '#4D4F93',   // Indigo dark (AI avatar gradient end)
  grayLight: '#E5E7EB',    // Light gray (user avatar gradient)
  indigoLight: '#EEF2FF',  // Light indigo (AI message background)
  LavendeBlue: '#E0E7FF',  // Lavender blue
  PeriwinkleBlue: '#C7D2FE', // Periwinkle blue
  indigoMedium: '#A5B4FC', // Medium indigo (for nested circles)

  // Disabled/Inactive colors
  grayDisabled: '#AFAFB1', // Medium gray (for disabled buttons/states)
};

// Create color scales for Chakra UI
const createColorScale = baseColor => {
  return {
    50: `${baseColor}0D`, // 5% opacity
    100: `${baseColor}1A`, // 10% opacity
    200: `${baseColor}33`, // 20% opacity
    300: `${baseColor}4D`, // 30% opacity
    400: `${baseColor}80`, // 50% opacity
    500: baseColor, // base color
    600: baseColor, // base color
    700: baseColor, // base color
    800: baseColor, // base color
    900: baseColor, // base color
  };
};

const getTheme = () => {
  const Input = {
    baseStyle: {
      field: {
        bg: 'transparent',
        borderColor: 'stroke',
        borderWidth: 1,
        ':hover': {
          borderColor: 'stroke',
        },
        ':focus': {
          borderColor: 'primary.500',
          borderWidth: 2,
          boxShadow: 'none',
        },
      },
    },
    defaultProps: {
      variant: null,
    },
  };

  const Select = {
    baseStyle: {
      field: {
        borderColor: 'stroke',
        borderWidth: 1,
        ':hover': {
          borderColor: 'stroke',
        },
        ':focus': {
          borderColor: 'primary.500',
          borderWidth: 2,
          boxShadow: 'none',
        },
      },
    },
    defaultProps: {
      variant: null,
    },
  };

  const Modal = {
    baseStyle: {
      header: {
        fontSize: '24px',
        fontWeight: 600,
      },
    },
  };

  const Button = {
    baseStyle: {
      fontWeight: 500,
      borderRadius: 'md',
    },
    defaultProps: {
      colorScheme: 'primary',
    },
  };

  const themeData = {
    config: {
      initialColorMode: 'light',
      useSystemColorMode: false,
    },
    fonts: {
      heading:
        'Inter, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif',
      body: 'Inter, -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif',
    },
    colors: {
      // Main color scales
      primary: createColorScale(COLORS.primary),
      secondary: createColorScale(COLORS.secondary),
      accent: createColorScale(COLORS.accent),

      // Status colors
      success: createColorScale(COLORS.success),
      warning: createColorScale(COLORS.warning),
      error: createColorScale(COLORS.error),
      danger: createColorScale(COLORS.error), // Alias for error
      info: createColorScale(COLORS.info),

      // Background colors
      bg: COLORS.bg,
      paleSky: COLORS.paleSky,
      riverBed: COLORS.riverBed,

      // Text colors
      primaryText: COLORS.primaryText,
      secondaryText: COLORS.secondaryText,
      lightText: COLORS.lightText,

      // Border colors
      stroke: COLORS.stroke,

      // Utility colors
      white: COLORS.white,
      white20: COLORS.white20,
      light: createColorScale(COLORS.light),
      dark: createColorScale(COLORS.dark),
      darkSecondary: COLORS.darkSecondary,
      
      // Avatar/Message colors
      indigo: createColorScale(COLORS.indigo),
      indigoDark: COLORS.indigoDark,
      grayLight: COLORS.grayLight,
      indigoLight: COLORS.indigoLight,
      LavendeBlue: COLORS.LavendeBlue,
      PeriwinkleBlue: COLORS.PeriwinkleBlue,
      indigoMedium: COLORS.indigoMedium,
      
      // Disabled/Inactive colors
      grayDisabled: COLORS.grayDisabled,
    },
    components: {
      Button,
      Switch: {
        defaultProps: {
          colorScheme: 'primary',
        },
        baseStyle: {
          track: {
            boxShadow: 'none !important',
          },
        },
      },
      Radio: {
        defaultProps: {
          colorScheme: 'primary',
        },
      },
      Stepper: {
        defaultProps: {
          colorScheme: 'primary',
        },
      },
      Tabs: {
        defaultProps: {
          colorScheme: 'primary',
        },
      },
      Checkbox: {
        defaultProps: {
          colorScheme: 'primary',
        },
      },
      Input,
      Select,
      Modal,
      FormLabel: {
        baseStyle: {
          fontWeight: 400,
          fontSize: '14px',
          color: 'primaryText',
        },
      },
    },
    styles: {
      global: {
        ':root': {
          '--toast-z-index': '9999999',
        },
        body: {
          bg: 'bg',
          color: 'primaryText',
        },
      },
    },
  };

  return extendTheme(breakpoints, themeData);
};

export default getTheme;
