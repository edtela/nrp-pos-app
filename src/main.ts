/**
 * Main Entry Point - SSG Mode
 * Used for statically generated sites where HTML is pre-rendered
 * Only performs hydration of pre-existing HTML
 */

import { initializeApp, getAppElement, getPageRenderer } from "@/app-init";

// Initialize common app features
initializeApp();

// Hydrate the pre-rendered page
async function init() {
  const app = getAppElement();
  const router = getPageRenderer();
  
  // In SSG mode, data is always preloaded
  if (!window.__PRELOADED_DATA__) {
    throw new Error("No preloaded data found. This is a production build that requires SSG.");
  }
  
  // Just hydrate - HTML is already rendered
  router.hydratePage(app, window.__PRELOADED_DATA__);
}

// Start the application
init().catch(console.error);