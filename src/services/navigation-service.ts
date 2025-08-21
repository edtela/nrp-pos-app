/**
 * Navigation Service
 * Manages navigation state, business navigation logic, and page state persistence
 */

import { MenuItem } from "@/types";
import { OrderItem } from "@/model/order-model";
import { createStore } from "@/lib/storage";
import { navigate } from "@/lib/router";

/**
 * Enhanced navigation entry with page state
 */
export type NavigationEntry = {
  menuId: string;
  type: "browse" | "modify";
  
  // Context data for the navigation
  context: {
    menuItem?: MenuItem;
    orderItem?: OrderItem;
  };
  
  // Page state that should be restored
  pageState?: {
    variants?: Record<string, string>; // groupId -> selectedId
    selectedItems?: string[]; // IDs of selected items
    quantities?: Record<string, number>; // itemId -> quantity
  };
};

/**
 * Legacy navigation stack item for backward compatibility
 * Will be migrated to NavigationEntry
 */
export type NavStackItem =
  | { type: "browse"; item: MenuItem }
  | { type: "modify"; item: OrderItem };

/**
 * Navigation Service - handles all navigation logic and state
 */
class NavigationService {
  private navStack: ReturnType<typeof createStore<NavStackItem[]>> | null = null;
  private pageStates: Map<string, NavigationEntry['pageState']> = new Map();
  private modifyContext: ReturnType<typeof createStore<OrderItem | null>> | null = null;

  /**
   * Initialize storage (only in browser environment)
   */
  private init(): void {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      if (!this.navStack) {
        this.navStack = createStore<NavStackItem[]>("nav-stack-v1", "session");
      }
      if (!this.modifyContext) {
        this.modifyContext = createStore<OrderItem | null>("modify-context", "session");
      }
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
   * Get the modify context store
   */
  private getModifyContextStore(): ReturnType<typeof createStore<OrderItem | null>> {
    this.init();
    if (!this.modifyContext) {
      return {
        get: () => null,
        set: () => {},
        replace: () => null
      } as any;
    }
    return this.modifyContext;
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
        
        // Clear page states for truncated pages
        const truncatedMenuIds = new Set<string>();
        for (let i = idx + 1; i < stack.length; i++) {
          const item = stack[i];
          const menuId = item.type === "browse" 
            ? item.item.subMenu?.menuId 
            : item.item.menuItem.subMenu?.menuId;
          if (menuId) {
            truncatedMenuIds.add(menuId);
          }
        }
        truncatedMenuIds.forEach(id => this.pageStates.delete(id));
      }
      // Return the item at this position
      return stack[idx];
    }

    // Menu not found in stack - clear it (direct navigation)
    navStack.set([]);
    this.pageStates.clear();
    return undefined;
  }

  /**
   * Save the current page state for a menu
   * @param menuId - The menu ID to save state for
   * @param state - The state to save
   */
  savePageState(menuId: string, state: NavigationEntry['pageState']): void {
    if (state && Object.keys(state).length > 0) {
      this.pageStates.set(menuId, state);
    }
  }

  /**
   * Get saved page state for a menu
   * @param menuId - The menu ID to get state for
   * @returns The saved state or undefined
   */
  getPageState(menuId: string): NavigationEntry['pageState'] | undefined {
    return this.pageStates.get(menuId);
  }

  /**
   * Clear all page states (for fresh navigation)
   */
  private clearPageStates(): void {
    this.pageStates.clear();
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

      // Navigate using router
      navigate.toMenu(item.subMenu.menuId);
    },

    /**
     * Navigate to the order page
     */
    order: (): void => {
      navigate.toOrder();
    },

    /**
     * Navigate to the home page
     */
    home: (): void => {
      // Clear navigation context when going home
      this.clearPageStates();
      const navStack = this.getNavStack();
      navStack.set([]);
      
      navigate.toHome();
    },

    /**
     * Navigate back in browser history
     */
    back: (): void => {
      navigate.back();
    },
  };

  /**
   * Business navigation operations
   */
  
  /**
   * Navigate to modify an order item
   * This is a high-level business operation that handles the full flow
   * @param orderItem - The order item to modify
   */
  modifyOrderItem(orderItem: OrderItem): void {
    const menuItem = orderItem.menuItem;

    // Store the order item in session for the menu page to read
    const modifyStore = this.getModifyContextStore();
    modifyStore.set(orderItem);

    // Set up navigation stack for modify mode
    const navStack = this.getNavStack();
    navStack.set([{ type: "modify", item: orderItem }]);

    // Clear page states for fresh modify experience
    this.clearPageStates();

    // Navigate to the appropriate menu
    const menuId = menuItem.subMenu?.menuId || "index";
    navigate.toMenu(menuId);
  }

  /**
   * Get the current order being modified (if any)
   */
  getModifyContext(): OrderItem | null {
    const store = this.getModifyContextStore();
    return store.get(null);
  }

  /**
   * Clear the modify context after it's been used
   */
  clearModifyContext(): void {
    const store = this.getModifyContextStore();
    store.set(null);
  }

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
      this.clearPageStates();
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