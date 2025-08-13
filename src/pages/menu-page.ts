/**
 * Menu Page
 * Main page component for displaying menu data
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { addEventHandler, html, Template } from "@/lib/html-template";
import { isSaleItem } from "@/types";
import { NavStackItem, getRouter } from "@/pages/app-router";
import { Context } from "@/lib/context";
import * as MenuContentUI from "@/components/menu-content";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { MenuPageData, MenuModel, toOrderMenuItem, DisplayMenu } from "@/model/menu-model";
import { DataChange, Update, UpdateResult } from "@/lib/data-model-types";
import { MENU_ITEM_CLICK } from "@/components/menu-item";
import { saveOrderItem, OrderItem, getOrder } from "@/model/order-model";
import { VARIANT_SELECT_EVENT } from "@/components/variant";
import { ADD_TO_ORDER_EVENT, VIEW_ORDER_EVENT } from "@/components/app-bottom-bar";

// Template function - pure rendering with data
export function template(displayMenu: DisplayMenu, context?: Context): Template {
  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">${AppHeader.template({}, context)}</header>
      <main class="${layoutStyles.content}">${MenuContentUI.template(displayMenu, context)}</main>
      <div class="${layoutStyles.bottomBar}">${AppBottomBar.template(displayMenu.modifierMenu ? "add" : "view", context)}</div>
    </div>
  `;
}

function toContext(navItem?: NavStackItem) {
  if (!navItem) return {};

  if (navItem.type === "modify") {
    const order = toOrderMenuItem(navItem.item.menuItem);
    order.order = navItem.item;
    order.quantity = navItem.item.quantity;
    return { menuItem: navItem.item.menuItem, order };
  }

  const menuItem = navItem.item;
  if (isSaleItem(menuItem)) {
    const order = toOrderMenuItem(menuItem);
    return { menuItem, order };
  }

  return { menuItem };
}

// Hydrate function - attaches event handlers and loads session data
export function hydrate(container: Element, displayMenu: DisplayMenu, context?: Context) {
  const page = container.querySelector(`.${layoutStyles.pageContainer}`) as HTMLElement;
  if (!page) return;

  // Hydrate header for language switching
  const header = page.querySelector(`.${layoutStyles.header}`) as HTMLElement;
  if (header) {
    AppHeader.hydrate(header, context);
  }

  const router = getRouter();
  const navItem = router.truncateStack(displayMenu.id);
  const navContext = toContext(navItem);
  MenuContentUI.init(page, navContext.menuItem?.subMenu, navContext.order, context);

  const bottomBar = page.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
  if (bottomBar) {
    if (navContext.order) {
      AppBottomBar.update(bottomBar, {
        quantity: navContext.order.quantity,
        total: navContext.order.total,
      }, context);
    } else {
      const mainOrder = getOrder();
      AppBottomBar.update(bottomBar, {
        itemCount: mainOrder.itemIds.length,
        total: mainOrder.total,
      }, context);
    }
  }

  // Initialize model
  const model = new MenuModel();
  function runUpdate(stmt: Update<MenuPageData>) {
    const result = model.update(stmt);
    update(page, result, model.data, context);
  }

  let changes: UpdateResult<MenuPageData> | undefined = model.setMenu(displayMenu);
  if (navContext.order) {
    changes = model.update({ order: [navContext.order] }, changes);
  }
  update(page, changes, model.data, context);

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

function update(page: Element, event: DataChange<MenuPageData> | undefined, data: MenuPageData, context?: Context) {
  if (!event) return;

  const content = page.querySelector(`.${MenuContentUI.menuContainer}`) as HTMLElement;
  if (content) {
    MenuContentUI.update(content, event, data, context);
  }

  if (event.order && "total" in event.order) {
    const bottomBar = page.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
    if (bottomBar) {
      AppBottomBar.update(bottomBar, { total: event.order.total }, context);
    }
  }
}
