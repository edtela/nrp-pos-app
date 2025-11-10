/**
 * Base SVG Element
 * Abstract base class for all SVG elements in the seatmap
 */

import type { BoundingBox, SVGAttributes, DataAttributes, RenderContext } from '../types.js';

export abstract class BaseSVGElement {
  protected attributes: SVGAttributes = {};
  protected dataAttributes: DataAttributes = {};

  /**
   * Set an SVG attribute
   */
  setAttribute(name: string, value: string | number): this {
    this.attributes[name] = value;
    return this;
  }

  /**
   * Set multiple attributes at once
   */
  setAttributes(attrs: SVGAttributes): this {
    Object.assign(this.attributes, attrs);
    return this;
  }

  /**
   * Set a data attribute
   */
  setDataAttribute(name: string, value: string | number): this {
    this.dataAttributes[name] = value;
    return this;
  }

  /**
   * Render attributes as SVG string
   */
  protected renderAttributes(): string {
    const attrs = Object.entries(this.attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    const dataAttrs = Object.entries(this.dataAttributes)
      .map(([key, value]) => `data-${key}="${value}"`)
      .join(' ');

    return [attrs, dataAttrs].filter(Boolean).join(' ');
  }

  /**
   * Abstract method to render the element
   */
  abstract render(context: RenderContext): string;

  /**
   * Abstract method to get bounding box
   */
  abstract getBounds(): BoundingBox;
}

/**
 * SVG Group Element
 * Container for grouping multiple SVG elements
 */
export class SVGGroup extends BaseSVGElement {
  private children: BaseSVGElement[] = [];

  constructor(private id?: string) {
    super();
    if (id) {
      this.setAttribute('id', id);
    }
  }

  /**
   * Add a child element to the group
   */
  add(element: BaseSVGElement): this {
    this.children.push(element);
    return this;
  }

  /**
   * Add multiple children at once
   */
  addAll(elements: BaseSVGElement[]): this {
    this.children.push(...elements);
    return this;
  }

  render(context: RenderContext): string {
    const attrs = this.renderAttributes();
    const childrenSVG = this.children
      .map((child) => child.render(context))
      .join('\n');

    return `<g ${attrs}>\n${childrenSVG}\n</g>`;
  }

  getBounds(): BoundingBox {
    if (this.children.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const bounds = this.children.map((child) => child.getBounds());
    const minX = Math.min(...bounds.map((b) => b.x));
    const minY = Math.min(...bounds.map((b) => b.y));
    const maxX = Math.max(...bounds.map((b) => b.x + b.width));
    const maxY = Math.max(...bounds.map((b) => b.y + b.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}

/**
 * SVG Circle Element
 */
export class SVGCircle extends BaseSVGElement {
  constructor(
    private cx: number,
    private cy: number,
    private r: number
  ) {
    super();
  }

  render(context: RenderContext): string {
    const attrs = this.renderAttributes();
    return `<circle cx="${this.cx}" cy="${this.cy}" r="${this.r}" ${attrs}/>`;
  }

  getBounds(): BoundingBox {
    return {
      x: this.cx - this.r,
      y: this.cy - this.r,
      width: this.r * 2,
      height: this.r * 2,
    };
  }
}

/**
 * SVG Rectangle Element
 */
export class SVGRect extends BaseSVGElement {
  constructor(
    private x: number,
    private y: number,
    private width: number,
    private height: number
  ) {
    super();
  }

  render(context: RenderContext): string {
    const attrs = this.renderAttributes();
    return `<rect x="${this.x}" y="${this.y}" width="${this.width}" height="${this.height}" ${attrs}/>`;
  }

  getBounds(): BoundingBox {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

/**
 * SVG Text Element
 */
export class SVGText extends BaseSVGElement {
  constructor(
    private x: number,
    private y: number,
    private content: string
  ) {
    super();
  }

  render(context: RenderContext): string {
    const attrs = this.renderAttributes();
    return `<text x="${this.x}" y="${this.y}" ${attrs}>${this.content}</text>`;
  }

  getBounds(): BoundingBox {
    // Rough approximation - text bounds are complex
    const estimatedWidth = this.content.length * 8;
    return {
      x: this.x,
      y: this.y - 10,
      width: estimatedWidth,
      height: 14,
    };
  }
}
