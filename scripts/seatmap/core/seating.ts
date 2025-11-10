/**
 * Seating Elements
 * Chair and Bench classes
 */

import type { Point, BoundingBox, RenderContext, SeatingConfig } from '../types.js';
import { BaseSVGElement, SVGCircle, SVGRect } from './svg-element.js';

/**
 * Chair - represented as a circle
 */
export class Chair extends BaseSVGElement {
  private static readonly DEFAULT_RADIUS = 8;
  private static readonly DEFAULT_STROKE_WIDTH = 1;

  constructor(
    private position: Point,
    private radius: number = Chair.DEFAULT_RADIUS
  ) {
    super();
  }

  render(context: RenderContext): string {
    const circle = new SVGCircle(this.position.x, this.position.y, this.radius);
    const color = context.indoor ? context.colors.chairIndoor : context.colors.chairOutdoor;

    circle.setAttributes({
      fill: color,
      stroke: '#666',
      'stroke-width': Chair.DEFAULT_STROKE_WIDTH,
    });

    return circle.render(context);
  }

  getBounds(): BoundingBox {
    return {
      x: this.position.x - this.radius,
      y: this.position.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2,
    };
  }

  static fromConfig(config: SeatingConfig): Chair {
    return new Chair(config.position);
  }
}

/**
 * Bench - represented as a rounded rectangle
 */
export class Bench extends BaseSVGElement {
  private static readonly DEFAULT_CORNER_RADIUS = 6;
  private static readonly DEFAULT_STROKE_WIDTH = 1;

  constructor(
    private position: Point,
    private width: number,
    private height: number
  ) {
    super();
  }

  render(context: RenderContext): string {
    const rect = new SVGRect(this.position.x, this.position.y, this.width, this.height);
    const color = context.indoor ? context.colors.chairIndoor : context.colors.chairOutdoor;

    rect.setAttributes({
      fill: color,
      stroke: '#666',
      'stroke-width': Bench.DEFAULT_STROKE_WIDTH,
      rx: Bench.DEFAULT_CORNER_RADIUS,
      ry: Bench.DEFAULT_CORNER_RADIUS,
    });

    return rect.render(context);
  }

  getBounds(): BoundingBox {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.width,
      height: this.height,
    };
  }

  static fromConfig(config: SeatingConfig): Bench {
    if (!config.dimensions) {
      throw new Error('Bench requires dimensions in config');
    }
    return new Bench(config.position, config.dimensions.width, config.dimensions.height);
  }
}

/**
 * Factory function to create seating from config
 */
export function createSeating(config: SeatingConfig): Chair | Bench {
  switch (config.type) {
    case 'chair':
      return Chair.fromConfig(config);
    case 'bench':
      return Bench.fromConfig(config);
    default:
      throw new Error(`Unknown seating type: ${(config as any).type}`);
  }
}
