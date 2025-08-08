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
import { styles as layoutStyles } from "@/components/app-layout";

// Data Types
export type Order = {
  orderIds: string[];
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

// Mock data for testing
const mockOrderItems: OrderItem[] = [
  {
    id: "order-1",
    menuItem: {
      id: "pizza-1",
      name: "Margherita Pizza",
      description: "Fresh mozzarella, basil, tomato sauce",
      icon: "🍕",
      price: 12.99
    },
    modifiers: [
      { menuItemId: "extra-cheese", name: "Extra Cheese", quantity: 1 },
      { menuItemId: "olives", name: "Black Olives", quantity: 1 },
      { menuItemId: "onions", name: "Onions", quantity: -1 }
    ],
    quantity: 2,
    unitPrice: 14.99,
    total: 29.98
  },
  {
    id: "order-2",
    menuItem: {
      id: "pasta-1",
      name: "Spaghetti Carbonara",
      description: "Creamy sauce with pancetta and parmesan",
      icon: "🍝",
      price: 13.99
    },
    modifiers: [],
    quantity: 1,
    unitPrice: 13.99,
    total: 13.99
  }
];

const mockOrder: Order = {
  orderIds: ["order-1", "order-2"],
  total: 43.97
};

// Template function
function template(order: Order | null, orderItems: OrderItem[]) {
  const bottomBarData = {
    left: { value: orderItems.length, label: "Items" },
    action: { label: "Place Order" },
    right: { value: `$${order?.total.toFixed(2) || "0.00"}`, label: "Total" }
  };

  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">
        ${AppHeader.template({ showBack: true, searchPlaceholder: "Search Order" })}
      </header>
      <main class="${layoutStyles.content}">
        ${OrderContentUI.template(order, orderItems)}
      </main>
      <div class="${layoutStyles.bottomBar}">
        ${AppBottomBar.template(bottomBarData)}
      </div>
    </div>
  `;
}

// Export function to render order page
export async function renderOrderPage(container: Element, showEmptyState: boolean = false) {
  // For testing: use empty arrays if showEmptyState is true
  const order = showEmptyState ? null : mockOrder;
  const orderItems = showEmptyState ? [] : mockOrderItems;

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
