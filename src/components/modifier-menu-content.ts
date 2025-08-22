/**
 * Modifier Menu Content Component
 * Displays order item being modified and the menu content for modifications
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./modifier-menu-content.css";
import { html, Template, render } from "@/lib/html-template";
import { Context, withContext } from "@/lib/context";
import { MenuPageData } from "@/model/menu-model";
import { DataChange } from "@/lib/data-model-types";
import { OrderItem } from "@/model/order-model";
import * as MenuContent from "./menu-content";
import { styles } from "@/styles/styles";

/**
 * Classes for modifier menu content component
 */
const classes = {
  container: "modifier-menu-content",
  orderItem: "order-item",
  orderTitle: "order-title",
  orderPrice: "order-price",
  orderModifications: "order-modifications",
  modifiersPrice: "modifiers-price",
  unitPrice: "unit-price",
  modificationToken: "modification-token",
};

// Export for menu-page
export const modifierMenuContainer = classes.container;

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
    <div class="${classes.orderItem}">
      <span class="${classes.orderTitle} ${styles.title.large}">${title}</span>
      <span class="${classes.orderPrice} ${styles.price.primary}">${formatPrice(order.price)}</span>

      <div class="${classes.orderModifications}">
        ${order.modifiers && order.modifiers.length > 0
          ? order.modifiers.map(
              (mod) => {
                const tokenStyle = mod.modType === 'remove' ? styles.token.remove : 
                                  mod.modType === 'add' ? styles.token.add : 
                                  styles.token.modify;
                return html` <span class="${classes.modificationToken} ${styles.token.base} ${tokenStyle}">${mod.name}</span> `;
              }
            )
          : ""}
      </div>

      <span class="${classes.modifiersPrice} ${styles.price.secondary}" style="${showModifiersPrice ? "" : "visibility: hidden;"}">
        ${showModifiersPrice ? `+${formatPrice(order.modifiersPrice)}` : ""}
      </span>

      <span class="${classes.unitPrice} ${styles.price.secondary}" style="${showUnitPrice ? "" : "visibility: hidden;"}">
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
    <div class="${classes.container}">
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