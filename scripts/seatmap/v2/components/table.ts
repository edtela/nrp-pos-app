/**
 * Table Component
 * Renders restaurant tables with different shapes (rectangle, round)
 * Size calculated from capacity using perimeter formula
 */

import type {
  Component,
  PreferredSize,
  LayoutResult,
  ResolvedTableConfig,
} from '../types.js';

/**
 * Table - represents a restaurant table
 */
export class Table implements Component {
  constructor(private config: ResolvedTableConfig) {}

  /**
   * Phase 1: Calculate preferred size from capacity and aspectRatio
   */
  getPreferredSize(): PreferredSize {
    const dimensions = this.calculateDimensions();
    return {
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  /**
   * Calculate table dimensions from capacity and aspectRatio
   * Uses perimeter formula: perimeter = capacity × baseUnit
   *
   * For rectangles:
   *   h = perimeter / (2×ar + 2)
   *   w = h × ar
   *
   * For rounds/ellipses:
   *   Uses same bounding rectangle calculation
   */
  private calculateDimensions(): { width: number; height: number } {
    const perimeter = this.config.capacity * this.config.baseUnit;
    const ar = this.config.aspectRatio;

    // Calculate bounding rectangle
    // 2w + 2h = perimeter, w = ar × h
    // h(2ar + 2) = perimeter
    const height = perimeter / (2 * ar + 2);
    const width = height * ar;

    return { width, height };
  }

  /**
   * Phase 3: Render to SVG
   */
  render(layout: LayoutResult): string {
    if (this.config.shape === 'rectangle') {
      return this.renderRectangle(layout);
    } else {
      return this.renderRound(layout);
    }
  }

  /**
   * Render rectangular table
   */
  private renderRectangle(layout: LayoutResult): string {
    const fill = this.config.fill ?? '#f5f5f5';
    const stroke = this.config.stroke ?? '#333';

    let svg = `<rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`;

    // Add label if name exists
    if (this.config.name) {
      const cx = layout.x + layout.width / 2;
      const cy = layout.y + layout.height / 2;
      svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="8" fill="#000">${this.config.name}</text>`;
    }

    return svg;
  }

  /**
   * Render round/ellipse table
   */
  private renderRound(layout: LayoutResult): string {
    const fill = this.config.fill ?? '#f5f5f5';
    const stroke = this.config.stroke ?? '#333';

    // Calculate center and radii from bounding box
    const cx = layout.x + layout.width / 2;
    const cy = layout.y + layout.height / 2;
    const rx = layout.width / 2;
    const ry = layout.height / 2;

    let svg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`;

    // Add label if name exists
    if (this.config.name) {
      svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="8" fill="#000">${this.config.name}</text>`;
    }

    return svg;
  }
}
