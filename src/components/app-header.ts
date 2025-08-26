/**
 * App Header Component
 * Material Design 3 Top App Bar with navigation, search, and menu
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import './app-header.css';
import { html, Template } from '@/lib/template';
import { Context, commonTranslations } from '@/lib/context';
import * as AppMenu from './app-menu';

/**
 * Left button configuration
 */
export type LeftButtonType = 'back' | 'home' | 'add' | 'none';

export interface LeftButtonConfig {
  type: LeftButtonType;
  onClick?: () => void;
}

/**
 * Header data interface
 */
export interface HeaderData {
  leftButton?: LeftButtonConfig;
  searchPlaceholder?: string;
}

/**
 * Get icon for left button type
 */
function getLeftButtonIcon(type: LeftButtonType): string {
  switch (type) {
    case 'back': return 'arrow_back';
    case 'home': return 'home';
    case 'add': return 'add_circle_outline';
    default: return '';
  }
}

/**
 * Header template - Material Design 3 Top App Bar
 */
export function template(data: HeaderData = {}, context: Context): Template {
  // Translation functions
  const searchPlaceholder = () => data.searchPlaceholder || commonTranslations.searchMenu(context);
  const leftButton = data.leftButton || { type: 'none' };
  const showLeftButton = leftButton.type !== 'none';
  const leftIcon = getLeftButtonIcon(leftButton.type);
  
  return html`
    <div class="${classes.headerContent}">
      ${showLeftButton ? html`
        <button class="${classes.iconButton} ${classes.leftButton}" data-action="left-button-click">
          <span class="material-icons">${leftIcon}</span>
        </button>
      ` : html`
        <div class="${classes.iconButton} ${classes.leftButton}"></div>
      `}
      
      <div class="${classes.searchContainer}">
        <span class="material-icons ${classes.searchIcon}">search</span>
        <input 
          type="text" 
          class="${classes.searchInput}"
          placeholder="${searchPlaceholder()}"
        />
      </div>
      
      <button class="${classes.iconButton} ${classes.menuButton}" data-action="toggle-app-menu">
        <span class="material-icons">menu</span>
      </button>
    </div>
    
    ${AppMenu.template(context)}
  `;
}

/**
 * App Header Class Names
 */
export const classes = {
  headerContent: 'app-header-content',
  iconButton: 'app-header-icon-button',
  leftButton: 'app-header-left-button',
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
export function hydrate(container: Element, context: Context, data: HeaderData = {}): void {
  // Left button handler
  const leftButton = container.querySelector('[data-action="left-button-click"]');
  if (leftButton && data.leftButton?.onClick) {
    leftButton.addEventListener('click', data.leftButton.onClick);
  }
  
  // App menu toggle
  const menuButton = container.querySelector('[data-action="toggle-app-menu"]');
  if (menuButton) {
    menuButton.addEventListener('click', () => {
      AppMenu.toggle(container);
    });
  }
  
  // Hydrate app menu
  AppMenu.hydrate(container, context);
}