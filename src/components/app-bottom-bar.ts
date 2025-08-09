/**
 * App Bottom Bar Component
 * Material Design 3 Bottom App Bar with info displays and primary action
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { html, Template } from "@/lib/html-template";
import { mdColors, mdTypography, mdSpacing, mdElevation, mdShape } from "@/styles/theme";

// Event types
export const VIEW_ORDER_EVENT = "view-order-event";
export const ADD_TO_ORDER_EVENT = "add-to-order-event";
export const SEND_ORDER_EVENT = "send-order-event";

// Type definitions
export type BottomBarMode = 'view' | 'add' | 'send';

export type BottomBarData = {
  mode: BottomBarMode;
  itemCount?: number;
  quantity?: number;
  total?: number;
};

type BottomBarConfig = {
  left: {
    value: string | number;
    label: string;
  };
  action: {
    onClick?: any;
    label: string;
  };
  right: {
    value: string | number;
    label: string;
  };
};

// Configuration for each mode
const CONFIGS: Record<BottomBarMode, Omit<BottomBarConfig, 'left' | 'right'> & { left: { label: string }, right: { label: string } }> = {
  view: {
    left: { label: "Items" },
    action: { label: "View Order" },
    right: { label: "Total" }
  },
  add: {
    left: { label: "Quantity" },
    action: { label: "Add to Order" },
    right: { label: "Total" }
  },
  send: {
    left: { label: "Items" },
    action: { label: "Place Order" },
    right: { label: "Total" }
  }
};

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
    // Default to view mode with zero values
    data = { mode: 'view', itemCount: 0, total: 0 };
  }

  const config = CONFIGS[data.mode];
  const leftValue = data.mode === 'add' ? (data.quantity || 0) : (data.itemCount || 0);
  const rightValue = `$${(data.total || 0).toFixed(2)}`;

  return html`
    ${infoDisplay(leftValue, config.left.label)}

    <button class="${styles.actionButton}">
      ${config.action.label}
    </button>

    ${infoDisplay(rightValue, config.right.label)}
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
