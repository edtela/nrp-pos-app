/**
 * Menu Item Component
 * Individual menu item with selection states
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./menu-item.css";
import { html, Template, replaceElements, onClick, updateOnClick } from "@/lib/html-template";
import { DataChange } from "@/lib/data-model-types";
import { DisplayMenuItem } from "@/model/menu-model";
import { isSaleItem } from "@/types";

export const ORDER_ITEM_EVENT = "order-item";
export const OPEN_MENU_EVENT = "open-menu";
export const MENU_ITEM_CLICK = "menu-item-click";

/**
 * Price template - renders the price or navigation chevron
 */
function priceTemplate(price?: number): Template {
  if (typeof price === "number") {
    return price === 0 ? html`` : html`<span class="${classes.price}">$${price.toFixed(2)}</span>`;
  }
  return html`<span class="${classes.price} material-icons">chevron_right</span>`;
}

/**
 * Menu item template - pure function
 */
export function template(item: DisplayMenuItem): Template {
  const iType = item.data.constraints?.choice?.single ? "radio" : item.data.subMenu ? "none" : "checkbox";

  // Show icon only when:
  // - Never for radio buttons (iType === "radio")
  // - For checkboxes, only when NOT selected (no checkmark showing)
  // - Always for navigation items (iType === "none")
  const showIcon = iType === "radio" ? false : iType === "checkbox" ? !item.selected : true;

  return html`
    <div
      class="${classes.item}"
      id="menu-item-${item.data.id}"
      data-type="menu-item"
      data-id="${item.data.id}"
      data-interaction-type="${iType}"
      data-selected=${item.selected ? "true" : "false"}
      ${onClick(MENU_ITEM_CLICK)}
    >
      <div class="${classes.content}">
        <span class="${classes.icon} ${iconClassName}">${showIcon && item.data.icon ? item.data.icon : ""}</span>
        <div class="${classes.text}">
          <span class="${classes.name}">${item.data.name}</span>
          ${item.data.description ? html`<p class="${classes.description}">${item.data.description}</p>` : ""}
        </div>
        ${priceTemplate(item.data.price)}
      </div>
    </div>
  `;
}

/**
 * Update menu item
 */
export function update(element: HTMLElement, event: DataChange<DisplayMenuItem>) {
  // Check if price or selectedVariantId has changed
  if (event.data && "price" in event.data) {
    replaceElements(element, `.${classes.price}`, priceTemplate(event.data.price));
  }

  if ("selected" in event) {
    element.setAttribute("data-selected", event.selected ? "true" : "false");
  }
}

// Class name for icon element (needed for style references)
const iconClassName = "menu-item-icon";

/**
 * Menu Item Class Names
 */
export const classes = {
  item: "menu-item",
  icon: "menu-item-icon",
  content: "menu-item-content",
  text: "menu-item-text",
  name: "menu-item-name",
  description: "menu-item-description",
  price: "menu-item-price",
} as const;

// Export as styles for backward compatibility
export const styles = classes;
