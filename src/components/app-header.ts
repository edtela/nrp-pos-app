/**
 * App Header Component
 * Material Design 3 Top App Bar with navigation, search, and menu
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import './app-header.css';
import { html, Template } from '@/lib/html-template';
import * as AppMenu from './app-menu';

/**
 * Header data interface
 */
export interface HeaderData {
  showBack?: boolean;
  searchPlaceholder?: string;
}

/**
 * Header template - Material Design 3 Top App Bar
 */
export function template(data: HeaderData = {}): Template {
  const { searchPlaceholder = "Search Menu" } = data;
  
  return html`
    <div class="${classes.headerContent}">
      <button class="${classes.iconButton} ${classes.backButton}">
        <span class="material-icons">arrow_back</span>
      </button>
      
      <div class="${classes.searchContainer}">
        <span class="material-icons ${classes.searchIcon}">search</span>
        <input 
          type="text" 
          class="${classes.searchInput}"
          placeholder="${searchPlaceholder}"
        />
      </div>
      
      <button class="${classes.iconButton} ${classes.menuButton}" data-action="toggle-app-menu">
        <span class="material-icons">menu</span>
      </button>
    </div>
    
    ${AppMenu.template()}
  `;
}

/**
 * App Header Class Names
 */
export const classes = {
  headerContent: 'app-header-content',
  iconButton: 'app-header-icon-button',
  backButton: 'app-header-back-button',
  menuButton: 'app-header-menu-button',
  searchContainer: 'app-header-search-container',
  searchIcon: 'app-header-search-icon',
  searchInput: 'app-header-search-input'
} as const;

// Export as styles for backward compatibility
export const styles = classes;

/**
 * Hydrate header with app menu functionality
 */
export function hydrate(container: Element): void {
  // App menu toggle
  const menuButton = container.querySelector('[data-action="toggle-app-menu"]');
  if (menuButton) {
    menuButton.addEventListener('click', () => {
      AppMenu.toggle(container);
    });
  }
  
  // Hydrate app menu
  AppMenu.hydrate(container);
}