/**
 * Variant Selector Component
 * Segmented button for selecting variants (e.g., sizes)
 */

import { css } from '@linaria/core';
import { html, Template } from '@/lib/html-template';
import { VariantGroup } from '@/types';
import { mdColors, mdTypography, mdSpacing } from '@/styles/theme';

/**
 * Variant Selector Styles
 */
const variantGroup = css`
  display: flex;
  gap: 0;
  border: 1px solid ${mdColors.outline};
  border-radius: 9999px;
  overflow: hidden;
  width: fit-content;
  margin: 0 auto ${mdSpacing.md} auto;
`;

const variantGroupLabel = css`
  display: none; /* Label not shown in ARP design */
`;

const variantGroupButtons = css`
  display: contents;
`;

const variantButton = css`
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
`;

/**
 * Variant selector template - pure function
 */
export function variantGroupTemplate(data: VariantGroup): Template {
  return html`
    <div class="${variantGroup}" id="variant-group-${data.id}" data-id="${data.id}">
      <span class="${variantGroupLabel}">${data.name || 'Size'}</span>
      <div class="${variantGroupButtons}">
        ${data.variants.map((variant) => html`
          <button 
            class="${variantButton}"
            data-type="variant"
            data-variant-id="${variant.id}"
            data-variant-group-id="${data.id}"
            data-selected="${variant.id === data.selectedId}"
          >
          ${variant.name}
          </button>
      `)}
      </div>
    </div>
  `;
}