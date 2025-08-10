/**
 * Order Content Component
 * Container for displaying order items with empty state
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { html, Template, render } from "@/lib/html-template";
import { Order, DisplayItem } from "@/model/order-model";
import * as OrderItemUI from "./order-item";
import { mdColors, mdSpacing, mdElevation, mdShape, mdTypography } from "@/styles/theme";
import { UpdateResult } from "@/lib/data-model-types";
import { OrderPageData } from "@/model/order-model";

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
function orderItemsTemplate(displayItems: DisplayItem[]): Template {
  // Check if any item is expanded to apply the flat styling
  const hasExpanded = displayItems.some(d => d.expanded);
  
  return html`
    <div class="${styles.itemsContainer}">
      <div class="${styles.items} ${hasExpanded ? styles.itemsWithExpanded : ''}">
        ${displayItems.map((displayItem) =>
          OrderItemUI.template(displayItem)
        )}
      </div>
    </div>
  `;
}

/**
 * Main template for order content
 */
export function template(_order: Order | null, displayItems: DisplayItem[]): Template {
  const hasItems = displayItems && displayItems.length > 0;

  return html`
    <div class="${styles.container}">${hasItems ? orderItemsTemplate(displayItems) : emptyOrderTemplate()}</div>
  `;
}

/**
 * Initialize order content with event handlers
 * Returns update function for re-rendering
 */
export function init(container: HTMLElement, order: Order | null, displayItems: DisplayItem[]) {
  render(template(order, displayItems), container);
  
  // Toggle events are now handled in order-page.ts through the model
}

export function update(container: Element, changes: UpdateResult<OrderPageData>, data: OrderPageData) {
  // Check if we need to re-render the entire list (for expand/collapse state changes)
  let needsFullRerender = false;
  if (changes.items) {
    for (const itemId of Object.keys(changes.items)) {
      const change = (changes.items as any)[itemId];
      if (change && (change.expanded !== undefined || change.flatMode !== undefined)) {
        needsFullRerender = true;
        break;
      }
    }
  }
  
  if (needsFullRerender) {
    // Re-render the entire list to update expand/collapse states
    const displayItems = Object.values(data.items);
    render(template(data.order, displayItems), container);
  } else if (changes.items) {
    // Update individual items
    for (const itemId of Object.keys(changes.items)) {
      const itemElement = document.getElementById(`order-item-${itemId}`);
      if (itemElement) {
        const change = (changes.items as any)[itemId];
        if (change === undefined) {
          itemElement.remove();
        } else {
          const displayItem = data.items[itemId];
          if (displayItem && change.item) {
            OrderItemUI.update(itemElement, change.item, displayItem);
          }
        }
      }
    }
  }
}

// Removed toggleExpanded function - state is now managed through the model

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
