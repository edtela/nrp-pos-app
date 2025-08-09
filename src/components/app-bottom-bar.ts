/**
 * App Bottom Bar Component
 * Material Design 3 Bottom App Bar with info displays and primary action
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { html, onClick, Template, render } from "@/lib/html-template";
import { mdColors, mdTypography, mdSpacing, mdElevation, mdShape } from "@/styles/theme";

// Event types
export const VIEW_ORDER_EVENT = "view-order-event";
export const ADD_TO_ORDER_EVENT = "add-to-order-event";
export const SEND_ORDER_EVENT = "send-order-event";

// Type definitions
export type BottomBarMode = "view" | "add" | "send";

export type BottomBarData = {
  mode: BottomBarMode;
  itemCount?: number;
  quantity?: number;
  total?: number;
};

type BottomBarConfig = {
  left: {
    field: string;
    label: string;
  };
  action: {
    onClick?: any;
    label: string;
  };
  right: {
    field: string;
    label: string;
  };
};

// Configuration for each mode
const CONFIGS: Record<BottomBarMode, BottomBarConfig> = {
  view: {
    left: { field: "itemCount", label: "Items" },
    action: { label: "View Order", onClick: VIEW_ORDER_EVENT },
    right: { field: "total", label: "Total" },
  },
  add: {
    left: { field: "quantity", label: "Quantity" },
    action: { label: "Add to Order", onClick: ADD_TO_ORDER_EVENT },
    right: { field: "total", label: "Total" },
  },
  send: {
    left: { field: "itemCount", label: "Items" },
    action: { label: "Place Order", onClick: SEND_ORDER_EVENT },
    right: { field: "total", label: "Total" },
  },
};


/**
 * Bottom bar template - Material Design 3 Bottom App Bar
 */
export function template(mode: BottomBarMode = "view"): Template {
  const config = CONFIGS[mode];

  return html`
    <div class="${styles.infoSection}" data-bottom-bar-field="${config.left.field}">
      <div class="${styles.infoValue}">0</div>
      <div class="${styles.infoLabel}">${config.left.label}</div>
    </div>

    <button class="${styles.actionButton}" data-bottom-bar-button ${onClick(config.action.onClick)}>${config.action.label}</button>

    <div class="${styles.infoSection}" data-bottom-bar-field="${config.right.field}">
      <div class="${styles.infoValue}">$0.00</div>
      <div class="${styles.infoLabel}">${config.right.label}</div>
    </div>
  `;
}

// Field formatters for consistent value formatting
const FIELD_FORMATTERS: Record<keyof Omit<BottomBarData, 'mode'>, (value: any) => string> = {
  itemCount: (value) => String(value || 0),
  quantity: (value) => String(value || 0),
  total: (value) => `$${(value || 0).toFixed(2)}`
};

/**
 * Update the bottom bar with partial data
 * @param container The bottom bar container element
 * @param updates Partial updates to apply
 */
export function update(container: HTMLElement, updates: Partial<BottomBarData>): void {
  const { mode, ...rest } = updates;
  
  // If mode changed, re-render with empty values
  if (mode !== undefined) {
    render(template(mode), container);
  }
  
  // Update individual fields
  for (const [field, value] of Object.entries(rest)) {
    const element = container.querySelector(`[data-bottom-bar-field="${field}"]`);
    if (element) {
      const valueElement = element.querySelector(`.${styles.infoValue}`);
      if (valueElement && field in FIELD_FORMATTERS) {
        valueElement.textContent = FIELD_FORMATTERS[field as keyof typeof FIELD_FORMATTERS](value);
      }
    }
  }
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

