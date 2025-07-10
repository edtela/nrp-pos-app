/**
 * Menu Content Component
 * Container and layout for menu content
 */

import { css } from '@linaria/core';
import { html, Template } from '@/lib/html-template';
import { ItemGroup, Menu, MenuGroup, NestedGroup } from '@/types';
import { HeaderCells } from './menu-header';
import { MenuItemTemplate, menuItemUpdate } from './menu-item';
import { VariantGroupTemplate } from './variant';
import { mdColors, mdSpacing, mdElevation, mdShape } from '@/styles/theme';
import { MenuEvent } from '@/model/menu-model';

/**
 * Menu Content Styles
 */
export const menuContainer = css`
  text-align: center;

  .loading {
    padding: 40px;
    text-align: center;
    color: ${mdColors.onSurfaceVariant};
  }
`;

const menuGroup = css`
  margin-bottom: ${mdSpacing.lg};
  text-align: left;
`;

const menuGroupItems = css`
  background: ${mdColors.surface};
  border-radius: ${mdShape.corner.medium};
  margin-bottom: ${mdSpacing.lg};
  overflow: hidden;
  box-shadow: ${mdElevation.level1};
  width: 100%;
`;

/**
 * Template for menu group
 */
function MenuGroupTemplate(group: MenuGroup): Template {
  return html`
    <div class="${menuGroup}">
      ${group.header ? HeaderCells(group.header) : ''}
      ${'items' in group ? html`
        <div class="${menuGroupItems}">
          ${(group as ItemGroup).items.map(itemData => MenuItemTemplate(itemData))}
        </div>
      ` : html`
        ${(group as NestedGroup).groups.map(nestedGroup => MenuGroupTemplate(nestedGroup))}
      `}
    </div>
  `;
}

/**
 * Main template for menu content
 */
export function MenuContentTemplate(data: Menu): Template {
  const variantGroups = data.variants ? Object.values(data.variants) : [];
  return html`
    <div class="${menuContainer}">
      ${variantGroups.length ? html`${variantGroups.map(variantData => VariantGroupTemplate(variantData))}` : ''}
      ${MenuGroupTemplate(data.content)}
    </div>
  `;
}

export function menuContentUpdate(container: HTMLElement, event: MenuEvent) {
  // Iterate through all menu item events
  for (const [itemId, itemEvent] of Object.entries(event)) {
    // Find the menu item element by its ID
    const menuItemElement = container.querySelector(`#menu-item-${itemId}`) as HTMLElement;
    if (menuItemElement) {
      menuItemUpdate(menuItemElement, itemEvent);
    }
  }
}