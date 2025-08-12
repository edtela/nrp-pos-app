/**
 * Localized Menu System Type Definitions
 * 
 * Extends the base menu types to support multi-language content.
 * Source files use these types, which are then compiled to single-language versions.
 */

import { Cells, Cell, TextCell, ImageCell, DataCell, LayoutCell, Styled } from "./display";
import { 
  MenuOptions, 
  SubMenu, 
  Constraint, 
  VariantPrice 
} from "./menu";

/**
 * Multi-language string type
 * Can be a plain string (for IDs, technical values) or localized object
 */
export type Words = string | LocalizedString;

export interface LocalizedString {
  en: string;
  it: string;
  [lang: string]: string; // Allow additional languages
}

/**
 * Supported languages
 */
export type Language = "en" | "it";

/**
 * Localized display cells
 */
export interface LocalizedTextCell extends Styled {
  text: Words;
}

export interface LocalizedImageCell extends Styled {
  src: string;
  alt?: Words;
}

export interface LocalizedDataCell extends Styled {
  type: string;
  data?: unknown;
}

export interface LocalizedLayoutCell extends Styled {
  cells: LocalizedCells;
}

export type LocalizedCell = LocalizedTextCell | LocalizedImageCell | LocalizedDataCell | LocalizedLayoutCell;
export type LocalizedCells = LocalizedCell | LocalizedCell[];

/**
 * Localized menu groups
 */
export type LocalizedMenuGroup<T = LocalizedMenuItem> = LocalizedItemGroup<T> | LocalizedNestedGroup<T>;
export type LocalizedItemGroup<T = LocalizedMenuItem> = { 
  header?: LocalizedCells; 
  items: T[]; 
  options?: MenuOptions 
};
export type LocalizedNestedGroup<T = LocalizedMenuItem> = { 
  header?: LocalizedCells; 
  groups: LocalizedMenuGroup<T>[]; 
  options?: MenuOptions 
};

/**
 * Localized menu container
 */
export interface LocalizedMenu<T = LocalizedMenuItem> {
  id: string;
  name: Words;
  content: LocalizedMenuGroup<T>;
  choices?: Record<string, LocalizedChoice>;
  variants?: Record<string, LocalizedVariantGroup>;
  modifierMenu?: boolean;
}

/**
 * Localized menu item
 */
export interface LocalizedMenuItem {
  id: string;
  name: Words;
  description?: Words;
  icon?: string;
  
  price?: number;
  variants?: {
    groupId: string;
    price: VariantPrice;
    selectedId?: string;
  };
  
  constraints?: Constraint;
  subMenu?: SubMenu;
}

/**
 * Localized choice definition
 */
export interface LocalizedChoice {
  id: string;
  name?: Words;
  min?: number;
  max?: number;
}

/**
 * Localized variant
 */
export interface LocalizedVariant {
  id: string;
  name: Words;
  icon?: string;
}

/**
 * Localized variant group
 */
export interface LocalizedVariantGroup {
  id: string;
  name?: Words;
  variants: LocalizedVariant[];
  selectedId: string;
}

/**
 * Helper functions for working with localized content
 */
export function isLocalizedString(value: Words): value is LocalizedString {
  return typeof value === "object" && value !== null && "en" in value;
}

export function extractLanguage(value: Words, lang: Language): string {
  if (isLocalizedString(value)) {
    return value[lang] || value.en; // Fallback to English
  }
  return value;
}

/**
 * Convert localized cells to single-language cells
 */
export function extractCellLanguage(cell: LocalizedCell, lang: Language): Cell {
  if ("text" in cell) {
    return {
      ...cell,
      text: extractLanguage(cell.text, lang)
    } as TextCell;
  }
  if ("src" in cell) {
    return {
      ...cell,
      alt: cell.alt ? extractLanguage(cell.alt, lang) : undefined
    } as ImageCell;
  }
  if ("type" in cell) {
    return cell as DataCell;
  }
  if ("cells" in cell) {
    return {
      ...cell,
      cells: extractCellsLanguage(cell.cells, lang)
    } as LayoutCell;
  }
  return cell as Cell;
}

export function extractCellsLanguage(cells: LocalizedCells, lang: Language): Cells {
  if (Array.isArray(cells)) {
    return cells.map(c => extractCellLanguage(c, lang));
  }
  return extractCellLanguage(cells, lang);
}