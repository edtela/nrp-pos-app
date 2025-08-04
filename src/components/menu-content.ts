/**
 * Menu Content Component
 * Container and layout for menu content
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { dataAttr, html, Template } from "@/lib/html-template";
import { ItemGroup, Menu, MenuGroup, NestedGroup, SubMenu } from "@/types";
import { headerCells } from "./menu-header";
import * as MenuItemUI from "./menu-item";
import * as VariantGroupUI from "./variant";
import { mdColors, mdSpacing, mdElevation, mdShape } from "@/styles/theme";
import { MenuPageData } from "@/model/menu-model";
import { DataChange } from "@/lib/data-model-types";

/**
 * Template for menu group
 */
function menuGroupTemplate(group: MenuGroup): Template {
  return html`
    <div class="${styles.group}" ${dataAttr("included", group.options?.extractIncluded)}>
      ${group.header ? headerCells(group.header) : ""}
      ${"items" in group
        ? html`
            <div class="${styles.groupItems}">
              ${(group as ItemGroup).items.map((itemData) => MenuItemUI.template(itemData))}
            </div>
          `
        : html` ${(group as NestedGroup).groups.map((nestedGroup) => menuGroupTemplate(nestedGroup))} `}
    </div>
  `;
}

/**
 * Main template for menu content
 */
export function template(data: Menu): Template {
  const variantGroups = data.variants ? Object.values(data.variants) : [];
  return html`
    <div class="${styles.container}">
      ${variantGroups.length ? html`${variantGroups.map((variantData) => VariantGroupUI.template(variantData))}` : ""}
      ${menuGroupTemplate(data.content)}
    </div>
  `;
}

export function init(container: HTMLElement, subMenu: SubMenu) {
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
  allGroups.forEach(group => {
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
} as const;

// Export for selector usage in menu-page
export const menuContainer = styles.container;
