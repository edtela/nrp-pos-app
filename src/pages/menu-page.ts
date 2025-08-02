/**
 * Menu Page
 * Main page component for displaying menu data
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { html, render } from "@/lib/html-template";
import { Menu, MenuItem } from "@/types";
import * as MenuContentUI from "@/components/menu-content";
import { mdColors, mdTypography, mdSpacing, mdElevation } from "@/styles/theme";
import { MenuPageData, MenuModel } from "@/model/menu-model";
import { DataChange, WHERE } from "@/lib/data-model-types";
import { createStore } from "@/lib/storage";

type BreadCrumb = NonNullable<MenuItem["subMenu"]>;
const crumbsStore = createStore<BreadCrumb[]>("crumbs-v1", "session");

const menuModel = new MenuModel();

// HANDLERS
function variantSelectHandler(groupId: string, selectedId: string) {
  update(menuModel.update({ variants: { [groupId]: { selectedId } } }));
}

// Function to load menu data based on path
async function loadMenuData(menuFile: string): Promise<Menu | null> {
  try {
    const response = await fetch(`/data/menu/${menuFile}`);
    if (!response.ok) {
      throw new Error(`Failed to load menu: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading menu data:", error);
    return null;
  }
}

// Export function to render menu page
export async function renderMenuPage(container: Element, menuFile: string = "index.json") {
  // Initial render with loading state
  render(
    html`
      <div class="${styles.menuPage}">
        <div class="${styles.loading}">Loading menu...</div>
      </div>
    `,
    container,
  );

  // Load and render menu data
  const menuData = await loadMenuData(menuFile);
  const error = menuData ? undefined : "Failed to load menu data";

  render(template(menuData, error), container);

  if (menuData) {
    const changes = menuModel.setMenu(menuData);
    update(changes);

    let crumbs = crumbsStore.get([]);
    const idx = crumbs.findIndex((crumb) => `${crumb.menuId}.json` === menuFile);
    if (idx != crumbs.length - 1) {
      crumbs = crumbs.slice(0, idx + 1);
      crumbsStore.set(crumbs);
    }
    const crumb = crumbs[crumbs.length - 1];
    if (crumb) {
      const stmt = crumb.included.reduce((u, key) => {
        u[key] = { [WHERE]: (item: any) => item != null, selected: true };
        return u;
      }, {} as any);
      update(menuModel.update({ menu: stmt }));
    }

    // Attach event handlers to the menuPage element (automatically cleaned up on re-render)
    const menuPageElement = container.querySelector(`.${styles.menuPage}`) as HTMLElement;
    if (menuPageElement) {
      MenuContentUI.addVariantHandler(menuPageElement, variantSelectHandler);

      menuPageElement.addEventListener("app:state-update", (e: Event) => {
        const customEvent = e as CustomEvent;
        const change = menuModel.update(customEvent.detail);
        update(change);
      });
    }
  }
}

function template(menuData: Menu | null, error?: string) {
  return html`
    <div class="${styles.menuPage}">
      <header class="${styles.header}">
        <h1 class="${styles.title}">${menuData?.name || "Menu"}</h1>
      </header>
      <main class="${styles.content}">
        ${error ? html` <div class="${styles.error}">Error: ${error}</div> ` : ""}
        ${menuData ? MenuContentUI.template(menuData) : ""}
      </main>
    </div>
  `;
}

function update(event: DataChange<MenuPageData> | undefined) {
  if (!event) return;

  if (event.activeMenu && event.activeMenu.menuId) {
    const activeMenu = event.activeMenu;
    crumbsStore.replace((crumbs) => {
      return crumbs == null ? [activeMenu] : [...crumbs, activeMenu];
    });

    window.location.href = `/${event.activeMenu.menuId}`;
  }

  const container = document.querySelector(`.${MenuContentUI.menuContainer}`) as HTMLElement;
  if (container) {
    MenuContentUI.update(container, event);
  }
}

const styles = {
  menuPage: css`
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: ${mdColors.background};
    color: ${mdColors.onBackground};
    font-family:
      "Roboto",
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  `,

  header: css`
    background-color: ${mdColors.surface};
    box-shadow: ${mdElevation.level2};
    padding: ${mdSpacing.md};
  `,

  title: css`
    font-size: ${mdTypography.headlineMedium.fontSize};
    line-height: ${mdTypography.headlineMedium.lineHeight};
    font-weight: ${mdTypography.headlineMedium.fontWeight};
    letter-spacing: ${mdTypography.headlineMedium.letterSpacing};
    margin: 0;
    color: ${mdColors.onSurface};
  `,

  content: css`
    flex: 1;
    padding: ${mdSpacing.lg};
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  `,

  loading: css`
    text-align: center;
    padding: 40px;
    color: ${mdColors.onSurfaceVariant};
  `,

  error: css`
    background-color: ${mdColors.errorContainer};
    color: ${mdColors.onErrorContainer};
    padding: ${mdSpacing.md};
    border-radius: 12px;
    margin-top: ${mdSpacing.lg};
  `,
} as const;
