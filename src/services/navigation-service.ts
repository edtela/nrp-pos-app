/**
 * Navigation Service
 * Manages navigation state, business navigation logic, and page state persistence
 */

import { MenuItem } from "@/types";
import { OrderItem } from "@/model/order-model";
import { createStore } from "@/lib/storage";
import { navigate } from "@/lib/router";

/**
 * Page state that can be saved and restored
 */
export type PageState = {
  variants?: Record<string, string>; // groupId -> selectedId
  selectedItems?: string[]; // IDs of selected items
  quantities?: Record<string, number>; // itemId -> quantity
  scrollPosition?: number; // Scroll position for restoration
};

/**
 * Navigation entry stored with the page state
 * Contains context about how we got to this page
 */
export type NavigationContext = {
  type: "browse" | "modify";
  menuItem?: MenuItem; // The menu item that led to this page
  orderItem?: OrderItem; // For modify mode
};

/**
 * Legacy navigation stack item for backward compatibility
 * Will be removed after menu-page is updated
 */
export type NavStackItem =
  | { type: "browse"; item: MenuItem }
  | { type: "modify"; item: OrderItem };

/**
 * Navigation Service - handles all navigation logic and state
 */
class NavigationService {
  // Simple stack of menu IDs
  private navStack: ReturnType<typeof createStore<string[]>> | null = null;
  
  // Modify context stored separately
  private modifyContext: ReturnType<typeof createStore<OrderItem | null>> | null = null;

  /**
   * Initialize storage (only in browser environment)
   */
  private init(): void {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      if (!this.navStack) {
        this.navStack = createStore<string[]>("nav-stack-v2", "session");
      }
      if (!this.modifyContext) {
        this.modifyContext = createStore<OrderItem | null>("modify-context", "session");
      }
    }
  }

  /**
   * Get the nav stack, initializing if needed
   */
  private getNavStack(): ReturnType<typeof createStore<string[]>> {
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
   * Get storage key for page state
   */
  private getPageStateKey(menuId: string): string {
    return `page-state-${menuId}`;
  }

  /**
   * Get storage key for navigation context
   */
  private getNavigationContextKey(menuId: string): string {
    return `nav-context-${menuId}`;
  }

  /**
   * Save page state for a specific menu
   */
  savePageState(menuId: string, state: PageState): void {
    if (typeof sessionStorage === 'undefined') return;
    
    if (state && Object.keys(state).length > 0) {
      sessionStorage.setItem(
        this.getPageStateKey(menuId),
        JSON.stringify(state)
      );
    }
  }

  /**
   * Get saved page state for a specific menu
   */
  getPageState(menuId: string): PageState | null {
    if (typeof sessionStorage === 'undefined') return null;
    
    const stored = sessionStorage.getItem(this.getPageStateKey(menuId));
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Clear page state for a specific menu
   */
  clearPageState(menuId: string): void {
    if (typeof sessionStorage === 'undefined') return;
    
    sessionStorage.removeItem(this.getPageStateKey(menuId));
    sessionStorage.removeItem(this.getNavigationContextKey(menuId));
  }

  /**
   * Save navigation context for a menu
   */
  private saveNavigationContext(menuId: string, context: NavigationContext): void {
    if (typeof sessionStorage === 'undefined') return;
    
    sessionStorage.setItem(
      this.getNavigationContextKey(menuId),
      JSON.stringify(context)
    );
  }

  /**
   * Get navigation context for a menu
   */
  getNavigationContext(menuId: string): NavigationContext | null {
    if (typeof sessionStorage === 'undefined') return null;
    
    const stored = sessionStorage.getItem(this.getNavigationContextKey(menuId));
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Truncate the navigation stack to a specific menu
   * Cleans up orphaned page states
   */
  truncateStack(menuId: string): NavStackItem | undefined {
    const navStack = this.getNavStack();
    let stack = navStack.get([]);

    // Find the menu in the stack
    const idx = stack.indexOf(menuId);

    if (idx !== -1) {
      if (idx !== stack.length - 1) {
        // Get items that will be removed
        const toRemove = stack.slice(idx + 1);
        
        // Truncate stack
        stack = stack.slice(0, idx + 1);
        navStack.set(stack);
        
        // Clean up orphaned page states
        toRemove.forEach(id => {
          this.clearPageState(id);
        });
      }
      
      // Get the navigation context for this menu to return legacy NavStackItem
      const context = this.getNavigationContext(menuId);
      if (context) {
        if (context.type === "modify" && context.orderItem) {
          return { type: "modify", item: context.orderItem };
        } else if (context.type === "browse" && context.menuItem) {
          return { type: "browse", item: context.menuItem };
        }
      }
      
      return undefined;
    }

    // Menu not found in stack - clear everything
    stack.forEach(id => {
      this.clearPageState(id);
    });
    navStack.set([]);
    
    return undefined;
  }

  /**
   * Get the current menu ID from the top of the stack
   */
  getCurrentMenuId(): string | undefined {
    const stack = this.getNavStack().get([]);
    return stack.length > 0 ? stack[stack.length - 1] : undefined;
  }

  /**
   * Navigation methods
   */
  goto = {
    /**
     * Navigate to a menu item (for drilling down into submenus)
     */
    menuItem: (item: MenuItem): void => {
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

      // Save navigation context for this menu
      this.saveNavigationContext(menuId, {
        type: "browse",
        menuItem: item
      });

      // Navigate using router
      navigate.toMenu(menuId);
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
      const stack = this.getNavStack().get([]);
      stack.forEach(id => {
        this.clearPageState(id);
      });
      this.getNavStack().set([]);
      
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
   */
  modifyOrderItem(orderItem: OrderItem): void {
    const menuItem = orderItem.menuItem;

    // Store the order item in session for the menu page to read
    const modifyStore = this.getModifyContextStore();
    modifyStore.set(orderItem);

    // Clear any existing navigation
    const oldStack = this.getNavStack().get([]);
    oldStack.forEach(id => {
      this.clearPageState(id);
    });

    // Set up new navigation stack with just this menu
    const menuId = menuItem.subMenu?.menuId || "index";
    const navStack = this.getNavStack();
    navStack.set([menuId]);

    // Save navigation context as modify
    this.saveNavigationContext(menuId, {
      type: "modify",
      orderItem: orderItem
    });

    // Navigate to the appropriate menu
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
     * Get the current navigation item (legacy support)
     */
    getCurrentItem: (): NavStackItem | undefined => {
      const menuId = this.getCurrentMenuId();
      if (!menuId) return undefined;
      
      const context = this.getNavigationContext(menuId);
      if (!context) return undefined;
      
      if (context.type === "modify" && context.orderItem) {
        return { type: "modify", item: context.orderItem };
      } else if (context.type === "browse" && context.menuItem) {
        return { type: "browse", item: context.menuItem };
      }
      
      return undefined;
    },

    /**
     * Check if currently in modify mode
     */
    isModifying: (): boolean => {
      const menuId = this.getCurrentMenuId();
      if (!menuId) return false;
      
      const context = this.getNavigationContext(menuId);
      return context?.type === "modify";
    },

    /**
     * Clear the entire navigation stack
     */
    clearStack: (): void => {
      const stack = this.getNavStack().get([]);
      stack.forEach(id => {
        this.clearPageState(id);
      });
      this.getNavStack().set([]);
    },

    /**
     * Get the full navigation stack (just IDs now)
     */
    getStack: (): string[] => {
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