/**
 * Menu Item Component
 * Individual menu item with selection states
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from '@linaria/core';
import { html, Template, replaceElements, onClick, addEventHandler } from '@/lib/html-template';
import { MenuItem } from '@/types';
import { mdColors, mdTypography, mdSpacing } from '@/styles/theme';
import { DataChange } from '@/lib/data-model-types';

/**
 * Event constants
 */
export const MENU_ITEM_CLICK_EVENT = 'menu-item-click';

/**
 * Price template - renders the price or navigation chevron
 */
function priceTemplate(price?: number): Template {
  if (typeof price === 'number') {
    return price === 0 ? html`` : html`<span class="${styles.price}">$${price.toFixed(2)}</span>`;
  }
  return html`<span class="${styles.price} material-icons">chevron_right</span>`;
}

/**
 * Menu item template - pure function
 */
export function template(data: MenuItem): Template {
  const iType = data.constraints?.choice?.single ? 'radio' : (data.subMenu ? 'none' : 'checkbox')
  return html`
    <div class="${styles.item}" 
         id="menu-item-${data.id}"
         data-type="menu-item"
         data-id="${data.id}" 
         data-interaction-type="${iType}"
         data-selected="false"
         ${data.price ? `data-price=${JSON.stringify(data.price)}` : ``}         
         ${onClick(MENU_ITEM_CLICK_EVENT)}>
      <div class="${styles.content}">
        <span class="${styles.icon} ${iconClassName}">${data.icon || ''}</span>
        <div class="${styles.text}">
          <span class="${styles.name}">${data.name}</span>
          ${data.description ? html`<p class="${styles.description}">${data.description}</p>` : ''}
        </div>
        ${priceTemplate(data.price)}
      </div>
    </div>
  `;
}

/**
 * Update menu item
 */
export function update(element: HTMLElement, event: DataChange<MenuItem>) {
  // Check if price or selectedVariantId has changed
  if ('price' in event) {
    replaceElements(element, `.${styles.price}`, priceTemplate(event.price));
  }
}

/**
 * Attach click event handler
 * Handles menu item selection events
 */
export function addClickEventHandler(container: HTMLElement, handler: (menuItemId: string) => void): void {
  addEventHandler(container, MENU_ITEM_CLICK_EVENT, (rawData) => {
    handler(rawData.id);
  });
}

// Class name for icon element (needed for style references)
const iconClassName = 'menu-item-icon';

/**
 * Menu Item Styles
 */
export const styles = {
  item: css`
    display: flex;
    align-items: center;
    padding: ${mdSpacing.md};
    background: transparent;
    border-bottom: 1px solid ${mdColors.outlineVariant};
    width: 100%;
    transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    min-height: 80px;
    position: relative;
    text-align: left;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: ${mdColors.surfaceContainer};
    }

    &:active {
      background: ${mdColors.surfaceContainerHighest};
    }

    /* Checkmark for checkbox items */
    &[data-interaction-type="checkbox"][data-selected="true"] .${iconClassName}::after {
      content: 'check';
      font-family: 'Material Icons';
      font-size: 24px;
      color: ${mdColors.primary};
      position: absolute;
      left: 0;
      top: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${mdColors.surface};
      font-weight: 400;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-feature-settings: 'liga';
    }

    /* Radio button selection */
    &[data-interaction-type="radio"] .${iconClassName}::before {
      content: '';
      position: absolute;
      left: 2px;
      top: 2px;
      width: 20px;
      height: 20px;
      border: 2px solid ${mdColors.outline};
      border-radius: 50%;
      background: ${mdColors.surface};
      box-sizing: border-box;
    }

    /* Selected state for radio buttons */
    &[data-interaction-type="radio"][data-selected="true"] .${iconClassName}::before {
      border-color: ${mdColors.primary};
    }

    &[data-interaction-type="radio"][data-selected="true"] .${iconClassName}::after {
      content: '';
      position: absolute;
      left: 8px;
      top: 8px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${mdColors.primary};
    }

    /* Override checkmark for radio button items */
    &[data-interaction-type="radio"] .${iconClassName}::after {
      font-family: inherit;
      content: '';
    }
  `,

  icon: css`
    font-size: 24px;
    line-height: 1;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  `,

  content: css`
    display: flex;
    align-items: center;
    gap: ${mdSpacing.md};
    width: 100%;
  `,

  text: css`
    flex: 1;
    min-width: 0;
    padding-right: 80px; /* Space for price */
  `,

  name: css`
    font-size: ${mdTypography.bodyLarge.fontSize};
    line-height: ${mdTypography.bodyLarge.lineHeight};
    font-weight: 500;
    margin: 0 0 4px 0;
    color: ${mdColors.onSurface};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,

  description: css`
    font-size: ${mdTypography.bodyMedium.fontSize};
    line-height: ${mdTypography.bodyMedium.lineHeight};
    color: ${mdColors.onSurfaceVariant};
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,

  price: css`
    font-size: ${mdTypography.titleMedium.fontSize};
    font-weight: ${mdTypography.titleMedium.fontWeight};
    color: ${mdColors.primary};
    white-space: nowrap;
    position: absolute;
    right: ${mdSpacing.md};
    top: 50%;
    transform: translateY(-50%);

    /* Chevron icon for categories */
    &.material-icons {
      font-family: 'Material Icons';
      font-size: 24px;
      color: ${mdColors.onSurfaceVariant};
      font-weight: 400;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-feature-settings: 'liga';
      line-height: 1;
    }
  `
} as const;