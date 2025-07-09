/**
 * Menu Header Component
 * Renders display cells for menu headers with data-driven styling
 */

import { html, Template, classMap, styleMap } from '@/lib/html-template';
import { Cells, Cell, isTextCell, isImageCell, isDataCell, isLayoutCell } from '@/types';


/**
 * Helper to convert array of classes to object for classMap
 */
function classesToObject(classes?: string[]): Record<string, boolean> {
  if (!classes) return {};
  return classes.reduce((acc, cls) => ({ ...acc, [cls]: true }), {});
}

/**
 * Render a single cell based on its type
 */
export function HeaderCell(cell: Cell): Template {
  if (isTextCell(cell)) {
    return html`<span class="${classMap(classesToObject(cell.classes))}" style="${styleMap(cell.style || {})}">${cell.text}</span>`;
  }

  if (isImageCell(cell)) {
    return html`<img 
      src="${cell.src}" 
      alt="${cell.alt || ''}" 
      class="${classMap(classesToObject(cell.classes))}" 
      style="${styleMap(cell.style || {})}"
    />`;
  }

  if (isDataCell(cell)) {
    return html`<span class="${classMap(classesToObject(cell.classes))}" style="${styleMap(cell.style || {})}">NOT YET IMPLEMENTED</span>`;
  }

  if (isLayoutCell(cell)) {
    return html`<div class="${classMap(classesToObject(cell.classes))}" style="${styleMap(cell.style || {})}">${HeaderCells(cell.cells)}</div>`;
  }

  // This shouldn't happen with proper types, but just in case
  return html``;
}

/**
 * Render cells (handles both single cell and array of cells)
 */
export function HeaderCells(cells: Cells): Template {
  if (Array.isArray(cells)) {
    return html`${cells.map(cell => HeaderCell(cell))}`;
  }
  return HeaderCell(cells);
}