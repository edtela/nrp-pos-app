/**
 * Menu System Type Definitions
 *
 * Three-layer architecture: Data (items), Semantic (item groups), Presentation (layout).
 * Single-language design - separate files generated for each language.
 */

import { Cells } from "./display.js";
import { Update } from "tsqn";

/**
 * Item group - semantic collection of related menu items
 */
export interface ItemGroup {
  id: string;
  name: string;
  itemIds: string[];
  description?: string;
  icon?: string;
}

/**
 * Menu container with three-layer architecture
 */
export interface Menu<T = MenuItem> {
  id: string;
  name: string;
  currency: string; // Currency code for prices in this menu (e.g., 'USD', 'ALL')

  // Layer 1: Data - all items indexed by ID
  items: Record<string, T>;

  // Layer 2: Semantic - meaningful groupings of items
  itemGroups: Record<string, ItemGroup>;

  // Layer 3: Presentation - layout using Cells (can include DataCell with type="item-group")
  layout: Cells;

  // Supporting definitions
  choices?: Record<string, Choice>; // Choice definitions referenced by items via choiceId
  variants?: Record<string, VariantGroup>; // Variant definitions referenced by items
  modifierMenu?: boolean; // If true, requires an OrderItem in the stack to display
}

//Simplified update statement. Add fields as needed
export interface MenuPreUpdate {
  items?: Record<string, Update<MenuItem>>;
}

// For Categories: submenu to navigate to
// For SaleItems: customization menu after "Add to Order"
// Item IDs that are pre-selected/included for this product
export interface SubMenu {
  menuId: string;
  included: IncludedItem[];
  preUpdate?: MenuPreUpdate[]; // Updates to apply before processing included items
}

export interface IncludedItem {
  itemId: string;
  item?: MenuItem;
  display?: "none" | "included";
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
  // Can be either a fixed price (number) or variant-based pricing (VariantPricing)
  price?: number | VariantPricing;

  // Constraints - always present to avoid serialization issues with tsqn symbols
  constraints: Constraint; // Item constraints and choice reference (default: {})

  // Navigation
  subMenu?: SubMenu;
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
  name?: string; // Display name for the choice group
  min?: number; // Minimum items that must be selected (default: 0)
  max?: number; // Maximum items that can be selected (undefined = unlimited)
}

export type Constraint = { min?: number; max?: number; choiceId?: string };

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
  name?: string; // Display name for the variant group
  variants: Variant[];
  selectedId: string; // Default selected variant ID
}

/**
 * Variant-based pricing where different variants have different prices
 */
export type VariantPrice = {
  [variantId: string]: number;
};

/**
 * Variant pricing configuration including the group reference and prices
 */
export interface VariantPricing {
  groupId: string; // References a VariantGroup definition
  prices: VariantPrice; // Price for each variant ID
}

/**
 * Type guards
 */
export function hasItemGroups(menu: Menu): boolean {
  return menu.itemGroups !== undefined && Object.keys(menu.itemGroups).length > 0;
}

export function hasItems(menu: Menu): boolean {
  return menu.items !== undefined && Object.keys(menu.items).length > 0;
}

export function isCategory(item: MenuItem | undefined): boolean {
  return item != null && !isSaleItem(item);
}

export function isSaleItem(item: MenuItem | undefined): boolean {
  return item?.price !== undefined;
}

export function isVariantPricing(price?: number | VariantPricing): price is VariantPricing {
  return price != null && typeof price === "object" && "groupId" in price && "prices" in price;
}

export function hasVariantPricing(item: MenuItem): item is MenuItem & { price: VariantPricing } {
  return isVariantPricing(item.price);
}

export function hasFixedPricing(item: MenuItem): item is MenuItem & { price: number } {
  return typeof item.price === "number";
}

/**
 * Get all items in an item group
 */
export function getItemsInGroup<T = MenuItem>(menu: Menu<T>, groupId: string): T[] {
  const group = menu.itemGroups[groupId];
  if (!group) return [];

  return group.itemIds.map((id) => menu.items[id]).filter((item) => item !== undefined);
}

/**
 * Iterate all items in the menu
 */
export function* iterateItems<T = MenuItem>(menu: Menu<T>): Generator<T> {
  for (const item of Object.values(menu.items)) {
    yield item;
  }
}

/**
 * Iterate all item groups in the menu
 */
export function* iterateItemGroups(menu: Menu): Generator<ItemGroup> {
  for (const group of Object.values(menu.itemGroups)) {
    yield group;
  }
}

/**
 * Map all items in a menu to a new type
 */
export function mapMenuItems<I, O>(menu: Menu<I>, mapper: (item: I) => O): Menu<O> {
  const mappedItems: Record<string, O> = {};

  for (const [id, item] of Object.entries(menu.items)) {
    mappedItems[id] = mapper(item);
  }

  return {
    ...menu,
    items: mappedItems,
  };
}

/**
 * Add an item to a group
 */
export function addItemToGroup(menu: Menu, groupId: string, itemId: string): void {
  const group = menu.itemGroups[groupId];
  if (group && !group.itemIds.includes(itemId)) {
    group.itemIds.push(itemId);
  }
}

/**
 * Remove an item from a group
 */
export function removeItemFromGroup(menu: Menu, groupId: string, itemId: string): void {
  const group = menu.itemGroups[groupId];
  if (group) {
    group.itemIds = group.itemIds.filter((id) => id !== itemId);
  }
}
