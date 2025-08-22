/**
 * Modifier Page Content Component
 * Full page component for modifier menu pages
 * Includes app header, order display, menu content for modifications, and bottom bar
 */

import { html, Template, toClassSelectors, domUpdate } from "@/lib/html-template";
import { Context, withContext, commonTranslations } from "@/lib/context";
import { DisplayMenu, MenuPageData } from "@/model/menu-model";
import { DataChange } from "@/lib/data-model-types";
import { OrderItem } from "@/model/order-model";
import * as MenuContent from "./menu-content";
import * as AppHeader from "./app-header";
import * as AppBottomBar from "./app-bottom-bar";
import { styles as layoutStyles } from "./app-layout";
import { styles } from "@/styles/styles";
import { navigate } from "@/pages/page-router";

// Export for page selector
export const modifierPageContainer = "modifier-page-content";

const targets = {
  title: "menu-order-title",
  price: "menu-order-price",
  tokens: "menu-order-tokens",
  unitPrice: "menu-order-unit-price",
  modifiersPrice: "menu-order-modifiers-price",
} as const;

const selectors = toClassSelectors(targets);

function orderTokensTemplate(order: OrderItem): Template {
  const tokenStyleMap = {
    remove: styles.token.remove,
    add: styles.token.add,
    modify: styles.token.modify
  };
  
  return html`${order.modifiers.map((mod) => {
    const tokenStyle = tokenStyleMap[mod.modType] || styles.token.modify;
    return html`<span
      class="${styles.token.base} ${tokenStyle}"
      style="
          padding: 2px 8px;
          border-radius: var(--md-sys-shape-corner-extra-small);
          display: inline-block;
          margin-right: 4px;
          margin-bottom: 2px;"
    >
      ${mod.name}
    </span>`;
  })}`;
}

/**
 * Order item template
 */
function orderItemTemplate(): Template {
  return html`
    <div
      style="
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: auto 1fr auto;
      align-items: baseline;
      min-height: 6.5rem;
      background: transparent;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      margin-bottom: var(--md-sys-spacing-lg);
      padding: var(--md-sys-spacing-md);
      padding-bottom: var(--md-sys-spacing-lg);"
    >
      <span
        class="${targets.title} ${styles.title.large}"
        style="
        grid-column: 1;
        grid-row: 1;
        margin: 0;
        text-align: left;"
      >
      </span>
      <span
        class="${targets.price} ${styles.price.primary}"
        style="
        grid-column: 2;
        grid-row: 1;
        text-align: right;"
      >
      </span>
      <div
        class="${targets.tokens}"
        style="
        grid-column: 1;
        grid-row: 2 / 4;
        display: block;
        align-self: start;
        margin-top: var(--md-sys-spacing-xs);"
      ></div>

      <span
        class="${targets.modifiersPrice} ${styles.price.secondary}"
        style="
        grid-column: 2;
        grid-row: 2;
        text-align: right;
        align-self: start;
        visibility: hidden;"
      >
      </span>

      <span
        class="${targets.unitPrice} ${styles.price.secondary}"
        style="
        grid-column: 2;
        grid-row: 3;
        text-align: right;
        align-self: end;
        visibility: hidden;"
      >
      </span>
    </div>
  `;
}

/**
 * Error content template
 */
function errorContentTemplate(context: Context): Template {
  return html`
    <div class="modifier-error" style="
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: var(--md-sys-spacing-xl);
      text-align: center;
      gap: var(--md-sys-spacing-lg);
    ">
      <span class="material-icons" style="
        font-size: 64px;
        color: var(--md-sys-color-outline);
      ">error_outline</span>

      <h2 style="
        font-size: var(--md-sys-typescale-headline-medium-size);
        line-height: var(--md-sys-typescale-headline-medium-line-height);
        color: var(--md-sys-color-on-surface);
        margin: 0;
      ">
        ${context.lang === "sq"
          ? "Nuk mund të aksesoni këtë menu"
          : context.lang === "it"
            ? "Impossibile accedere a questo menu"
            : "Cannot access this menu"}
      </h2>

      <p style="
        font-size: var(--md-sys-typescale-body-large-size);
        line-height: var(--md-sys-typescale-body-large-line-height);
        color: var(--md-sys-color-on-surface-variant);
        margin: 0;
        max-width: 400px;
      ">
        ${context.lang === "sq"
          ? "Ky menu kërkon një artikull të zgjedhur. Ju lutemi filloni nga menuja kryesore."
          : context.lang === "it"
            ? "Questo menu richiede un articolo selezionato. Si prega di iniziare dal menu principale."
            : "This menu requires a selected item. Please start from the main menu."}
      </p>

      <button class="nav-home-button" style="
        background-color: var(--md-sys-color-primary);
        color: var(--md-sys-color-on-primary);
        border: none;
        border-radius: var(--md-sys-shape-corner-full);
        padding: var(--md-sys-spacing-sm) var(--md-sys-spacing-xl);
        font-size: var(--md-sys-typescale-label-large-size);
        font-weight: var(--md-sys-typescale-label-large-weight);
        cursor: pointer;
        margin-top: var(--md-sys-spacing-md);
      ">
        ${commonTranslations.menu(context)}
      </button>
    </div>
  `;
}

