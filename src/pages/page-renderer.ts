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
import { OrderPageData } from "@/model/order-model";
import { PageStaticData, TablesPageData } from "@/types/page-data";
import { render } from "@/lib/template";
import { getCurrentLanguage } from "@/lib/language";
import { createContext, Context, getCurrencyFormat } from "@/lib/context";
import * as MenuPage from "./menu-page";
import * as OrderPage from "./order-page";
import * as TablesPage from "./tables-page";

/**
 * Page Renderer
 * Handles page rendering, hydration, and context creation
 */
class PageRenderer {

  /**
   * Get context for current environment
   * @param data Optional menu or order data to extract currency from
   */
  getContext(data?: Menu | DisplayMenu | OrderPageData | TablesPageData): Context {
    const lang = getCurrentLanguage();

    // Check for currency in the data (not applicable to TablesPageData)
    if (data && 'currency' in data && data.currency) {
      const currencyFormat = getCurrencyFormat(data.currency);
      return createContext(lang, currencyFormat);
    }

    return createContext(lang);
  }

  /**
   * Render a page with static data
   */
  renderPage(container: Element, pageData: PageStaticData): void {
    // Get context with appropriate currency
    const context = this.getContext(pageData.data);

    if (pageData.type === "order") {
      render(OrderPage.template(pageData.data, context), container);
    } else if (pageData.type === "tables") {
      render(TablesPage.template(pageData.data, context), container);
    } else {
      render(MenuPage.template(pageData.data, context), container);
    }
  }

  /**
   * Hydrate a page with event handlers and session data
   */
  hydratePage(container: Element, pageData: PageStaticData): void {
    // Get context with appropriate currency
    const context = this.getContext(pageData.data);

    if (pageData.type === "order") {
      OrderPage.hydrate(container, pageData.data, context);
    } else if (pageData.type === "tables") {
      TablesPage.hydrate(container, pageData.data, context);
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
