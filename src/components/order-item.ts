/**
 * Order Item Component
 * Displays a single order item with modifiers and pricing
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { html, Template, dataAttr, CLICK_EVENT, onClick } from "@/lib/html-template";
import { OrderItem, OrderModifier } from "@/model/order-model";
import { mdColors, mdSpacing, mdTypography, mdShape, mdElevation } from "@/styles/theme";

// Event constants
export const INCREASE_QUANTITY_EVENT = "increase-quantity-event";
export const DECREASE_QUANTITY_EVENT = "decrease-quantity-event";
export const MODIFY_ITEM_EVENT = "modify-item-event";
export const TOGGLE_ITEM_EVENT = "toggle-item-event";

export interface OrderItemData extends OrderItem {
  expanded?: boolean;
  flatMode?: boolean;
}

/**
 * Modification token types
 */
type ModificationTokenType = "removed" | "added-free" | "added-priced";

interface ModificationToken {
  name: string;
  type: ModificationTokenType;
  price?: number;
}

/**
 * Generate modification tokens from modifiers
 */
function generateModificationTokens(modifiers: OrderModifier[]): ModificationToken[] {
  return modifiers.map((modifier) => {
    if (modifier.quantity < 0) {
      return { name: `No ${modifier.name}`, type: "removed" };
    } else {
      // In a real implementation, we'd check if the modifier has a price
      // For now, we'll randomly assign for demo purposes
      const hasPrice = Math.random() > 0.5;
      return {
        name: modifier.name,
        type: hasPrice ? "added-priced" : "added-free",
        price: hasPrice ? 2.0 : undefined,
      };
    }
  });
}

/**
 * Modification token template
 */
function modificationTokenTemplate(token: ModificationToken): Template {
  const className =
    token.type === "removed"
      ? styles.tokenRemoved
      : token.type === "added-priced"
        ? styles.tokenPriced
        : styles.tokenFree;
  const suffix = token.price ? ` (+$${token.price.toFixed(2)})` : "";

  return html`<span class="${styles.token} ${className}">${token.name}${suffix}</span>`;
}

/**
 * Modifier detail template for expanded view
 */
function modifierDetailTemplate(modifier: OrderModifier): Template {
  const isRemoved = modifier.quantity < 0;
  return html`
    <div class="${styles.modifierDetail} ${isRemoved ? styles.modifierRemoved : ""}">
      <span class="${styles.modifierName}">${modifier.name}</span>
      <span class="${styles.modifierQuantity}">×${Math.abs(modifier.quantity)}</span>
    </div>
  `;
}

/**
 * Order item template
 */
export function template(item: OrderItemData): Template {
  const hasModifiers = item.modifiers && item.modifiers.length > 0;
  const tokens = hasModifiers ? generateModificationTokens(item.modifiers) : [];
  const showQuantityInHeader = item.quantity > 1 && !item.expanded;

  const itemClasses = styles.item;

  return html`
    <div class="${itemClasses}" id="order-item-${item.id}" data-expanded="${item.expanded ? 'true' : 'false'}" data-flat-mode="${item.flatMode ? 'true' : 'false'}">
      <div class="${styles.header}" data-item-id="${item.id}" ${onClick(TOGGLE_ITEM_EVENT)}>
        <div class="${styles.info}">
          ${item.menuItem.icon ? html`<span class="${styles.icon}">${item.menuItem.icon}</span>` : ""}
          <div class="${styles.details}">
            <div class="${styles.titleSection}">
              <h3 class="${styles.name}">${item.menuItem.name}</h3>
              <div class="${styles.price}">$${item.total.toFixed(2)}</div>
            </div>
            <div class="${styles.descriptionSection}">
              ${!item.expanded && tokens.length > 0
                ? html`<div class="${styles.tokens}">${tokens.map((token) => modificationTokenTemplate(token))}</div>`
                : item.menuItem.description
                  ? html`<p class="${styles.description}">${item.menuItem.description}</p>`
                  : ""}
              ${showQuantityInHeader
                ? html`<span class="${styles.quantity}">${item.quantity} × $${item.unitPrice.toFixed(2)}</span>`
                : ""}
            </div>
          </div>
        </div>
        <svg
          class="${styles.toggle}"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      <div class="${styles.expandedContent}">
              <div class="${styles.expandedControls}">
                <div class="${styles.tokens}">
                  ${tokens.length > 0
                    ? tokens.map((token) => modificationTokenTemplate(token))
                    : html`<span class="${styles.noModifiers}">No modifications</span>`}
                </div>
                <div class="${styles.quantityControls}">
                  <button class="${styles.quantityBtn}" data-item-id="${item.id}" ${onClick(DECREASE_QUANTITY_EVENT)} ${item.quantity <= 1 ? "disabled" : ""}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <span class="${styles.quantityDisplay}">${item.quantity}</span>
                  <button class="${styles.quantityBtn}" data-item-id="${item.id}" ${onClick(INCREASE_QUANTITY_EVENT)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="${styles.actions}">
                <div class="${styles.actionsLeft}">
                  <button class="${styles.actionBtn} ${styles.actionBtnDestructive}" ${dataAttr(CLICK_EVENT, {items: {[item.id]: []}})}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                    Remove
                  </button>
                </div>
                <div class="${styles.actionsRight}">
                  <button class="${styles.actionBtn} ${styles.actionBtnSecondary}" data-item-id="${item.id}" ${onClick(MODIFY_ITEM_EVENT)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m17 3 4 4-9 9-4 1 1-4 9-9z" />
                      <path d="m15 5 4 4" />
                    </svg>
                    Modify
                  </button>
                </div>
              </div>
            </div>
    </div>
  `;
}

