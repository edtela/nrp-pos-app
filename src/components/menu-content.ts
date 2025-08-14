/**
 * Menu Content Component
 * Container and layout for menu content
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./menu-content.css";
import { dataAttr, html, Template, replaceElements, buildHTML } from "@/lib/html-template";
import { Context, formatPrice } from "@/lib/context";
import { ItemGroup, Menu, MenuGroup, NestedGroup, DataCell, MenuItem, SubMenu } from "@/types";
import { headerCells, DataCellRenderer } from "./menu-header";
import * as MenuItemUI from "./menu-item";
import * as VariantGroupUI from "./variant";
import { DisplayMenuItem, MenuPageData, OrderMenuItem, DisplayMenu } from "@/model/menu-model";
import { DataChange } from "@/lib/data-model-types";

/**
 * Modification token types
 */
type ModificationTokenType = "removed" | "added-free" | "added-priced";

interface ModificationToken {
  name: string;
  type: ModificationTokenType;
  price?: number;
}

/**
 * Generate modification tokens from modifiers
 */
function generateModificationTokens(modifiers: OrderMenuItem["modifiers"]): ModificationToken[] {
  if (!modifiers) return [];

  return modifiers.map((modifier) => {
    if (modifier.quantity === 0) {
      return { name: modifier.name, type: "removed", price: modifier.price };
    }

    if (modifier.price === 0) {
      return {
        name: modifier.name,
        type: "added-free",
      };
    }

    return {
      name: modifier.name,
      type: "added-priced",
      price: modifier.price,
    };
  });
}

/**
 * Modification token template
 */
function modificationTokenTemplate(token: ModificationToken): Template {
  const className =
    token.type === "removed"
      ? classes.tokenRemoved
      : token.type === "added-priced"
        ? classes.tokenPriced
        : classes.tokenFree;

  const prefix = token.type === "removed" ? "-" : token.type === "added-priced" ? "+" : "";

  return html`<span class="${classes.token} ${className}">${prefix}${token.name}</span>`;
}

/**
 * Data structure for menu content
 */
export interface MenuContentData {
  menu: Menu | DisplayMenu;
  order?: OrderMenuItem;
}

/**
 * Order item template - displays the current order item
 */
function orderItemTemplate(order: OrderMenuItem | undefined, context: Context): Template {
  if (!order) return html`<div class="${classes.orderItem}" style="display: none"></div>`;

  const hasModifiers = order.modifiers && order.modifiers.length > 0;
  const tokens = hasModifiers ? generateModificationTokens(order.modifiers) : [];
  
  const priceStr = formatPrice(order.menuItem.price ?? 0, context.currency);
  
  const modifierPriceStr = order.modifiersPrice > 0
    ? `+${formatPrice(order.modifiersPrice, context.currency)}`
    : "";

  return html`
    <div class="${classes.orderItem}">
      <div class="${classes.orderContent}">
        <div class="${classes.orderHeader}">
          <h3 class="${classes.orderName}">${order.menuItem.name}</h3>
          <span class="${classes.price}">${priceStr}</span>
        </div>

        <div class="${classes.orderSecondLine}">
          ${tokens.length > 0
            ? html`
                <div class="${classes.tokensWrapper}">
                  <div class="${classes.tokens}">${tokens.map((token) => modificationTokenTemplate(token))}</div>
                  ${modifierPriceStr ? html`<span class="${classes.modifierPrice}">${modifierPriceStr}</span>` : ""}
                </div>
              `
            : order.menuItem.description
              ? html`<p class="${classes.orderDescription}">${order.menuItem.description}</p>`
              : ""}
        </div>
      </div>
    </div>
  `;
}

/**
 * DataCell renderer for menu content
 * Handles variant selection and other data-driven cells
 */
function createDataCellRenderer(menu: Menu | DisplayMenu, _context: Context): DataCellRenderer {
  return (cell: DataCell): Template => {
    if (cell.type === "variant-selection" && typeof cell.data === "string") {
      // Find the variant group by ID
      const variantGroup = menu.variants?.[cell.data];
      if (variantGroup) {
        return VariantGroupUI.template(variantGroup);
      }
    }
    // Default fallback for unknown types
    return html`[${cell.type}]`;
  };
}

/**
 * Template for menu group
 */
function menuGroupTemplate<T>(group: MenuGroup<T>, dataRenderer: DataCellRenderer, context: Context): Template {
  return html`
    <div class="${classes.group}" ${dataAttr("included", group.options?.extractIncluded)}>
      ${group.header ? headerCells(group.header, dataRenderer) : ""}
      ${"items" in group
        ? html`
            <div class="${classes.groupItems}">
              ${(group as ItemGroup<T>).items.map((itemData) => {
                // Type check: if it's a DisplayMenuItem, use it directly
                if ("quantity" in (itemData as any) && "data" in (itemData as any)) {
                  return MenuItemUI.template(itemData as DisplayMenuItem, context);
                }
                // Otherwise it's a MenuItem, wrap it
                return MenuItemUI.template({ data: itemData as MenuItem, quantity: 0, total: 0 }, context);
              })}
            </div>
          `
        : html`
            ${(group as NestedGroup<T>).groups.map((nestedGroup) => menuGroupTemplate(nestedGroup, dataRenderer, context))}
          `}
    </div>
  `;
}

/**
 * Main template for menu content
 */
