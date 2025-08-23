/**
 * App Bottom Bar Component
 * Material Design 3 Bottom App Bar with info displays and primary action
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./app-bottom-bar.css";
import { html, onClick, Template, render } from "@/lib/html-template";
import { Context, withContext } from "@/lib/context";

// Event types
export const VIEW_ORDER_EVENT = "view-order-event";
export const ADD_TO_ORDER_EVENT = "add-to-order-event";
export const SEND_ORDER_EVENT = "send-order-event";
export const SAVE_CHANGES_EVENT = "save-changes-event";

// Type definitions
export type BottomBarMode = 'add-to-order' | 'modify-order' | 'quick-order' | 'view-order' | 'send-order';

export type BottomBarData = {
  mode: BottomBarMode;
  quantity: number;
  price: number;
};

type BottomBarConfig = {
  quantityLabel: string;
  priceLabel: string;
  actionLabel: string;
  actionEvent: string;
};

// Configuration for each mode
function getConfig(mode: BottomBarMode, context: Context): BottomBarConfig {
  const { t } = withContext(context);
  
  switch (mode) {
    case 'view-order':
      return {
        quantityLabel: t('items'),
        priceLabel: t('total'),
        actionLabel: t('viewOrder'),
        actionEvent: VIEW_ORDER_EVENT,
      };
    case 'add-to-order':
      return {
        quantityLabel: t('quantity'),
        priceLabel: t('total'),
        actionLabel: t('addToOrder'),
        actionEvent: ADD_TO_ORDER_EVENT,
      };
    case 'send-order':
      return {
        quantityLabel: t('items'),
        priceLabel: t('total'),
        actionLabel: t('sendOrder'),
        actionEvent: SEND_ORDER_EVENT,
      };
    case 'quick-order':
      return {
        quantityLabel: t('selected'),
        priceLabel: t('total'),
        actionLabel: t('addToOrder'),
        actionEvent: ADD_TO_ORDER_EVENT,
      };
    case 'modify-order':
      return {
        quantityLabel: t('quantity'),
        priceLabel: t('total'),
        actionLabel: t('saveChanges'),
        actionEvent: SAVE_CHANGES_EVENT,
      };
  }
}

/**
 * Bottom bar template - Material Design 3 Bottom App Bar
 */
export function template(mode: BottomBarMode, context: Context): Template {
  const config = getConfig(mode, context);

  return html`
    <div class="${classes.container}">
      <div class="${classes.infoSection}" data-bottom-bar-quantity>
        <div class="${classes.infoValue}"></div>
        <div class="${classes.infoLabel}">${config.quantityLabel}</div>
      </div>

      <button class="${classes.actionButton}" data-bottom-bar-button ${onClick(config.actionEvent)}>
        ${config.actionLabel}
      </button>

      <div class="${classes.infoSection}" data-bottom-bar-price>
        <div class="${classes.infoValue}"></div>
        <div class="${classes.infoLabel}">${config.priceLabel}</div>
      </div>
    </div>
  `;
}

/**
 * Update the bottom bar with changes
 * @param container The bottom bar container element  
 * @param changes Partial changes to apply
 * @param context Runtime context with language and currency
 */
export function update(
  container: Element,
  changes: Partial<BottomBarData>,
  context: Context
): void {
  // If mode changed, re-render with blank values
  if ('mode' in changes && changes.mode !== undefined) {
    render(template(changes.mode, context), container);
  }

  // Update quantity if provided
  if ('quantity' in changes && changes.quantity !== undefined) {
    const quantitySection = container.querySelector('[data-bottom-bar-quantity]');
    if (quantitySection) {
      const valueElement = quantitySection.querySelector(`.${classes.infoValue}`);
      if (valueElement) {
        valueElement.textContent = String(changes.quantity);
      }
    }
  }

  // Update price if provided
  if ('price' in changes && changes.price !== undefined) {
    const priceSection = container.querySelector('[data-bottom-bar-price]');
    if (priceSection) {
      const valueElement = priceSection.querySelector(`.${classes.infoValue}`);
      if (valueElement) {
        const { formatPrice } = withContext(context);
        valueElement.textContent = formatPrice(changes.price);
      }
    }
  }
}

/**
 * App Bottom Bar Class Names
 */
export const classes = {
  container: "app-bottom-bar-container",
  infoSection: "app-bottom-bar-info-section",
  infoValue: "app-bottom-bar-info-value",
  infoLabel: "app-bottom-bar-info-label",
  actionButton: "app-bottom-bar-action-button",
} as const;

// Export as styles for backward compatibility
export const styles = classes;