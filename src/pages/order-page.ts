/**
 * Order Page
 * Displays the current order with items and totals
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { html, render } from "@/lib/html-template";
import { MenuItem } from "@/types";
import * as OrderContentUI from "@/components/order-content";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { BottomBarData } from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { ALL, DataBinding } from "@/lib/data-model-types";
import { createStore } from "@/lib/storage";
import { getOrder, getOrderItem } from "@/model/order-model";

// Data Types
export type Order = {
  itemIds: string[];
  total: number;
};

export type OrderItem = {
  id: string;
  menuItem: MenuItem;
  modifiers: OrderModifier[];
  quantity: number;
  unitPrice: number;
  total: number;
};

export type OrderModifier = {
  menuItemId: string;
  name: string;
  quantity: number;
};

export type OrderPageData = {
  order: Order;
  items: Record<string, OrderItem>;
};

const bindings: DataBinding<OrderPageData>[] = [
  {
    onChange: ["items", [ALL], "quantity"],
    update(item: OrderItem) {
      return { items: { [item.id]: { total: item.quantity * item.unitPrice } } };
    },
  },
  {
    onChange: ["items"],
    update(data: OrderPageData) {
      let total = 0;
      const orderIds = data.order.itemIds.filter((id) => data.items[id] != null);
      for (const item of Object.values(data.items)) {
        if (!orderIds.includes(item.id)) {
          orderIds.push(item.id);
        }
        total += item.total;
      }
      return { order: [{ itemIds: orderIds, total }] };
    },
  },
];

// Template function
function template(order: Order | null, orderItems: OrderItem[]) {
  const bottomBarData: BottomBarData = {
    mode: "send",
    itemCount: orderItems.length,
    total: order?.total || 0,
  };

  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">
        ${AppHeader.template({ showBack: true, searchPlaceholder: "Search Order" })}
      </header>
      <main class="${layoutStyles.content}">${OrderContentUI.template(order, orderItems)}</main>
      <div class="${layoutStyles.bottomBar}">${AppBottomBar.template(bottomBarData)}</div>
    </div>
  `;
}

// Export function to render order page
export async function renderOrderPage(container: Element, showEmptyState: boolean = false) {
  // For testing: use empty arrays if showEmptyState is true
  const order = getOrder();
  const items: OrderPageData["items"] = {};
  for (const itemId of order.itemIds) {
    const item = getOrderItem(itemId);
    if (item) {
      items[item.id] = item;
    }
  }
  const orderItems = Object.values(items);

  render(template(order, orderItems), container);

  // Initialize order content with event handlers
  const orderContainer = container.querySelector(`.${OrderContentUI.orderContainer}`) as HTMLElement;
  if (orderContainer) {
    OrderContentUI.init(orderContainer, order, orderItems);
  }

  // Handle empty state button click
  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains(OrderContentUI.styles.emptyAction)) {
      // Navigate back to menu
      window.location.href = "/";
    }
  });
}
