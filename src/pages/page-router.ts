/**
 * Page Router
 * Centralized navigation and routing utilities
 * 
 * Provides a fluent API for navigation without hardcoding paths
 * Example: router.goto.menu("pizzas") instead of window.location.href = "/pizzas"
 */

/**
 * Route definitions - centralized path templates
 */
const ROUTES = {
  home: "/",
  menu: (id: string) => `/${id}`,
  order: "/order",
  checkout: "/checkout",
  admin: "/admin",
} as const;

/**
 * Navigation actions with fluent API
 */
class NavigationBuilder {
  /**
   * Navigate to a menu page
   * @param menuId - The menu ID (without .json extension)
   * @param params - Optional query parameters
   */
  menu(menuId: string, params?: Record<string, string>): void {
    const url = ROUTES.menu(menuId);
    this.navigate(params ? this.addQueryParams(url, params) : url);
  }

  /**
   * Navigate to the home/index menu
   * @param params - Optional query parameters
   */
  home(params?: Record<string, string>): void {
    const url = ROUTES.home;
    this.navigate(params ? this.addQueryParams(url, params) : url);
  }

  /**
   * Navigate to the order page
   */
  order(): void {
    this.navigate(ROUTES.order);
  }

  /**
   * Navigate to the checkout page
   */
  checkout(): void {
    this.navigate(ROUTES.checkout);
  }

  /**
   * Navigate to the admin page
   */
  admin(): void {
    this.navigate(ROUTES.admin);
  }

  /**
   * Navigate back in history
   */
  back(): void {
    window.history.back();
  }

  /**
   * Navigate forward in history
   */
  forward(): void {
    window.history.forward();
  }

  /**
   * Navigate to a custom path
   * @param path - The path to navigate to
   */
  custom(path: string): void {
    this.navigate(path);
  }

  /**
   * Internal navigation method
   */
  private navigate(path: string): void {
    window.location.href = path;
  }

  /**
   * Add query parameters to a URL
   */
  private addQueryParams(url: string, params: Record<string, string>): string {
    const searchParams = new URLSearchParams(params);
    return `${url}?${searchParams.toString()}`;
  }
}

/**
 * URL builder for generating URLs without navigation
 */
class UrlBuilder {
  /**
   * Get URL for a menu page
   * @param menuId - The menu ID (without .json extension)
   */
  menu(menuId: string): string {
    return ROUTES.menu(menuId);
  }

  /**
   * Get URL for the home page
   */
  home(): string {
    return ROUTES.home;
  }

  /**
   * Get URL for the order page
   */
  order(): string {
    return ROUTES.order;
  }

  /**
   * Get URL for the checkout page
   */
  checkout(): string {
    return ROUTES.checkout;
  }

  /**
   * Get URL for the admin page
   */
  admin(): string {
    return ROUTES.admin;
  }
}

/**
 * Router utilities for parsing current location
 */
class RouterUtils {
  /**
   * Get the current menu ID from the URL
   * Returns null if not on a menu page
   */
  getCurrentMenuId(): string | null {
    const path = window.location.pathname;
    if (path === "/" || path === "/index") {
      return "index";
    }
    // Remove leading slash and trailing extensions
    const match = path.match(/^\/([^\/]+?)(?:\.json)?$/);
    return match ? match[1] : null;
  }

  /**
   * Check if currently on a specific page type
   */
  isOnMenuPage(): boolean {
    const path = window.location.pathname;
    return path === "/" || (path.startsWith("/") && !path.startsWith("/order") && !path.startsWith("/checkout") && !path.startsWith("/admin"));
  }

  isOnOrderPage(): boolean {
    return window.location.pathname === ROUTES.order;
  }

  isOnCheckoutPage(): boolean {
    return window.location.pathname === ROUTES.checkout;
  }

  isOnAdminPage(): boolean {
    return window.location.pathname === ROUTES.admin;
  }

  /**
   * Get query parameters as an object
   */
  getQueryParams(): Record<string, string> {
    const params: Record<string, string> = {};
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }
}

/**
 * Main router interface
 */
class Router {
  readonly goto = new NavigationBuilder();
  readonly url = new UrlBuilder();
  readonly utils = new RouterUtils();

  /**
   * Replace current history entry (no back button)
   * @param path - The path to replace with
   */
  replace(path: string): void {
    window.history.replaceState(null, "", path);
  }

  /**
   * Push to history (with back button)
   * @param path - The path to push
   */
  push(path: string): void {
    window.history.pushState(null, "", path);
  }
}

/**
 * Singleton router instance
 */
export const router = new Router();

/**
 * Re-export for convenience
 */
export type { Router };