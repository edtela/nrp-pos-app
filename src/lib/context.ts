/**
 * Context System
 * Provides runtime context to components including language and formatting preferences
 */

import { Language } from './language';

/**
 * Currency formatting configuration
 */
export interface CurrencyFormat {
  code: string;        // Currency code (e.g., 'USD', 'EUR', 'ALL')
  symbol: string;      // Currency symbol (e.g., '$', '€', 'L')
  position: 'before' | 'after';  // Symbol position relative to amount
  decimals: number;    // Number of decimal places
  separator: string;   // Decimal separator
  thousands: string;   // Thousands separator
}

/**
 * Runtime context passed to components
 */
export interface Context {
  lang: Language;              // Current language
  currency: CurrencyFormat;    // Currency formatting preferences
  // Additional context fields can be added here as needed
}

/**
 * Default context for when context is not provided
 */
export const DEFAULT_CONTEXT: Context = {
  lang: 'en',
  currency: {
    code: 'USD',
    symbol: '$',
    position: 'before',
    decimals: 2,
    separator: '.',
    thousands: ','
  }
};

/**
 * Default currency formats for different regions
 */
export const CURRENCY_FORMATS: Record<string, CurrencyFormat> = {
  USD: {
    code: 'USD',
    symbol: '$',
    position: 'before',
    decimals: 2,
    separator: '.',
    thousands: ','
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    position: 'after',
    decimals: 2,
    separator: ',',
    thousands: '.'
  },
  ALL: {
    code: 'ALL',
    symbol: 'L',
    position: 'after',
    decimals: 0,
    separator: ',',
    thousands: '.'
  }
};

/**
 * Get currency format from currency code
 * @param code Currency code (e.g., 'USD', 'EUR', 'ALL')
 * @returns Currency format configuration
 */
export function getCurrencyFormat(code: string): CurrencyFormat {
  return CURRENCY_FORMATS[code] || CURRENCY_FORMATS.USD;
}

/**
 * Get currency format for a language
 * Maps languages to their common currency formats
 */
export function getCurrencyFormatForLanguage(lang: Language): CurrencyFormat {
  switch (lang) {
    case 'sq': // Albanian - Albanian Lek
      return CURRENCY_FORMATS.ALL;
    case 'it': // Italian - Euro
      return CURRENCY_FORMATS.EUR;
    case 'en': // English - US Dollar (default)
    default:
      return CURRENCY_FORMATS.USD;
  }
}

/**
 * Format a price according to currency format
 */
export function formatPrice(amount: number, format: CurrencyFormat): string {
  // Format the number with proper decimals
  const formatted = amount.toFixed(format.decimals);
  
  // Split into integer and decimal parts
  const [integer, decimal] = formatted.split('.');
  
  // Add thousands separators
  const integerWithSeparators = integer.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousands);
  
  // Combine parts with proper decimal separator
  const number = decimal !== undefined 
    ? `${integerWithSeparators}${format.separator}${decimal}`
    : integerWithSeparators;
  
  // Add currency symbol
  return format.position === 'before'
    ? `${format.symbol}${number}`
    : `${number}${format.symbol}`;
}

/**
 * Create a context object with defaults
 */
export function createContext(lang: Language, currencyFormat?: CurrencyFormat): Context {
  return {
    lang,
    currency: currencyFormat || getCurrencyFormatForLanguage(lang)
  };
}

/**
 * Common translations type
 * Can be extended by components for their specific translations
 */
export type TranslationKey = string;
export type TranslationFunction = (context?: Context) => string;

/**
 * Helper to create translation functions
 */
export function createTranslation(translations: Record<Language, string>, defaultText?: string): TranslationFunction {
  return (context?: Context) => {
    const lang = context?.lang || 'en';
    return translations[lang] || defaultText || translations['en'] || '';
  };
}

/**
 * Common UI translations used across multiple components
 */
