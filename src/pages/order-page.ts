/**
 * Order Page
 * Displays the current order with items and totals
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { html, render, addEventHandler } from "@/lib/html-template";
import * as OrderContentUI from "@/components/order-content";
import * as OrderItemUI from "@/components/order-item";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { BottomBarData } from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { orderModel, OrderPageData } from "@/model/order-model";
import { UpdateResult } from "@/lib/data-model-types";

// Template function
function template() {
  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">
        ${AppHeader.template({ showBack: true, searchPlaceholder: "Search Order" })}
      </header>
      <main class="${layoutStyles.content}">${OrderContentUI.template(null, [])}</main>
      <div class="${layoutStyles.bottomBar}">${AppBottomBar.template("send")}</div>
    </div>
  `;
}

// Export function to initialize order page
export async function init(container: Element) {
  // Render empty template first
  render(template(), container);

  const model = orderModel();
  const data = model.getData();

  const orderItems = Object.values(data.items);

  // Update with actual data
  const contentContainer = container.querySelector(`.${layoutStyles.content}`) as HTMLElement;
  if (contentContainer) {
    OrderContentUI.init(contentContainer, data.order, orderItems);
  }

  container.addEventListener("app:state-update", (e: Event) => {
    const customEvent = e as CustomEvent;
    const changes = model.update(customEvent.detail);
    update(changes);
  });

  // Handle increase quantity event
  addEventHandler(container, OrderItemUI.INCREASE_QUANTITY_EVENT, (data) => {
    console.log(data);
    const itemId = data.itemId;
    if (itemId) {
      const changes = model.update({
        items: { [itemId]: { quantity: (q) => q + 1 } },
      });
      update(changes);
    }
  });

  // Handle decrease quantity event
  addEventHandler(container, OrderItemUI.DECREASE_QUANTITY_EVENT, (data) => {
    const itemId = data.itemId;
    if (itemId) {
      const changes = model.update({
        items: { [itemId]: { quantity: (q) => Math.max(1, q - 1) } },
      });
      update(changes);
    }
  });

  // Handle modify item event
  addEventHandler(container, OrderItemUI.MODIFY_ITEM_EVENT, (data) => {
    const itemId = data.itemId;
    if (itemId) {
      window.location.href = `/?modify=${itemId}`;
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
