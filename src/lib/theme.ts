/**
 * Theme Configuration and Management
 * Handles theme detection, storage, and switching
 */

import { createStore } from "./storage";

export type Theme = "light" | "dark" | "system";

/**
 * Theme store for persisting user preference
 */
const themeStore = typeof window !== 'undefined' 
  ? createStore<Theme>("theme-v1", "local")
  : null;

/**
 * Get system theme preference
 */
export function getSystemTheme(): "light" | "dark" {
  if (typeof window === 'undefined') {
    return "light";
  }
  
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches 
    ? "dark" 
    : "light";
}

/**
 * Get current theme setting
 */
export function getCurrentTheme(): Theme {
  if (typeof window === 'undefined') {
    return "system";
  }
  
  return themeStore?.get("system") || "system";
}

/**
 * Get active theme (resolved theme after system detection)
 */
export function getActiveTheme(): "light" | "dark" {
  const theme = getCurrentTheme();
  return theme === "system" ? getSystemTheme() : theme;
}

/**
 * Set theme preference
 */
export function setTheme(theme: Theme): void {
  if (themeStore) {
    themeStore.set(theme);
  }
  applyTheme(theme);
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  const activeTheme = theme === "system" ? getSystemTheme() : theme;
  
  // Set data attribute for CSS
  document.documentElement.setAttribute('data-theme', activeTheme);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', 
      activeTheme === 'dark' ? '#1c1b1f' : '#fef7ff'
    );
  }
}

/**
 * Initialize theme system
 */
export function initTheme(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Apply stored theme or system preference
  const theme = getCurrentTheme();
  applyTheme(theme);
  
  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (getCurrentTheme() === 'system') {
        applyTheme('system');
      }
    });
  }
}

/**
 * Get theme display name
 */
export function getThemeName(theme: Theme): string {
  const names: Record<Theme, string> = {
    light: "Light",
    dark: "Dark",
    system: "System"
  };
  return names[theme] || theme;
}

/**
 * Get theme icon
 */
export function getThemeIcon(theme: Theme): string {
  const icons: Record<Theme, string> = {
    light: "light_mode",
    dark: "dark_mode",
    system: "brightness_auto"
  };
  return icons[theme] || "brightness_auto";
}