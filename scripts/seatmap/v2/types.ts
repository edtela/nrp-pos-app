/**
 * Type definitions for v2 seatmap system
 * Component-based architecture with two-phase layout protocol
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

export interface PreferredSize {
  width?: number;   // pixels or undefined (auto)
  height?: number;  // pixels or undefined (auto)
}

export interface LayoutResult {
  x: number;        // Top-left x position
  y: number;        // Top-left y position
  width: number;    // Final width
  height: number;   // Final height
}

// ============================================================================
// Component Protocol
// ============================================================================

export interface Component {
  /**
   * Phase 1: Query preferred dimensions
   * Returns desired size in pixels, undefined means auto/fill
   */
  getPreferredSize(): PreferredSize;

  /**
   * Phase 3: Render with calculated layout
   * Receives final position and size from parent
   */
  render(layout: LayoutResult): string;
}

// ============================================================================
// Unit Types
// ============================================================================

/**
 * Unit value in configuration
 * - string: "2s", "30px"
 * - number: direct pixel value
 * - undefined: auto-size
 */
export type UnitValue = string | number | undefined;

// ============================================================================
// Anchor System
// ============================================================================

/**
 * 9-position anchor system
 * Edges: top, bottom, left, right (4)
 * Corners: top-left, top-right, bottom-left, bottom-right (4)
 * Center: center (1)
 */
export type AnchorPosition =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

export interface Offset {
  x: UnitValue;
  y: UnitValue;
}

// ============================================================================
// Layout Types
// ============================================================================

export type LayoutMode = 'row' | 'column' | null;

export type SpacingMode = 'even' | 'start' | 'center' | 'end';

export type AlignmentMode = 'start' | 'center' | 'end';

// ============================================================================
// Configuration Types (User-facing JSON)
// ============================================================================

/**
 * Base component configuration
 */
export interface BaseComponentConfig {
  type: string;
  name?: string;
  use?: string;  // Reference to template
  anchor?: AnchorPosition;
  offset?: Offset;
}

/**
 * Box component (placeholder for testing)
 */
export interface BoxConfig extends BaseComponentConfig {
  type: 'box';
  width: UnitValue;
  height: UnitValue;
  fill?: string;
}

/**
 * Container component
 */
export interface ContainerConfig extends BaseComponentConfig {
  type: 'container';

  // Layout mode
  layout?: LayoutMode;

  // Auto-layout properties
  gap?: UnitValue;
  spacing?: SpacingMode;
  alignment?: AlignmentMode;

  // Spacing
  padding?: UnitValue;

  // Size constraints
  width?: UnitValue;
  height?: UnitValue;

  // Visual
  fill?: string;

  // Children
  children?: ComponentConfig[];
}

/**
 * Seat definition for custom seat placement
 */
export interface SeatDefinition {
  position: string;      // Compass direction ("N", "S", "E", "W", etc.) or degrees
  seatCount: number;     // Number of people at this position (1 = chair, >1 = bench)
}

/**
 * Table component
 */
export interface TableConfig extends BaseComponentConfig {
  type: 'table';
  shape: 'round' | 'rectangle';
  capacity: number;
  aspectRatio?: number;  // defaults to 1.0
  fill?: string;
  stroke?: string;
  seatCount?: number;    // Number of people to seat (defaults to capacity if omitted)
  seats?: SeatDefinition[];  // Custom seat definitions
}

/**
 * Union of all component configs
 */
export type ComponentConfig = BoxConfig | ContainerConfig | TableConfig;

/**
 * Type-based default properties
 * Applied to all components of a given type
 */
export interface Defaults {
  table?: Partial<Omit<TableConfig, 'type'>>;
  container?: Partial<Omit<ContainerConfig, 'type'>>;
  box?: Partial<Omit<BoxConfig, 'type'>>;
}

/**
 * Named template definitions
 * Templates cannot have 'use' property (prevents circular references)
 */
export interface Templates {
  [templateName: string]: ComponentConfig;
}

/**
 * Root configuration
 */
export interface RootConfig {
  baseUnit: number;  // Pixel value for 1s
  anchor?: AnchorPosition;
  defaults?: Defaults;
  templates?: Templates;
  children: ComponentConfig[];
}

// ============================================================================
// Resolved Configuration (After unit parsing)
// ============================================================================

/**
 * Resolved offset with parsed units
 */
export interface ResolvedOffset {
  x: number | undefined;
  y: number | undefined;
}

/**
 * Base resolved component
 */
export interface BaseResolvedConfig {
  type: string;
  name?: string;
  anchor?: AnchorPosition;
  offset?: ResolvedOffset;
}

/**
 * Resolved box config
 */
export interface ResolvedBoxConfig extends BaseResolvedConfig {
  type: 'box';
  width: number | undefined;
  height: number | undefined;
  fill?: string;
}

/**
 * Resolved container config
 */
export interface ResolvedContainerConfig extends BaseResolvedConfig {
  type: 'container';
  layout?: LayoutMode;
  gap?: number;
  spacing?: SpacingMode;
  alignment?: AlignmentMode;
  padding?: number;
  width?: number;
  height?: number;
  fill?: string;
  children?: ResolvedComponentConfig[];
}

/**
 * Resolved table config
 */
export interface ResolvedTableConfig extends BaseResolvedConfig {
  type: 'table';
  shape: 'round' | 'rectangle';
  capacity: number;
  aspectRatio: number;
  baseUnit: number;  // Needed to calculate dimensions from capacity
  fill?: string;
  stroke?: string;
  seatCount?: number;
  seats?: SeatDefinition[];
}

/**
 * Union of all resolved configs
 */
export type ResolvedComponentConfig = ResolvedBoxConfig | ResolvedContainerConfig | ResolvedTableConfig;
