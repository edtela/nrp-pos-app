/**
 * Menu Data Service
 * Handles fetching and transforming menu data
 * Separates data concerns from navigation logic
 */

import { Menu } from "@/types";
import { toDisplayMenu } from "@/model/menu-model";
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
      data: createEmptyOrderData(),
    };
  }

  // Parse language and menu ID from path
  const { language } = parseLanguageFromUrl(path);
  const menuId = parseMenuId(path);

  // Fetch and transform menu data
  const rawMenu = await fetchMenuData(menuId, language);
  return {
    type: "menu",
    data: toDisplayMenu(rawMenu),
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
 * Create empty order page data
 */
export function createEmptyOrderData(): OrderPageData {
  return {
    order: { itemIds: [], total: 0 },
    items: {},
  };
}
