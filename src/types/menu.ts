/**
 * Menu System Type Definitions
 * 
 * A flexible, recursive menu system supporting infinite customization chains.
 * Single-language design - separate files generated for each language.
 */

import { Cells } from './display';

/**
 * Menu group options
 */
export interface MenuOptions {
  extractIncluded?: boolean;  // If true, this group is a placeholder for included items
}

/**
 * Menu groups allow organizing items into sections with optional headers
 */
export type MenuGroup = ItemGroup | NestedGroup;
export type ItemGroup = { header?: Cells; items: MenuItem[]; options?: MenuOptions };
export type NestedGroup = { header?: Cells; groups: MenuGroup[]; options?: MenuOptions };

/**
 * Menu container that holds menu groups
 */
export interface Menu {
  id: string;
  name: string;
  content: MenuGroup;
  choices?: Record<string, Choice>;  // Choice definitions referenced by items via choiceId
  variants?: Record<string, VariantGroup>;  // Variant definitions referenced by items
  modifierMenu?: boolean;  // If true, requires an OrderItem in the stack to display
}

/**
 * Menu item that can be either a Category (navigation) or SaleItem (purchasable)
 */
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;

  // Pricing - if undefined, this is a Category; if defined, this is a SaleItem
  price?: number | VariantPrice;
  variantGroupId?: string;         // References a Variants definition for variant-based pricing
  selectedVariantId?: string;

  // Constraints
  constraints?: Constraint;        // Item constraints and choice reference

  // Navigation
  subMenu?: {                     // For Categories: submenu to navigate to
    menuId: string;               // For SaleItems: customization menu after "Add to Order"
    included: string[];           // Item IDs that are pre-selected/included for this product
  };
}

/**
 * Choice definition for selection behavior and constraints
 * 
 * Examples:
 * - Radio button (required): min=1, max=1
 * - Radio button (optional): min=0, max=1
 * - Checkbox (pick 2-3): min=2, max=3
 * - Checkbox (unlimited): max=undefined
 */
export interface Choice {
  id: string;
  name?: string;          // Display name for the choice group
  min?: number;          // Minimum items that must be selected (default: 0)
  max?: number;          // Maximum items that can be selected (undefined = unlimited)
}

export type Constraint = { min?: number, max?: number, choice?: { id: string, single: boolean } };

/**
 * Product variant (e.g., size options like mini, standard, large)
 * Each variant can have different pricing
 */
export interface Variant {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Collection of variants with a group ID and default selection
 * Example: yogurt-size variants with mini and standard options
 */
export interface VariantGroup {
  id: string;
  name?: string;              // Display name for the variant group
  variants: Variant[];
  selectedId: string;        // Default selected variant ID
}

/**
 * Variant-based pricing where different variants have different prices
 */
export type VariantPrice = {
  [variantId: string]: number;
};

/**
 * Type guards
 */
export function isItemGroup(group: MenuGroup): group is ItemGroup {
  return 'items' in group;
}

export function isNestedGroup(group: MenuGroup): group is NestedGroup {
  return 'groups' in group;
}

export function isCategory(item: MenuItem): boolean {
  return item.price === undefined;
}

export function isSaleItem(item: MenuItem): boolean {
  return item.price !== undefined;
}

export function isVariantPrice(price?: number | VariantPrice): price is VariantPrice {
  return price != null && typeof price !== 'number';
}

export function hasVariantPricing(item: MenuItem): item is MenuItem & { price: VariantPrice } {
  return typeof item.price === 'object' && item.price !== null;
}

export function hasFixedPricing(item: MenuItem): item is MenuItem & { price: number } {
  return typeof item.price === 'number';
}

export function* iterateGroups(group: MenuGroup): Generator<ItemGroup> {
  if (isItemGroup(group)) {
    yield group;
  } else {
    for (const subGroup of group.groups) {
      yield* iterateGroups(subGroup);
    }
  }
}

export function* iterateItems(group: MenuGroup): Generator<MenuItem> {
  for (const itemGroup of iterateGroups(group)) {
    for (const item of itemGroup.items) {
      yield item;
    }
  }
}