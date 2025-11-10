/**
 * Background Areas
 * Grass, walkways, patios, and other background elements
 */

import type { AreaConfig, BoundingBox, RenderContext } from '../types.js';
import { BaseSVGElement, SVGRect, SVGGroup } from '../core/svg-element.js';

/**
 * Background Area Element
 */
export class BackgroundArea extends BaseSVGElement {
  constructor(private config: AreaConfig) {
    super();
  }

  render(context: RenderContext): string {
    const rect = new SVGRect(
      this.config.bounds.x,
      this.config.bounds.y,
      this.config.bounds.width,
      this.config.bounds.height
    );

    // Apply color based on area type
    const fill = this.getFillColor(context);
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', 'none');

    // Apply custom styles if provided
    if (this.config.style) {
      rect.setAttributes(this.config.style);
    }

    return rect.render(context);
  }

  private getFillColor(context: RenderContext): string {
    switch (this.config.type) {
      case 'grass':
        return context.colors.grass;
      case 'patio':
        return context.colors.patio;
      case 'walkway':
        return context.colors.walkway;
      case 'indoor':
        return context.colors.indoor;
      default:
        return '#ffffff';
    }
  }

  getBounds(): BoundingBox {
    return this.config.bounds;
  }
}

/**
 * Create grass areas that avoid walkway
 */
export function createGrassAreas(
  topY: number,
  bottomY: number,
  leftX: number,
  rightX: number,
  walkwayLeft: number,
  walkwayRight: number
): BackgroundArea[] {
  const height = bottomY - topY;

  return [
    // Left grass area
    new BackgroundArea({
      type: 'grass',
      bounds: {
        x: leftX,
        y: topY,
        width: walkwayLeft - leftX,
        height: height,
      },
    }),
    // Right grass area
    new BackgroundArea({
      type: 'grass',
      bounds: {
        x: walkwayRight,
        y: topY,
        width: rightX - walkwayRight,
        height: height,
      },
    }),
  ];
}

/**
 * Create a vertical walkway
 */
export function createVerticalWalkway(
  leftX: number,
  width: number,
  topY: number,
  bottomY: number
): BackgroundArea {
  return new BackgroundArea({
    type: 'walkway',
    bounds: {
      x: leftX,
      y: topY,
      width: width,
      height: bottomY - topY,
    },
  });
}

/**
 * Create a horizontal walkway
 */
export function createHorizontalWalkway(
  leftX: number,
  rightX: number,
  topY: number,
  height: number
): BackgroundArea {
  return new BackgroundArea({
    type: 'walkway',
    bounds: {
      x: leftX,
      y: topY,
      width: rightX - leftX,
      height: height,
    },
  });
}

/**
 * Create outdoor patio background
 */
export function createOutdoorPatio(
  x: number,
  y: number,
  width: number,
  height: number
): BackgroundArea {
  return new BackgroundArea({
    type: 'patio',
    bounds: { x, y, width, height },
  });
}
