/**
 * Menu Page Controller
 * Handles menu page logic and coordinates between components
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { addEventHandler, Template } from "@/lib/html-template";
import { getNavigationService } from "@/services/navigation-service";
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

// Template function - delegates to appropriate page component
export function template(displayMenu: DisplayMenu, context: Context): Template {
  if (displayMenu.modifierMenu) {
    return ModifierPageContent.template(displayMenu, context);
  } else {
    return MenuPageContent.template(displayMenu, context);
  }
}

// Hydrate function - attaches event handlers and loads session data
export function hydrate(container: Element, displayMenu: DisplayMenu, context: Context) {
  const navService = getNavigationService();
  const pageState = navService.setCurrentPage(displayMenu.id) ?? {};
  const order: OrderItem = pageState.order;

  // Delegate to appropriate page component for hydration
  if (displayMenu.modifierMenu) {
    ModifierPageContent.hydrate(container, displayMenu, context, order);
    // If no order, the component will handle showing the error
    if (!order) return;
  } else {
    MenuPageContent.hydrate(container, displayMenu, context);
  }

  // Initialize model
  const model = new MenuModel();
  function runUpdate(stmt: Update<MenuPageData>) {
    const result = model.update(stmt);
    update(container, result, model.data, context);
  }

  let changes: UpdateResult<MenuPageData> | undefined = model.setMenu(displayMenu);

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

  addEventHandler(container, VARIANT_SELECT_EVENT, (data) => {
    runUpdate({ variants: { [data.variantGroupId]: { selectedId: data.variantId } } });
  });

  addEventHandler(container, MENU_ITEM_CLICK, (data) => {
    const item = model.data.items[data.id];

    if (item?.data.subMenu) {
      if (isSaleItem(item.data)) {
        navService.editOrder(toOrderItem(item.data, model.data));
      } else {
        navService.goto.menuItem(item.data);
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

  addEventHandler(container, VIEW_ORDER_EVENT, () => {
    navService.goto.order();
  });

  addEventHandler(container, ADD_TO_ORDER_EVENT, () => {
    const order = model.data.order;
    if (order) {
      const modifying = order.id.length > 0;
      saveOrderItem(order);

      // Check if we're in modify mode
      if (modifying) {
        navService.goto.order();
      } else {
        navService.goto.back();
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
  if (event.order) {
    const ns = getNavigationService();
    ns.updateCurrentState({ order: data.order });
  } else if (event.variants) {
    const ns = getNavigationService();
    const selected = select(data, { variants: { [ALL]: { selectedId: true } } });
    ns.updateCurrentState({ variants: selected });
  }
}
