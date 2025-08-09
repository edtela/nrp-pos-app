/**
 * Order Page
 * Displays the current order with items and totals
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { html, render } from "@/lib/html-template";
import * as OrderContentUI from "@/components/order-content";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { BottomBarData } from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { Order, OrderItem, orderModel, OrderPageData } from "@/model/order-model";
import { UpdateResult } from "@/lib/data-model-types";

// Template function
function template(order: Order | null, orderItems: OrderItem[]) {
  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">
        ${AppHeader.template({ showBack: true, searchPlaceholder: "Search Order" })}
      </header>
      <main class="${layoutStyles.content}">${OrderContentUI.template(order, orderItems)}</main>
      <div class="${layoutStyles.bottomBar}">${AppBottomBar.template("send")}</div>
    </div>
  `;
}

// Export function to render order page
export async function renderOrderPage(container: Element, showEmptyState: boolean = false) {
  // For testing: use empty arrays if showEmptyState is true

  const model = orderModel();
  const data = model.getData();

  const orderItems = Object.values(data.items);
  render(template(data.order, orderItems), container);

  // Initialize order content with event handlers
  const orderContainer = container.querySelector(`.${OrderContentUI.orderContainer}`) as HTMLElement;
  if (orderContainer) {
    OrderContentUI.init(orderContainer, data.order, orderItems);
  }

  container.addEventListener("app:state-update", (e: Event) => {
    const customEvent = e as CustomEvent;
    const changes = model.update(customEvent.detail);
    update(changes);
  });

  // Handle empty state button click
  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains(OrderContentUI.styles.emptyAction)) {
      // Navigate back to menu
      window.location.href = "/";
    }
  });
}

function update(changes: UpdateResult<OrderPageData> | undefined) {
  if (!changes) return;

  OrderContentUI.update(changes);

  if (changes.order) {
    const bottomBar = document.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
    if (bottomBar) {
      const stmt = { total: changes.order.total } as Partial<BottomBarData>;
      if (Array.isArray(changes.order.itemIds)) {
        stmt.itemCount = changes.order.itemIds.length;
      }
      AppBottomBar.update(bottomBar, stmt);
    }
  }
}
