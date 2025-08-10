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
  if (!changes.items) return;

  // Track if we need to update the list's expanded state
  let expandedStateChanged = false;
  let itemToRerender: string | null = null;

  // First pass: check what changed
  for (const itemId of Object.keys(changes.items)) {
    const change = (changes.items as any)[itemId];
    if (change && (change.expanded !== undefined || change.flatMode !== undefined)) {
      expandedStateChanged = true;
      // If an item's expanded state changed, we'll re-render just that item
      if (change.expanded !== undefined) {
        itemToRerender = itemId;
      }
    }
  }

  // Update the list container's expanded state if needed
  if (expandedStateChanged) {
    const hasExpanded = Object.values(data.items).some((d) => d.expanded);
    const itemsElement = container.querySelector(`.${itemListStyles.items}`);
    if (itemsElement) {
      itemsElement.setAttribute("data-has-expanded", String(hasExpanded));
    }
  }

  // Second pass: update individual items
  for (const itemId of Object.keys(changes.items)) {
    const itemElement = document.getElementById(`order-item-${itemId}`);
    const change = (changes.items as any)[itemId];
    const displayItem = data.items[itemId];

    if (change === undefined) {
      // Item was deleted
      itemElement?.remove();
    } else if (!itemElement && displayItem) {
      // New item added - need to re-render the whole list
      render(template(data), container);
      break;
    } else if (itemElement && displayItem) {
      // Update existing item
      if (itemId === itemToRerender && change.expanded !== undefined) {
        // Re-render this specific item when expanded state changes
        const newItemHtml = OrderItemUI.template(displayItem);
        const tempDiv = document.createElement("div");
        render(newItemHtml, tempDiv);
        const newElement = tempDiv.firstElementChild;
        if (newElement) {
          itemElement.replaceWith(newElement);
        }
      } else {
        // Update item state and content
        if (change.expanded !== undefined || change.flatMode !== undefined) {
          itemElement.setAttribute("data-expanded", String(displayItem.expanded));
          itemElement.setAttribute("data-flat-mode", String(displayItem.flatMode));
        }
        if (change.item) {
          OrderItemUI.update(itemElement, change.item, displayItem);
        }
      }
    }
  }
}

// Export for selector usage in order-page
export const orderContainer = itemListStyles.container;
