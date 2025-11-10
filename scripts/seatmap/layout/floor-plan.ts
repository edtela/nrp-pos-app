/**
 * Floor Plan
 * Main class that manages the entire floor plan layout
 */

import type { FloorPlanConfig, RenderContext, ColorTheme } from '../types.js';
import { SVGGroup } from '../core/svg-element.js';
import { createTable } from '../core/table.js';
import { BackgroundArea } from './areas.js';

/**
 * FloorPlan class manages all elements and renders the complete seatmap
 */
export class FloorPlan {
  private outdoorSection: SVGGroup;
  private indoorSection: SVGGroup;
  private backgroundAreas: BackgroundArea[];

  constructor(private config: FloorPlanConfig) {
    this.outdoorSection = new SVGGroup('outdoor-section');
    this.indoorSection = new SVGGroup('indoor-section');
    this.backgroundAreas = [];
    this.initialize();
  }

  /**
   * Initialize the floor plan by creating all elements
   */
  private initialize(): void {
    // Create background areas
    this.backgroundAreas = this.config.areas.map((areaConfig) => new BackgroundArea(areaConfig));

    // Create tables for each row
    for (const row of this.config.rows) {
      for (const tableConfig of row.tables) {
        const table = createTable(tableConfig);
        this.outdoorSection.add(table);
      }
    }

    // Create indoor tables if present
    if (this.config.indoor) {
      for (const tableConfig of this.config.indoor.tables) {
        const table = createTable({ ...tableConfig, indoor: true });
        this.indoorSection.add(table);
      }
    }
  }

  /**
   * Render the complete floor plan to SVG
   */
  render(colors: ColorTheme): string {
    const context: RenderContext = {
      colors,
      padding: this.config.padding,
      indoor: false,
    };

    // Start SVG
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg viewBox="0 0 ${this.config.dimensions.width} ${this.config.dimensions.height}" xmlns="http://www.w3.org/2000/svg">\n`;
    svg += `  <!-- Restaurant Floor Plan - ${this.config.name} -->\n\n`;

    // Render outdoor section
    svg += `  <!-- OUTDOOR SECTION -->\n`;
    svg += `  <g id="outdoor-section">\n`;

    // Render background areas for outdoor
    const outdoorAreas = this.backgroundAreas.filter((area) =>
      area.getBounds().y < (this.config.indoor?.startY || this.config.dimensions.height)
    );
    for (const area of outdoorAreas) {
      svg += `    ${area.render(context)}\n`;
    }

    // Render outdoor tables
    svg += this.outdoorSection.render(context).split('\n').map(line => line ? `    ${line}` : '').join('\n');
    svg += `\n  </g>\n\n`;

    // Render indoor section if present
    if (this.config.indoor) {
      const indoorContext: RenderContext = { ...context, indoor: true };
      svg += `  <!-- INDOOR SECTION -->\n`;

      // Add indoor background
      const indoorStartY = this.config.indoor.startY;
      const indoorHeight = this.config.dimensions.height - indoorStartY;
      svg += `  <rect x="0" y="${indoorStartY}" width="${this.config.dimensions.width}" height="${indoorHeight}" fill="${colors.indoorBg}" />\n\n`;

      // Render indoor tables (already wrapped in a group)
      svg += this.indoorSection.render(indoorContext).split('\n').map(line => line ? `  ${line}` : '').join('\n');
      svg += `\n`;
    }

    svg += `</svg>`;
    return svg;
  }

  /**
   * Get the configuration
   */
  getConfig(): FloorPlanConfig {
    return this.config;
  }
}
