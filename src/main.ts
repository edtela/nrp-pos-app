import { router } from "@/pages/app-router";
import { initializeGlobalClickHandler } from "@/lib/html-template";
import { initTheme } from "@/lib/theme";
import "./styles/theme.css";
import "./styles/global.css";

// Initialize theme system
initTheme();

// Initialize global click handler
initializeGlobalClickHandler();

// Get the root element
const app = document.getElementById("app");

// Initialize the app
async function init() {
  if (!app) {
    throw new Error("App root element not found");
  }

  const path = window.location.pathname;
  
  if (window.__PRELOADED_DATA__) {
    // SSG mode - HTML is already rendered, just hydrate
    router.hydratePage(app, window.__PRELOADED_DATA__);
  } else {
    // Client mode - fetch data, render, then hydrate
    const pageData = await router.fetchStaticData(path);
    router.renderPage(app, pageData);
    router.hydratePage(app, pageData);
  }
}

// Start the application
init().catch(console.error);

// Handle navigation (for development)
window.addEventListener("popstate", async () => {
  if (!app) return;
  
  // Always client-side for navigation
  const path = window.location.pathname;
  const pageData = await router.fetchStaticData(path);
  router.renderPage(app, pageData);
  router.hydratePage(app, pageData);
});
