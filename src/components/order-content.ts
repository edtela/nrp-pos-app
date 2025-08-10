/**
 * Order Content Component
 * Container for displaying order items with empty state
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { html, Template, render } from "@/lib/html-template";
import { OrderPageData } from "@/model/order-model";
import * as OrderItemUI from "./order-item";
import { styles as itemListStyles } from "./item-list";
import { UpdateResult } from "@/lib/data-model-types";
import { typeChange } from "@/lib/data-model";

/**
 * Empty order state template
 */
function emptyOrderTemplate(): Template {
  return html`
    <div class="${itemListStyles.emptyContainer}">
      <div class="${itemListStyles.emptyIcon}">🛒</div>
      <h2 class="${itemListStyles.emptyTitle}">Your order is empty</h2>
      <p class="${itemListStyles.emptyMessage}">Add some delicious items to get started!</p>
      <button class="${itemListStyles.emptyAction}">Browse Menu</button>
    </div>
  `;
}

/**
 * Order items list template
 */
function orderItemsTemplate(data: OrderPageData): Template {
  // Use orderIds for proper ordering
  const orderedItems = data.order.itemIds.map((id) => data.items[id]).filter((item) => item != null);

  return html`
    <div class="${itemListStyles.scrollContainer}">
      <div class="${itemListStyles.items}" data-has-expanded="${data.expandedId != null}">
        ${orderedItems.map((displayItem) => OrderItemUI.template(displayItem))}
      </div>
    </div>
  `;
}

/**
 * Main template for order content
 */
export function template(data: OrderPageData): Template {
  const hasItems = data.order.itemIds.length > 0;

  return html`
    <div class="${itemListStyles.container}">${hasItems ? orderItemsTemplate(data) : emptyOrderTemplate()}</div>
  `;
}

/**
 * Initialize order content with event handlers
 * Returns update function for re-rendering
 */
export function init(container: HTMLElement, data: OrderPageData) {
  render(template(data), container);
}

export function update(container: Element, changes: UpdateResult<OrderPageData>, data: OrderPageData) {
  // Update list container if expandedId changed
  if ("expandedId" in changes) {
    const itemsElement = container.querySelector(`.${itemListStyles.items}`);
    if (itemsElement) {
      itemsElement.setAttribute("data-has-expanded", String(data.expandedId != null));
    }
  }

  if (!changes.items) return;

  // Check if any items are new (using typeChange to detect new keys)
  const hasNewItem = Object.keys(changes.items).some(
    (itemId) => typeChange(itemId, changes.items) && (changes.items as any)[itemId] != null,
  );

  if (hasNewItem) {
    // Re-render everything to maintain proper order
    render(template(data), container);
    return;
  }

  // Handle updates and deletions for existing items
  for (const itemId of Object.keys(changes.items)) {
    const change = (changes.items as any)[itemId];
    const itemElement = document.getElementById(`order-item-${itemId}`);

    if (change === undefined) {
      // Item was deleted
      itemElement?.remove();
    } else if (itemElement) {
      // Update existing item - let order-item handle all its updates
      const displayItem = data.items[itemId];
      if (displayItem) {
        OrderItemUI.update(itemElement, change, displayItem);
      }
    }
  }
}

// Export for selector usage in order-page
export const orderContainer = itemListStyles.container;
