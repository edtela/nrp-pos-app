/**
 * Menu Page Controller
 * Handles menu page logic and coordinates between components
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { Template } from "@/lib/template";
import { Context } from "@/lib/context";
import * as MenuPageContent from "@/components/menu-page-content";
import * as ModifierPageContent from "@/components/modifier-page-content";
import { MenuPageData, MenuModel, DisplayMenu, toDisplayMenuUpdate, toOrderItem } from "@/model/menu-model";
import { DataChange, Update, UpdateResult } from "@/lib/data-model-types";
import { MENU_ITEM_CLICK } from "@/components/menu-item";
import { saveOrderItem, OrderItem } from "@/model/order-model";
import { VARIANT_SELECT_EVENT } from "@/components/variant";
import { ADD_TO_ORDER_EVENT, VIEW_ORDER_EVENT } from "@/components/app-bottom-bar";
import { isSaleItem } from "@/types";
import { ALL, select, WHERE } from "tsqn";
import { dom } from "@/lib/dom-node";

// Template function - delegates to appropriate page component
export function template(displayMenu: DisplayMenu, context: Context): Template {
  if (displayMenu.modifierMenu) {
    return ModifierPageContent.template(displayMenu, context);
  } else {
    return MenuPageContent.template(displayMenu, context);
  }
}

// Hydrate function - attaches event handlers and loads session data
// Helper functions for page state (temporary until full migration)
function getPageState(menuId: string): any {
  if (typeof sessionStorage === "undefined") return null;
  const stored = sessionStorage.getItem(`page-state-${menuId}`);
  return stored ? JSON.parse(stored) : null;
}

function setCurrentPage(_menuId: string): void {
  // Truncate navigation stack logic will be handled by navigation message handler
  return;
}

function updatePageState(menuId: string, state: any): void {
  if (typeof sessionStorage === "undefined") return;
  const current = getPageState(menuId) || {};
  sessionStorage.setItem(`page-state-${menuId}`, JSON.stringify({ ...current, ...state }));
}

function getCurrentMenuId(): string | undefined {
  // Get from navigation stack in session storage
  if (typeof sessionStorage === "undefined") return undefined;
  const stackStr = sessionStorage.getItem("nav-stack-v3");
  if (!stackStr) return undefined;
  const stack = JSON.parse(stackStr);
  return stack.length > 0 ? stack[stack.length - 1] : undefined;
}

export function hydrate(container: Element, menu: DisplayMenu, context: Context) {
  const node = dom(container);

  const pageState = getPageState(menu.id) ?? {};
  setCurrentPage(menu.id);
  const order: OrderItem = pageState.order;

  // Delegate to appropriate page component for hydration
  if (menu.modifierMenu) {
    ModifierPageContent.hydrate(container, menu, context, order);
    // If no order, the component will handle showing the error
    if (!order) return;
  } else {
    MenuPageContent.hydrate(container, menu, context);
  }

  // Initialize model
  const model = new MenuModel();
  function runUpdate(stmt: Update<MenuPageData>) {
    const result = model.update(stmt);
    update(container, result, model.data, context);
  }

  let changes: UpdateResult<MenuPageData> | undefined = model.setMenu(menu);

  const stmts: Update<MenuPageData>[] = [];
  if (order) {
    // Execute preUpdate statements if they exist
    const preUpdate = order.menuItem.subMenu?.preUpdate;
    if (preUpdate) {
      const updates = preUpdate.map((p) => toDisplayMenuUpdate(p, model.data)) as any[];
      stmts.push(...updates);
    }

    // Then process the order normally
    stmts.push({ order: [order] });
  }

  if (pageState.variants) {
    stmts.push(pageState.variants);
  }
  changes = model.updateAll(stmts, changes);
  update(container, changes, model.data, context);

  node.on(VARIANT_SELECT_EVENT, (data) => {
    runUpdate({ variants: { [data.variantGroupId]: { selectedId: data.variantId } } });
  });

  node.on(MENU_ITEM_CLICK, (data) => {
    const item = model.data.items[data.id];

    if (item?.data.subMenu) {
      const menuId = item.data.subMenu.menuId;
      if (isSaleItem(item.data)) {
        const orderItem = toOrderItem(item.data, model.data);
        node.dispatch("navigate", { to: "menu", menuId, state: { order: orderItem } });
      } else {
        node.dispatch("navigate", { to: "menu", menuId });
      }
    } else {
      // Prevent deselecting required items
      if (item.isRequired && item.selected) {
        // Item is required and already selected - don't toggle
        return;
      }
      runUpdate({ items: { [item.data.id]: { selected: (v) => !v } } });
    }
  });

  node.on(VIEW_ORDER_EVENT, () => {
    node.dispatch("navigate", { to: "order" });
  });

  node.on(ADD_TO_ORDER_EVENT, () => {
    const order = model.data.order;
    if (order) {
      const modifying = order.id.length > 0;
      saveOrderItem(order);

      // Check if we're in modify mode
      if (modifying) {
        node.dispatch("navigate", { to: "order" });
      } else {
        node.dispatch("navigate", { to: "back" });
      }
    } else {
      const quickOrder = model.data.quickOrder;
      if (quickOrder) {
        const orders = quickOrder.selectedIds.map((id) => toOrderItem(model.data.items[id].data, model.data));
        orders.forEach((o) => saveOrderItem(o));

        runUpdate({
          quickOrder: [],
          items: { [ALL]: { [WHERE]: (item) => item.selected === true, selected: false } },
        });
      }
    }
  });
}

function update(container: Element, event: DataChange<MenuPageData> | undefined, data: MenuPageData, context: Context) {
  if (!event) return;

  // Delegate to appropriate page component for updates
  if (data.modifierMenu) {
    ModifierPageContent.update(container, event, context, data);
  } else {
    MenuPageContent.update(container, event, context, data);
  }

  // Save state changes
  const menuId = getCurrentMenuId() || "";
  if (event.order) {
    updatePageState(menuId, { order: data.order });
  } else if (event.variants) {
    const selected = select(data, { variants: { [ALL]: { selectedId: true } } });
    updatePageState(menuId, { variants: selected });
  }
}
