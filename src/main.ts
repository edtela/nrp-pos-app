import { renderMenuPage } from '@/pages/menu-page';
import { renderOrderPage } from '@/pages/order-page';
import { globals } from '@/styles/theme';
import { initializeGlobalClickHandler } from '@/lib/html-template';
import './styles/global.css';

// Apply global styles
document.documentElement.classList.add(globals);

// Initialize global click handler
initializeGlobalClickHandler();

// Get the root element
const app = document.getElementById('app');

// Extract menu file from URL path (e.g., /breakfast -> breakfast.json)
function getMenuFileFromPath(): string {
  const path = window.location.pathname;
  const menuName = path.slice(1); // Remove leading slash

  // Map common paths to actual files
  if (!menuName || menuName === 'menu') {
    return 'index.json';
  }

  return `${menuName}.json`;
}

// Initialize the app
async function init() {
  if (!app) {
    throw new Error('App root element not found');
  }

  const path = window.location.pathname;
  
  // Route to order page
  if (path === '/order' || path === '/order-empty') {
    const showEmpty = path === '/order-empty';
    await renderOrderPage(app, showEmpty);
    return;
  }

  // Default to menu page
  const menuFile = getMenuFileFromPath();
  await renderMenuPage(app, menuFile);
}

// Start the application
init().catch(console.error);

// Handle navigation (for development)
window.addEventListener('popstate', () => {
  init().catch(console.error);
});