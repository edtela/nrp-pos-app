/**
 * Menu Page
 * Main page component for displaying menu data
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { addEventHandler, html, render, STATE_UPDATE_EVENT } from "@/lib/html-template";
import { isSaleItem, Menu, MenuItem } from "@/types";
import * as MenuContentUI from "@/components/menu-content";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { mdColors, mdSpacing } from "@/styles/theme";
import { MenuPageData, MenuModel, toOrderMenuItem, OrderMenuItem } from "@/model/menu-model";
import { DataChange, Update, UpdateResult, WHERE } from "@/lib/data-model-types";
import { createStore } from "@/lib/storage";
import { OPEN_MENU_EVENT, ORDER_ITEM_EVENT } from "@/components/menu-item";
import { typeChange } from "@/lib/data-model";
import { saveOrderItem, OrderItem, getOrder } from "@/model/order-model";

type BreadCrumb = MenuItem;
const crumbsStore = {
  ...createStore<BreadCrumb[]>("crumbs-v2", "session"),
  append(c: BreadCrumb) {
    crumbsStore.replace((s) => (s ? [...s, c] : [c]));
  },
  truncate(menuId: string) {
    let crumbs = crumbsStore.get([]);
    const idx = crumbs.findIndex((crumb) => crumb.subMenu?.menuId === menuId);
    if (idx != crumbs.length - 1) {
      crumbs = crumbs.slice(0, idx + 1);
      crumbsStore.set(crumbs);
    }
  },
  getItem(): MenuItem | undefined {
    const a = crumbsStore.get([]);
    return a.length > 0 ? a[a.length - 1] : undefined;
  },
};

const menuModel = new MenuModel();

// HANDLERS
function variantSelectHandler(groupId: string, selectedId: string) {
  update(menuModel.update({ variants: { [groupId]: { selectedId } } }));
}

// Function to load menu data based on path
async function loadMenuData(menuFile: string): Promise<Menu | null> {
  try {
    const response = await fetch(`/data/menu/${menuFile}`);
    if (!response.ok) {
      throw new Error(`Failed to load menu: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading menu data:", error);
    return null;
  }
}

// Export function to render menu page
export async function renderMenuPage(container: Element, menuFile: string = "index.json") {
  // Initial render with loading state
  render(
    html`
      <div class="${layoutStyles.pageContainer}">
        <div class="${styles.loading}">Loading menu...</div>
      </div>
    `,
    container,
  );

  // Load and render menu data
  const menuData = await loadMenuData(menuFile);
  const error = menuData ? undefined : "Failed to load menu data";

  render(template(menuData, error), container);
  const page = container.querySelector(`.${layoutStyles.pageContainer}`) as HTMLElement;
  if (!menuData || !page) return;

  let changes: UpdateResult<MenuPageData> | undefined = menuModel.setMenu(menuData);

  crumbsStore.truncate(menuFile.slice(0, menuFile.length - 5)); //TODO properly handle ID
  let menuItem = crumbsStore.getItem();
  if (isSaleItem(menuItem)) {
    menuItem = toOrderMenuItem(menuItem!);
    const stmt: Update<MenuPageData> = { order: [menuItem as OrderMenuItem] };
    changes = menuModel.update(stmt, changes);
  } else {
    const bottomBar = document.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
    const mainOrder = getOrder();
    AppBottomBar.update(bottomBar, {
      mode: "view",
      itemCount: mainOrder.itemIds.length,
      total: mainOrder.total,
    });
  }

  const subMenu = menuItem?.subMenu;
  if (subMenu) {
    const stmt = subMenu.included.reduce((u, key) => {
      u[key.itemId] = { [WHERE]: (item: any) => item != null, included: 1 };
      return u;
    }, {} as any);

    changes = menuModel.update({ menu: stmt }, changes);
  }

  MenuContentUI.init(page, menuItem);
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
    if (item?.subMenu) {
      item.quantity = 1;
      item.total = item.price ?? 0;
      crumbsStore.replace((c) => (c ? [...c, item] : [item]));
      window.location.href = `/${item.subMenu.menuId}`;
    }
  });

  addEventHandler(page, OPEN_MENU_EVENT, (data) => {
    const item = menuModel.getMenuItem(data.id);
    if (item?.subMenu) {
      crumbsStore.replace((c) => (c ? [...c, item] : [item]));
      window.location.href = `/${item.subMenu.menuId}`;
    }
  });

  addEventHandler(page, AppBottomBar.ADD_TO_ORDER_EVENT, () => {
    const order = menuModel.data.order;
    if (order) {
      const modifiers = Object.values(menuModel.data.menu)
        .filter((item) => item.quantity != 0)
        .map((item) => ({ menuItemId: item.id, name: item.name, quantity: item.quantity }));

      const orderItem: OrderItem = {
        id: "",
        menuItem: order,
        quantity: order.quantity,
        modifiers,
        unitPrice: order.unitPrice,
        total: order.total,
      };

      saveOrderItem(orderItem);
      window.history.back();
    }
  });
}

function template(menuData: Menu | null, error?: string) {
  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">${AppHeader.template()}</header>
      <main class="${layoutStyles.content}">
        ${error ? html` <div class="${styles.error}">Error: ${error}</div> ` : ""}
        ${menuData ? MenuContentUI.template(menuData) : ""}
      </main>
      <div class="${layoutStyles.bottomBar}">${AppBottomBar.template("view")}</div>
    </div>
  `;
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

const styles = {
  loading: css`
    text-align: center;
    padding: 40px;
    color: ${mdColors.onSurfaceVariant};
  `,

  error: css`
    background-color: ${mdColors.errorContainer};
    color: ${mdColors.onErrorContainer};
    padding: ${mdSpacing.md};
    border-radius: 12px;
    margin-top: ${mdSpacing.lg};
  `,
} as const;
