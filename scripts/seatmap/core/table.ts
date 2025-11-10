/**
 * Table Elements
 * Table hierarchy with Round, Rectangular, and Square tables
 */

import type {
  Point,
  BoundingBox,
  RenderContext,
  AnyTableConfig,
  RoundTableConfig,
  RectangularTableConfig,
  SquareTableConfig,
  SeatingConfig,
} from '../types.js';
import { BaseSVGElement, SVGGroup, SVGCircle, SVGRect, SVGText } from './svg-element.js';
import { createSeating } from './seating.js';
import { getSeatingPreset } from '../layout/seating-presets.js';

/**
 * Abstract base table class
 */
abstract class Table extends BaseSVGElement {
  protected group: SVGGroup;
  protected seating: BaseSVGElement[] = [];

  constructor(
    protected config: AnyTableConfig
  ) {
    super();
    this.group = new SVGGroup(`table-${config.id}-group`);
    this.initializeSeating();
  }

  /**
   * Initialize seating arrangement based on preset
   */
  private initializeSeating(): void {
    const preset = getSeatingPreset(this.config.seatingPreset);
    const seatingConfigs = preset.calculate(this.config);
    this.seating = seatingConfigs.map((config) => createSeating(config));
  }

  /**
   * Get table color based on indoor/outdoor
   */
  protected getTableColor(context: RenderContext): string {
    return this.config.indoor ? context.colors.tableIndoor : context.colors.tableOutdoor;
  }

  /**
   * Create the label text element
   */
  protected createLabel(x: number, y: number, fontSize: number = 14): SVGText {
    const text = new SVGText(x, y, this.config.label);
    text.setAttributes({
      'text-anchor': 'middle',
      'font-family': 'Arial',
      'font-size': fontSize,
      'font-weight': 'bold',
    });
    return text;
  }

  /**
   * Render the table and its seating
   */
  render(context: RenderContext): string {
    this.group = new SVGGroup(`table-${this.config.id}-group`);

    // Add seating first (so they appear behind table)
    this.seating.forEach((seat) => this.group.add(seat));

    // Add table shape on top
    this.group.add(this.createTableShape(context));

    return this.group.render(context);
  }

  /**
   * Abstract method to create the table shape
   */
  protected abstract createTableShape(context: RenderContext): BaseSVGElement;

  /**
   * Get the center point of the table
   */
  abstract getCenter(): Point;

  /**
   * Get bounds includes seating
   */
  getBounds(): BoundingBox {
    return this.group.getBounds();
  }
}

/**
 * Round Table
 */
export class RoundTable extends Table {
  constructor(config: RoundTableConfig) {
    super(config);
  }

  private get roundConfig(): RoundTableConfig {
    return this.config as RoundTableConfig;
  }

  protected createTableShape(context: RenderContext): BaseSVGElement {
    const cfg = this.roundConfig;
    const circle = new SVGCircle(
      cfg.position.x,
      cfg.position.y,
      cfg.radius
    );

    circle.setAttributes({
      id: `table-${cfg.id}`,
      fill: this.getTableColor(context),
      stroke: '#333',
      'stroke-width': 2,
    });

    circle.setDataAttribute('number', cfg.label);
    circle.setDataAttribute('capacity', cfg.capacity);

    // Add label
    const labelGroup = new SVGGroup();
    labelGroup.add(circle);

    const label = this.createLabel(
      cfg.position.x,
      cfg.position.y + 6,
      cfg.indoor ? 16 : 14
    );
    label.setAttribute('fill', context.colors.tableText);
    labelGroup.add(label);

    return labelGroup;
  }

  getCenter(): Point {
    return this.roundConfig.position;
  }
}

/**
 * Rectangular Table
 */
export class RectangularTable extends Table {
  constructor(config: RectangularTableConfig) {
    super(config);
  }

  private get rectConfig(): RectangularTableConfig {
    return this.config as RectangularTableConfig;
  }

  protected createTableShape(context: RenderContext): BaseSVGElement {
    const cfg = this.rectConfig;
    const rect = new SVGRect(
      cfg.position.x,
      cfg.position.y,
      cfg.width,
      cfg.height
    );

    rect.setAttributes({
      id: `table-${cfg.id}`,
      fill: this.getTableColor(context),
      stroke: '#333',
      'stroke-width': 2,
      rx: 5,
    });

    rect.setDataAttribute('number', cfg.label);
    rect.setDataAttribute('capacity', cfg.capacity);

    // Add label
    const labelGroup = new SVGGroup();
    labelGroup.add(rect);

    const centerX = cfg.position.x + cfg.width / 2;
    const centerY = cfg.position.y + cfg.height / 2;

    const label = this.createLabel(
      centerX,
      centerY + 6,
      cfg.indoor ? 16 : 14
    );
    label.setAttribute('fill', context.colors.tableText);
    labelGroup.add(label);

    return labelGroup;
  }

  getCenter(): Point {
    const cfg = this.rectConfig;
    return {
      x: cfg.position.x + cfg.width / 2,
      y: cfg.position.y + cfg.height / 2,
    };
  }
}

/**
 * Square Table (convenience subclass of Rectangular)
 */
export class SquareTable extends RectangularTable {
  constructor(config: SquareTableConfig) {
    // Convert square config to rectangular
    super({
      ...config,
      shape: 'rectangular',
      width: config.size,
      height: config.size,
    });
  }
}

/**
 * Factory function to create tables from config
 */
export function createTable(config: AnyTableConfig): Table {
  switch (config.shape) {
    case 'round':
      return new RoundTable(config);
    case 'rectangular':
      return new RectangularTable(config);
    case 'square':
      return new SquareTable(config);
    default:
      throw new Error(`Unknown table shape: ${(config as any).shape}`);
  }
}
