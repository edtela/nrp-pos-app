/**
 * Menu Header Component
 * Renders display cells for menu headers with data-driven styling
 * 
 * @see /component-guidelines.md for component patterns and conventions
 */

import { html, Template, classMap, styleMap } from '@/lib/template';
import { Cells, Cell, isTextCell, isImageCell, isDataCell, isLayoutCell, DataCell } from '@/types';

/**
 * Function type for custom DataCell rendering
 */
export type DataCellRenderer = (cell: DataCell) => Template;


/**
 * Helper to convert array of classes to object for classMap
 */
function classesToObject(classes?: string[]): Record<string, boolean> {
  if (!classes) return {};
  return classes.reduce((acc, cls) => ({ ...acc, [cls]: true }), {});
}

/**
 * Render a single cell based on its type
 * @param cell - The cell to render
 * @param dataRenderer - Optional custom renderer for DataCell types
 */
export function headerCell(cell: Cell, dataRenderer?: DataCellRenderer): Template {
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
    // Use custom renderer if provided, otherwise show the type as placeholder
    const content = dataRenderer ? dataRenderer(cell) : html`[${cell.type}]`;
    return html`<span class="${classMap(classesToObject(cell.classes))}" style="${styleMap(cell.style || {})}">${content}</span>`;
  }

  if (isLayoutCell(cell)) {
    return html`<div class="${classMap(classesToObject(cell.classes))}" style="${styleMap(cell.style || {})}">${headerCells(cell.cells, dataRenderer)}</div>`;
  }

  // This shouldn't happen with proper types, but just in case
  return html``;
}

/**
 * Render cells (handles both single cell and array of cells)
 * @param cells - Single cell or array of cells to render
 * @param dataRenderer - Optional custom renderer for DataCell types
 */
export function headerCells(cells: Cells, dataRenderer?: DataCellRenderer): Template {
  if (Array.isArray(cells)) {
    return html`${cells.map(cell => headerCell(cell, dataRenderer))}`;
  }
  return headerCell(cells, dataRenderer);
}