/**
 * App Menu Component
 * Material Design 3 navigation drawer with settings and options
 */

import './app-menu.css';
import { html, Template } from '@/lib/template';
import { Context, commonTranslations } from '@/lib/context';
import { 
  getCurrentLanguage, 
  getAvailableLanguages, 
  getLanguageName, 
  getLanguageFlag,
  setCurrentLanguage,
  buildLanguageUrl 
} from '@/lib/language';
import { 
  getCurrentTheme, 
  getThemeName, 
  getThemeIcon,
  setTheme,
  Theme 
} from '@/lib/theme';

export interface AppMenuData {
  isOpen?: boolean;
}

/**
 * App menu template
 */
export function template(context: Context): Template {
  const isOpen = false; // Default state
  const currentLang = getCurrentLanguage();
  const currentTheme = getCurrentTheme();
  const languages = getAvailableLanguages();
  const themes: Theme[] = ['light', 'dark', 'system'];
  
  // Translation functions
  const settingsText = () => commonTranslations.settings(context);
  const languageText = () => commonTranslations.language(context);
  const themeText = () => commonTranslations.theme(context);
  const aboutText = () => commonTranslations.about(context);
  
  return html`
    <div class="${classes.overlay} ${isOpen ? classes.overlayOpen : ''}" data-action="close-menu"></div>
    <div class="${classes.drawer} ${isOpen ? classes.drawerOpen : ''}" data-state="${isOpen ? 'open' : 'closed'}">
      <div class="${classes.header}">
        <h2 class="${classes.title}">${settingsText()}</h2>
        <button class="${classes.closeButton}" data-action="close-menu">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <div class="${classes.content}">
        <!-- Language Section -->
        <div class="${classes.section}">
          <h3 class="${classes.sectionTitle}">
            <span class="material-icons ${classes.sectionIcon}">language</span>
            ${languageText()}
          </h3>
          <div class="${classes.optionGroup}">
            ${languages.map(lang => html`
              <button 
                class="${classes.option} ${lang === currentLang ? classes.optionActive : ''}"
                data-action="select-language"
                data-language="${lang}"
              >
                <span class="${classes.optionIcon}">${getLanguageFlag(lang)}</span>
                <span class="${classes.optionLabel}">${getLanguageName(lang)}</span>
                ${lang === currentLang ? html`
                  <span class="material-icons ${classes.optionCheck}">check</span>
                ` : ''}
              </button>
            `)}
          </div>
        </div>
        
        <!-- Theme Section -->
        <div class="${classes.section}">
          <h3 class="${classes.sectionTitle}">
            <span class="material-icons ${classes.sectionIcon}">palette</span>
            ${themeText()}
          </h3>
          <div class="${classes.optionGroup}">
            ${themes.map(theme => html`
              <button 
                class="${classes.option} ${theme === currentTheme ? classes.optionActive : ''}"
                data-action="select-theme"
                data-theme="${theme}"
              >
                <span class="material-icons ${classes.optionIcon}">${getThemeIcon(theme)}</span>
                <span class="${classes.optionLabel}">${getThemeName(theme, context)}</span>
                ${theme === currentTheme ? html`
                  <span class="material-icons ${classes.optionCheck}">check</span>
                ` : ''}
              </button>
            `)}
          </div>
        </div>
        
        <!-- About Section -->
        <div class="${classes.section}">
          <h3 class="${classes.sectionTitle}">
            <span class="material-icons ${classes.sectionIcon}">info</span>
            ${aboutText()}
          </h3>
          <div class="${classes.about}">
            <p>NRP POS System</p>
            <p class="${classes.version}">Version 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * App Menu Class Names
 */
export const classes = {
  overlay: 'app-menu-overlay',
  overlayOpen: 'app-menu-overlay-open',
  drawer: 'app-menu-drawer',
  drawerOpen: 'app-menu-drawer-open',
  header: 'app-menu-header',
  title: 'app-menu-title',
  closeButton: 'app-menu-close-button',
  content: 'app-menu-content',
  section: 'app-menu-section',
  sectionTitle: 'app-menu-section-title',
  sectionIcon: 'app-menu-section-icon',
  optionGroup: 'app-menu-option-group',
  option: 'app-menu-option',
  optionActive: 'app-menu-option-active',
  optionIcon: 'app-menu-option-icon',
  optionLabel: 'app-menu-option-label',
  optionCheck: 'app-menu-option-check',
  about: 'app-menu-about',
  version: 'app-menu-version'
} as const;

/**
 * Open the app menu
 */
export function open(container: Element): void {
  const overlay = container.querySelector(`.${classes.overlay}`);
  const drawer = container.querySelector(`.${classes.drawer}`);
  
  if (overlay && drawer) {
    overlay.classList.add(classes.overlayOpen);
    drawer.classList.add(classes.drawerOpen);
    drawer.setAttribute('data-state', 'open');
  }
}

/**
 * Close the app menu
 */
export function close(container: Element): void {
  const overlay = container.querySelector(`.${classes.overlay}`);
  const drawer = container.querySelector(`.${classes.drawer}`);
  
  if (overlay && drawer) {
    overlay.classList.remove(classes.overlayOpen);
    drawer.classList.remove(classes.drawerOpen);
    drawer.setAttribute('data-state', 'closed');
  }
}

/**
 * Toggle the app menu
 */
export function toggle(container: Element): void {
  const drawer = container.querySelector(`.${classes.drawer}`);
  const isOpen = drawer?.getAttribute('data-state') === 'open';
  
  if (isOpen) {
    close(container);
  } else {
    open(container);
  }
}

/**
 * Hydrate app menu with event handlers
 */
export function hydrate(container: Element, _context: Context): void {
  // Close menu handlers
  container.querySelectorAll('[data-action="close-menu"]').forEach(element => {
    element.addEventListener('click', () => close(container));
  });
  
  // Language selection
  container.querySelectorAll('[data-action="select-language"]').forEach(element => {
    element.addEventListener('click', (e) => {
      const button = e.currentTarget as HTMLElement;
      const lang = button.getAttribute('data-language');
      if (lang) {
        setCurrentLanguage(lang as any);
        const currentPath = window.location.pathname;
        window.location.href = buildLanguageUrl(currentPath, lang as any);
      }
    });
  });
  
  // Theme selection
  container.querySelectorAll('[data-action="select-theme"]').forEach(element => {
    element.addEventListener('click', (e) => {
      const button = e.currentTarget as HTMLElement;
      const theme = button.getAttribute('data-theme') as Theme;
      if (theme) {
        setTheme(theme);
        // Update active state
        container.querySelectorAll('[data-action="select-theme"]').forEach(btn => {
          btn.classList.remove(classes.optionActive);
          const check = btn.querySelector(`.${classes.optionCheck}`);
          if (check) check.remove();
        });
        button.classList.add(classes.optionActive);
        if (!button.querySelector(`.${classes.optionCheck}`)) {
          button.insertAdjacentHTML('beforeend', 
            `<span class="material-icons ${classes.optionCheck}">check</span>`
          );
        }
      }
    });
  });
}