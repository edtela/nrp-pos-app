/**
 * SVG Renderer
 * Utility for rendering SVG with proper formatting and optimization
 */

import type { ColorTheme } from '../types.js';

/**
 * Default color theme matching current implementation
 */
export const DEFAULT_COLORS: ColorTheme = {
  patio: '#e8f5e9',
  grass: '#7cb342',
  walkway: '#d0d0d0',
  tableOutdoor: '#d7ccc8',
  tableIndoor: '#d7ccc8',
  chairOutdoor: '#a1887f',
  chairIndoor: '#a1887f',
  indoor: '#fff8e1',
  indoorBg: '#f5f5f5',
  wall: '#e0e0e0',
  door: '#b3e5fc',
  bench: '#8d6e63',
  bar: '#795548',
  tableText: '#ffffff',
};

/**
 * SVG Renderer class with formatting utilities
 */
export class SVGRenderer {
  /**
   * Format SVG string with proper indentation
   */
  static format(svg: string): string {
    // Basic formatting - remove excessive blank lines
    return svg
      .split('\n')
      .filter((line, index, array) => {
        if (line.trim() === '') {
          // Keep only single blank lines
          return index === 0 || array[index - 1].trim() !== '';
        }
        return true;
      })
      .join('\n');
  }

  /**
   * Optimize SVG by removing unnecessary attributes
   */
  static optimize(svg: string): string {
    // For now, just return as-is
    // Could add minification, attribute cleanup, etc.
    return svg;
  }

  /**
   * Create an SVG comment
   */
  static comment(text: string): string {
    return `<!-- ${text} -->`;
  }

  /**
   * Wrap content in a group with optional ID
   */
  static group(content: string, id?: string, attributes?: Record<string, string | number>): string {
    const attrs = attributes
      ? Object.entries(attributes)
          .map(([key, value]) => `${key}="${value}"`)
          .join(' ')
      : '';

    const idAttr = id ? `id="${id}"` : '';
    const allAttrs = [idAttr, attrs].filter(Boolean).join(' ');

    return `<g ${allAttrs}>\n${content}\n</g>`;
  }
}
