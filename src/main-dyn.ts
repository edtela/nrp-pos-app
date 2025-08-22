/**
 * Main Entry Point - Dynamic Mode
 * Used for production deployments without SSG
 * Fetches data from JSON, renders HTML, then hydrates
 */

import { initializeApp, getAppElement, getPageRenderer } from "@/app-init";

// Initialize common app features
initializeApp();

// Initialize the dynamic app
async function init() {
  const app = getAppElement();
  const path = window.location.pathname;
  const router = getPageRenderer();
  
  // Dynamic mode - fetch data, render, then hydrate
  const pageData = await router.fetchStaticData(path);
  router.renderPage(app, pageData);
  router.hydratePage(app, pageData);
}

// Start the application
init().catch(console.error);