export const commonTranslations = {
  search: createTranslation({
    sq: 'Kërko',
    en: 'Search',
    it: 'Cerca'
  }),
  
  searchMenu: createTranslation({
    sq: 'Kërko në menu',
    en: 'Search Menu',
    it: 'Cerca nel menu'
  }),
  
  back: createTranslation({
    sq: 'Prapa',
    en: 'Back',
    it: 'Indietro'
  }),
  
  menu: createTranslation({
    sq: 'Menu',
    en: 'Menu',
    it: 'Menu'
  }),
  
  settings: createTranslation({
    sq: 'Cilësimet',
    en: 'Settings',
    it: 'Impostazioni'
  }),
  
  language: createTranslation({
    sq: 'Gjuha',
    en: 'Language',
    it: 'Lingua'
  }),
  
  theme: createTranslation({
    sq: 'Tema',
    en: 'Theme',
    it: 'Tema'
  }),
  
  lightTheme: createTranslation({
    sq: 'E ndritshme',
    en: 'Light',
    it: 'Chiaro'
  }),
  
  darkTheme: createTranslation({
    sq: 'E errët',
    en: 'Dark',
    it: 'Scuro'
  }),
  
  systemTheme: createTranslation({
    sq: 'Sistemi',
    en: 'System',
    it: 'Sistema'
  }),
  
  about: createTranslation({
    sq: 'Rreth',
    en: 'About',
    it: 'Informazioni'
  }),
  
  viewOrder: createTranslation({
    sq: 'Shiko porosinë',
    en: 'View Order',
    it: 'Vedi ordine'
  }),
  
  addToOrder: createTranslation({
    sq: 'Shto në porosi',
    en: 'Add to Order',
    it: 'Aggiungi all\'ordine'
  }),
  
  updateOrder: createTranslation({
    sq: 'Përditëso porosinë',
    en: 'Update Order',
    it: 'Aggiorna ordine'
  }),
  
  saveChanges: createTranslation({
    sq: 'Ruaj ndryshimet',
    en: 'Save Changes',
    it: 'Salva modifiche'
  }),
  
  yourOrderIsEmpty: createTranslation({
    sq: 'Porosia juaj është bosh',
    en: 'Your order is empty',
    it: 'Il tuo ordine è vuoto'
  }),
  
  addItemsToGetStarted: createTranslation({
    sq: 'Shtoni disa artikuj të shijshëm për të filluar!',
    en: 'Add some delicious items to get started!',
    it: 'Aggiungi alcuni articoli deliziosi per iniziare!'
  }),
  
  browseMenu: createTranslation({
    sq: 'Shfleto menunë',
    en: 'Browse Menu',
    it: 'Sfoglia il menu'
  }),
  
  items: createTranslation({
    sq: 'artikuj',
    en: 'items',
    it: 'articoli'
  }),
  
  item: createTranslation({
    sq: 'artikull',
    en: 'item',
    it: 'articolo'
  }),
  
  quantity: createTranslation({
    sq: 'Sasia',
    en: 'Quantity',
    it: 'Quantità'
  }),
  
  selected: createTranslation({
    sq: 'Zgjedhur',
    en: 'Selected',
    it: 'Selezionato'
  }),
  
  price: createTranslation({
    sq: 'Çmimi',
    en: 'Price',
    it: 'Prezzo'
  }),
  
  total: createTranslation({
    sq: 'Totali',
    en: 'Total',
    it: 'Totale'
  }),
  
  remove: createTranslation({
    sq: 'Hiq',
    en: 'Remove',
    it: 'Rimuovi'
  }),
  
  edit: createTranslation({
    sq: 'Redakto',
    en: 'Edit',
    it: 'Modifica'
  }),
  
  sendOrder: createTranslation({
    sq: 'Dërgo porosinë',
    en: 'Send Order',
    it: 'Invia ordine'
  })
};

/**
 * Create context-aware utility functions for cleaner usage in components
 * Usage: const { formatPrice, t } = withContext(context);
 * 
 * @param context - The context object containing language and currency settings
 * @returns Object with utility functions bound to the context
 */
export function withContext(context: Context) {
  // Use default context if not provided
  const ctx = context || DEFAULT_CONTEXT;
  
  return {
    // Price formatting bound to context's currency
    formatPrice: (amount: number) => formatPrice(amount, ctx.currency),
    
    // Translation helper bound to context's language
    t: (key: keyof typeof commonTranslations) => commonTranslations[key](ctx),
    
    // Direct access to context values
    lang: ctx.lang,
    currencyCode: ctx.currency.code,
    currencySymbol: ctx.currency.symbol,
    
    // Helper for conditional rendering based on language
    isLanguage: (lang: Language) => ctx.lang === lang,
  };
}