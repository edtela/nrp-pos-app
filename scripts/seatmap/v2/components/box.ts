/**
 * Box Component
 * Simple placeholder component for testing layout system
 */

import type { Component, PreferredSize, LayoutResult, ResolvedBoxConfig } from '../types.js';

/**
 * Box - renders a colored rectangle
 * Used for testing and as a placeholder
 */
export class Box implements Component {
  constructor(private config: ResolvedBoxConfig) {}

  /**
   * Phase 1: Query preferred size
   */
  getPreferredSize(): PreferredSize {
    return {
      width: this.config.width,
      height: this.config.height,
    };
  }

  /**
   * Phase 3: Render with calculated layout
   */
  render(layout: LayoutResult): string {
    const fill = this.config.fill || '#cccccc';

    return `<rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" fill="${fill}" stroke="#333" stroke-width="1" />`;
  }
}
