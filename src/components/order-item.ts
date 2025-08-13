/**
 * Order Item Component
 * Displays a single order item with modifiers and pricing
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./order-item.css";
import { html, Template, dataAttr, CLICK_EVENT, onClick, replaceElement } from "@/lib/html-template";
import { Context } from "@/lib/context";
import { OrderModifier, DisplayItem } from "@/model/order-model";
import { styles as itemListStyles } from "./item-list";
import { DataChange } from "@/lib/data-model-types";

// Event constants
export const INCREASE_QUANTITY_EVENT = "increase-quantity-event";
export const DECREASE_QUANTITY_EVENT = "decrease-quantity-event";
export const MODIFY_ITEM_EVENT = "modify-item-event";
export const TOGGLE_ITEM_EVENT = "toggle-item-event";

// Removed OrderItemData - using DisplayItem from model instead

/**
 * Modification token types
 */
type ModificationTokenType = "removed" | "added-free" | "added-priced";

interface ModificationToken {
  name: string;
  type: ModificationTokenType;
  price?: number;
}

/**
 * Generate modification tokens from modifiers
 */
function generateModificationTokens(modifiers: OrderModifier[]): ModificationToken[] {
  return modifiers.map((modifier) => {
    if (modifier.quantity === 0) {
      return { name: modifier.name, type: "removed", price: modifier.price };
    }

    if (modifier.price === 0) {
      return {
        name: modifier.name,
        type: "added-free",
      };
    }

    return {
      name: modifier.name,
      type: "added-priced",
      price: modifier.price,
    };
  });
}

/**
 * Modification token template for collapsed view (horizontal, no prices)
 */
function modificationTokenTemplate(token: ModificationToken): Template {
  const className =
    token.type === "removed"
      ? classes.tokenRemoved
      : token.type === "added-priced"
        ? classes.tokenPriced
        : classes.tokenFree;

  const prefix = token.type === "removed" ? "-" : token.type === "added-priced" ? "+" : "";

  return html`<span class="${classes.token} ${className}">${prefix}${token.name}</span>`;
}

/**
 * Modification item template for expanded view (vertical list with prices)
 */
function modificationItemTemplate(modifier: OrderModifier): Template {
  const isRemoved = modifier.quantity === 0;
  const hasPriceDisplay = modifier.price > 0;
  const className = isRemoved ? classes.modItemRemoved : modifier.price > 0 ? classes.modItemPriced : classes.modItemFree;

  const prefix = isRemoved ? "-" : modifier.price > 0 ? "+" : "";

  return html`
    <div class="${classes.modItem} ${className}">
      <span class="${classes.modItemName}">${prefix}${modifier.name}</span>
      ${hasPriceDisplay ? html`<span class="${classes.modItemPrice}">$${modifier.price.toFixed(2)}</span>` : ""}
    </div>
  `;
}

/**
 * Order item template
 */
