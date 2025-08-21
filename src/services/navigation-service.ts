/**
 * Navigation Service
 * Manages navigation state, business navigation logic, and page state persistence
 */

import { MenuItem } from "@/types";
import { OrderItem } from "@/model/order-model";
import { createStore } from "@/lib/storage";
import { navigate } from "@/lib/router";

export type PageState = Record<string, any>;

/**
 * Navigation Service - handles all navigation logic and state
 */
class NavigationService {
  // Simple stack of menu IDs
  private navStack: ReturnType<typeof createStore<string[]>> | null = null;

  /**
   * Initialize storage (only in browser environment)
   */
  private init(): void {
    if (typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
      if (!this.navStack) {
        this.navStack = createStore<string[]>("nav-stack-v3", "session");
      }
    }
  }

  private getNavStack(): ReturnType<typeof createStore<string[]>> {
    this.init();
    if (!this.navStack) {
      // Return a mock store for non-browser environments
      return {
        get: (defaultValue?: any) => defaultValue ?? [],
        set: () => {},
        replace: () => [],
      } as any;
    }
    return this.navStack;
  }

  /**
   * Get storage key for page state
   */
  private getPageStateKey(menuId: string): string {
    return `page-state-${menuId}`;
  }

  /**
   * Save page state for a specific menu
   */
  savePageState(menuId: string, state: PageState): void {
    if (typeof sessionStorage === "undefined") return;

    if (state) {
      sessionStorage.setItem(this.getPageStateKey(menuId), JSON.stringify(state));
    }
  }

  /**
   * Get saved page state for a specific menu
   */
  getPageState(menuId: string): PageState | null {
    if (typeof sessionStorage === "undefined") return null;

    const stored = sessionStorage.getItem(this.getPageStateKey(menuId));
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Clear page state for a specific menu
   */
  clearPageState(menuId: string): void {
    if (typeof sessionStorage === "undefined") return;

    sessionStorage.removeItem(this.getPageStateKey(menuId));
  }

  /**
   * Truncate the navigation stack to a specific menu
   * Cleans up orphaned page states
   */
  private truncateStack(menuId?: string) {
    const navStack = this.getNavStack();
    let stack = navStack.get([]);

    // Find the menu in the stack
    const idx = menuId ? stack.indexOf(menuId) : -1;
    if (idx !== stack.length - 1) {
      // Get items that will be removed
      const toRemove = stack.slice(idx + 1);

      // Truncate stack
      stack = stack.slice(0, idx + 1);
      navStack.set(stack);

      // Clean up orphaned page states
      toRemove.forEach((id) => {
        this.clearPageState(id);
      });
    }
  }

  /**
   * Get the current menu ID from the top of the stack
   */
  getCurrentMenuId(): string | undefined {
    const stack = this.getNavStack().get([]);
    return stack.length > 0 ? stack[stack.length - 1] : undefined;
  }

  setCurrentPage(menuId: string) {
    this.truncateStack(menuId);
    return this.getPageState(menuId);
  }

  editOrder(orderItem: OrderItem) {
    this.goto.menuItem(orderItem.menuItem, { order: orderItem });
  }

  /**
   * Navigation methods
   */
  goto = {
    /**
     * Navigate to a menu item (for drilling down into submenus)
     */
    menuItem: (item: MenuItem, state?: PageState): void => {
      if (!item.subMenu) {
        console.warn("Attempting to navigate to menu item without submenu:", item);
        return;
      }

      const menuId = item.subMenu.menuId;

      // Add to navigation stack
      const navStack = this.getNavStack();
      const stack = navStack.get([]);
      stack.push(menuId);
      navStack.set(stack);

      if (state) {
        this.savePageState(menuId, state);
      }

      // Navigate using router
      navigate.toMenu(menuId);
    },

    /**
     * Navigate to the order page
     */
    order: (): void => {
      this.truncateStack();
      navigate.toOrder();
    },

    /**
     * Navigate to the home page
     */
    home: (): void => {
      this.truncateStack();
      navigate.toHome();
    },

    /**
     * Navigate back in browser history
     */
    back: (): void => {
      navigate.back();
    },
  };
}

/**
 * Singleton instance
 */
let navigationServiceInstance: NavigationService | null = null;

/**
 * Get the navigation service instance
 */
export function getNavigationService(): NavigationService {
  if (!navigationServiceInstance) {
    navigationServiceInstance = new NavigationService();
  }
  return navigationServiceInstance;
}

/**
 * Type exports
 */
export type { NavigationService };
