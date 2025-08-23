/**
 * App Bottom Bar Component
 * Material Design 3 Bottom App Bar with info displays and primary action
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./app-bottom-bar.css";
import { html, onClick, Template, render } from "@/lib/html-template";
import { Context, withContext } from "@/lib/context";
import { DataChange } from "@/lib/data-model-types";

// Event types
export const VIEW_ORDER_EVENT = "view-order-event";
export const ADD_TO_ORDER_EVENT = "add-to-order-event";
export const SEND_ORDER_EVENT = "send-order-event";
export const SAVE_CHANGES_EVENT = "save-changes-event";

// Type definitions
export type BottomBarMode = "view" | "add" | "send" | "quickOrder" | "modify";

export type BottomBarData = {
  mode: BottomBarMode;
  itemCount?: number;
  quantity?: number;
  selected?: number;
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
function getConfigs(context: Context): Record<BottomBarMode, BottomBarConfig> {
  const { t } = withContext(context);
  
  return {
    view: {
      left: { field: "itemCount", label: t('items') },
      action: { label: t('viewOrder'), onClick: VIEW_ORDER_EVENT },
      right: { field: "total", label: t('total') },
    },
    add: {
      left: { field: "quantity", label: t('quantity') },
      action: { label: t('addToOrder'), onClick: ADD_TO_ORDER_EVENT },
      right: { field: "total", label: t('total') },
    },
    send: {
      left: { field: "itemCount", label: t('items') },
      action: { label: t('sendOrder'), onClick: SEND_ORDER_EVENT },
      right: { field: "total", label: t('total') },
    },
    quickOrder: {
      left: { field: "selected", label: t('selected') },
      action: { label: t('addToOrder'), onClick: ADD_TO_ORDER_EVENT },
      right: { field: "total", label: t('total') },
    },
    modify: {
      left: { field: "quantity", label: t('quantity') },
      action: { label: t('saveChanges'), onClick: SAVE_CHANGES_EVENT },
      right: { field: "total", label: t('total') },
    },
  };
}

/**
 * Bottom bar template - Material Design 3 Bottom App Bar
 */
export function template(mode: BottomBarMode = "view", context: Context): Template {
  const configs = getConfigs(context);
  const config = configs[mode];
  const { formatPrice } = withContext(context);
  
  // Default display value for price field
  const defaultPrice = context ? formatPrice(0) : "$0.00";

  return html`
    <div class="${classes.infoSection}" data-bottom-bar-field="${config.left.field}">
      <div class="${classes.infoValue}">0</div>
      <div class="${classes.infoLabel}">${config.left.label}</div>
    </div>

    <button class="${classes.actionButton}" data-bottom-bar-button ${onClick(config.action.onClick)}>
      ${config.action.label}
    </button>

    <div class="${classes.infoSection}" data-bottom-bar-field="${config.right.field}">
      <div class="${classes.infoValue}">${defaultPrice}</div>
      <div class="${classes.infoLabel}">${config.right.label}</div>
    </div>
  `;
}

// Field formatters for consistent value formatting
function getFieldFormatters(context: Context): Record<keyof Omit<BottomBarData, "mode">, (value: any) => string> {
  const { formatPrice } = withContext(context);
  
  return {
    itemCount: (value) => String(value || 0),
    quantity: (value) => String(value || 0),
    selected: (value) => String(value || 0),
    total: (value) => formatPrice(value || 0),
  };
}

/**
 * Update the bottom bar with changes
 * @param container The bottom bar container element  
 * @param changes Changes to apply
 * @param context Runtime context with language and currency
 */
export function update(
  container: Element,
  changes: DataChange<BottomBarData>,
  context: Context
): void {
  // If mode changed, re-render with empty values
  if ('mode' in changes && changes.mode !== undefined) {
    render(template(changes.mode, context), container);
  }

  // Update individual fields
  const formatters = getFieldFormatters(context);
  const fieldsToUpdate = ['itemCount', 'quantity', 'selected', 'total'] as const;
  
  for (const field of fieldsToUpdate) {
    if (field in changes) {
      const element = container.querySelector(`[data-bottom-bar-field="${field}"]`);
      if (element) {
        const valueElement = element.querySelector(`.${classes.infoValue}`);
        if (valueElement && field in formatters) {
          valueElement.textContent = formatters[field]((changes as any)[field]);
        }
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
