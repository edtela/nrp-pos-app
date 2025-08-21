/**
 * Menu Data Service
 * Handles fetching and transforming menu data
 * Separates data concerns from navigation logic
 */

import { Menu, MenuItem, isVariantPricing } from "@/types";
import { DisplayMenuItem, DisplayMenu } from "@/model/menu-model";
import { OrderPageData } from "@/model/order-model";
import { PageStaticData } from "@/types/page-data";
import { Language, parseLanguageFromUrl } from "@/lib/language";
import { getMenuDataPath, isOrderPage, parseMenuId } from "@/lib/router";

/**
 * Fetch page data based on the path
 * Main entry point for data fetching
 * @param path - The URL path to fetch data for
 */
export async function fetchPageData(path: string): Promise<PageStaticData> {
  // Check if this is the order page
  if (isOrderPage(path)) {
    return {
      type: "order",
      data: createEmptyOrderData()
    };
  }
  
  // Parse language and menu ID from path
  const { language } = parseLanguageFromUrl(path);
  const menuId = parseMenuId(path);
  
  // Fetch and transform menu data
  const rawMenu = await fetchMenuData(menuId, language);
  return {
    type: "menu",
    data: transformToDisplayMenu(rawMenu)
  };
}

/**
 * Fetch raw menu data from server
 * @param menuId - The menu ID ('index' for root menu)
 * @param language - The language to fetch
 */
export async function fetchMenuData(menuId: string | null, language: Language): Promise<Menu> {
  // Get data path - server handles fallback to default language
  const dataPath = getMenuDataPath(menuId, language);
  const response = await fetch(dataPath);
  
  if (!response.ok) {
    throw new Error(`Failed to load menu: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Transform raw menu to display menu
 * @param rawMenu - The raw menu data from server
 */
export function transformToDisplayMenu(rawMenu: Menu): DisplayMenu {
  const mappedItems: Record<string, DisplayMenuItem> = {};
  
  for (const [id, item] of Object.entries(rawMenu.items)) {
    mappedItems[id] = createDisplayMenuItem(item, rawMenu.choices, rawMenu.variants);
  }
  
  return {
    ...rawMenu,
    items: mappedItems
  } as DisplayMenu;
}

/**
 * Create a display menu item from raw menu item
 * @param item - The raw menu item
 * @param choices - Choice definitions for computing isSingleChoice
 * @param variants - Variant groups for computing initial price
 */
export function createDisplayMenuItem(
  item: MenuItem,
  choices?: Record<string, any>,
  variants?: Record<string, any>
): DisplayMenuItem {
  // Compute initial price
  const price = computeItemPrice(item, variants);
  
  // Compute isSingleChoice from choice definition if constraints reference a choice
  let isSingleChoice: boolean | undefined;
  if (item.constraints.choiceId && choices) {
    const choice = choices[item.constraints.choiceId];
    if (choice) {
      isSingleChoice = choice.min === 1 && choice.max === 1;
    }
  }
  
  // Compute isRequired from constraints
  const isRequired = item.constraints.min !== undefined && item.constraints.min >= 1;
  
  return {
    data: item,
    price,
    quantity: 0,
    total: 0,
    isSingleChoice,
    isRequired
  };
}

/**
 * Compute the initial price for a menu item
 * @param item - The menu item
 * @param variants - Variant groups for variant pricing
 */
export function computeItemPrice(item: MenuItem, variants?: Record<string, any>): number {
  if (typeof item.price === 'number') {
    return item.price;
  }
  
  if (isVariantPricing(item.price)) {
    // Use the default selected variant's price
    const variantGroup = variants?.[item.price.groupId];
    if (variantGroup) {
      return item.price.prices[variantGroup.selectedId] ?? 0;
    }
  }
  
  return 0;
}

/**
 * Create empty order page data
 */
export function createEmptyOrderData(): OrderPageData {
  return {
    order: { itemIds: [], total: 0 },
    items: {}
  };
}