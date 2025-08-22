/**
 * Menu Page
 * Main page component for displaying menu data
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { addEventHandler, html, Template, render } from "@/lib/html-template";
import { navigate } from "@/lib/router";
import { getNavigationService } from "@/services/navigation-service";
import { Context, commonTranslations } from "@/lib/context";
import * as MenuContentUI from "@/components/menu-content";
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

  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">${AppHeader.template(headerData, context)}</header>
      <main class="${layoutStyles.content}">${MenuContentUI.template(displayMenu, context)}</main>
      <div class="${layoutStyles.bottomBar}">
        ${AppBottomBar.template(displayMenu.modifierMenu ? "add" : "view", context)}
      </div>
    </div>
  `;
}

/**
 * Template for modifier menu without order context
 */
function modifierMenuErrorTemplate(context: Context): Template {
  const headerData: AppHeader.HeaderData = {
    leftButton: {
      type: "home",
      onClick: () => navigate.toHome(),
    },
  };

  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">${AppHeader.template(headerData, context)}</header>
      <main class="${layoutStyles.content}">
        <div
          style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: var(--md-sys-spacing-xl);
          text-align: center;
          gap: var(--md-sys-spacing-lg);
        "
        >
          <span
            class="material-icons"
            style="
            font-size: 64px;
            color: var(--md-sys-color-outline);
          "
            >error_outline</span
          >

          <h2
            style="
            font-size: var(--md-sys-typescale-headline-medium-size);
            line-height: var(--md-sys-typescale-headline-medium-line-height);
            color: var(--md-sys-color-on-surface);
            margin: 0;
          "
          >
            ${context.lang === "sq"
              ? "Nuk mund të aksesoni këtë menu"
              : context.lang === "it"
                ? "Impossibile accedere a questo menu"
                : "Cannot access this menu"}
          </h2>

          <p
            style="
            font-size: var(--md-sys-typescale-body-large-size);
            line-height: var(--md-sys-typescale-body-large-line-height);
            color: var(--md-sys-color-on-surface-variant);
            margin: 0;
            max-width: 400px;
          "
          >
            ${context.lang === "sq"
              ? "Ky menu kërkon një artikull të zgjedhur. Ju lutemi filloni nga menuja kryesore."
              : context.lang === "it"
                ? "Questo menu richiede un articolo selezionato. Si prega di iniziare dal menu principale."
                : "This menu requires a selected item. Please start from the main menu."}
          </p>

          <button
            class="nav-home-button"
            style="
            background-color: var(--md-sys-color-primary);
            color: var(--md-sys-color-on-primary);
            border: none;
            border-radius: var(--md-sys-shape-corner-full);
            padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-xl);
            font-size: var(--md-sys-typescale-label-large-size);
            font-weight: var(--md-sys-typescale-label-large-weight);
            cursor: pointer;
            margin-top: var(--md-sys-spacing-md);
          "
          >
            ${commonTranslations.menu(context)}
          </button>
        </div>
      </main>
      <div class="${layoutStyles.bottomBar}">${AppBottomBar.template("view", context)}</div>
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
  console.log("ORDER: ", order);

  // Check if this is a modifier menu without an order context
  if (displayMenu.modifierMenu && !order) {
    // Replace the entire page content with error template
    render(modifierMenuErrorTemplate(context), container);

    // Re-hydrate the header for the error page
    const errorHeader = container.querySelector(`.${layoutStyles.header}`) as HTMLElement;
    if (errorHeader) {
      const headerData: AppHeader.HeaderData = {
        leftButton: {
          type: "home",
          onClick: () => navigate.toHome(),
        },
      };
      AppHeader.hydrate(errorHeader, context, headerData);
    }

    // Add click handler for the home button in the error message
    const homeButton = container.querySelector(".nav-home-button") as HTMLButtonElement;
    if (homeButton) {
      homeButton.onclick = () => navigate.toHome();
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
  if (order) {
    // Execute preUpdate statements if they exist
    const preUpdate = order.menuItem.subMenu?.preUpdate;
    if (preUpdate) {
      const updates = preUpdate.map((p) => toDisplayMenuUpdate(p, model.data));
      try {
        changes = model.updateAll(updates as any, changes);
      } catch {}
    }

    // Then process the order normally
    changes = model.update({ order: [order] }, changes);
  }
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

  const content = page.querySelector(`.${MenuContentUI.menuContainer}`) as HTMLElement;
  if (content) {
    MenuContentUI.update(content, event, context, data);
  }

  if (event.order && "total" in event.order) {
    const bottomBar = page.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
    if (bottomBar) {
      AppBottomBar.update(bottomBar, { total: event.order.total }, context);
    }
  }
}
