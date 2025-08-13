/**
 * Order Content Component
 * Container for displaying order items with empty state
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { html, Template, render } from "@/lib/html-template";
import { Context, commonTranslations } from "@/lib/context";
import { OrderPageData } from "@/model/order-model";
import * as OrderItemUI from "./order-item";
import { styles as itemListStyles } from "./item-list";
import { DataChange } from "@/lib/data-model-types";
import { typeChange } from "@/lib/data-model";

/**
 * Empty order state template
 */
function emptyOrderTemplate(context: Context): Template {
  // Translation functions
  const emptyTitle = () => commonTranslations.yourOrderIsEmpty(context);
  const emptyMessage = () => commonTranslations.addItemsToGetStarted(context);
  const browseButton = () => commonTranslations.browseMenu(context);
  
  return html`
    <div class="${itemListStyles.emptyContainer}">
      <div class="${itemListStyles.emptyIcon}">🛒</div>
      <h2 class="${itemListStyles.emptyTitle}">${emptyTitle()}</h2>
      <p class="${itemListStyles.emptyMessage}">${emptyMessage()}</p>
      <button class="${itemListStyles.emptyAction}">${browseButton()}</button>
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
export function template(data: OrderPageData, context: Context): Template {
  const hasItems = data.order.itemIds.length > 0;

  return html`
    <div class="${itemListStyles.container}">${hasItems ? orderItemsTemplate(data) : emptyOrderTemplate(context)}</div>
  `;
}

/**
 * Initialize order content with event handlers
 * Returns update function for re-rendering
 */
export function init(container: HTMLElement, data: OrderPageData, context: Context) {
  render(template(data, context), container);
}

export function update(
  container: Element,
  changes: DataChange<OrderPageData>,
  context: Context,
  data: OrderPageData
): void {
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
    render(template(data, context), container);
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
        OrderItemUI.update(itemElement, change, context, displayItem);
      }
    }
  }
}

// Export for selector usage in order-page
export const orderContainer = itemListStyles.container;
