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
    padding-bottom: calc(${BOTTOM_BAR_HEIGHT} + ${mdSpacing.lg});
    padding-left: ${mdSpacing.md};
    padding-right: ${mdSpacing.md};
    background-color: ${mdColors.background};
    position: relative;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  `,

  bottomBar: css`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: ${BOTTOM_BAR_HEIGHT};
    background-color: ${mdColors.surface};
    border-top: 1px solid ${mdColors.outlineVariant};
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 ${mdSpacing.md};
  `,
} as const;