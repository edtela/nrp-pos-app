/**
 * Menu Page
 * Main page component for displaying menu data
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { addEventHandler, html, Template } from "@/lib/html-template";
import { navigate } from "@/pages/page-router";
import { getNavigationService } from "@/services/navigation-service";
import { Context } from "@/lib/context";
import * as MenuContentUI from "@/components/menu-content";
import * as ModifierMenuContentUI from "@/components/modifier-menu-content";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { MenuPageData, MenuModel, DisplayMenu, toDisplayMenuUpdate, toOrderMenuItem } from "@/model/menu-model";
import { DataChange, Update, UpdateResult } from "@/lib/data-model-types";
import { MENU_ITEM_CLICK } from "@/components/menu-item";
import { saveOrderItem, OrderItem, getOrder } from "@/model/order-model";
import { VARIANT_SELECT_EVENT } from "@/components/variant";
import { ADD_TO_ORDER_EVENT, VIEW_ORDER_EVENT } from "@/components/app-bottom-bar";
import { isSaleItem } from "@/types";
import { ALL, select } from "tsqn";

// Template function - pure rendering with data
export function template(displayMenu: DisplayMenu, context: Context): Template {
  // Determine left button type based on menu ID
  const leftButtonType: AppHeader.LeftButtonType = displayMenu.id === "main-menu" ? "home" : "back";

  const headerData: AppHeader.HeaderData = {
    leftButton: {
      type: leftButtonType,
      onClick: leftButtonType === "home" ? () => navigate.toHome() : () => navigate.back(),
    },
  };

  const isModifierMenu = displayMenu.modifierMenu;
  const contentTemplate = isModifierMenu 
    ? ModifierMenuContentUI.template(displayMenu, context)
    : MenuContentUI.template(displayMenu, context);

  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">${AppHeader.template(headerData, context)}</header>
      <main class="${layoutStyles.content}">${contentTemplate}</main>
      <div class="${layoutStyles.bottomBar}">
        ${AppBottomBar.template(isModifierMenu ? "add" : "view", context)}
      </div>
    </div>
  `;
}

// Hydrate function - attaches event handlers and loads session data
export function hydrate(container: Element, displayMenu: DisplayMenu, context: Context) {
  const page = container.querySelector(`.${layoutStyles.pageContainer}`) as HTMLElement;
  if (!page) return;

  // Hydrate header with navigation
  const header = page.querySelector(`.${layoutStyles.header}`) as HTMLElement;
  if (header) {
    const leftButtonType: AppHeader.LeftButtonType = displayMenu.id === "main-menu" ? "home" : "back";

    const headerData: AppHeader.HeaderData = {
      leftButton: {
        type: leftButtonType,
        onClick: leftButtonType === "home" ? () => navigate.toHome() : () => navigate.back(),
      },
    };
    AppHeader.hydrate(header, context, headerData);
  }

  const navService = getNavigationService();
  const pageState = navService.setCurrentPage(displayMenu.id) ?? {};
  const order: OrderItem = pageState.order;

  // Check if this is a modifier menu without an order context
  if (displayMenu.modifierMenu && !order) {
    // Show error state in the modifier menu content
    const modifierContent = page.querySelector(`.${layoutStyles.content}`) as HTMLElement;
    if (modifierContent) {
      ModifierMenuContentUI.showError(modifierContent);
    }
    return; // Exit early, no need to set up other handlers
  }

  const bottomBar = page.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
  if (bottomBar) {
    if (order) {
      AppBottomBar.update(
        bottomBar,
        {
          quantity: order.quantity,
          total: order.total,
        },
        context,
      );
    } else {
      const mainOrder = getOrder();
      AppBottomBar.update(
        bottomBar,
        {
          itemCount: mainOrder.itemIds.length,
          total: mainOrder.total,
        },
        context,
      );
    }
  }

  // Initialize model
  const model = new MenuModel();
  function runUpdate(stmt: Update<MenuPageData>) {
    const result = model.update(stmt);
    update(page, result, model.data, context);
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
  update(page, changes, model.data, context);

  addEventHandler(page, VARIANT_SELECT_EVENT, (data) => {
    runUpdate({ variants: { [data.variantGroupId]: { selectedId: data.variantId } } });
  });

  addEventHandler(page, MENU_ITEM_CLICK, (data) => {
    const item = model.data.items[data.id];

    if (item?.data.subMenu) {
      if (isSaleItem(item.data)) {
        navService.editOrder(toOrderMenuItem(item.data, model.data));
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

  addEventHandler(page, VIEW_ORDER_EVENT, () => {
    navService.goto.order();
  });

  addEventHandler(page, ADD_TO_ORDER_EVENT, () => {
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
    }
  });
}

function update(page: Element, event: DataChange<MenuPageData> | undefined, data: MenuPageData, context: Context) {
  if (!event) return;

  const isModifierMenu = data.modifierMenu;
  
  // Find the correct content container based on menu type
  const content = isModifierMenu 
    ? page.querySelector(`.${ModifierMenuContentUI.modifierMenuContainer}`) as HTMLElement
    : page.querySelector(`.${MenuContentUI.menuContainer}`) as HTMLElement;
    
  if (content) {
    if (isModifierMenu) {
      ModifierMenuContentUI.update(content, event, context, data);
    } else {
      MenuContentUI.update(content, event, context, data);
    }
  }

  if (event.order && "total" in event.order) {
    const bottomBar = page.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
    if (bottomBar) {
      AppBottomBar.update(bottomBar, { total: event.order.total }, context);
    }
  }

  if (event.order) {
    const ns = getNavigationService();
    ns.updateCurrentState({ order: data.order });
  } else if (event.variants) {
    const ns = getNavigationService();
    const selected = select(data, { variants: { [ALL]: { selectedId: true } } });
    ns.updateCurrentState({ variants: selected });
  }
}
