/**
 * App Layout Styles
 * Defines the overall layout structure for pages with fixed header and bottom bar
 * Following Material Design 3 guidelines
 */

import { css } from '@linaria/core';
import { mdColors, mdSpacing } from '@/styles/theme';

/**
 * Layout constants following MD3 specifications
 */
const HEADER_HEIGHT = '64px';
const BOTTOM_BAR_HEIGHT = '80px';
const BOTTOM_BAR_PADDING = '16px'; // Vertical padding for content

/**
 * App Layout Styles
 */
export const styles = {
  pageContainer: css`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: ${mdColors.background};
    color: ${mdColors.onBackground};
    position: relative;
  `,

  header: css`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: ${HEADER_HEIGHT};
    background-color: ${mdColors.surface};
    z-index: 100;
    display: flex;
    align-items: center;
    padding: 0 ${mdSpacing.sm};
    gap: ${mdSpacing.sm};
  `,

  content: css`
    flex: 1;
    overflow-y: auto;
    padding-top: calc(${HEADER_HEIGHT} + ${mdSpacing.md});
    padding-bottom: calc(${BOTTOM_BAR_HEIGHT} + ${mdSpacing.lg} + env(safe-area-inset-bottom, 0));
    padding-left: ${mdSpacing.md};
    padding-right: ${mdSpacing.md};
    background-color: ${mdColors.background};
    position: relative;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    /* Ensure content doesn't bleed through */
    z-index: 1;
  `,

  bottomBar: css`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    /* Adjust height: reduce base height slightly since we're adding explicit padding */
    height: calc(64px + env(safe-area-inset-bottom, 0));
    background-color: ${mdColors.surface};
    border-top: 1px solid ${mdColors.outlineVariant};
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* Use symmetric padding on top, and safe area padding on bottom */
    padding: ${mdSpacing.sm} ${mdSpacing.md};
    padding-bottom: calc(${mdSpacing.sm} + env(safe-area-inset-bottom, 0));
    box-sizing: border-box;
  `,
} as const;