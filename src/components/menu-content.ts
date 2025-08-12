/**
 * Menu Content Component
 * Container and layout for menu content
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./menu-content.css";
import { dataAttr, html, Template, replaceElements } from "@/lib/html-template";
import { ItemGroup, Menu, MenuGroup, NestedGroup, DataCell, MenuItem, SubMenu } from "@/types";
import { headerCells, DataCellRenderer } from "./menu-header";
import * as MenuItemUI from "./menu-item";
import * as VariantGroupUI from "./variant";
import { DisplayMenuItem, MenuPageData, OrderMenuItem, DisplayMenu } from "@/model/menu-model";
import { DataChange } from "@/lib/data-model-types";

/**
 * Order item template - displays the current order item
 */
function orderItemTemplate(order: OrderMenuItem | undefined): Template {
  if (!order) return html`<div class="${classes.orderItem}" style="display: none"></div>`;

  return html`
    <div class="${classes.orderItem}">
      <div class="${classes.orderContent}">
        <div class="${classes.orderInfo}">
          ${order.menuItem.icon ? html`<span class="${classes.orderIcon}">${order.menuItem.icon}</span>` : ""}
          <div class="${classes.orderDetails}">
            <h3 class="${classes.orderName}">${order.menuItem.name}</h3>
            ${order.menuItem.description
              ? html`<p class="${classes.orderDescription}">${order.menuItem.description}</p>`
              : ""}
          </div>
        </div>
        <span class="${classes.price}">$${order.total.toFixed(2)}</span>
      </div>
    </div>
  `;
}

/**
 * DataCell renderer for menu content
 * Handles variant selection and other data-driven cells
 */
function createDataCellRenderer(menu: Menu | DisplayMenu): DataCellRenderer {
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
function menuGroupTemplate<T>(group: MenuGroup<T>, dataRenderer: DataCellRenderer): Template {
  return html`
    <div class="${classes.group}" ${dataAttr("included", group.options?.extractIncluded)}>
      ${group.header ? headerCells(group.header, dataRenderer) : ""}
      ${"items" in group
        ? html`
            <div class="${classes.groupItems}">
              ${(group as ItemGroup<T>).items.map((itemData) => {
                // Type check: if it's a DisplayMenuItem, use it directly
                if ("quantity" in (itemData as any) && "data" in (itemData as any)) {
                  return MenuItemUI.template(itemData as DisplayMenuItem);
                }
                // Otherwise it's a MenuItem, wrap it
                return MenuItemUI.template({ data: itemData as MenuItem, quantity: 0, total: 0 });
              })}
            </div>
          `
        : html`
            ${(group as NestedGroup<T>).groups.map((nestedGroup) => menuGroupTemplate(nestedGroup, dataRenderer))}
          `}
    </div>
  `;
}

/**
 * Main template for menu content
 */
export function template(data: (Menu | DisplayMenu) & { order?: OrderMenuItem }): Template {
  const dataRenderer = createDataCellRenderer(data);
  return html`
    <div class="${classes.container}">
      ${orderItemTemplate(data.order)} ${menuGroupTemplate(data.content as MenuGroup<any>, dataRenderer)}
    </div>
  `;
}

export function init(container: HTMLElement, subMenu?: SubMenu, order?: OrderMenuItem) {
  if (order) {
    replaceElements(container, `.${classes.orderItem}`, orderItemTemplate(order));
  }

  if (!subMenu?.included) return;

  // Find the included section
  const includedSection = container.querySelector('[data-included="true"]');
  const includedGroupItems = includedSection?.querySelector(`.${classes.groupItems}`);

  // Process each included item
  for (const includedItem of subMenu.included) {
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
export function update(container: HTMLElement, event: DataChange<MenuPageData>) {
  // Handle order updates
  if (event.order?.menuItem && "price" in event.order.menuItem) {
    const priceElement = container.querySelector(`.${classes.orderItem} .${classes.price}`);
    if (priceElement && typeof event.order.menuItem.price === "number") {
      priceElement.textContent = `$${event.order.menuItem.price.toFixed(2)}`;
    }
  }

  for (const [itemId, itemEvent] of Object.entries(event.menu ?? {})) {
    const menuItemElement = container.querySelector(`#menu-item-${itemId}`) as HTMLElement;
    if (menuItemElement && itemEvent) {
      MenuItemUI.update(menuItemElement, itemEvent);
    }
  }

  for (const [variantGroupId, variantEvent] of Object.entries(event.variants ?? {})) {
    const variantGroupElement = container.querySelector(`#variant-group-${variantGroupId}`) as HTMLElement;
    if (variantGroupElement && variantEvent) {
      VariantGroupUI.update(variantGroupElement, variantEvent);
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
  orderInfo: "menu-content-order-info",
  orderIcon: "menu-content-order-icon",
  orderDetails: "menu-content-order-details",
  orderName: "menu-content-order-name",
  orderDescription: "menu-content-order-description",
  price: "menu-content-price",
} as const;

// Export for backward compatibility and selector usage in menu-page
export const styles = classes;
export const menuContainer = classes.container;
