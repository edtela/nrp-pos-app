/**
 * Modifier Menu Content Component
 * Displays order item being modified and the menu content for modifications
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { html, Template, render } from "@/lib/html-template";
import { Context, withContext } from "@/lib/context";
import { MenuPageData } from "@/model/menu-model";
import { DataChange } from "@/lib/data-model-types";
import { OrderItem } from "@/model/order-model";
import * as MenuContent from "./menu-content";
import { styles } from "@/styles/styles";

// Export for menu-page selector
export const modifierMenuContainer = "modifier-menu-content";

/**
 * Order item template
 */
function orderItemTemplate(order: OrderItem | undefined, context: Context): Template {
  if (!order) return html``;

  const { formatPrice } = withContext(context);

  const showModifiersPrice = order.modifiersPrice > 0;
  const showUnitPrice = order.modifiersPrice !== 0;
  const title = order.variant ? `${order.menuItem.name} - ${order.variant.name}` : order.menuItem.name;

  return html`
    <div style="
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: auto 1fr auto;
      align-items: baseline;
      min-height: 6.5rem;
      background: transparent;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      margin-bottom: var(--md-sys-spacing-lg);
      padding: var(--md-sys-spacing-md);
      padding-bottom: var(--md-sys-spacing-lg);
    ">
      <span class="${styles.title.large}" style="
        grid-column: 1;
        grid-row: 1;
        margin: 0;
        text-align: left;
      ">${title}</span>
      <span class="${styles.price.primary}" style="
        grid-column: 2;
        grid-row: 1;
        text-align: right;
      ">${formatPrice(order.price)}</span>

      <div style="
        grid-column: 1;
        grid-row: 2 / 4;
        display: block;
        align-self: start;
        margin-top: var(--md-sys-spacing-xs);
      ">
        ${order.modifiers && order.modifiers.length > 0
          ? order.modifiers.map(
              (mod) => {
                const tokenStyle = mod.modType === 'remove' ? styles.token.remove : 
                                  mod.modType === 'add' ? styles.token.add : 
                                  styles.token.modify;
                return html` <span class="${styles.token.base} ${tokenStyle}" style="
                  padding: 2px 8px;
                  border-radius: var(--md-sys-shape-corner-extra-small);
                  display: inline-block;
                  margin-right: 4px;
                  margin-bottom: 2px;
                ">${mod.name}</span> `;
              }
            )
          : ""}
      </div>

      <span class="${styles.price.secondary}" style="
        grid-column: 2;
        grid-row: 2;
        text-align: right;
        align-self: start;
        ${showModifiersPrice ? "" : "visibility: hidden;"}
      ">
        ${showModifiersPrice ? `+${formatPrice(order.modifiersPrice)}` : ""}
      </span>

      <span class="${styles.price.secondary}" style="
        grid-column: 2;
        grid-row: 3;
        text-align: right;
        align-self: end;
        ${showUnitPrice ? "" : "visibility: hidden;"}
      ">
        ${showUnitPrice ? formatPrice(order.unitPrice) : ""}
      </span>
    </div>
  `;
}

/**
 * Main template for modifier menu content
 */
export function template(data: MenuPageData, context: Context): Template {
  return html`
    <div class="${modifierMenuContainer}" style="display: flex; flex-direction: column;">
      <div class="order-slot slot">${orderItemTemplate(data.order, context)}</div>
      ${MenuContent.template(data, context)}
    </div>
  `;
}

/**
 * Update function for menu-page
 */
export function update(container: Element, changes: DataChange<MenuPageData>, ctx: Context, data: MenuPageData): void {
  // Handle order updates
  if (changes.order) {
    const orderSlot = container.querySelector(".order-slot");
    if (orderSlot) {
      render(orderItemTemplate(data.order, ctx), orderSlot);
    }
  }

  // Delegate other updates to menu-content
  const menuContentElement = container.querySelector(`.${MenuContent.menuContainer}`);
  if (menuContentElement) {
    MenuContent.update(menuContentElement, changes, ctx, data);
  }
}