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
    let svg = '';

    // Render table shape
    if (this.config.shape === 'rectangle') {
      svg += this.renderRectangle(layout);
    } else {
      svg += this.renderRound(layout);
    }

    // Render benches (if any)
    svg += this.renderBenches(layout);

    return svg;
  }

  /**
   * Render rectangular table
   */
  private renderRectangle(layout: LayoutResult): string {
    const fill = this.config.fill ?? '#D2B48C';  // Light brown
    const stroke = this.config.stroke ?? '#333';
    const borderRadius = this.config.baseUnit * 0.125;  // 2px when baseUnit=16

    let svg = `<rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" rx="${borderRadius}" ry="${borderRadius}" fill="${fill}" stroke="${stroke}" stroke-width="1" />`;

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

  /**
   * Render benches for rectangle tables
   * Benches are positioned outside the table perimeter
   */
  private renderBenches(layout: LayoutResult): string {
    if (!this.config.seats || this.config.seats.length === 0) {
      return '';
    }

    let svg = '';
    const benchThickness = this.config.baseUnit * 0.25;  // 4px when baseUnit=16
    const radius = this.config.baseUnit * 0.125;         // 2px when baseUnit=16
    const darkBrown = '#8B4513';  // Darker brown for benches

    for (const seat of this.config.seats) {
      if (seat.position === 'N') {
        // North bench - above table
        const benchY = layout.y - benchThickness;
        svg += `<rect x="${layout.x}" y="${benchY}" width="${layout.width}" height="${benchThickness}" rx="${radius}" ry="${radius}" fill="${darkBrown}" />`;
      } else if (seat.position === 'S') {
        // South bench - below table
        const benchY = layout.y + layout.height;
        svg += `<rect x="${layout.x}" y="${benchY}" width="${layout.width}" height="${benchThickness}" rx="${radius}" ry="${radius}" fill="${darkBrown}" />`;
      }
      // E and W positions not yet implemented
    }

    return svg;
  }
}
