/**
 * App Initialization
 * Common initialization code shared by all entry points
 */

import { initializeGlobalClickHandler } from "@/lib/html-template";
import { initTheme } from "@/lib/theme";
import { getPageRenderer } from "@/pages/page-renderer";
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