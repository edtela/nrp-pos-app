/**
 * App Bottom Bar Component
 * Material Design 3 Bottom App Bar with info displays and primary action
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from '@linaria/core';
import { html, Template } from '@/lib/html-template';
import { mdColors, mdTypography, mdSpacing, mdElevation, mdShape } from '@/styles/theme';

/**
 * Bottom bar data interface
 */
export interface BottomBarData {
  leftValue?: string | number;
  leftLabel?: string;
  rightValue?: string | number;
  rightLabel?: string;
  actionText?: string;
}

/**
 * Info display template for left/right sections
 */
function infoDisplay(value: string | number, label: string): Template {
  return html`
    <div class="${styles.infoSection}">
      <div class="${styles.infoValue}">${value}</div>
      <div class="${styles.infoLabel}">${label}</div>
    </div>
  `;
}

/**
 * Bottom bar template - Material Design 3 Bottom App Bar
 */
export function template(data: BottomBarData = {}): Template {
  const {
    leftValue = 2,
    leftLabel = "Items",
    rightValue = "$120",
    rightLabel = "Total",
    actionText = "View Cart"
  } = data;
  
  return html`
    ${infoDisplay(leftValue, leftLabel)}
    
    <button class="${styles.actionButton}">
      ${actionText}
    </button>
    
    ${infoDisplay(rightValue, rightLabel)}
  `;
}

/**
 * App Bottom Bar Styles
 */
export const styles = {
  infoSection: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
  `,
  
  infoValue: css`
    font-size: ${mdTypography.headlineSmall.fontSize};
    line-height: ${mdTypography.headlineSmall.lineHeight};
    font-weight: ${mdTypography.headlineSmall.fontWeight};
    color: ${mdColors.onSurface};
  `,
  
  infoLabel: css`
    font-size: ${mdTypography.labelSmall.fontSize};
    line-height: ${mdTypography.labelSmall.lineHeight};
    font-weight: ${mdTypography.labelSmall.fontWeight};
    color: ${mdColors.onSurfaceVariant};
    margin-top: 2px;
  `,
  
  actionButton: css`
    background-color: ${mdColors.primary};
    color: ${mdColors.onPrimary};
    border: none;
    border-radius: ${mdShape.corner.full};
    padding: 0 ${mdSpacing.xl};
    height: 40px;
    min-width: 120px;
    font-size: ${mdTypography.labelLarge.fontSize};
    line-height: ${mdTypography.labelLarge.lineHeight};
    font-weight: ${mdTypography.labelLarge.fontWeight};
    letter-spacing: ${mdTypography.labelLarge.letterSpacing};
    cursor: pointer;
    transition: all 200ms ease;
    box-shadow: ${mdElevation.level1};
    
    &:hover {
      box-shadow: ${mdElevation.level2};
      background-color: ${mdColors.primary}E6;
    }
    
    &:active {
      box-shadow: ${mdElevation.level1};
      transform: scale(0.98);
    }
  `,
} as const;