/**
 * Order Item Styles
 */
const styles = {
  item: css`
    background: ${mdColors.surface};
    border-bottom: 1px solid ${mdColors.outlineVariant};
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: ${mdColors.surfaceVariant};
    }

    /* Expanded item styling */
    &[data-expanded="true"] {
      background: ${mdColors.surface} !important;
      border: 1px solid ${mdColors.outlineVariant};
      border-radius: ${mdShape.corner.medium};
      margin: ${mdSpacing.sm} 0;
      box-shadow: ${mdElevation.level2};
    }

    /* Flat mode styling for collapsed items */
    &[data-flat-mode="true"][data-expanded="false"] {
      background: transparent !important;
      border-bottom: none !important;

      &:hover {
        background: transparent !important;
      }
    }
  `,

  header: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: ${mdSpacing.md};
    gap: ${mdSpacing.md};
    cursor: pointer;
    user-select: none;
    transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      background: ${mdColors.surfaceContainer};
    }

    &:active {
      background: ${mdColors.surfaceContainerHigh};
    }
  `,

  info: css`
    display: flex;
    align-items: flex-start;
    gap: ${mdSpacing.md};
    flex: 1;
    min-width: 0;
  `,

  icon: css`
    font-size: 32px;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  `,

  details: css`
    flex: 1;
    text-align: left;
    min-width: 0;
  `,

  titleSection: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  `,

  name: css`
    font-size: ${mdTypography.titleMedium.fontSize};
    line-height: ${mdTypography.titleMedium.lineHeight};
    font-weight: ${mdTypography.titleMedium.fontWeight};
    color: ${mdColors.onSurface};
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,

  price: css`
    font-size: ${mdTypography.titleMedium.fontSize};
    line-height: ${mdTypography.titleMedium.lineHeight};
    font-weight: ${mdTypography.titleMedium.fontWeight};
    color: ${mdColors.primary};
    white-space: nowrap;
    margin-left: ${mdSpacing.md};
  `,

  descriptionSection: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
  `,

  description: css`
    font-size: ${mdTypography.bodyMedium.fontSize};
    line-height: ${mdTypography.bodyMedium.lineHeight};
    color: ${mdColors.onSurfaceVariant};
    margin: 0;
  `,

  quantity: css`
    font-size: ${mdTypography.bodySmall.fontSize};
    line-height: ${mdTypography.bodySmall.lineHeight};
    color: ${mdColors.onSurfaceVariant};
    margin-left: ${mdSpacing.md};
    white-space: nowrap;
  `,

  toggle: css`
    color: ${mdColors.onSurfaceVariant};
    transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    align-self: flex-start;
    margin-top: 2px;

    [data-expanded="true"] & {
      transform: rotate(180deg);
    }
  `,

  tokens: css`
    display: flex;
    flex-wrap: wrap;
    gap: ${mdSpacing.sm};
    align-items: center;
  `,

  token: css`
    font-size: ${mdTypography.bodySmall.fontSize};
    line-height: ${mdTypography.bodySmall.lineHeight};
    display: inline;
  `,

  tokenRemoved: css`
    color: ${mdColors.error};
  `,

  tokenPriced: css`
    color: ${mdColors.primary};
  `,

  tokenFree: css`
    color: ${mdColors.onSurfaceVariant};
  `,

  noModifiers: css`
    font-size: ${mdTypography.bodySmall.fontSize};
    color: ${mdColors.onSurfaceVariant};
    font-style: italic;
  `,

  expandedContent: css`
    background: transparent;
    border-top: none;

    [data-expanded="false"] & {
      display: none;
    }
  `,

  expandedControls: css`
    padding: ${mdSpacing.sm} ${mdSpacing.md};
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${mdSpacing.lg};
  `,

  quantityControls: css`
    display: flex;
    align-items: center;
    gap: ${mdSpacing.sm};
    flex-shrink: 0;
  `,

  quantityBtn: css`
    width: 36px;
    height: 36px;
    border-radius: ${mdShape.corner.full};
    border: none;
    background: transparent;
    color: ${mdColors.onSurfaceVariant};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;

    &:hover {
      background: ${mdColors.surfaceContainerHighest};
    }

    &:hover::before {
      content: "";
      position: absolute;
      inset: 0;
      background-color: ${mdColors.onSurface};
      opacity: 0.08;
      border-radius: inherit;
    }

    &:disabled {
      opacity: 0.38;
      cursor: not-allowed;
    }

    &:disabled:hover {
      background: transparent;
    }

    &:disabled:hover::before {
      display: none;
    }
  `,

  quantityDisplay: css`
    min-width: 32px;
    text-align: center;
    font-size: ${mdTypography.bodyMedium.fontSize};
    color: ${mdColors.onSurface};
  `,

  actions: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${mdSpacing.sm} ${mdSpacing.md};
    background: ${mdColors.surfaceContainer};
    border-top: 1px solid ${mdColors.outlineVariant};
    border-bottom-left-radius: ${mdShape.corner.medium};
    border-bottom-right-radius: ${mdShape.corner.medium};
  `,

  actionsLeft: css`
    display: flex;
    gap: ${mdSpacing.sm};
    align-items: center;
  `,

  actionsRight: css`
    display: flex;
    gap: ${mdSpacing.sm};
    align-items: center;
  `,

  actionBtn: css`
    padding: ${mdSpacing.sm} ${mdSpacing.md};
    border: 1px solid ${mdColors.outline};
    border-radius: ${mdShape.corner.medium};
    background: ${mdColors.surface};
    color: ${mdColors.onSurface};
    cursor: pointer;
    font-size: ${mdTypography.labelMedium.fontSize};
    font-weight: ${mdTypography.labelMedium.fontWeight};
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: ${mdSpacing.xs};
    position: relative;

    &:hover {
      background: ${mdColors.surfaceContainer};
    }

    &:hover::before {
      content: "";
      position: absolute;
      inset: 0;
      background-color: ${mdColors.onSurface};
      opacity: 0.08;
      border-radius: inherit;
    }
  `,

  actionBtnDestructive: css`
    color: ${mdColors.error};
    border-color: ${mdColors.error};

    &:hover::before {
      background-color: ${mdColors.error};
    }
  `,

  actionBtnSecondary: css`
    color: ${mdColors.primary};
    border-color: ${mdColors.primary};

    &:hover::before {
      background-color: ${mdColors.primary};
    }
  `,

  modifierDetail: css`
    display: flex;
    justify-content: space-between;
    font-size: ${mdTypography.bodySmall.fontSize};
    line-height: ${mdTypography.bodySmall.lineHeight};
    color: ${mdColors.onSurfaceVariant};
    padding: 2px 0;
  `,

  modifierRemoved: css`
    text-decoration: line-through;
    color: ${mdColors.onSurfaceVariant};
  `,

  modifierName: css`
    flex: 1;
  `,

  modifierQuantity: css`
    flex-shrink: 0;
    margin-left: ${mdSpacing.sm};
  `,
} as const;
