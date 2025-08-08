/**
 * Menu Content Component
 * Container and layout for menu content
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { dataAttr, html, Template, replaceElements } from "@/lib/html-template";
import { ItemGroup, Menu, MenuGroup, NestedGroup, DataCell, MenuItem } from "@/types";
import { headerCells, DataCellRenderer } from "./menu-header";
import * as MenuItemUI from "./menu-item";
import * as VariantGroupUI from "./variant";
import { mdColors, mdSpacing, mdElevation, mdShape, mdTypography } from "@/styles/theme";
import { DisplayMenuItem, isOrderMenuItem, MenuPageData, OrderMenuItem } from "@/model/menu-model";
import { DataChange } from "@/lib/data-model-types";

/**
 * Order item template - displays the current order item
 */
function orderItemTemplate(order: OrderMenuItem | undefined): Template {
  if (!order) return html`<div class="${styles.orderItem}" style="display: none"></div>`;

  return html`
    <div class="${styles.orderItem}">
      <div class="${styles.orderContent}">
        <div class="${styles.orderInfo}">
          ${order.icon ? html`<span class="${styles.orderIcon}">${order.icon}</span>` : ""}
          <div class="${styles.orderDetails}">
            <h3 class="${styles.orderName}">${order.name}</h3>
            ${order.description ? html`<p class="${styles.orderDescription}">${order.description}</p>` : ""}
          </div>
        </div>
        <span class="${styles.price}">$${order.total.toFixed(2)}</span>
      </div>
    </div>
  `;
}

/**
 * DataCell renderer for menu content
 * Handles variant selection and other data-driven cells
 */
function createDataCellRenderer(menu: Menu): DataCellRenderer {
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
function menuGroupTemplate(group: MenuGroup, dataRenderer: DataCellRenderer): Template {
  return html`
    <div class="${styles.group}" ${dataAttr("included", group.options?.extractIncluded)}>
      ${group.header ? headerCells(group.header, dataRenderer) : ""}
      ${"items" in group
        ? html`
            <div class="${styles.groupItems}">
              ${(group as ItemGroup).items.map((itemData) => MenuItemUI.template(itemData as DisplayMenuItem))}
            </div>
          `
        : html` ${(group as NestedGroup).groups.map((nestedGroup) => menuGroupTemplate(nestedGroup, dataRenderer))} `}
    </div>
  `;
}

/**
 * Main template for menu content
 */
export function template(data: Menu & { order?: OrderMenuItem }): Template {
  const dataRenderer = createDataCellRenderer(data);
  return html`
    <div class="${styles.container}">
      ${orderItemTemplate(data.order)} ${menuGroupTemplate(data.content, dataRenderer)}
    </div>
  `;
}

export function init(container: HTMLElement, item: MenuItem | undefined) {
  if (item && isOrderMenuItem(item)) {
    replaceElements(container, `.${styles.orderItem}`, orderItemTemplate(item));
  }

  const subMenu = item?.subMenu;
  if (!subMenu?.included) return;

  // Find the included section
  const includedSection = container.querySelector('[data-included="true"]');
  const includedGroupItems = includedSection?.querySelector(`.${styles.groupItems}`);

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
  const allGroups = container.querySelectorAll(`.${styles.group}`);
  allGroups.forEach((group) => {
    const groupItems = group.querySelector(`:scope > .${styles.groupItems}`);
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
  if (event.order && "price" in event.order) {
    // Update just the price
    const priceElement = container.querySelector(`.${styles.orderItem} .${styles.price}`);
    if (priceElement) {
      priceElement.textContent = `$${event.order.price!.toFixed(2)}`;
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
 * Event handler forwarding
 * Direct assignment for simple event forwarding to child components
 */
export const addVariantHandler = VariantGroupUI.addSelectEventHandler;

/**
 * Menu Content Styles
 */
export const styles = {
  container: css`
    text-align: center;

    .loading {
      padding: 40px;
      text-align: center;
      color: ${mdColors.onSurfaceVariant};
    }
  `,

  group: css`
    margin-bottom: ${mdSpacing.lg};
    text-align: left;
  `,

  groupItems: css`
    background: ${mdColors.surface};
    border-radius: ${mdShape.corner.medium};
    margin-bottom: ${mdSpacing.lg};
    overflow: hidden;
    box-shadow: ${mdElevation.level1};
    width: 100%;
  `,

  orderItem: css`
    background: ${mdColors.surface};
    border-radius: ${mdShape.corner.medium};
    margin-bottom: ${mdSpacing.xl};
    padding: ${mdSpacing.md};
  `,

  orderContent: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${mdSpacing.md};
  `,

  orderInfo: css`
    display: flex;
    align-items: center;
    gap: ${mdSpacing.md};
    flex: 1;
  `,

  orderIcon: css`
    font-size: 32px;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  `,

  orderDetails: css`
    flex: 1;
    text-align: left;
  `,

  orderName: css`
    font-size: ${mdTypography.headlineSmall.fontSize};
    line-height: ${mdTypography.headlineSmall.lineHeight};
    font-weight: ${mdTypography.headlineSmall.fontWeight};
    color: ${mdColors.onSurface};
    margin: 0;
  `,

  orderDescription: css`
    font-size: ${mdTypography.bodyMedium.fontSize};
    line-height: ${mdTypography.bodyMedium.lineHeight};
    color: ${mdColors.onSurfaceVariant};
    margin: 4px 0 0 0;
  `,

  price: css`
    font-size: ${mdTypography.titleMedium.fontSize};
    line-height: ${mdTypography.titleMedium.lineHeight};
    font-weight: ${mdTypography.titleMedium.fontWeight};
    color: ${mdColors.primary};
    flex-shrink: 0;
  `,
} as const;

// Export for selector usage in menu-page
export const menuContainer = styles.container;
