/**
 * Menu Content Component
 * Container and layout for menu content
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./menu-content.css";
import { html, Template, replaceElements, buildHTML } from "@/lib/html-template";
import { Context, formatPrice } from "@/lib/context";
import { DataCell, SubMenu, ItemGroup, Cell, Cells } from "@/types";
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
 * Classes for menu content component
 */
const classes = {
  container: "menu-content",
  group: "menu-group",
  groupItems: "menu-group-items",
  orderItem: "order-item",
  orderInfo: "order-info",
  orderTitle: "order-title",
  orderPrice: "order-price",
  orderModifications: "order-modifications",
  modificationToken: "modification-token",
};

// Export for menu-page
export const menuContainer = classes.container;

/**
 * Order item template
 */
function orderItemTemplate(order: OrderMenuItem | undefined, context: Context): Template {
  if (!order) return html``;

  const modifications = generateModificationTokens(order.modifiers);

  return html`
    <div class="${classes.orderItem}">
      <div class="${classes.orderInfo}">
        <span class="${classes.orderTitle}">
          ${order.menuItem.name}
        </span>
        <span class="${classes.orderPrice}">${formatPrice(order.unitPrice, context.currency)}</span>
      </div>
      ${modifications.length > 0
        ? html`
            <div class="${classes.orderModifications}">
              ${modifications.map(
                (mod) => html`
                  <span class="${classes.modificationToken}" data-type="${mod.type}">
                    ${mod.name}
                    ${mod.type === "added-priced" && mod.price ? ` (+${formatPrice(mod.price, context.currency)})` : ""}
                  </span>
                `
              )}
            </div>
          `
        : ""}
    </div>
  `;
}

/**
 * Menu content data
 */
export interface MenuContentData {
  menu: DisplayMenu;
  order?: OrderMenuItem;
}

/**
 * Create data cell renderer for the menu
 */
function createDataCellRenderer(menu: DisplayMenu, context: Context): DataCellRenderer {
  return (cell: DataCell): Template => {
    switch (cell.type) {
      case "variant-selection":
        const variantGroupId = cell.data as string;
        const variantGroup = menu.variants?.[variantGroupId];
        if (variantGroup) {
          return VariantGroupUI.template(variantGroup);
        }
        return html``;
      case "item-group":
        const groupId = cell.data as string;
        const itemGroup = menu.itemGroups?.[groupId];
        if (itemGroup) {
          return itemGroupTemplate(menu, itemGroup, context);
        }
        return html``;
      default:
        return html``;
    }
  };
}

/**
 * Template for rendering an item group
 */
function itemGroupTemplate(menu: DisplayMenu, group: ItemGroup, context: Context): Template {
  return html`
    <div class="${classes.group}">
      <div class="${classes.groupItems}">
        ${group.itemIds.map((itemId) => {
          const item = menu.items[itemId];
          if (!item) return html``;
          return MenuItemUI.template(item, context);
        })}
      </div>
    </div>
  `;
}

/**
 * Process layout cells recursively
 */
function processLayoutCells(cells: Cells, dataRenderer: DataCellRenderer): Template {
  if (Array.isArray(cells)) {
    return html`${cells.map(cell => processSingleCell(cell, dataRenderer))}`;
  }
  return processSingleCell(cells, dataRenderer);
}

/**
 * Process a single cell
 */
function processSingleCell(cell: Cell, dataRenderer: DataCellRenderer): Template {
  if ('type' in cell) {
    // DataCell - use renderer
    return dataRenderer(cell as DataCell);
  }
  // Regular display cell - use header cells renderer
  return headerCells(cell, dataRenderer);
}

/**
 * Main template for menu content
 */
export function template(data: MenuContentData, context: Context): Template {
  const dataRenderer = createDataCellRenderer(data.menu, context);
  
  return html`
    <div class="${classes.container}">
      ${orderItemTemplate(data.order, context)}
      ${processLayoutCells(data.menu.layout, dataRenderer)}
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
      // Compute price for the included item
      let price = 0;
      if (typeof includedItem.item.price === 'number') {
        price = includedItem.item.price;
      }
      const displayItem: DisplayMenuItem = { data: includedItem.item, price, quantity: 0, total: 0 };
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
      // Just mark existing item with data attributes or hide
      const existingElement = container.querySelector(`#menu-item-${includedItem.itemId}`);
      if (existingElement) {
        if (includedItem.display === "none") {
          (existingElement as HTMLElement).style.display = "none";
        } else if (includedItem.display === "included") {
          existingElement.setAttribute("data-included", "true");
        }
      }
    }
  }
}

/**
 * Handle data changes for reactive updates
 */
export function handleDataChange(
  _container: HTMLElement,
  _data: MenuPageData,
  _change: DataChange<MenuPageData>,
  _context: Context
): boolean {
  // TODO: Implement specific change handlers for performance
  return false; // Return false to trigger full re-render
}

/**
 * Update function for menu-page
 */
export function update(
  container: HTMLElement,
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
      if (changes.order.unitPrice !== undefined) {
        const elt = container.querySelector(`.${classes.orderItem} .${classes.orderPrice}`);
        if (elt) {
          elt.textContent = formatPrice(changes.order.unitPrice, context.currency);
        }
      }

      // Update modifierPrice if changed
      if ("modifiersPrice" in changes.order) {
        const elt = container.querySelector(`.${classes.orderItem} .${classes.orderPrice}`);
        if (elt && data.order) {
          elt.textContent = formatPrice(data.order.unitPrice, context.currency);
        }
      }
    }
  }

  // Handle menu item updates
  if (changes.menu) {
    for (const [itemId, itemChanges] of Object.entries(changes.menu)) {
      const menuItemElement = container.querySelector(`#menu-item-${itemId}`);
      if (menuItemElement && itemChanges) {
        MenuItemUI.update(menuItemElement, itemChanges, context);
      }
    }
  }
}