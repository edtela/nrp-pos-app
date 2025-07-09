/**
 * Menu Item Component
 * Individual menu item with selection states
 */

import { css } from '@linaria/core';
import { html, Template } from '@/lib/html-template';
import { MenuItem } from '@/types';
import { mdColors, mdTypography, mdSpacing } from '@/styles/theme';

const menuItemIcon = css`
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

/**
 * Menu Item Styles
 */
const menuItem = css`
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
  &[data-interaction-type="checkbox"][data-selected="true"] .${menuItemIcon}::after {
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
  &[data-interaction-type="radio"] .${menuItemIcon}::before {
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
  &[data-interaction-type="radio"][data-selected="true"] .${menuItemIcon}::before {
    border-color: ${mdColors.primary};
  }

  &[data-interaction-type="radio"][data-selected="true"] .${menuItemIcon}::after {
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
  &[data-interaction-type="radio"] .${menuItemIcon}::after {
    font-family: inherit;
    content: '';
  }
`;

const menuItemContent = css`
  display: flex;
  align-items: center;
  gap: ${mdSpacing.md};
  width: 100%;
`;

const menuItemText = css`
  flex: 1;
  min-width: 0;
  padding-right: 80px; /* Space for price */
`;

const menuItemName = css`
  font-size: ${mdTypography.bodyLarge.fontSize};
  line-height: ${mdTypography.bodyLarge.lineHeight};
  font-weight: 500;
  margin: 0 0 4px 0;
  color: ${mdColors.onSurface};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const menuItemDescription = css`
  font-size: ${mdTypography.bodyMedium.fontSize};
  line-height: ${mdTypography.bodyMedium.lineHeight};
  color: ${mdColors.onSurfaceVariant};
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const menuItemPrice = css`
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
`;

/**
 * Menu item template - pure function
 */
export function MenuItemTemplate(data: MenuItem): Template {
  const iType = data.constraints?.choice?.single ? 'radio' : (data.subMenu ? 'none' : 'checkbox')
  return html`
    <div class="${menuItem}" 
         id="menu-item__${data.id}"
         data-id="${data.id}" 
         data-type="menu-item"
         data-interaction-type="${iType}"
         data-selected="false">
      <div class="${menuItemContent}">
        <span class="${menuItemIcon}">${data.icon || ''}</span>
        <div class="${menuItemText}">
          <span class="${menuItemName}">${data.name}</span>
          ${data.description ? html`<p class="${menuItemDescription}">${data.description}</p>` : ''}
        </div>
        ${typeof data.price === 'number' ?
      (data.price === 0 ? '' : html`<span class="${menuItemPrice}">$${data.price.toFixed(2)}</span>`) :
      html`<span class="${menuItemPrice} material-icons">chevron_right</span>`}
      </div>
    </div>
  `;
}