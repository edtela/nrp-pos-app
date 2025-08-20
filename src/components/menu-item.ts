/**
 * Menu Item Component
 * Individual menu item with selection states
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./menu-item.css";
import { html, Template, replaceElements, onClick, dataAttr, setDataAttribute } from "@/lib/html-template";
import { Context, formatPrice } from "@/lib/context";
import { DataChange } from "@/lib/data-model-types";
import { DisplayMenuItem } from "@/model/menu-model";

export const ORDER_ITEM_EVENT = "order-item";
export const OPEN_MENU_EVENT = "open-menu";
export const MENU_ITEM_CLICK = "menu-item-click";

/**
 * Price template - renders the price or navigation chevron
 */
function priceTemplate(context: Context, price?: number): Template {
  if (typeof price === "number") {
    return price === 0 ? html`` : html`<span class="${classes.price}">${formatPrice(price, context.currency)}</span>`;
  }
  return html`<span class="${classes.price} material-icons">chevron_right</span>`;
}

/**
 * Menu item template - pure function
 */
export function template(item: DisplayMenuItem, context: Context): Template {
  const controlType = item.isSingleChoice ? "radio" : item.data.subMenu ? "nav" : "check";

  return html`
    <div
      class="${classes.item}"
      id="menu-item-${item.data.id}"
      data-type="menu-item"
      data-id="${item.data.id}"
      data-control-type="${controlType}"
      ${dataAttr("included", item.included)}
      ${dataAttr("selected", item.selected)}
      ${dataAttr("required", item.isRequired)}
      ${onClick(MENU_ITEM_CLICK)}
    >
      <div class="${classes.content}">
        <span class="${classes.control}"></span>
        <span class="${classes.icon}">${item.data.icon || ""}</span>
        <div class="${classes.text}">
          <span class="${classes.name}">${item.data.name}</span>
          ${item.data.description ? html`<p class="${classes.description}">${item.data.description}</p>` : ""}
        </div>
        ${priceTemplate(context, item.price)}
      </div>
    </div>
  `;
}

/**
 * Update menu item
 */
export function update(container: Element, changes: DataChange<DisplayMenuItem>, context: Context): void {
  // Note: This component treats container AS the menu item element itself
  // Check if price has changed
  if ("price" in changes) {
    replaceElements(container, `.${classes.price}`, priceTemplate(context, changes.price));
  }

  if ("selected" in changes) {
    setDataAttribute(container as HTMLElement, "selected", changes.selected);
  }

  if ("included" in changes) {
    setDataAttribute(container as HTMLElement, "included", changes.included);
  }

  if ("isRequired" in changes) {
    setDataAttribute(container as HTMLElement, "required", changes.isRequired);
  }
}

/**
 * Menu Item Class Names
 */
export const classes = {
  item: "menu-item",
  content: "menu-item-content",
  control: "menu-item-control",
  icon: "menu-item-icon",
  text: "menu-item-text",
  name: "menu-item-name",
  description: "menu-item-description",
  price: "menu-item-price",
} as const;

// Export as styles for backward compatibility
export const styles = classes;
