/**
 * Menu Content Component
 * Container and layout for menu content
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from '@linaria/core';
import { html, Template } from '@/lib/html-template';
import { ItemGroup, Menu, MenuGroup, NestedGroup } from '@/types';
import { headerCells } from './menu-header';
import * as MenuItemUI from './menu-item';
import * as VariantGroupUI from './variant';
import { mdColors, mdSpacing, mdElevation, mdShape } from '@/styles/theme';
import { MenuEvent } from '@/model/menu-model';

/**
 * Template for menu group
 */
function menuGroupTemplate(group: MenuGroup): Template {
  return html`
    <div class="${styles.group}">
      ${group.header ? headerCells(group.header) : ''}
      ${'items' in group ? html`
        <div class="${styles.groupItems}">
          ${(group as ItemGroup).items.map(itemData => MenuItemUI.template(itemData))}
        </div>
      ` : html`
        ${(group as NestedGroup).groups.map(nestedGroup => menuGroupTemplate(nestedGroup))}
      `}
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
      ${variantGroups.length ? html`${variantGroups.map(variantData => VariantGroupUI.template(variantData))}` : ''}
      ${menuGroupTemplate(data.content)}
    </div>
  `;
}

/**
 * Update menu content
 */
export function update(container: HTMLElement, event: MenuEvent) {
  // Iterate through all menu item events
  for (const [itemId, itemEvent] of Object.entries(event)) {
    // Find the menu item element by its ID
    const menuItemElement = container.querySelector(`#menu-item-${itemId}`) as HTMLElement;
    if (menuItemElement) {
      MenuItemUI.update(menuItemElement, itemEvent);
    }
  }
}

/**
 * Event handler forwarding
 * Direct assignment for simple event forwarding to child components
 */
export const addVariantHandler = VariantGroupUI.addSelectEventHandler;
export const addMenuItemHandler = MenuItemUI.addClickEventHandler;

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
  `
} as const;

// Export for selector usage in menu-page
export const menuContainer = styles.container;