export function template(data: MenuContentData, context: Context): Template {
  const dataRenderer = createDataCellRenderer(data.menu, context);
  return html`
    <div class="${classes.container}">
      ${orderItemTemplate(data.order, context)} ${menuGroupTemplate(data.menu.content as MenuGroup<any>, dataRenderer, context)}
    </div>
  `;
}

export function init(container: HTMLElement, subMenu: SubMenu | undefined, order: OrderMenuItem | undefined, context: Context) {
  if (order) {
    replaceElements(container, `.${classes.orderItem}`, orderItemTemplate(order, context));
  }

  if (!subMenu?.included) return;

  // Find the included section
  const includedSection = container.querySelector('[data-included="true"]');
  const includedGroupItems = includedSection?.querySelector(`.${classes.groupItems}`);

  // Process each included item
  for (const includedItem of subMenu.included) {
    // Check if we have a custom item definition
    if (includedItem.item != null) {
      // Create a new element from the provided item
      const displayItem: DisplayMenuItem = { data: includedItem.item, quantity: 0, total: 0 };
      const newElementTemplate = MenuItemUI.template(displayItem, context);
      
      // Convert template to DOM element
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = buildHTML(newElementTemplate);
      const newElement = tempDiv.firstElementChild as HTMLElement;
      
      if (!newElement) continue;
      
      // Handle display property
      if (includedItem.display === "none") {
        // Add but hide the new item
        newElement.style.display = "none";
        includedGroupItems?.appendChild(newElement);
      } else if (includedItem.display === "included" && includedGroupItems) {
        // Add to included section (most common case for one-off ingredients)
        includedGroupItems.appendChild(newElement);
      } else if (includedItem.display === undefined) {
        // Replace existing item if it exists
        const existingElement = container.querySelector(`#menu-item-${includedItem.itemId}`);
        if (existingElement) {
          existingElement.parentNode?.replaceChild(newElement, existingElement);
        } else if (includedGroupItems) {
          // If no existing element, add to included section
          includedGroupItems.appendChild(newElement);
        }
      }
    } else {
      // Original logic for when item is not provided
      const itemElement = container.querySelector(`#menu-item-${includedItem.itemId}`);
      if (!itemElement) continue;

      if (includedItem.display === "none") {
        // Hide items with display: none
        (itemElement as HTMLElement).style.display = "none";
      } else if (includedItem.display === "included" && includedGroupItems) {
        // Move items with display: included to the included section
        includedGroupItems.appendChild(itemElement);
      }
      // If no display property, do nothing (leave item in place)
    }
  }

  // Hide all sections that have empty .groupItems
  const allGroups = container.querySelectorAll(`.${classes.group}`);
  allGroups.forEach((group) => {
    const groupItems = group.querySelector(`:scope > .${classes.groupItems}`);
    if (groupItems && groupItems.children.length === 0) {
      (group as HTMLElement).style.display = "none";
    }
  });
}

/**
 * Update menu content
 */
export function update(
  container: Element,
  changes: DataChange<MenuPageData>,
  context: Context,
  data: MenuPageData
): void {
  // Handle order updates
  if (changes.order) {
    // If modifiers changed, re-render the entire order item
    if (changes.order.modifiers) {
      replaceElements(container, `.${classes.orderItem}`, orderItemTemplate(data.order, context));
    } else {
      // Update price if changed
      if (changes.order.menuItem?.price !== undefined) {
        const elt = container.querySelector(`.${classes.orderItem} .${classes.price}`);
        if (elt) {
          elt.textContent = formatPrice(changes.order.menuItem.price, context.currency);
        }
      }

      // Update modifierPrice if changed
      if ("modifiersPrice" in changes.order) {
        const elt = container.querySelector(`.${classes.orderItem} .${classes.modifierPrice}`);
        if (elt) {
          const value = changes.order.modifiersPrice;
          elt.textContent = value ? `+${formatPrice(value, context.currency)}` : "";
        }
      }
    }
  }

  for (const [itemId, itemChanges] of Object.entries(changes.menu ?? {})) {
    const menuItemElement = container.querySelector(`#menu-item-${itemId}`);
    if (menuItemElement && itemChanges) {
      MenuItemUI.update(menuItemElement, itemChanges, context);
    }
  }

  for (const [variantGroupId, variantChanges] of Object.entries(changes.variants ?? {})) {
    const variantGroupElement = container.querySelector(`#variant-group-${variantGroupId}`);
    if (variantGroupElement && variantChanges) {
      VariantGroupUI.update(variantGroupElement, variantChanges, context);
    }
  }
}

/**
 * CSS class names
 */
export const classes = {
  container: "menu-content-container",
  group: "menu-content-group",
  groupItems: "menu-content-group-items",
  orderItem: "menu-content-order-item",
  orderContent: "menu-content-order-content",
  orderHeader: "menu-content-order-header",
  orderInfo: "menu-content-order-info",
  orderIcon: "menu-content-order-icon",
  orderDetails: "menu-content-order-details",
  orderName: "menu-content-order-name",
  orderDescription: "menu-content-order-description",
  orderSecondLine: "menu-content-order-second-line",
  price: "menu-content-price",
  tokensWrapper: "menu-content-tokens-wrapper",
  tokens: "menu-content-tokens",
  token: "menu-content-token",
  tokenRemoved: "menu-content-token-removed",
  tokenPriced: "menu-content-token-priced",
  tokenFree: "menu-content-token-free",
  modifierPrice: "menu-content-modifier-price",
} as const;

// Export for backward compatibility and selector usage in menu-page
export const styles = classes;
export const menuContainer = classes.container;
