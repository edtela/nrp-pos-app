/**
 * Menu Data Service
 * Handles fetching and transforming menu data
 * Separates data concerns from navigation logic
 */

import { Menu } from "@/types";
import { toDisplayMenu } from "@/model/menu-model";
import { OrderPageData } from "@/model/order-model";
import { PageStaticData } from "@/types/page-data";
import { getCurrentLanguage, Language, parseLanguageFromUrl } from "@/lib/language";
import { isOrderPage, parseMenuId } from "@/pages/page-router";

/**
 * Get menu JSON filename from menu ID
 * @param menuId - The menu ID ('index' for root menu)
 */
export function getMenuFileName(menuId: string | null): string {
  if (!menuId || menuId === "menu") {
    return "index.json";
  }
  return `${menuId}.json`;
}

/**
 * Get menu data file path
 * Server handles fallback to default language, so we always include language
 * @param menuId - The menu ID ('index' for root menu)
 * @param language - The language (defaults to current)
 */
export function getMenuDataPath(menuId: string | null, language?: Language): string {
  const fileName = getMenuFileName(menuId);
  const lang = language ?? getCurrentLanguage();

  // Always include language in path - server handles fallback to default language
  return `/data/menu/${lang}/${fileName}`;
}

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
      data: await createEmptyOrderData(),
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
 * Fetch order configuration
 */
export async function fetchOrderConfig(): Promise<{ currency: string; taxRate: number; serviceFee: number }> {
  const response = await fetch('/data/order.json');
  if (!response.ok) {
    // Fallback to default if config doesn't exist
    return { currency: 'ALL', taxRate: 0, serviceFee: 0 };
  }
  return response.json();
}

/**
 * Create empty order page data
 */
export async function createEmptyOrderData(): Promise<OrderPageData> {
  const config = await fetchOrderConfig();
  return {
    order: { itemIds: [], total: 0, currency: config.currency },
    items: {},
    currency: config.currency,
  };
}
