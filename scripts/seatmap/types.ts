/**
 * Type definitions for seatmap generation system
 */

// ============================================================================
// Core Geometry Types
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// SVG Types
// ============================================================================

export interface SVGAttributes {
  [key: string]: string | number;
}

export interface DataAttributes {
  [key: string]: string | number;
}

// ============================================================================
// Table Types
// ============================================================================

export type TableShape = 'round' | 'rectangular' | 'square';

export interface TableConfig {
  id: string;
  label: string;
  position: Point;
  capacity: number;
  seatingPreset: string;
  indoor?: boolean;
}

export interface RoundTableConfig extends TableConfig {
  shape: 'round';
  radius: number;
}

export interface RectangularTableConfig extends TableConfig {
  shape: 'rectangular';
  width: number;
  height: number;
}

export interface SquareTableConfig extends TableConfig {
  shape: 'square';
  size: number;
}

export type AnyTableConfig = RoundTableConfig | RectangularTableConfig | SquareTableConfig;

// ============================================================================
// Seating Types
// ============================================================================

export type SeatingType = 'chair' | 'bench';

export interface SeatingConfig {
  type: SeatingType;
  position: Point;
  rotation?: number;
  dimensions?: Dimensions; // For benches
}

// Seating preset definitions
export interface SeatingPreset {
  name: string;
  description: string;
  calculate: (tableConfig: AnyTableConfig) => SeatingConfig[];
}

// ============================================================================
// Layout Types
// ============================================================================

export interface LayoutPadding {
  small: number;
  standard: number;
  top: number;
}

export interface RowConfig {
  id: string;
  y: number;
  tables: AnyTableConfig[];
}

export interface AreaConfig {
  type: 'grass' | 'patio' | 'walkway' | 'indoor';
  bounds: BoundingBox;
  style?: SVGAttributes;
}

// ============================================================================
// Floor Plan Types
// ============================================================================

export interface WalkwayConfig {
  vertical?: {
    left: number;
    right: number;
    center: number;
    width: number;
  };
  horizontal?: {
    top: number;
    bottom: number;
    height: number;
  };
}

export interface StorefrontConfig {
  left: number;
  right: number;
  center: number;
  width: number;
}

export interface FloorPlanConfig {
  id: string;
  name: string;
  dimensions: Dimensions;
  padding: LayoutPadding;
  storefront?: StorefrontConfig;
  walkways?: WalkwayConfig;
  areas: AreaConfig[];
  rows: RowConfig[];
  indoor?: {
    startY?: number; // Can be calculated
    tables: AnyTableConfig[];
  };
}

// ============================================================================
// Color Theme Types
// ============================================================================

export interface ColorTheme {
  patio: string;
  grass: string;
  walkway: string;
  tableOutdoor: string;
  tableIndoor: string;
  chairOutdoor: string;
  chairIndoor: string;
  indoor: string;
  indoorBg: string;
  wall: string;
  door: string;
  bench: string;
  bar: string;
  tableText: string;
}

// ============================================================================
// Rendering Types
// ============================================================================

export interface RenderContext {
  colors: ColorTheme;
  padding: LayoutPadding;
  indoor: boolean;
}

export interface SVGElement {
  render(context: RenderContext): string;
  getBounds(): BoundingBox;
}
