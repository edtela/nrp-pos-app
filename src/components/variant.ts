/**
 * Variant Selector Component
 * Segmented button for selecting variants (e.g., sizes)
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import "./variant.css";
import { html, Template, onClick } from "@/lib/html-template";
import { VariantGroup } from "@/types";
import { DataChange } from "@/lib/data-model-types";

/**
 * Event constants
 */
export const VARIANT_SELECT_EVENT = "variant-select";

/**
 * Variant selector template - pure function
 */
export function template(data: VariantGroup): Template {
  return html`
    <div class="${classes.group}" id="variant-group-${data.id}" data-id="${data.id}">
      <span class="${classes.label}">${data.name || "Size"}</span>
      <div class="${classes.buttons}">
        ${data.variants.map(
          (variant) => html`
            <button
              class="${classes.button}"
              data-type="variant"
              data-variant-id="${variant.id}"
              data-variant-group-id="${data.id}"
              data-selected="${variant.id === data.selectedId}"
              ${onClick(VARIANT_SELECT_EVENT)}
            >
              ${variant.name}
            </button>
          `,
        )}
      </div>
    </div>
  `;
}

export function update(variantGroupElement: HTMLElement, variantEvent: DataChange<VariantGroup>) {
  if (variantEvent.selectedId) {
    // Find all variant buttons in this group
    const buttons = variantGroupElement.querySelectorAll('[data-type="variant"]');

    // Update the selected state for each button
    buttons.forEach((button) => {
      const variantId = button.getAttribute("data-variant-id");
      button.setAttribute("data-selected", variantId === variantEvent.selectedId ? "true" : "false");
    });
  }
}

/**
 * CSS class names
 */
export const classes = {
  group: "variant-group",
  label: "variant-label",
  buttons: "variant-buttons",
  button: "variant-button",
} as const;

// Export for backward compatibility
export const styles = classes;
