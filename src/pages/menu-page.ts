/**
 * Menu Page
 * Main page component for displaying menu data
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { addEventHandler, html, Template, STATE_UPDATE_EVENT } from "@/lib/html-template";
import { isSaleItem } from "@/types";
import { NavStackItem, router } from "@/pages/app-router";
import * as MenuContentUI from "@/components/menu-content";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { MenuPageData, MenuModel, toOrderMenuItem, DisplayMenu } from "@/model/menu-model";
import { DataChange, Update, UpdateResult } from "@/lib/data-model-types";
import { MENU_ITEM_CLICK, OPEN_MENU_EVENT } from "@/components/menu-item";
import { typeChange } from "@/lib/data-model";
import { saveOrderItem, OrderItem, getOrder } from "@/model/order-model";
import { VARIANT_SELECT_EVENT } from "@/components/variant";
import { ADD_TO_ORDER_EVENT, VIEW_ORDER_EVENT } from "@/components/app-bottom-bar";

// Template function - pure rendering with data
export function template(displayMenu: DisplayMenu): Template {
  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">${AppHeader.template()}</header>
      <main class="${layoutStyles.content}">${MenuContentUI.template(displayMenu)}</main>
      <div class="${layoutStyles.bottomBar}">${AppBottomBar.template("view")}</div>
    </div>
  `;
}

function toContext(navItem?: NavStackItem) {
  if (!navItem) return {};

  if (navItem.type === "modify") {
    const order = toOrderMenuItem(navItem.item.menuItem);
    order.order = navItem.item;
    order.quantity = navItem.item.quantity;
    return { menuItem: navItem.item.menuItem, order, modifiers: navItem.item.modifiers };
  }

  const menuItem = navItem.item;
  if (isSaleItem(menuItem)) {
    const order = toOrderMenuItem(menuItem);
    return { menuItem, order };
  }

  return { menuItem };
}

// Hydrate function - attaches event handlers and loads session data
export function hydrate(container: Element, displayMenu: DisplayMenu) {
  const page = container.querySelector(`.${layoutStyles.pageContainer}`) as HTMLElement;
  if (!page) return;

  const navItem = router.truncateStack(displayMenu.id);
  const context = toContext(navItem);
  MenuContentUI.init(page, context.menuItem?.subMenu, context.order);

  const bottomBar = page.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
  if (bottomBar) {
    if (context.order) {
      AppBottomBar.update(bottomBar, {
        mode: "add",
        quantity: context.order.quantity,
        total: context.order.total,
      });
    } else {
      const mainOrder = getOrder();
      AppBottomBar.update(bottomBar, {
        mode: "view",
        itemCount: mainOrder.itemIds.length,
        total: mainOrder.total,
      });
    }
  }

  // Initialize model
  const model = new MenuModel();
  function runUpdate(stmt: Update<MenuPageData>) {
    const result = model.update(stmt);
    update(result, model.data);
  }

  let changes: UpdateResult<MenuPageData> | undefined = model.setMenu(displayMenu);
  if (context.order) {
    changes = model.update({ order: [context.order] }, changes);
  }
  update(changes, model.data);

  // Attach event handlers to the pageContainer element (automatically cleaned up on re-render)
  page.addEventListener(`app:${STATE_UPDATE_EVENT}`, (e: Event) => {
    runUpdate((e as CustomEvent).detail);
  });

  addEventHandler(page, VARIANT_SELECT_EVENT, (data) => {
    runUpdate({ variants: { [data.variantGroupId]: { selectedId: data.variantId } } });
  });

  addEventHandler(page, MENU_ITEM_CLICK, (data) => {
    const item = model.data.menu[data.id];

    if (item?.data.subMenu) {
      router.goto.menuItem(item.data);
    } else {
      runUpdate({ menu: { [item.data.id]: { selected: (v) => !v } } });
    }
  });

  addEventHandler(page, OPEN_MENU_EVENT, (data) => {
    const item = model.data.menu[data.id];
    if (item?.data.subMenu) {
      router.goto.menuItem(item.data);
    }
  });

  addEventHandler(page, VIEW_ORDER_EVENT, () => {
    router.goto.order();
  });

  addEventHandler(page, ADD_TO_ORDER_EVENT, () => {
    const order = model.data.order;
    if (order) {
      const modifiers = Object.values(model.data.menu)
        .filter((item) => {
          if (item.included) {
            return item.quantity !== 1 && !item.data.constraints?.choice?.single;
          }
          return item.quantity > 0;
        })
        .map((item) => ({
          menuItemId: item.data.id,
          name: item.data.name,
          quantity: item.quantity,
          price: item.data.price ?? 0,
        }));

      const orderItem: OrderItem = {
        ...(order.order ?? { id: "" }),
        menuItem: order.menuItem,
        quantity: order.quantity,
        modifiers,
        unitPrice: order.unitPrice,
        total: order.total,
      };
      saveOrderItem(orderItem);

      // Check if we're in modify mode
      if (order.order) {
        router.context.clearStack();
        router.goto.order();
      } else {
        router.goto.back();
      }
    }
  });
}

function update(event: DataChange<MenuPageData> | undefined, data: MenuPageData) {
  if (!event) return;

  const container = document.querySelector(`.${MenuContentUI.menuContainer}`) as HTMLElement;
  if (container) {
    MenuContentUI.update(container, event);
  }

  // Update bottom bar based on order state
  if (typeChange("order", event)) {
    const bottomBar = document.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
    if (bottomBar) {
      if (data.order) {
        // Add mode when we have an order item
        AppBottomBar.update(bottomBar, {
          mode: "add",
          quantity: data.order.quantity,
          total: data.order.total,
        });
      } else {
        // View mode when no order item
      }
    }
  }
}