export function template(displayItem: DisplayItem): Template {
  const item = displayItem.item;
  const hasModifiers = item.modifiers && item.modifiers.length > 0;
  const tokens = hasModifiers ? generateModificationTokens(item.modifiers) : [];
  const showQuantityInHeader = item.quantity > 1 && !displayItem.expanded;

  const itemClasses = `${itemListStyles.item} ${classes.orderItem}`;

  return html`
    <div
      class="${itemClasses}"
      id="order-item-${item.id}"
      data-expanded="${displayItem.expanded ? "true" : "false"}"
      data-flat-mode="${displayItem.flatMode ? "true" : "false"}"
    >
      <div class="${classes.header}" data-item-id="${item.id}" ${onClick(TOGGLE_ITEM_EVENT)}>
        <div class="${classes.info}">
          ${item.menuItem.icon ? html`<span class="${classes.icon}">${item.menuItem.icon}</span>` : ""}
          <div class="${classes.details}">
            <div class="${classes.titleSection}">
              <h3 class="${classes.name}">${item.menuItem.name}</h3>
              <div class="${classes.price}">$${item.total.toFixed(2)}</div>
            </div>
            <div class="${classes.descriptionSection}">
              ${!displayItem.expanded
                ? tokens.length > 0
                  ? html`<div class="${classes.tokens}">${tokens.map((token) => modificationTokenTemplate(token))}</div>`
                  : item.menuItem.description
                    ? html`<p class="${classes.description}">${item.menuItem.description}</p>`
                    : ""
                : ""}
              ${showQuantityInHeader
                ? html`<span class="${classes.quantity}">${item.quantity} × $${item.unitPrice.toFixed(2)}</span>`
                : ""}
            </div>
          </div>
        </div>
        <svg
          class="${classes.toggle}"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      ${displayItem.expanded
        ? html`
            <div class="${classes.expandedContent}">
              ${item.menuItem.description
                ? html`<p class="${classes.expandedDescription}">${item.menuItem.description}</p>`
                : ""}
              ${hasModifiers
                ? html`<div class="${classes.modificationsList}">
                    ${item.modifiers.map((modifier) => modificationItemTemplate(modifier))}
                  </div>`
                : ""}
              <div class="${classes.expandedControls}">
                <div class="${classes.quantityControls}">
                  <span class="${classes.quantityLabel}">Quantity:</span>
                  <button
                    class="${classes.quantityBtn}"
                    data-item-id="${item.id}"
                    ${onClick(DECREASE_QUANTITY_EVENT)}
                    ${item.quantity <= 1 ? "disabled" : ""}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <span class="${classes.quantityDisplay}">${item.quantity}</span>
                  <button class="${classes.quantityBtn}" data-item-id="${item.id}" ${onClick(INCREASE_QUANTITY_EVENT)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="${classes.actions}">
                <div class="${classes.actionsLeft}">
                  <button
                    class="${classes.actionBtn} ${classes.actionBtnDestructive}"
                    ${dataAttr(CLICK_EVENT, { items: { [item.id]: [] } })}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    Remove
                  </button>
                </div>
                <div class="${classes.actionsRight}">
                  <button
                    class="${classes.actionBtn} ${classes.actionBtnSecondary}"
                    data-item-id="${item.id}"
                    ${onClick(MODIFY_ITEM_EVENT)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m17 3 4 4-9 9-4 1 1-4 9-9z" />
                      <path d="m15 5 4 4" />
                    </svg>
                    Modify
                  </button>
                </div>
              </div>
            </div>
          `
        : ""}
    </div>
  `;
}

export function update(
  container: Element,
  changes: DataChange<DisplayItem>,
  _context: Context,
  data: DisplayItem
): void {
  // Handle expanded state changes - requires re-render
  if ("expanded" in changes) {
    replaceElement(container, template(data));
    return;
  }

  // Handle flatMode changes - just update attribute
  if ("flatMode" in changes) {
    container.setAttribute("data-flat-mode", String(data.flatMode === true));
  }

  // Handle item property changes
  const itemChanges = changes.item;
  if (!itemChanges) return;

  const itemData = data.item;

  // Update quantity display
  if (itemChanges.quantity !== undefined) {
    const quantityDisplay = container.querySelector(`.${classes.quantityDisplay}`);
    if (quantityDisplay) {
      quantityDisplay.textContent = String(itemData.quantity);
    }

    const quantityHeader = container.querySelector(`.${classes.quantity}`) as HTMLElement;
    if (quantityHeader) {
      quantityHeader.textContent = `${itemData.quantity} × $${itemData.unitPrice.toFixed(2)}`;
      if (itemData.quantity > 1) {
        quantityHeader.classList.remove(classes.quantityHidden);
      } else {
        quantityHeader.classList.add(classes.quantityHidden);
      }
    }

    // Update decrease button disabled state
    const quantityControls = container.querySelector(`.${classes.quantityControls}`);
    if (quantityControls) {
      const decreaseBtn = quantityControls.querySelector("button:first-child") as HTMLButtonElement;
      if (decreaseBtn) {
        decreaseBtn.disabled = itemData.quantity <= 1;
      }
    }
  }

  // Update total price
  if (itemChanges.total !== undefined) {
    const priceElement = container.querySelector(`.${classes.price}`);
    if (priceElement) {
      priceElement.textContent = `$${itemData.total.toFixed(2)}`;
    }
  }
}

/**
 * CSS class names
 */
export const classes = {
  orderItem: "order-item-order-item",
  header: "order-item-header",
  info: "order-item-info",
  icon: "order-item-icon",
  details: "order-item-details",
  titleSection: "order-item-title-section",
  name: "order-item-name",
  price: "order-item-price",
  descriptionSection: "order-item-description-section",
  description: "order-item-description",
  quantity: "order-item-quantity",
  quantityHidden: "order-item-quantity-hidden",
  toggle: "order-item-toggle",
  tokens: "order-item-tokens",
  token: "order-item-token",
  tokenRemoved: "order-item-token-removed",
  tokenPriced: "order-item-token-priced",
  tokenFree: "order-item-token-free",
  noModifiers: "order-item-no-modifiers",
  expandedContent: "order-item-expanded-content",
  expandedDescription: "order-item-expanded-description",
  modificationsList: "order-item-modifications-list",
  modItem: "order-item-mod-item",
  modItemName: "order-item-mod-item-name",
  modItemPrice: "order-item-mod-item-price",
  modItemRemoved: "order-item-mod-item-removed",
  modItemPriced: "order-item-mod-item-priced",
  modItemFree: "order-item-mod-item-free",
  expandedControls: "order-item-expanded-controls",
  quantityControls: "order-item-quantity-controls",
  quantityLabel: "order-item-quantity-label",
  quantityBtn: "order-item-quantity-btn",
  quantityDisplay: "order-item-quantity-display",
  actions: "order-item-actions",
  actionsLeft: "order-item-actions-left",
  actionsRight: "order-item-actions-right",
  actionBtn: "order-item-action-btn",
  actionBtnDestructive: "order-item-action-btn-destructive",
  actionBtnSecondary: "order-item-action-btn-secondary",
} as const;

// Export for backward compatibility
export const styles = classes;
