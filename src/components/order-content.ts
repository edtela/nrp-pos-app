/**
 * Order Content Component
 * Container for displaying order items with empty state
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { html, Template, render } from "@/lib/html-template";
import { Order, OrderItem } from "@/model/order-model";
import * as OrderItemUI from "./order-item";
import { mdColors, mdSpacing, mdElevation, mdShape, mdTypography } from "@/styles/theme";
import { UpdateResult } from "@/lib/data-model-types";
import { OrderPageData } from "@/model/order-model";

// Track expanded state for items
const expandedItems = new Set<string>();

/**
 * Empty order state template
 */
function emptyOrderTemplate(): Template {
  return html`
    <div class="${styles.empty}">
      <div class="${styles.emptyIcon}">🛒</div>
      <h2 class="${styles.emptyTitle}">Your order is empty</h2>
      <p class="${styles.emptyMessage}">Add some delicious items to get started!</p>
      <button class="${styles.emptyAction}">Browse Menu</button>
    </div>
  `;
}

/**
 * Order items list template
 */
function orderItemsTemplate(items: OrderItem[]): Template {
  const hasExpandedItem = expandedItems.size > 0;

  return html`
    <div class="${styles.itemsContainer}">
      <div class="${styles.items} ${hasExpandedItem ? styles.itemsWithExpanded : ""}">
        ${items.map((item) =>
          OrderItemUI.template({
            ...item,
            expanded: expandedItems.has(item.id),
            flatMode: hasExpandedItem,
          }),
        )}
      </div>
    </div>
  `;
}

/**
 * Main template for order content
 */
export function template(order: Order | null, orderItems: OrderItem[]): Template {
  const hasItems = orderItems && orderItems.length > 0;

  return html`
    <div class="${styles.container}">${hasItems ? orderItemsTemplate(orderItems) : emptyOrderTemplate()}</div>
  `;
}

/**
 * Initialize order content with event handlers
 * Returns update function for re-rendering
 */
export function init(container: HTMLElement, order: Order | null, orderItems: OrderItem[]) {
  // Handle click events for item actions
  const handleClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const action = target.closest("[data-action]") as HTMLElement;

    if (!action) return;

    const actionType = action.dataset.action;
    const itemElement = action.closest('[id^="order-item-"]') as HTMLElement;

    if (!itemElement) return;

    const itemId = itemElement.id.replace("order-item-", "");

    switch (actionType) {
      case "toggle":
        if (expandedItems.has(itemId)) {
          expandedItems.delete(itemId);
        } else {
          expandedItems.add(itemId);
        }
        // Re-render the content
        render(template(order, orderItems), container);
        break;

      case "increase":
        console.log(`Increase quantity for item ${itemId}`);
        break;

      case "decrease":
        console.log(`Decrease quantity for item ${itemId}`);
        break;

      case "remove":
        console.log(`Remove item ${itemId}`);
        break;

      case "modify":
        console.log(`Modify item ${itemId}`);
        window.location.href = `/?modify=${itemId}`;
        break;
    }
  };

  container.addEventListener("click", handleClick);

  // Return cleanup function
  return () => {
    container.removeEventListener("click", handleClick);
  };
}

export function update(changes: UpdateResult<OrderPageData>) {
  if (changes.items) {
    for (const itemId of Object.keys(changes.items)) {
      const value = (changes.items as any)[itemId];
      if (value === undefined) {
        const itemElement = document.getElementById(`order-item-${itemId}`);
        if (itemElement) {
          itemElement.remove();
        }
      }
    }
  }
}

/**
 * Order Content Styles
 */
export const styles = {
  container: css`
    flex: 1;
    display: flex;
    flex-direction: column;
  `,

  itemsContainer: css`
    flex: 1;
    overflow-y: auto;
  `,

  items: css`
    background: ${mdColors.surface};
    border: 1px solid ${mdColors.outlineVariant};
    border-radius: ${mdShape.corner.medium};
    margin: ${mdSpacing.md} 0;
    overflow: hidden;
    box-shadow: ${mdElevation.level1};
  `,

  itemsWithExpanded: css`
    box-shadow: none;
    background: transparent;
    border: none;
  `,

  empty: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${mdSpacing.xl};
    text-align: center;
  `,

  emptyIcon: css`
    font-size: 64px;
    margin-bottom: ${mdSpacing.lg};
    opacity: 0.5;
  `,

  emptyTitle: css`
    font-size: ${mdTypography.headlineMedium.fontSize};
    line-height: ${mdTypography.headlineMedium.lineHeight};
    font-weight: ${mdTypography.headlineMedium.fontWeight};
    color: ${mdColors.onSurface};
    margin: 0 0 ${mdSpacing.sm} 0;
  `,

  emptyMessage: css`
    font-size: ${mdTypography.bodyLarge.fontSize};
    line-height: ${mdTypography.bodyLarge.lineHeight};
    color: ${mdColors.onSurfaceVariant};
    margin: 0 0 ${mdSpacing.xl} 0;
    max-width: 300px;
  `,

  emptyAction: css`
    background: ${mdColors.primary};
    color: ${mdColors.onPrimary};
    border: none;
    border-radius: ${mdShape.corner.full};
    padding: ${mdSpacing.sm} ${mdSpacing.lg};
    font-size: ${mdTypography.labelLarge.fontSize};
    line-height: ${mdTypography.labelLarge.lineHeight};
    font-weight: ${mdTypography.labelLarge.fontWeight};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: ${mdColors.primaryContainer};
      color: ${mdColors.onPrimaryContainer};
    }

    &:active {
      transform: scale(0.98);
    }
  `,
} as const;

// Export for selector usage in order-page
export const orderContainer = styles.container;
