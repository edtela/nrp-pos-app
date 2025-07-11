/**
 * Variant Selector Component
 * Segmented button for selecting variants (e.g., sizes)
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from '@linaria/core';
import { html, Template, onClick, addEventHandler } from '@/lib/html-template';
import { VariantGroup } from '@/types';
import { mdColors, mdTypography, mdSpacing } from '@/styles/theme';

/**
 * Event constants
 */
export const VARIANT_SELECT_EVENT = 'variant-select';

/**
 * Event data interface
 */
export interface ClickEventData {
  variantGroupId: string;
  variantId: string;
  selected: boolean;
}

/**
 * Variant selector template - pure function
 */
export function template(data: VariantGroup): Template {
  return html`
    <div class="${styles.group}" id="variant-group-${data.id}" data-id="${data.id}">
      <span class="${styles.label}">${data.name || 'Size'}</span>
      <div class="${styles.buttons}">
        ${data.variants.map((variant) => html`
          <button 
            class="${styles.button}"
            data-type="variant"
            data-variant-id="${variant.id}"
            data-variant-group-id="${data.id}"
            data-selected="${variant.id === data.selectedId}"
            ${onClick(VARIANT_SELECT_EVENT)}
          >
          ${variant.name}
          </button>
      `)}
      </div>
    </div>
  `;
}

/**
 * Attach event handler with data transformation
 */
export function attach(container: HTMLElement, handler: (data: ClickEventData) => void): void {
  addEventHandler(container, VARIANT_SELECT_EVENT, (rawData) => {
    const data: ClickEventData = {
      variantGroupId: rawData.variantGroupId,
      variantId: rawData.variantId,
      selected: rawData.selected === 'true'
    };
    handler(data);
  });
}

/**
 * Variant Selector Styles
 */
export const styles = {
  group: css`
    display: flex;
    gap: 0;
    border: 1px solid ${mdColors.outline};
    border-radius: 9999px;
    overflow: hidden;
    width: fit-content;
    margin: 0 auto ${mdSpacing.md} auto;
  `,

  label: css`
    display: none; /* Label not shown in ARP design */
  `,

  buttons: css`
    display: contents;
  `,

  button: css`
    min-width: 100px;
    max-width: 150px;
    padding: 0 ${mdSpacing.lg};
    border: none;
    background: transparent;
    font-size: ${mdTypography.labelLarge.fontSize};
    line-height: 40px;
    font-weight: ${mdTypography.labelLarge.fontWeight};
    letter-spacing: ${mdTypography.labelLarge.letterSpacing};
    height: 40px;
    color: ${mdColors.onSurface};
    cursor: pointer;
    transition: background-color 200ms ease;

    &:not(:last-child) {
      border-right: 1px solid ${mdColors.outline};
    }

    &[data-selected="true"] {
      background: ${mdColors.secondaryContainer};
      color: ${mdColors.onSecondaryContainer};
      font-weight: 500;
    }

    &:hover:not([data-selected="true"]) {
      background: ${mdColors.surfaceContainer};
    }
  `
} as const;