/**
 * Main template for modifier page content
 */
export function template(displayMenu: DisplayMenu, context: Context): Template {
  // Always use back button for modifier menus
  const headerData: AppHeader.HeaderData = {
    leftButton: {
      type: "back",
      onClick: () => navigate.back(),
    },
  };

  return html`
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">${AppHeader.template(headerData, context)}</header>
      <main class="${layoutStyles.content}" style="display: flex; flex-direction: column; height: 100%;">
        ${errorContentTemplate(context)}
        <div class="modifier-content" style="display: flex; flex-direction: column;">
          ${orderItemTemplate()}
          ${MenuContent.template(displayMenu, context)}
        </div>
      </main>
      <div class="${layoutStyles.bottomBar}">
        ${AppBottomBar.template("add", context)}
      </div>
    </div>
  `;
}

export function updateOrder(container: Element, changes: DataChange<OrderItem>, ctx: Context, data: MenuPageData): void {
  const { formatPrice } = withContext(ctx);

  if (changes.price !== undefined) {
    domUpdate.setTextContent(container, selectors.price, formatPrice(changes.price));
  }

  if (changes.unitPrice !== undefined) {
    domUpdate.setTextContent(container, selectors.unitPrice, formatPrice(changes.unitPrice));
  }

  if (changes.modifiersPrice !== undefined) {
    domUpdate.setTextContent(container, selectors.modifiersPrice, `+${formatPrice(changes.modifiersPrice)}`);
    domUpdate.setVisibility(container, selectors.unitPrice, changes.modifiersPrice !== 0);
    domUpdate.setVisibility(container, selectors.modifiersPrice, changes.modifiersPrice > 0);
  }

  if (changes.menuItem || changes.variant) {
    const order = data.order;
    const title = order?.variant ? `${order.menuItem.name} - ${order.variant.name}` : (order?.menuItem.name ?? "");
    domUpdate.setTextContent(container, selectors.title, title);
  }

  if (changes.modifiers && data.order) {
    domUpdate.setHTML(container, selectors.tokens, orderTokensTemplate(data.order));
  }
}

/**
 * Hydrate function - attaches event handlers
 */
export function hydrate(container: Element, _displayMenu: DisplayMenu, context: Context, order?: OrderItem): void {
  const page = container.querySelector(`.${layoutStyles.pageContainer}`) as HTMLElement;
  if (!page) return;

  // Check if this is a modifier menu without an order context
  if (!order) {
    showError(page);
    return;
  }

  // Hydrate header with navigation
  const header = page.querySelector(`.${layoutStyles.header}`) as HTMLElement;
  if (header) {
    const headerData: AppHeader.HeaderData = {
      leftButton: {
        type: "back",
        onClick: () => navigate.back(),
      },
    };
    AppHeader.hydrate(header, context, headerData);
  }

  // Update bottom bar with order state
  const bottomBar = page.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
  if (bottomBar && order) {
    AppBottomBar.update(
      bottomBar,
      {
        quantity: order.quantity,
        total: order.total,
      },
      context,
    );
  }
}

/**
 * Show error state when modifier menu has no order context
 */
function showError(container: Element): void {
  const content = container.querySelector(`.${layoutStyles.content}`) as HTMLElement;
  if (!content) return;
  
  // Hide regular content
  domUpdate.setStyle(content, '.modifier-content', 'display', 'none');
  // Show error content
  domUpdate.setStyle(content, '.modifier-error', 'display', 'flex');
  
  // Set up click handler for home button
  const homeButton = content.querySelector('.nav-home-button') as HTMLButtonElement;
  if (homeButton) {
    homeButton.onclick = () => navigate.toHome();
  }
}

/**
 * Update function for menu-page
 */
export function update(container: Element, changes: DataChange<MenuPageData>, ctx: Context, data: MenuPageData): void {
  const content = container.querySelector(`.${layoutStyles.content}`) as HTMLElement;
  if (!content) return;

  // Handle order updates
  if ("order" in changes) {
    updateOrder(content, changes.order as any, ctx, data);
    
    // Also update bottom bar total if needed
    if (changes.order && "total" in changes.order) {
      const bottomBar = container.querySelector(`.${layoutStyles.bottomBar}`) as HTMLElement;
      if (bottomBar) {
        AppBottomBar.update(bottomBar, { total: changes.order.total }, ctx);
      }
    }
  }

  // Delegate other updates to menu-content
  const menuContentElement = content.querySelector(`.${MenuContent.menuContainer}`);
  if (menuContentElement) {
    MenuContent.update(menuContentElement, changes, ctx, data);
  }
}
