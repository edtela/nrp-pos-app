/**
 * Language Configuration and Management
 * Handles language detection, storage, and switching
 */

import { createStore } from "./storage";

export type Language = "en" | "it";

export interface LanguageConfig {
  available: Language[];
  default: Language;
  current: Language;
}

const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  it: "Italiano"
};

const LANGUAGE_FLAGS: Record<Language, string> = {
  en: "🇬🇧",
  it: "🇮🇹"
};

/**
 * Language store for persisting user preference
 */
const languageStore = typeof window !== 'undefined' 
  ? createStore<Language>("language-v1", "local")
  : null;

/**
 * Get available languages from config or defaults
 */
export function getAvailableLanguages(): Language[] {
  // In production, this would come from menu-config.json
  return ["en", "it"];
}

/**
 * Get the default language
 */
export function getDefaultLanguage(): Language {
  return "en";
}

/**
 * Detect user's preferred language
 */
export function detectLanguage(): Language {
  if (typeof window === 'undefined') {
    return getDefaultLanguage();
  }

  // Check stored preference first
  const stored = languageStore?.get();
  if (stored && getAvailableLanguages().includes(stored)) {
    return stored;
  }

  // Check browser language
  const browserLang = navigator.language.toLowerCase();
  const available = getAvailableLanguages();
  
  // Exact match
  if (available.includes(browserLang as Language)) {
    return browserLang as Language;
  }
  
  // Partial match (e.g., "en-US" -> "en")
  const langPrefix = browserLang.split('-')[0] as Language;
  if (available.includes(langPrefix)) {
    return langPrefix;
  }

  return getDefaultLanguage();
}

/**
 * Get current language
 */
export function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') {
    return getDefaultLanguage();
  }
  
  // Check URL path for language
  const path = window.location.pathname;
  const match = path.match(/^\/(en|it)\//);
  if (match) {
    return match[1] as Language;
  }
  
  return detectLanguage();
}

/**
 * Set current language
 */
export function setCurrentLanguage(lang: Language): void {
  if (languageStore) {
    languageStore.set(lang);
  }
}

/**
 * Get language display name
 */
export function getLanguageName(lang: Language): string {
  return LANGUAGE_NAMES[lang] || lang.toUpperCase();
}

/**
 * Get language flag emoji
 */
export function getLanguageFlag(lang: Language): string {
  return LANGUAGE_FLAGS[lang] || "🌐";
}

/**
 * Build URL with language
 */
export function buildLanguageUrl(path: string, lang: Language): string {
  // Remove any existing language prefix
  const cleanPath = path.replace(/^\/(en|it)/, '');
  
  // For default language, don't add prefix
  if (lang === getDefaultLanguage()) {
    return cleanPath || '/';
  }
  
  // Add language prefix for non-default languages
  return `/${lang}${cleanPath || '/'}`;
}

/**
 * Parse language from URL
 */
export function parseLanguageFromUrl(url: string): { language: Language; path: string } {
  const match = url.match(/^\/(en|it)(\/.*)?$/);
  if (match) {
    return {
      language: match[1] as Language,
      path: match[2] || '/'
    };
  }
  
  return {
    language: getDefaultLanguage(),
    path: url
  };
}