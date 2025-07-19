/**
 * Material Design 3 Theme with Linaria
 * Using Linaria's recommended approach for theming
 */

import { css } from '@linaria/core';

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

// Helper function to create font shorthand
function createFontShorthand(typography: typeof mdTypography[keyof typeof mdTypography]) {
  return `${typography.fontWeight} ${typography.fontSize}/${typography.lineHeight} 'Roboto', sans-serif`;
}

// Global styles with CSS custom properties
export const globals = css`
  :global() {
    :root {
      /* Color System */
      --md-sys-color-primary: ${mdColors.primary};
      --md-sys-color-on-primary: ${mdColors.onPrimary};
      --md-sys-color-primary-container: ${mdColors.primaryContainer};
      --md-sys-color-on-primary-container: ${mdColors.onPrimaryContainer};
      
      --md-sys-color-secondary: ${mdColors.secondary};
      --md-sys-color-on-secondary: ${mdColors.onSecondary};
      --md-sys-color-secondary-container: ${mdColors.secondaryContainer};
      --md-sys-color-on-secondary-container: ${mdColors.onSecondaryContainer};
      
      --md-sys-color-tertiary: ${mdColors.tertiary};
      --md-sys-color-on-tertiary: ${mdColors.onTertiary};
      --md-sys-color-tertiary-container: ${mdColors.tertiaryContainer};
      --md-sys-color-on-tertiary-container: ${mdColors.onTertiaryContainer};
      
      --md-sys-color-error: ${mdColors.error};
      --md-sys-color-on-error: ${mdColors.onError};
      --md-sys-color-error-container: ${mdColors.errorContainer};
      --md-sys-color-on-error-container: ${mdColors.onErrorContainer};
      
      --md-sys-color-background: ${mdColors.background};
      --md-sys-color-on-background: ${mdColors.onBackground};
      
      --md-sys-color-surface: ${mdColors.surface};
      --md-sys-color-on-surface: ${mdColors.onSurface};
      --md-sys-color-surface-variant: ${mdColors.surfaceVariant};
      --md-sys-color-on-surface-variant: ${mdColors.onSurfaceVariant};
      
      /* Surface container colors */
      --md-sys-color-surface-container: ${mdColors.surfaceContainer};
      --md-sys-color-surface-container-high: ${mdColors.surfaceContainerHigh};
      --md-sys-color-surface-container-highest: ${mdColors.surfaceContainerHighest};
      --md-sys-color-surface-container-low: ${mdColors.surfaceContainerLow};
      --md-sys-color-surface-container-lowest: ${mdColors.surfaceContainerLowest};
      
      --md-sys-color-outline: ${mdColors.outline};
      --md-sys-color-outline-variant: ${mdColors.outlineVariant};
      
      /* Typography System */
      --md-sys-typescale-display-large-font: ${createFontShorthand(mdTypography.displayLarge)};
      --md-sys-typescale-display-medium-font: ${createFontShorthand(mdTypography.displayMedium)};
      --md-sys-typescale-display-small-font: ${createFontShorthand(mdTypography.displaySmall)};
      
      --md-sys-typescale-headline-large-font: ${createFontShorthand(mdTypography.headlineLarge)};
      --md-sys-typescale-headline-medium-font: ${createFontShorthand(mdTypography.headlineMedium)};
      --md-sys-typescale-headline-small-font: ${createFontShorthand(mdTypography.headlineSmall)};
      
      --md-sys-typescale-title-large-font: ${createFontShorthand(mdTypography.titleLarge)};
      --md-sys-typescale-title-medium-font: ${createFontShorthand(mdTypography.titleMedium)};
      --md-sys-typescale-title-small-font: ${createFontShorthand(mdTypography.titleSmall)};
      
      --md-sys-typescale-body-large-font: ${createFontShorthand(mdTypography.bodyLarge)};
      --md-sys-typescale-body-medium-font: ${createFontShorthand(mdTypography.bodyMedium)};
      --md-sys-typescale-body-small-font: ${createFontShorthand(mdTypography.bodySmall)};
      
      --md-sys-typescale-label-large-font: ${createFontShorthand(mdTypography.labelLarge)};
      --md-sys-typescale-label-medium-font: ${createFontShorthand(mdTypography.labelMedium)};
      --md-sys-typescale-label-small-font: ${createFontShorthand(mdTypography.labelSmall)};
    }
  }
`;