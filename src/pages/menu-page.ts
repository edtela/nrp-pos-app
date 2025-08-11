/**
 * Menu Page
 * Main page component for displaying menu data
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { addEventHandler, html, Template, STATE_UPDATE_EVENT } from "@/lib/html-template";
import { isSaleItem, MenuItem } from "@/types";
import { router } from "@/pages/app-router";
import * as MenuContentUI from "@/components/menu-content";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { MenuPageData, MenuModel, toOrderMenuItem, OrderMenuItem, DisplayMenu } from "@/model/menu-model";
import { DataChange, Update, UpdateResult, WHERE } from "@/lib/data-model-types";
import { OPEN_MENU_EVENT, ORDER_ITEM_EVENT } from "@/components/menu-item";
import { typeChange } from "@/lib/data-model";
import { saveOrderItem, OrderItem, getOrder } from "@/model/order-model";

const menuModel = new MenuModel();

// HANDLERS
function variantSelectHandler(groupId: string, selectedId: string) {
  update(menuModel.update({ variants: { [groupId]: { selectedId } } }));
}

// Template function - pure rendering with data
export function template(displayMenu: DisplayMenu): Template {
  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">${AppHeader.template()}</header>
      <main class="${layoutStyles.content}">
        ${MenuContentUI.template(displayMenu)}
      </main>
      <div class="${layoutStyles.bottomBar}">${AppBottomBar.template("view")}</div>
    </div>
  `;
}

// Hydrate function - attaches event handlers and loads session data
export function hydrate(container: Element, displayMenu: DisplayMenu) {
  const page = container.querySelector(`.${layoutStyles.pageContainer}`) as HTMLElement;
  if (!page) return;

  // Initialize model
  let changes: UpdateResult<MenuPageData> | undefined = menuModel.setMenu(displayMenu);
  
  // Add order to displayMenu if present
  if (menuModel.data.order) {
    (displayMenu as any).order = menuModel.data.order;
  }

  // Handle navigation context from session
  const menuId = displayMenu.id;
  const navItem = router.truncateStack(menuId);

  if (navItem) {
    if (navItem.type === "modify") {
      // Modify mode: editing an existing order item
      const orderItem = navItem.item;
      const menuItem = toOrderMenuItem(orderItem.menuItem);
      menuItem.quantity = orderItem.quantity;
      menuItem.total = orderItem.total;

      const stmt: Update<MenuPageData> = { order: [menuItem as OrderMenuItem] };
      changes = menuModel.update(stmt, changes);

      // TODO: Also restore modifiers state
    } else {
      // Browse mode: navigating through menu
      const menuItem = navItem.item;
      if (isSaleItem(menuItem)) {
        const orderMenuItem = toOrderMenuItem(menuItem);
        const stmt: Update<MenuPageData> = { order: [orderMenuItem as OrderMenuItem] };
        changes = menuModel.update(stmt, changes);
      }
    }
  } else {
    // No navigation context - show order summary in bottom bar
    const bottomBar = page.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
    const mainOrder = getOrder();
    if (bottomBar) {
      AppBottomBar.update(bottomBar, {
        mode: "view",
        itemCount: mainOrder.itemIds.length,
        total: mainOrder.total,
      });
    }
  }

  // Handle submenu includes if we have a navigation context
  let contextMenuItem: MenuItem | undefined;
  if (navItem) {
    contextMenuItem = navItem.type === "modify" ? navItem.item.menuItem : navItem.item;
    const subMenu = contextMenuItem?.subMenu;
    if (subMenu?.included) {
      const stmt = subMenu.included.reduce((u, key) => {
        u[key.itemId] = { [WHERE]: (item: any) => item != null, included: 1 };
        return u;
      }, {} as any);

      changes = menuModel.update({ menu: stmt }, changes);
    }
  }

  MenuContentUI.init(page, contextMenuItem);
  update(changes);

  // Attach event handlers to the pageContainer element (automatically cleaned up on re-render)
  MenuContentUI.addVariantHandler(page, variantSelectHandler);

  page.addEventListener(`app:${STATE_UPDATE_EVENT}`, (e: Event) => {
    const customEvent = e as CustomEvent;
    const change = menuModel.update(customEvent.detail);
    update(change);
  });

  addEventHandler(page, ORDER_ITEM_EVENT, (data) => {
    const item = menuModel.getMenuItem(data.id);
    if (item?.data.subMenu) {
      // Set initial quantity and total for sale items
      item.quantity = 1;
      item.total = item.data.price ?? 0;
      router.goto.menuItem(item.data);
    }
  });

  addEventHandler(page, OPEN_MENU_EVENT, (data) => {
    const item = menuModel.getMenuItem(data.id);
    if (item?.data.subMenu) {
      router.goto.menuItem(item.data);
    }
  });

  addEventHandler(page, AppBottomBar.ADD_TO_ORDER_EVENT, () => {
    const order = menuModel.data.order;
    if (order) {
      const modifiers = Object.values(menuModel.data.menu)
        .filter((item) => item.quantity - (item.included ? 1 : 0) != 0)
        .map((item) => ({
          menuItemId: item.data.id,
          name: item.data.name,
          quantity: item.quantity - (item.included ? 1 : 0),
          price: item.data.price ?? 0,
        }));

      // Check if we're in modify mode
      if (router.context.isModifying()) {
        const currentItem = router.context.getCurrentItem();
        if (currentItem?.type === "modify") {
          // Update existing order item
          const orderItem: OrderItem = {
            ...currentItem.item,
            quantity: order.quantity,
            modifiers,
            unitPrice: order.unitPrice,
            total: order.total,
          };
          saveOrderItem(orderItem);
          // Clear navigation stack and go to order page
          router.context.clearStack();
          router.goto.order();
        }
      } else {
        // Create new order item
        const orderItem: OrderItem = {
          id: "",
          menuItem: order.data,
          quantity: order.quantity,
          modifiers,
          unitPrice: order.unitPrice,
          total: order.total,
        };
        saveOrderItem(orderItem);
        router.goto.back();
      }
    }
  });

  addEventHandler(page, AppBottomBar.VIEW_ORDER_EVENT, () => {
    router.goto.order();
  });
}


function update(event: DataChange<MenuPageData> | undefined) {
  if (!event) return;

  const container = document.querySelector(`.${MenuContentUI.menuContainer}`) as HTMLElement;
  if (container) {
    MenuContentUI.update(container, event);
  }

  // Update bottom bar based on order state
  if (event.order !== undefined || typeChange("order", event)) {
    const bottomBar = document.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
    if (bottomBar) {
      if (menuModel.data.order) {
        // Add mode when we have an order item
        AppBottomBar.update(bottomBar, {
          mode: "add",
          quantity: menuModel.data.order.quantity,
          total: menuModel.data.order.total,
        });
      } else {
        // View mode when no order item
      }
    }
  }
}

