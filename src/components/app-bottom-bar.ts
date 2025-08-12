/**
 * App Bottom Bar Component
 * Material Design 3 Bottom App Bar with info displays and primary action
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./app-bottom-bar.css";
import { html, onClick, Template, render } from "@/lib/html-template";

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
    <div class="${classes.infoSection}" data-bottom-bar-field="${config.left.field}">
      <div class="${classes.infoValue}">0</div>
      <div class="${classes.infoLabel}">${config.left.label}</div>
    </div>

    <button class="${classes.actionButton}" data-bottom-bar-button ${onClick(config.action.onClick)}>
      ${config.action.label}
    </button>

    <div class="${classes.infoSection}" data-bottom-bar-field="${config.right.field}">
      <div class="${classes.infoValue}">$0.00</div>
      <div class="${classes.infoLabel}">${config.right.label}</div>
    </div>
  `;
}

// Field formatters for consistent value formatting
const FIELD_FORMATTERS: Record<keyof Omit<BottomBarData, "mode">, (value: any) => string> = {
  itemCount: (value) => String(value || 0),
  quantity: (value) => String(value || 0),
  total: (value) => `$${(value || 0).toFixed(2)}`,
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
      const valueElement = element.querySelector(`.${classes.infoValue}`);
      if (valueElement && field in FIELD_FORMATTERS) {
        valueElement.textContent = FIELD_FORMATTERS[field as keyof typeof FIELD_FORMATTERS](value);
      }
    }
  }
}

/**
 * App Bottom Bar Class Names
 */
export const classes = {
  infoSection: "app-bottom-bar-info-section",
  infoValue: "app-bottom-bar-info-value",
  infoLabel: "app-bottom-bar-info-label",
  actionButton: "app-bottom-bar-action-button",
} as const;

// Export as styles for backward compatibility
export const styles = classes;
