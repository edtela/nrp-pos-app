/**
 * Modifier Menu Content Component
 * Displays order item being modified and the menu content for modifications
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { html, Template, toClassSelectors, domUpdate } from "@/lib/html-template";
import { Context, withContext, commonTranslations } from "@/lib/context";
import { MenuPageData } from "@/model/menu-model";
import { DataChange } from "@/lib/data-model-types";
import { OrderItem } from "@/model/order-model";
import * as MenuContent from "./menu-content";
import { styles } from "@/styles/styles";
import { navigate } from "@/pages/page-router";

// Export for menu-page selector
export const modifierMenuContainer = "modifier-menu-content";

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
 * Main template for modifier menu content
 */
export function template(data: MenuPageData, context: Context): Template {
  return html`
    <div class="${modifierMenuContainer}" style="display: flex; flex-direction: column; height: 100%;">
      ${errorContentTemplate(context)}
      <div class="modifier-content" style="display: flex; flex-direction: column;">
        ${orderItemTemplate()}
        ${MenuContent.template(data, context)}
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
 * Show error state when modifier menu has no order context
 */
export function showError(container: Element): void {
  // Hide regular content
  domUpdate.setStyle(container, '.modifier-content', 'display', 'none');
  // Show error content
  domUpdate.setStyle(container, '.modifier-error', 'display', 'flex');
  
  // Set up click handler for home button
  const homeButton = container.querySelector('.nav-home-button') as HTMLButtonElement;
  if (homeButton) {
    homeButton.onclick = () => navigate.toHome();
  }
}

/**
 * Update function for menu-page
 */
export function update(container: Element, changes: DataChange<MenuPageData>, ctx: Context, data: MenuPageData): void {
  // Handle order updates
  if ("order" in changes) {
    updateOrder(container, changes.order as any, ctx, data);
  }

  // Delegate other updates to menu-content
  const menuContentElement = container.querySelector(`.${MenuContent.menuContainer}`);
  if (menuContentElement) {
    MenuContent.update(menuContentElement, changes, ctx, data);
  }
}
