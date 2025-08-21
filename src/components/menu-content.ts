/**
 * Menu Content Component
 * Container and layout for menu content
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./menu-content.css";
import { html, Template, render, reconcileChildren, buildHTML } from "@/lib/html-template";
import { Context, withContext } from "@/lib/context";
import { DataCell, ItemGroup } from "@/types";
import { headerCells, DataCellRenderer } from "./menu-header";
import * as MenuItemUI from "./menu-item";
import * as VariantGroupUI from "./variant";
import { DisplayMenuItem, MenuPageData, OrderMenuItem, DisplayMenu } from "@/model/menu-model";
import { DataChange } from "@/lib/data-model-types";

/**
 * Classes for menu content component
 */
const classes = {
  container: "menu-content",
  group: "menu-group",
  groupHeader: "menu-group-header",
  groupItems: "menu-group-items",
  orderItem: "order-item",
  orderTitle: "order-title",
  orderPrice: "order-price",
  orderModifications: "order-modifications",
  modifiersPrice: "modifiers-price",
  unitPrice: "unit-price",
  modificationToken: "modification-token",
};

// Export for menu-page
export const menuContainer = classes.container;

/**
 * Order item template
 */
function orderItemTemplate(order: OrderMenuItem | undefined, context: Context): Template {
  if (!order) return html``;

  const { formatPrice } = withContext(context);
  
  const showModifiersPrice = order.modifiersPrice > 0;
  const showUnitPrice = order.modifiersPrice !== 0;

  return html`
    <div class="${classes.orderItem}">
      <span class="${classes.orderTitle}">${order.menuItem.name}</span>
      <span class="${classes.orderPrice}">${formatPrice(order.price)}</span>

      <div class="${classes.orderModifications}">
        ${order.modifiers && order.modifiers.length > 0
          ? order.modifiers.map(
              (mod) => html` <span class="${classes.modificationToken}" data-type="${mod.modType}">${mod.name}</span> `,
            )
          : ""}
      </div>

      <span class="${classes.modifiersPrice}" style="${showModifiersPrice ? "" : "visibility: hidden;"}">
        ${showModifiersPrice ? `+${formatPrice(order.modifiersPrice)}` : ""}
      </span>

      <span class="${classes.unitPrice}" style="${showUnitPrice ? "" : "visibility: hidden;"}">
        ${showUnitPrice ? formatPrice(order.unitPrice) : ""}
      </span>
    </div>
  `;
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
  const isEmpty = group.itemIds.length === 0;

  return html`
    <div class="${classes.group}" data-group-id="${group.id}" ${isEmpty ? 'style="display: none;"' : ""}>
      ${group.name ? html` <div class="${classes.groupHeader}">${group.name}</div> ` : ""}
      <div class="${classes.groupItems}">
        ${group.itemIds.map((itemId) => {
          const item = menu.items[itemId];
          return MenuItemUI.template(item, context);
        })}
      </div>
    </div>
  `;
}

/**
 * Main template for menu content
 */
export function template(data: MenuPageData, context: Context): Template {
  const dataRenderer = createDataCellRenderer(data, context);

  return html`
    <div class="${classes.container}">
      <div class="order-slot slot">${orderItemTemplate(data.order, context)}</div>
      ${headerCells(data.layout, dataRenderer)}
    </div>
  `;
}

/**
 * Build children for a menu group, reusing existing DOM elements
 */
function buildGroupChildren(
  container: Element,
  itemIds: string[],
  items: Record<string, DisplayMenuItem>,
  context: Context,
): Element[] {
  const children: Element[] = [];

  for (const itemId of itemIds) {
    const item = items[itemId];

    // Try to find existing element
    let element = container.querySelector(`#menu-item-${itemId}`);

    if (!element) {
      // Create new element from template
      const template = MenuItemUI.template(item, context);
      const temp = document.createElement("div");
      temp.innerHTML = buildHTML(template);
      element = temp.firstElementChild;
    }

    if (element) {
      children.push(element as Element);
    }
  }

  return children;
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

  // Handle itemGroups changes
  if (changes.itemGroups) {
    for (const [groupId, groupChanges] of Object.entries(changes.itemGroups)) {
      if (groupChanges && "itemIds" in groupChanges) {
        const groupElement = container.querySelector(`[data-group-id="${groupId}"]`);
        if (groupElement && data.itemGroups) {
          const group = data.itemGroups[groupId];
          if (group) {
            // Update display based on whether group has items
            if (group.itemIds.length === 0) {
              (groupElement as HTMLElement).style.display = "none";
            } else {
              // Remove display style to show the group
              (groupElement as HTMLElement).style.removeProperty("display");

              const itemsContainer = groupElement.querySelector(`.${classes.groupItems}`);
              if (itemsContainer) {
                // Build new children array from updated itemIds
                const newChildren = buildGroupChildren(container, group.itemIds, data.items, ctx);
                reconcileChildren(itemsContainer, newChildren);
              }
            }
          }
        }
      }
    }
  }

  // Handle menu item updates
  if (changes.items) {
    for (const [itemId, itemChanges] of Object.entries(changes.items)) {
      const menuItemElement = container.querySelector(`#menu-item-${itemId}`);
      if (menuItemElement && itemChanges) {
        MenuItemUI.update(menuItemElement, itemChanges, ctx);
      }
    }
  }

  if (changes.variants) {
    for (const [groupId, groupChanges] of Object.entries(changes.variants)) {
      const groupElement = container.querySelector(`#variant-group-${groupId}`);
      if (groupElement && groupChanges) {
        VariantGroupUI.update(groupElement, groupChanges as any, ctx);
      }
    }
  }
}
