/**
 * Display Cell System
 * 
 * Simple, flexible cells for rich content display in menu headers and items.
 * Based on ARP's proven Cell system with minor adaptations for single-language use.
 */

/**
 * Base styled interface for all cells
 */
export interface Styled {
  classes?: string[];
  style?: Record<string, any>;  // CSS properties
}

/**
 * Text content cell
 */
export interface TextCell extends Styled {
  text: string;
}

/**
 * Image content cell
 */
export interface ImageCell extends Styled {
  src: string;
  alt?: string;
}

/**
 * Dynamic data placeholder cell
 * Used for injecting runtime data like variant selections
 */
export interface DataCell extends Styled {
  type: string;
  data?: unknown;
}

/**
 * Container cell for multiple cells
 */
export interface LayoutCell extends Styled {
  cells: Cells;
}

/**
 * Cell types
 */
export type Cell = TextCell | ImageCell | DataCell | LayoutCell;
export type Cells = Cell | Cell[];

/**
 * Type guards
 */
export function isTextCell(cell: Cell): cell is TextCell {
  return 'text' in cell;
}

export function isImageCell(cell: Cell): cell is ImageCell {
  return 'src' in cell;
}

export function isDataCell(cell: Cell): cell is DataCell {
  return 'type' in cell;
}

export function isLayoutCell(cell: Cell): cell is LayoutCell {
  return 'cells' in cell;
}