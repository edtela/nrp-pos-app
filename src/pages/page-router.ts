/**
 * Route Builder Module
 * Simple, functional approach to building application routes
 * Handles language prefixes and provides type-safe route construction
 */

import { Language, getCurrentLanguage, buildLanguageUrl } from "@/lib/language";

/**
 * Route definitions - centralized route constants
 */
export const ROUTES = {
  HOME: "/",
  ORDER: "/order",
  MENU: (menuId: string) => `/${menuId}`,
} as const;

/**
 * Build a route URL with optional language support
 * @param path - The path to build (e.g., "/order", "/coffee-menu")
 * @param options - Optional configuration
 */
export function buildRoute(
  path: string,
  options?: {
    language?: Language;
    preserveQuery?: boolean;
  },
): string {
  const lang = options?.language ?? getCurrentLanguage();
  const url = buildLanguageUrl(path, lang);

  // Preserve query string if requested
  if (options?.preserveQuery && typeof window !== "undefined") {
    const currentQuery = window.location.search;
    if (currentQuery) {
      return url + currentQuery;
    }
  }

  return url;
}

/**
 * Navigate to a route
 * @param path - The path to navigate to
 * @param options - Navigation options
 */
export function navigateTo(
  path: string,
  options?: {
    language?: Language;
    preserveQuery?: boolean;
    replace?: boolean;
  },
): void {
  const url = buildRoute(path, options);

  if (options?.replace) {
    window.location.replace(url);
  } else {
    window.location.href = url;
  }
}

/**
 * Type-safe route builders for specific routes
 */
export const routes = {
  home: (lang?: Language) => buildRoute(ROUTES.HOME, { language: lang }),
  order: (lang?: Language) => buildRoute(ROUTES.ORDER, { language: lang }),
  menu: (menuId: string, lang?: Language) => buildRoute(ROUTES.MENU(menuId), { language: lang }),
} as const;

/**
 * Type-safe navigation functions
 */
export const navigate = {
  toHome: (options?: { language?: Language; replace?: boolean }) => navigateTo(ROUTES.HOME, options),

  toOrder: (options?: { language?: Language; replace?: boolean }) => navigateTo(ROUTES.ORDER, options),

  toMenu: (menuId: string, options?: { language?: Language; replace?: boolean }) =>
    navigateTo(ROUTES.MENU(menuId), options),

  back: () => window.history.back(),
} as const;

/**
 * Parse menu ID from current path
 * @param path - The path to parse (defaults to current path)
 */
export function parseMenuId(path?: string): string | null {
  const targetPath = path ?? window.location.pathname;

  // Remove language prefix if present
  const cleanPath = targetPath.replace(/^\/(sq|en|it)/, "");

  // Handle root and order specially
  if (cleanPath === "/" || cleanPath === "") {
    return "index"; // Root menu is 'index'
  }

  if (cleanPath === "/order") {
    return null; // Order page has no menu
  }

  // Extract menu ID (everything after the first slash)
  const menuId = cleanPath.slice(1).split("/")[0];
  return menuId || "index";
}

/**
 * Check if a path is the order page
 * @param path - The path to check (defaults to current path)
 */
export function isOrderPage(path?: string): boolean {
  const targetPath = path ?? window.location.pathname;
  const cleanPath = targetPath.replace(/^\/(sq|en|it)/, "");
  return cleanPath === "/order";
}

/**
 * Check if a path is the home page
 * @param path - The path to check (defaults to current path)
 */
export function isHomePage(path?: string): boolean {
  const targetPath = path ?? window.location.pathname;
  const cleanPath = targetPath.replace(/^\/(sq|en|it)/, "");
  return cleanPath === "/" || cleanPath === "";
}
