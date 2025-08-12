/**
 * Application Router
 * Manages navigation state and provides domain-specific routing
 *
 * Features:
 * - Navigation stack for menu hierarchy traversal
 * - Support for browse and modify modes
 * - Automatic state restoration on page load
 */

import { MenuItem, Menu, mapItems } from "@/types";
import { OrderItem } from "@/model/order-model";
import { DisplayMenu } from "@/model/menu-model";
import { createStore } from "@/lib/storage";
import { PageStaticData } from "@/types/page-data";
import { render } from "@/lib/html-template";
import * as MenuPage from "./menu-page";
import * as OrderPage from "./order-page";

/**
 * Navigation stack item types
 */
export type NavStackItem =
  | { type: "browse"; item: MenuItem } // Normal menu navigation
  | { type: "modify"; item: OrderItem }; // Modifying an existing order item

/**
 * Application-specific router with navigation stack
 */
class AppRouter {
  private navStack: ReturnType<typeof createStore<NavStackItem[]>> | null = null;

  /**
   * Initialize the router (only in browser environment)
   */
  private init(): void {
    if (!this.navStack && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      this.navStack = createStore<NavStackItem[]>("nav-stack-v1", "session");
    }
  }

  /**
   * Get the nav stack, initializing if needed
   */
  private getNavStack(): ReturnType<typeof createStore<NavStackItem[]>> {
    this.init();
    if (!this.navStack) {
      // Return a mock store for non-browser environments
      return {
        get: (defaultValue?: any) => defaultValue ?? [],
        set: () => {},
        replace: () => []
      } as any;
    }
    return this.navStack;
  }

  /**
   * Truncate the navigation stack to a specific menu
   * Used when navigating directly or via browser back/forward
   * @param menuId - The menu ID to truncate to
   * @returns The current navigation item after truncation, or undefined
   */
  truncateStack(menuId: string): NavStackItem | undefined {
    const navStack = this.getNavStack();
    let stack = navStack.get([]);

    // Find the item in stack that matches this menuId
    const idx = stack.findIndex((stackItem) => {
      if (stackItem.type === "browse") {
        return stackItem.item.subMenu?.menuId === menuId;
      } else {
        // For modify items, check the original menu item
        return stackItem.item.menuItem.subMenu?.menuId === menuId;
      }
    });

    if (idx !== -1) {
      if (idx !== stack.length - 1) {
        // Truncate everything after this item
        stack = stack.slice(0, idx + 1);
        navStack.set(stack);
      }
      // Return the item at this position
      return stack[idx];
    }

    // Menu not found in stack - clear it (direct navigation)
    navStack.set([]);
    return undefined;
  }

  /**
   * Navigation methods
   */
  goto = {
    /**
     * Navigate to a menu item (for drilling down into submenus)
     * @param item - The menu item to navigate to
     */
    menuItem: (item: MenuItem): void => {
      if (!item.subMenu) {
        console.warn("Attempting to navigate to menu item without submenu:", item);
        return;
      }

      // Add to navigation stack
      const navStack = this.getNavStack();
      const stack = navStack.get([]);
      stack.push({ type: "browse", item });
      navStack.set(stack);

      // Navigate
      window.location.href = `/${item.subMenu.menuId}`;
    },

    /**
     * Navigate to modify an order item
     * @param orderItem - The order item to modify
     */
    modifyOrderItem: (orderItem: OrderItem): void => {
      const menuItem = orderItem.menuItem;

      // Set up modify context in the stack
      const navStack = this.getNavStack();
      navStack.set([{ type: "modify", item: orderItem }]);

      // Navigate to the menu page where this item came from
      const menuId = menuItem.subMenu?.menuId || "index";
      window.location.href = `/${menuId}`;
    },

    /**
     * Navigate to the order page
     */
    order: (): void => {
      window.location.href = "/order";
    },

    /**
     * Navigate to the home page
     */
    home: (): void => {
      window.location.href = "/";
    },

    /**
     * Navigate back in browser history
     */
    back: (): void => {
      window.history.back();
    },
  };

  /**
   * Context methods for accessing navigation state
   */
  context = {
    /**
     * Get the current navigation item
     * @returns The current item or undefined if stack is empty
     */
    getCurrentItem: (): NavStackItem | undefined => {
      const navStack = this.getNavStack();
      const stack = navStack.get([]);
      return stack.length > 0 ? stack[stack.length - 1] : undefined;
    },

    /**
     * Check if currently in modify mode
     * @returns True if modifying an order item
     */
    isModifying: (): boolean => {
      const current = this.context.getCurrentItem();
      return current?.type === "modify";
    },

    /**
     * Clear the entire navigation stack
     */
    clearStack: (): void => {
      const navStack = this.getNavStack();
      navStack.set([]);
    },

    /**
     * Get the full navigation stack
     * @returns The complete navigation stack
     */
    getStack: (): NavStackItem[] => {
      const navStack = this.getNavStack();
      return navStack.get([]);
    },
  };

  /**
   * Get menu file from URL path
   */
  private getMenuFileFromPath(path: string): string {
    const menuName = path.slice(1); // Remove leading slash
    if (!menuName || menuName === "menu") {
      return "index.json";
    }
    return `${menuName}.json`;
  }

  /**
   * Fetch static data for a page (menu data or empty order)
   */
  async fetchStaticData(path: string): Promise<PageStaticData> {
    if (path === "/order") {
      // Order page returns empty data structure
      return {
        type: "order",
        data: {
          order: { itemIds: [], total: 0 },
          items: {}
        }
      };
    }
    
    // Menu pages fetch menu data
    const menuFile = this.getMenuFileFromPath(path);
    const response = await fetch(`/data/menu/${menuFile}`);
    if (!response.ok) {
      throw new Error(`Failed to load menu: ${response.statusText}`);
    }
    const rawMenu: Menu = await response.json();
    
    const displayMenu: DisplayMenu = {
      ...rawMenu,
      content: mapItems(rawMenu.content, (item) => ({
        data: item,
        quantity: 0,
        total: 0
      }))
    };
    
    return {
      type: "menu",
      data: displayMenu
    };
  }

  /**
   * Render a page with static data
   */
  renderPage(container: Element, pageData: PageStaticData): void {
    if (pageData.type === "order") {
      render(OrderPage.template(pageData.data), container);
    } else {
      render(MenuPage.template(pageData.data), container);
    }
  }

  /**
   * Hydrate a page with event handlers and session data
   */
  hydratePage(container: Element, pageData: PageStaticData): void {
    if (pageData.type === "order") {
      OrderPage.hydrate(container);
    } else {
      MenuPage.hydrate(container, pageData.data);
    }
  }
}

/**
 * Singleton router instance (lazy initialization)
 */
let routerInstance: AppRouter | null = null;

/**
 * Get the router instance, creating it if needed
 * This ensures the router is only created in browser environments
 */
export function getRouter(): AppRouter {
  if (!routerInstance) {
    routerInstance = new AppRouter();
  }
  return routerInstance;
}

/**
 * Export router for backward compatibility (will be removed)
 * @deprecated Use getRouter() instead
 */
export const router = new Proxy({} as AppRouter, {
  get(_target, prop) {
    const instance = getRouter();
    const value = (instance as any)[prop];
    // If it's a function, bind it to the instance to preserve 'this' context
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

/**
 * Type exports for consumers
 */
export type { AppRouter };
