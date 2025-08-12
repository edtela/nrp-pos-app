/**
 * Material Design 3 Theme Constants
 * TypeScript constants for components that need direct access to theme values
 */

// Material Design 3 Color Tokens
export const mdColors = {
  // Primary
  primary: '#1B6C3F',
  onPrimary: '#FFFFFF',
  primaryContainer: '#A3F5BB',
  onPrimaryContainer: '#00210F',
  
  // Secondary
  secondary: '#52634F',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#D5E8D0',
  onSecondaryContainer: '#101F0D',
  
  // Tertiary
  tertiary: '#7D5260',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD8E4',
  onTertiaryContainer: '#31111D',
  
  // Error
  error: '#B3261E',
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#410E0B',
  
  // Background
  background: '#FDFCF8',
  onBackground: '#1D1B20',
  
  // Surface
  surface: '#FDFCF8',
  onSurface: '#1D1B20',
  surfaceVariant: '#E7E0EC',
  onSurfaceVariant: '#49454F',
  
  // Surface containers (Material Design 3)
  surfaceContainer: '#F1F0EC',
  surfaceContainerHigh: '#EBE9E6',
  surfaceContainerHighest: '#E5E4E0',
  surfaceContainerLow: '#F7F5F2',
  surfaceContainerLowest: '#FFFFFF',
  
  // Outline
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
  
  // Others
  surfaceTint: '#1B6C3F',
  scrim: '#000000',
  inverseSurface: '#313033',
  inverseOnSurface: '#F4EFF4',
  inversePrimary: '#87D9A0',
} as const;

// Material Design 3 Typography Scale
export const mdTypography = {
  // Display
  displayLarge: {
    fontSize: '57px',
    lineHeight: '64px',
    letterSpacing: '-0.25px',
    fontWeight: '400',
  },
  displayMedium: {
    fontSize: '45px',
    lineHeight: '52px',
    letterSpacing: '0',
    fontWeight: '400',
  },
  displaySmall: {
    fontSize: '36px',
    lineHeight: '44px',
    letterSpacing: '0',
    fontWeight: '400',
  },
  
  // Headline
  headlineLarge: {
    fontSize: '32px',
    lineHeight: '40px',
    letterSpacing: '0',
    fontWeight: '400',
  },
  headlineMedium: {
    fontSize: '28px',
    lineHeight: '36px',
    letterSpacing: '0',
    fontWeight: '400',
  },
  headlineSmall: {
    fontSize: '24px',
    lineHeight: '32px',
    letterSpacing: '0',
    fontWeight: '400',
  },
  
  // Title
  titleLarge: {
    fontSize: '22px',
    lineHeight: '28px',
    letterSpacing: '0',
    fontWeight: '400',
  },
  titleMedium: {
    fontSize: '16px',
    lineHeight: '24px',
    letterSpacing: '0.15px',
    fontWeight: '500',
  },
  titleSmall: {
    fontSize: '14px',
    lineHeight: '20px',
    letterSpacing: '0.1px',
    fontWeight: '500',
  },
  
  // Body
  bodyLarge: {
    fontSize: '16px',
    lineHeight: '24px',
    letterSpacing: '0.5px',
    fontWeight: '400',
  },
  bodyMedium: {
    fontSize: '14px',
    lineHeight: '20px',
    letterSpacing: '0.25px',
    fontWeight: '400',
  },
  bodySmall: {
    fontSize: '12px',
    lineHeight: '16px',
    letterSpacing: '0.4px',
    fontWeight: '400',
  },
  
  // Label
  labelLarge: {
    fontSize: '14px',
    lineHeight: '20px',
    letterSpacing: '0.1px',
    fontWeight: '500',
  },
  labelMedium: {
    fontSize: '12px',
    lineHeight: '16px',
    letterSpacing: '0.5px',
    fontWeight: '500',
  },
  labelSmall: {
    fontSize: '11px',
    lineHeight: '16px',
    letterSpacing: '0.5px',
    fontWeight: '500',
  },
} as const;

// Material Design 3 Spacing
export const mdSpacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

// Material Design 3 Elevation
export const mdElevation = {
  level0: 'none',
  level1: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
  level2: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
  level3: '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px rgba(0, 0, 0, 0.3)',
  level4: '0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px rgba(0, 0, 0, 0.3)',
  level5: '0px 8px 12px 6px rgba(0, 0, 0, 0.15), 0px 4px 4px rgba(0, 0, 0, 0.3)',
} as const;

// Material Design 3 Shape
export const mdShape = {
  corner: {
    none: '0',
    extraSmall: '4px',
    small: '8px',
    medium: '12px',
    large: '16px',
    extraLarge: '28px',
    full: '9999px',
  },
} as const;