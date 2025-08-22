/**
 * Main Entry Point - Development Mode
 * Used by Vite dev server
 * Includes popstate handling for client-side navigation
 */

import { initializeApp, getAppElement, getPageRenderer } from "@/app-init";
import { fetchPageData } from "@/services/menu-data-service";

// Initialize common app features
initializeApp();

// Get references we'll need
const app = getAppElement();
const router = getPageRenderer();

// Initialize the dev app
async function init() {
  const path = window.location.pathname;
  
  // Dev mode - fetch data, render, then hydrate
  const pageData = await fetchPageData(path);
  router.renderPage(app, pageData);
  router.hydratePage(app, pageData);
}

// Handle browser navigation (back/forward buttons)
window.addEventListener("popstate", async () => {
  const path = window.location.pathname;
  const pageData = await fetchPageData(path);
  router.renderPage(app, pageData);
  router.hydratePage(app, pageData);
});

// Start the application
init().catch(console.error);