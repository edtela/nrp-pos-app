import { css } from '@linaria/core';
import { html, render, addEventHandler } from '@/lib/html-template';
import { Menu } from '@/types';
import { menuContentTemplate, menuContentUpdate, menuContainer as menuContainerClass } from '@/components/menu-content';
import { mdColors, mdTypography, mdSpacing, mdElevation } from '@/styles/theme';
import { MenuModel, MenuModelEvent } from '@/model/menu-model';
import { VARIANT_SELECT_EVENT, VariantSelectEventData } from '@/components/variant';

// Page container styles using Linaria's recommended approach
const menuPageStyles = css`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${mdColors.background};
  color: ${mdColors.onBackground};
  font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

const headerStyles = css`
  background-color: ${mdColors.surface};
  box-shadow: ${mdElevation.level2};
  padding: ${mdSpacing.md};
`;

const titleStyles = css`
  font-size: ${mdTypography.headlineMedium.fontSize};
  line-height: ${mdTypography.headlineMedium.lineHeight};
  font-weight: ${mdTypography.headlineMedium.fontWeight};
  letter-spacing: ${mdTypography.headlineMedium.letterSpacing};
  margin: 0;
  color: ${mdColors.onSurface};
`;

const contentStyles = css`
  flex: 1;
  padding: ${mdSpacing.lg};
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const loadingStyles = css`
  text-align: center;
  padding: 40px;
  color: ${mdColors.onSurfaceVariant};
`;

const errorStyles = css`
  background-color: ${mdColors.errorContainer};
  color: ${mdColors.onErrorContainer};
  padding: ${mdSpacing.md};
  border-radius: 12px;
  margin-top: ${mdSpacing.lg};
`;

// Function to load menu data based on path
async function loadMenuData(menuFile: string): Promise<Menu | null> {
  try {
    const response = await fetch(`/data/menu/${menuFile}`);
    if (!response.ok) {
      throw new Error(`Failed to load menu: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading menu data:', error);
    return null;
  }
}

// Main menu page template
function menuPageTemplate(menuData: Menu | null, error?: string) {
  return html`
    <div class="${menuPageStyles}">
      <header class="${headerStyles}">
        <h1 class="${titleStyles}">${menuData?.name || 'Menu'}</h1>
      </header>
      <main class="${contentStyles}">
        ${error ? html`
          <div class="${errorStyles}">
            Error: ${error}
          </div>
        ` : ''}
        ${menuData ? menuContentTemplate(menuData) : ''}
      </main>
    </div>
  `;
}

// Export function to render menu page
export async function renderMenuPage(container: Element, menuFile: string = 'index.json') {
  // Initial render with loading state
  render(html`
    <div class="${menuPageStyles}">
      <div class="${loadingStyles}">Loading menu...</div>
    </div>
  `, container);
  
  // Load and render menu data
  const menuData = await loadMenuData(menuFile);
  const error = menuData ? undefined : 'Failed to load menu data';
  
  render(menuPageTemplate(menuData, error), container);

  if (menuData) {
    const menuModel = new MenuModel();
    const event = menuModel.setMenu(menuData);
    menuPageUpdate(event);
    
    // Set up event listeners for custom events
    container.addEventListener('app:menu-item-click', (e: Event) => {
      const customEvent = e as CustomEvent;
      const { target, dataset } = customEvent.detail;
      
      console.log('Menu item clicked:', {
        id: dataset.id,
        type: dataset.type,
        interactionType: dataset.interactionType,
        selected: dataset.selected
      });
      
      // Handle menu item selection/navigation
      if (dataset.interactionType === 'checkbox' || dataset.interactionType === 'radio') {
        // TODO: Update selection state and dispatch model changes
      } else if (dataset.interactionType === 'none') {
        // Navigate to submenu
        // TODO: Implement navigation
      }
    });
    
    // Define the handler function
    function variantSelectHandler({variantId, variantGroupId, selected}: VariantSelectEventData) {
      console.log('Variant selected:', variantId, variantGroupId, selected);
      
      // TODO: Update variant selection in model and trigger price updates
    }
    
    // Add the event handler
    addEventHandler(container, VARIANT_SELECT_EVENT, variantSelectHandler);
  }
}

function menuPageUpdate(event: MenuModelEvent) {
  if (event.menu) {
    // Find the menu container element using the imported class name
    const container = document.querySelector(`.${menuContainerClass}`) as HTMLElement;
    if (container) {
      menuContentUpdate(container, event.menu);
    }
  }
}