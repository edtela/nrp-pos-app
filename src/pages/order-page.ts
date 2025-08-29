/**
 * Order Page
 * Displays the current order with items and totals
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { html } from "@/lib/template";
import { STATE_UPDATE_EVENT } from "@/lib/events";
import { Context } from "@/lib/context";
import { dom } from "@/lib/dom-node";
import * as OrderContentUI from "@/components/order-content";
import * as OrderItemUI from "@/components/order-item";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { orderModel, OrderPageData } from "@/model/order-model";
import { DataChange } from "@/lib/data-model-types";

// Template function - accepts data for static generation
export function template(data: OrderPageData, context: Context) {
  const headerData: AppHeader.HeaderData = {
    leftButton: {
      type: "add",
      onClick: () => dom(document.body).dispatch('navigate', { to: 'home' }),
    },
  };

  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">${AppHeader.template(headerData, context)}</header>
      <main class="${layoutStyles.content}">${OrderContentUI.template(data, context)}</main>
      <div class="${layoutStyles.bottomBar}">${AppBottomBar.template("send-order", context)}</div>
    </div>
  `;
}

// Hydrate function - loads session data and attaches event handlers
export function hydrate(container: Element, _data: OrderPageData, context: Context) {
  const node = dom(container);

  // Hydrate header with navigation
  const header = container.querySelector(`.${layoutStyles.header}`) as HTMLElement;
  if (header) {
    const headerData: AppHeader.HeaderData = {
      leftButton: {
        type: "add",
        onClick: () => node.dispatch('navigate', { to: 'home' }),
      },
    };
    AppHeader.hydrate(header, context, headerData);
  }

  // Load session data
  const model = orderModel();
  const sessionData = model.getData();

  // Only update if we have actual order items (not empty state)
  if (sessionData.order.itemIds.length > 0) {
    const contentContainer = container.querySelector(`.${layoutStyles.content}`) as HTMLElement;
    if (contentContainer) {
      OrderContentUI.init(contentContainer, sessionData, context);
    }

    // Update bottom bar with actual counts
    const bottomBar = container.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
    if (bottomBar) {
      AppBottomBar.update(
        bottomBar,
        {
          quantity: sessionData.order.itemIds.length,
          price: sessionData.order.total,
        },
        context,
      );
    }
  }

  // Attach event handlers
  node.on(STATE_UPDATE_EVENT, (data) => {
    const changes = model.update(data);
    update(container, changes, model.getData(), context);
  });

  // Handle increase quantity event
  node.on(OrderItemUI.INCREASE_QUANTITY_EVENT, (data) => {
    const itemId = data.itemId;
    if (itemId) {
      const changes = model.update({
        items: { [itemId]: { item: { quantity: (q) => q + 1 } } },
      });
      update(container, changes, model.getData(), context);
    }
  });

  // Handle decrease quantity event
  node.on(OrderItemUI.DECREASE_QUANTITY_EVENT, (data) => {
    const itemId = data.itemId;
    if (itemId) {
      const changes = model.update({
        items: { [itemId]: { item: { quantity: (q) => Math.max(1, q - 1) } } },
      });
      update(container, changes, model.getData(), context);
    }
  });

  // Handle modify item event
  node.on(OrderItemUI.MODIFY_ITEM_EVENT, (data) => {
    const itemId = data.itemId;
    if (itemId) {
      // Get the order item and navigate to modify it
      const displayItem = model.getData().items[itemId];
      if (displayItem) {
        // Navigate to modifier page with order item
        const menuItem = displayItem.item.menuItem;
        if (menuItem.subMenu) {
          node.dispatch('navigate', { 
            to: 'menu',
            menuId: menuItem.subMenu.menuId, 
            state: { order: displayItem.item }
          });
        }
      }
    }
  });

  // Handle toggle events - update expanded state in model
  node.on(OrderItemUI.TOGGLE_ITEM_EVENT, (data) => {
    const stmt = { expandedId: (current?: string) => (current === data.itemId ? undefined : data.itemId) };
    const changes = model.update(stmt);
    update(container, changes, model.getData(), context);
  });

  // Handle comment item event
  node.on(OrderItemUI.COMMENT_ITEM_EVENT, (data) => {
    const itemId = data.itemId;
    if (itemId) {
      // For now, just log - can be expanded to show comment dialog
      console.log('Comment requested for item:', itemId);
      // TODO: Implement comment functionality
    }
  });
}

function update(
  container: Element,
  changes: DataChange<OrderPageData> | undefined,
  data: OrderPageData,
  context: Context,
) {
  if (!changes) return;

  requestAnimationFrame(() => {
    const contentContainer = container.querySelector(`.${layoutStyles.content}`) as HTMLElement;
    if (contentContainer) {
      OrderContentUI.update(contentContainer, changes, context, data);
    }

    if (changes.order) {
      const bottomBar = container.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
      if (bottomBar) {
        const stmt: any = { price: changes.order.total };
        if (Array.isArray(changes.order.itemIds)) {
          stmt.quantity = changes.order.itemIds.length;
        }
        AppBottomBar.update(bottomBar, stmt, context);
      }
    }
  });
}
