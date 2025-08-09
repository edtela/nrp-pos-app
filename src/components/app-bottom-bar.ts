/**
 * App Bottom Bar Component
 * Material Design 3 Bottom App Bar with info displays and primary action
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from '@linaria/core';
import { html, Template } from '@/lib/html-template';
import { mdColors, mdTypography, mdSpacing, mdElevation, mdShape } from '@/styles/theme';
import { BottomBarData } from '@/model/page-model';

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
export function template(data?: BottomBarData): Template {
  if (!data) {
    // Default values if no data provided
    return html`
      ${infoDisplay(0, "Items")}
      <button class="${styles.actionButton}">View Order</button>
      ${infoDisplay(0, "Total")}
    `;
  }
  
  return html`
    ${infoDisplay(data.left.value, data.left.label)}
    
    <button 
      class="${styles.actionButton}"
      ${data.action.onClick ? html`@click="${data.action.onClick}"` : ''}
    >
      ${data.action.label}
    </button>
    
    ${infoDisplay(data.right.value, data.right.label)}
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