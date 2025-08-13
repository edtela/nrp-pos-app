/**
 * Order Page
 * Displays the current order with items and totals
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { html, addEventHandler, STATE_UPDATE_EVENT } from "@/lib/html-template";
import { router } from "@/pages/app-router";
import { Context } from "@/lib/context";
import * as OrderContentUI from "@/components/order-content";
import * as OrderItemUI from "@/components/order-item";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { BottomBarData } from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { orderModel, OrderPageData } from "@/model/order-model";
import { UpdateResult } from "@/lib/data-model-types";

// Template function - accepts data for static generation
export function template(data: OrderPageData, context?: Context) {
  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">
        ${AppHeader.template({ showBack: true }, context)}
      </header>
      <main class="${layoutStyles.content}">
        ${OrderContentUI.template(data, context)}
      </main>
      <div class="${layoutStyles.bottomBar}">
        ${AppBottomBar.template("send", context)}
      </div>
    </div>
  `;
}

// Hydrate function - loads session data and attaches event handlers
export function hydrate(container: Element, _data: OrderPageData, context?: Context) {
  // Hydrate header for language switching
  const header = container.querySelector(`.${layoutStyles.header}`) as HTMLElement;
  if (header) {
    AppHeader.hydrate(header, context);
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
      AppBottomBar.update(bottomBar, {
        itemCount: sessionData.order.itemIds.length,
        total: sessionData.order.total
      } as Partial<BottomBarData>, context);
    }
  }

  // Attach event handlers
  container.addEventListener(`app:${STATE_UPDATE_EVENT}`, (e: Event) => {
    const customEvent = e as CustomEvent;
    const changes = model.update(customEvent.detail);
    update(container, changes, model.getData(), context);
  });

  // Handle increase quantity event
  addEventHandler(container, OrderItemUI.INCREASE_QUANTITY_EVENT, (data) => {
    const itemId = data.itemId;
    if (itemId) {
      const changes = model.update({
        items: { [itemId]: { item: { quantity: (q) => q + 1 } } },
      });
      update(container, changes, model.getData(), context);
    }
  });

  // Handle decrease quantity event
  addEventHandler(container, OrderItemUI.DECREASE_QUANTITY_EVENT, (data) => {
    const itemId = data.itemId;
    if (itemId) {
      const changes = model.update({
        items: { [itemId]: { item: { quantity: (q) => Math.max(1, q - 1) } } },
      });
      update(container, changes, model.getData(), context);
    }
  });

  // Handle modify item event
  addEventHandler(container, OrderItemUI.MODIFY_ITEM_EVENT, (data) => {
    const itemId = data.itemId;
    if (itemId) {
      // Get the order item and navigate to modify it
      const displayItem = model.getData().items[itemId];
      if (displayItem) {
        router.goto.modifyOrderItem(displayItem.item);
      }
    }
  });

  // Handle toggle events - update expanded state in model
  addEventHandler(container, OrderItemUI.TOGGLE_ITEM_EVENT, (data) => {
    const stmt = { expandedId: (current?: string) => (current === data.itemId ? undefined : data.itemId) };
    const changes = model.update(stmt);
    update(container, changes, model.getData(), context);
  });
}

function update(container: Element, changes: UpdateResult<OrderPageData> | undefined, data: OrderPageData, context?: Context) {
  if (!changes) return;

  requestAnimationFrame(() => {
    const contentContainer = container.querySelector(`.${layoutStyles.content}`) as HTMLElement;
    if (contentContainer) {
      OrderContentUI.update(contentContainer, changes, data, context);
    }

    if (changes.order) {
      const bottomBar = container.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
      if (bottomBar) {
        const stmt = { total: changes.order.total } as Partial<BottomBarData>;
        if (Array.isArray(changes.order.itemIds)) {
          stmt.itemCount = changes.order.itemIds.length;
        }
        AppBottomBar.update(bottomBar, stmt, context);
      }
    }
  });
}
