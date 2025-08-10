/**
 * Item List Styles
 * Shared styles for list containers and items across the application
 * Following Material Design 3 guidelines
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { mdColors, mdSpacing, mdElevation, mdShape, mdTypography } from "@/styles/theme";

/**
 * Item List Styles
 * Provides consistent styling for lists of items (menu items, order items, etc.)
 */
export const styles = {
  /**
   * Main container for scrollable content
   */
  container: css`
    flex: 1;
    display: flex;
    flex-direction: column;
  `,

  /**
   * Scrollable container wrapper
   */
  scrollContainer: css`
    flex: 1;
    overflow-y: auto;
  `,

  /**
   * List container that holds items
   * Changes appearance based on data-has-expanded attribute
   */
  items: css`
    background: ${mdColors.surface};
    border: 1px solid ${mdColors.outlineVariant};
    border-radius: ${mdShape.corner.medium};
    margin: ${mdSpacing.md} 0;
    overflow: hidden;
    box-shadow: ${mdElevation.level1};
    
    /* When an item is expanded, flatten the list appearance */
    &[data-has-expanded="true"] {
      box-shadow: none;
      background: transparent;
      border: none;
    }
  `,

  /**
   * Individual list item
   * Supports expanded and flat-mode states via data attributes
   */
  item: css`
    background: ${mdColors.surface};
    border-bottom: 1px solid ${mdColors.outlineVariant};
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: ${mdColors.surfaceVariant};
    }

    /* Expanded item styling */
    &[data-expanded="true"] {
      background: ${mdColors.surface} !important;
      border: 1px solid ${mdColors.outlineVariant};
      border-radius: ${mdShape.corner.medium};
      margin: ${mdSpacing.sm} 0;
      box-shadow: ${mdElevation.level2};
    }

    /* Flat mode styling for collapsed items when another is expanded */
    &[data-flat-mode="true"][data-expanded="false"] {
      background: transparent !important;
      border-bottom: none !important;

      &:hover {
        background: transparent !important;
      }
    }
  `,

  /**
   * Empty state container
   */
  emptyContainer: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${mdSpacing.xl};
    text-align: center;
  `,

  emptyIcon: css`
    font-size: 64px;
    margin-bottom: ${mdSpacing.lg};
    opacity: 0.5;
  `,

  emptyTitle: css`
    font-size: ${mdTypography.headlineMedium.fontSize};
    line-height: ${mdTypography.headlineMedium.lineHeight};
    font-weight: ${mdTypography.headlineMedium.fontWeight};
    color: ${mdColors.onSurface};
    margin: 0 0 ${mdSpacing.sm} 0;
  `,

  emptyMessage: css`
    font-size: ${mdTypography.bodyLarge.fontSize};
    line-height: ${mdTypography.bodyLarge.lineHeight};
    color: ${mdColors.onSurfaceVariant};
    margin: 0 0 ${mdSpacing.xl} 0;
    max-width: 300px;
  `,

  emptyAction: css`
    background: ${mdColors.primary};
    color: ${mdColors.onPrimary};
    border: none;
    border-radius: ${mdShape.corner.full};
    padding: ${mdSpacing.sm} ${mdSpacing.lg};
    font-size: ${mdTypography.labelLarge.fontSize};
    line-height: ${mdTypography.labelLarge.lineHeight};
    font-weight: ${mdTypography.labelLarge.fontWeight};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: ${mdColors.primaryContainer};
      color: ${mdColors.onPrimaryContainer};
    }

    &:active {
      transform: scale(0.98);
    }
  `,
} as const;