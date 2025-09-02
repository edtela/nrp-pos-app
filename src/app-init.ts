/**
 * App Initialization
 * Common initialization code shared by all entry points
 */

import { initializeGlobalClickHandler } from "@/lib/events";
import { initTheme } from "@/lib/theme";
import { getPageRenderer } from "@/pages/page-renderer";
import { listen, AppEvents, type NavigateEvent } from "@/lib/dom-events";
import { navigate } from "@/pages/page-router";
import "./styles/theme.css";
import "./styles/global.css";

/**
 * Initialize common app features
 */
export function initializeApp(): void {
  // Initialize theme system
  initTheme();
  
  // Initialize global click handler
  initializeGlobalClickHandler();
  
  // Set up navigation event listener at document body
  listen<NavigateEvent>(document.body, AppEvents.NAVIGATE, (data) => {
    switch (data.to) {
      case "home":
        navigate.toHome();
        break;
      case "menu":
        if (data.menuId) {
          // Handle navigation stack for menu navigation
          if (typeof sessionStorage !== "undefined") {
            const stackStr = sessionStorage.getItem("nav-stack-v3") || "[]";
            const stack = JSON.parse(stackStr);
            stack.push(data.menuId);
            sessionStorage.setItem("nav-stack-v3", JSON.stringify(stack));
            
            // Save page state if provided
            if (data.state) {
              sessionStorage.setItem(`page-state-${data.menuId}`, JSON.stringify(data.state));
            }
          }
          navigate.toMenu(data.menuId);
        }
        break;
      case "order":
        // Clear navigation stack when going to order
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem("nav-stack-v3", "[]");
        }
        navigate.toOrder();
        break;
      case "tables":
        navigate.toTables();
        break;
      case "back":
        navigate.back();
        break;
    }
  });
}

/**
 * Get the app root element with validation
 */
export function getAppElement(): Element {
  const app = document.getElementById("app");
  if (!app) {
    throw new Error("App root element not found");
  }
  return app;
}

/**
 * Export page renderer for convenience
 */
export { getPageRenderer };