/**
 * Menu Page
 * Main page component for displaying menu data
 *
 * @see /component-guidelines.md for component patterns and conventions
 */

import { css } from "@linaria/core";
import { html, render } from "@/lib/html-template";
import { Menu, SubMenu } from "@/types";
import * as MenuContentUI from "@/components/menu-content";
import * as AppHeader from "@/components/app-header";
import * as AppBottomBar from "@/components/app-bottom-bar";
import { styles as layoutStyles } from "@/components/app-layout";
import { mdColors, mdSpacing } from "@/styles/theme";
import { MenuPageData, MenuModel } from "@/model/menu-model";
import { DataChange, WHERE } from "@/lib/data-model-types";
import { createStore } from "@/lib/storage";

type BreadCrumb = NonNullable<SubMenu>;
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
      <div class="${layoutStyles.pageContainer}">
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
    const subMenu = crumbs[crumbs.length - 1];
    if (subMenu) {
      const stmt = subMenu.included.reduce((u, key) => {
        u[key.itemId] = { [WHERE]: (item: any) => item != null, selected: true };
        return u;
      }, {} as any);
      update(menuModel.update({ menu: stmt }));
    }

    // Attach event handlers to the pageContainer element (automatically cleaned up on re-render)
    const menuPageElement = container.querySelector(`.${layoutStyles.pageContainer}`) as HTMLElement;
    if (menuPageElement) {
      if (subMenu) {
        MenuContentUI.init(menuPageElement, subMenu);
      }

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
    <div class="${layoutStyles.pageContainer}">
      <header class="${layoutStyles.header}">
        ${AppHeader.template()}
      </header>
      <main class="${layoutStyles.content}">
        ${error ? html` <div class="${styles.error}">Error: ${error}</div> ` : ""}
        ${menuData ? MenuContentUI.template(menuData) : ""}
      </main>
      <div class="${layoutStyles.bottomBar}">
        ${AppBottomBar.template()}
      </div>
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
