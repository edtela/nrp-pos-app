/**
 * Application Router
 * Manages navigation state and provides domain-specific routing
 *
 * Features:
 * - Navigation stack for menu hierarchy traversal
 * - Support for browse and modify modes
 * - Automatic state restoration on page load
 */

import { Menu } from "@/types";
import { DisplayMenu } from "@/model/menu-model";
import { PageStaticData } from "@/types/page-data";
import { render } from "@/lib/html-template";
import { getCurrentLanguage } from "@/lib/language";
import { createContext, Context, getCurrencyFormat } from "@/lib/context";
import * as MenuPage from "./menu-page";
import * as OrderPage from "./order-page";
import { fetchPageData } from "@/services/menu-data-service";

/**
 * Page Renderer
 * Handles page rendering, hydration, data fetching, and context creation
 */
class PageRenderer {


  /**
   * Fetch static data for a page (menu data or empty order)
   */
  async fetchStaticData(path: string): Promise<PageStaticData> {
    return fetchPageData(path);
  }

  /**
   * Get context for current environment
   * @param menu Optional menu data to extract currency from
   */
  getContext(menu?: Menu | DisplayMenu): Context {
    const lang = getCurrentLanguage();
    
    // If menu has currency, use it; otherwise use language default
    if (menu?.currency) {
      const currencyFormat = getCurrencyFormat(menu.currency);
      return createContext(lang, currencyFormat);
    }
    
    return createContext(lang);
  }

  /**
   * Render a page with static data
   */
  renderPage(container: Element, pageData: PageStaticData): void {
    // Get context with menu currency if it's a menu page
    const context = pageData.type === "menu" 
      ? this.getContext(pageData.data)
      : this.getContext();
    
    if (pageData.type === "order") {
      render(OrderPage.template(pageData.data, context), container);
    } else {
      render(MenuPage.template(pageData.data, context), container);
    }
  }

  /**
   * Hydrate a page with event handlers and session data
   */
  hydratePage(container: Element, pageData: PageStaticData): void {
    // Get context with menu currency if it's a menu page
    const context = pageData.type === "menu" 
      ? this.getContext(pageData.data)
      : this.getContext();
    
    if (pageData.type === "order") {
      OrderPage.hydrate(container, pageData.data, context);
    } else {
      MenuPage.hydrate(container, pageData.data, context);
    }
  }
}

/**
 * Singleton page renderer instance (lazy initialization)
 */
let pageRendererInstance: PageRenderer | null = null;

/**
 * Get the page renderer instance, creating it if needed
 * This ensures the renderer is only created in browser environments
 */
export function getPageRenderer(): PageRenderer {
  if (!pageRendererInstance) {
    pageRendererInstance = new PageRenderer();
  }
  return pageRendererInstance;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getPageRenderer() instead
 */
export const getRouter = getPageRenderer;

/**
 * Type exports for consumers
 */
export type { PageRenderer };
export type AppRouter = PageRenderer; // Backward compatibility alias

// Re-export NavStackItem from NavigationService for backward compatibility
export type { NavStackItem } from "@/services/navigation-service";
