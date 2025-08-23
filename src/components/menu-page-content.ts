/**
 * Menu Page Content Component
 * Full page component for regular (non-modifier) menu pages
 * Includes app header, menu content, and bottom bar
 */

import { html, Template } from "@/lib/html-template";
import { Context } from "@/lib/context";
import { DisplayMenu, MenuPageData } from "@/model/menu-model";
import { DataChange } from "@/lib/data-model-types";
import * as MenuContent from "./menu-content";
import * as AppHeader from "./app-header";
import * as AppBottomBar from "./app-bottom-bar";
import { styles as layoutStyles } from "./app-layout";
import { navigate } from "@/pages/page-router";
import { getOrder } from "@/model/order-model";
import { typeChange } from "tsqn";

// Export for page selector
export const menuPageContainer = "menu-page-content";

/**
 * Main template for menu page content
 */
export function template(displayMenu: DisplayMenu, context: Context): Template {
  // Determine left button type based on menu ID
  const leftButtonType: AppHeader.LeftButtonType = displayMenu.id === "main-menu" ? "home" : "back";

  const headerData: AppHeader.HeaderData = {
    leftButton: {
      type: leftButtonType,
      onClick: leftButtonType === "home" ? () => navigate.toHome() : () => navigate.back(),
    },
  };

  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">${AppHeader.template(headerData, context)}</header>
      <main class="${layoutStyles.content}">${MenuContent.template(displayMenu, context)}</main>
      <div class="${layoutStyles.bottomBar}">${AppBottomBar.template("view-order", context)}</div>
    </div>
  `;
}

/**
 * Hydrate function - attaches event handlers
 */
export function hydrate(container: Element, displayMenu: DisplayMenu, context: Context): void {
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

  // Update bottom bar with current order state
  const bottomBar = page.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
  if (bottomBar) {
    const mainOrder = getOrder();
    AppBottomBar.update(
      bottomBar,
      {
        quantity: mainOrder.itemIds.length,
        price: mainOrder.total,
      },
      context,
    );
  }
}

/**
 * Update function for menu-page
 */
export function update(container: Element, changes: DataChange<MenuPageData>, ctx: Context, data: MenuPageData): void {
  const bottomBar = container.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
  if (typeChange("quickOrder", changes)) {
    if (data.quickOrder == null) {
      const mainOrder = getOrder();
      AppBottomBar.update(
        bottomBar,
        {
          mode: "view-order",
          quantity: mainOrder.itemIds.length,
          price: mainOrder.total,
        },
        ctx,
      );
    } else {
      AppBottomBar.update(
        bottomBar,
        {
          mode: "quick-order",
          quantity: data.quickOrder.selectedIds.length,
          price: data.quickOrder.total,
        },
        ctx,
      );
    }
  } else if (changes.quickOrder && data.quickOrder) {
    AppBottomBar.update(
      bottomBar,
      {
        quantity: data.quickOrder.selectedIds.length,
        price: data.quickOrder.total,
      },
      ctx,
    );
  }

  // Delegate updates to menu-content
  const content = container.querySelector(`.${layoutStyles.content} .${MenuContent.menuContainer}`) as HTMLElement;
  if (content) {
    MenuContent.update(content, changes, ctx, data);
  }
}
