/**
 * Seating Presets
 * Named seating arrangements that can be applied to tables
 */

import type { SeatingPreset, SeatingConfig, AnyTableConfig, Point, RoundTableConfig, RectangularTableConfig } from '../types.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate point on circle at given angle (in degrees)
 */
function pointOnCircle(center: Point, radius: number, angleDegrees: number): Point {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: Math.round(center.x + radius * Math.cos(angleRadians)),
    y: Math.round(center.y + radius * Math.sin(angleRadians)),
  };
}

/**
 * Get table center point
 */
function getTableCenter(config: AnyTableConfig): Point {
  if (config.shape === 'round') {
    return config.position;
  } else if (config.shape === 'rectangular') {
    return {
      x: config.position.x + config.width / 2,
      y: config.position.y + config.height / 2,
    };
  } else { // square
    return {
      x: config.position.x + config.size / 2,
      y: config.position.y + config.size / 2,
    };
  }
}

/**
 * Get table radius for round tables
 */
function getTableRadius(config: RoundTableConfig): number {
  return config.radius;
}

// ============================================================================
// Preset Definitions
// ============================================================================

/**
 * 4 chairs at diagonal angles (45°, 135°, 225°, 315°)
 * Used for rows C and D
 */
const diagonal4: SeatingPreset = {
  name: 'diagonal-4',
  description: '4 chairs at 45° increments',
  calculate: (config: AnyTableConfig): SeatingConfig[] => {
    if (config.shape !== 'round') {
      throw new Error('diagonal-4 preset only works with round tables');
    }

    const center = config.position;
    const distance = config.radius; // Chair center at table edge
    const angles = [45, 135, 225, 315];

    return angles.map((angle) => ({
      type: 'chair',
      position: pointOnCircle(center, distance, angle - 90), // Adjust for 0° being east
    }));
  },
};

/**
 * 4 chairs at cardinal directions (North, East, South, West)
 */
const cardinal4: SeatingPreset = {
  name: 'cardinal-4',
  description: '4 chairs at cardinal directions',
  calculate: (config: AnyTableConfig): SeatingConfig[] => {
    if (config.shape !== 'round') {
      throw new Error('cardinal-4 preset only works with round tables');
    }

    const center = config.position;
    const distance = config.radius + 33;
    const angles = [0, 90, 180, 270]; // N, E, S, W

    return angles.map((angle) => ({
      type: 'chair',
      position: pointOnCircle(center, distance, angle - 90),
    }));
  },
};

/**
 * Bench on south side + 2 chairs at 60° and 120° (north side)
 * Used for Row A
 */
const benchSouthChairs60_120: SeatingPreset = {
  name: 'bench-south-chairs-60-120',
  description: 'Bench on south side, 2 angled chairs on north',
  calculate: (config: AnyTableConfig): SeatingConfig[] => {
    if (config.shape !== 'round') {
      throw new Error('bench-south-chairs-60-120 preset only works with round tables');
    }

    const center = config.position;
    const radius = config.radius;

    const seating: SeatingConfig[] = [];

    // Bench on south side (centered below table, half overlapping)
    const benchHeight = 12;
    seating.push({
      type: 'bench',
      position: {
        x: Math.round(center.x - 30),
        y: center.y + radius - benchHeight / 2, // Half the bench under the table
      },
      dimensions: {
        width: 60,
        height: benchHeight,
      },
    });

    // Two chairs on north side at 60° and 120°
    seating.push({
      type: 'chair',
      position: { x: Math.round(center.x - 26), y: center.y - 15 },
    });

    seating.push({
      type: 'chair',
      position: { x: Math.round(center.x + 26), y: center.y - 15 },
    });

    return seating;
  },
};

/**
 * Two benches horizontal (north and south)
 * Used for Row B
 */
const benchHorizontal2: SeatingPreset = {
  name: 'bench-horizontal-2',
  description: 'Two horizontal benches north and south',
  calculate: (config: AnyTableConfig): SeatingConfig[] => {
    if (config.shape !== 'rectangular') {
      throw new Error('bench-horizontal-2 preset only works with rectangular tables');
    }

    const x = config.position.x;
    const y = config.position.y;
    const width = config.width;
    const height = config.height;
    const benchHeight = 12;
    const gap = 3;

    return [
      // North bench (no overlap, small gap)
      {
        type: 'bench',
        position: {
          x: x,
          y: y - benchHeight - gap,
        },
        dimensions: {
          width: width,
          height: benchHeight,
        },
      },
      // South bench (no overlap, small gap)
      {
        type: 'bench',
        position: {
          x: x,
          y: y + height + gap,
        },
        dimensions: {
          width: width,
          height: benchHeight,
        },
      },
    ];
  },
};

/**
 * Two chairs vertical (north and south)
 * Used for T tables
 */
const chairsVertical2: SeatingPreset = {
  name: 'chairs-vertical-2',
  description: 'Two chairs vertically aligned (north and south)',
  calculate: (config: AnyTableConfig): SeatingConfig[] => {
    if (config.shape !== 'round') {
      throw new Error('chairs-vertical-2 preset only works with round tables');
    }

    const center = config.position;
    const distance = config.radius; // Chair center at table edge

    return [
      // North chair
      {
        type: 'chair',
        position: {
          x: center.x,
          y: center.y - distance,
        },
      },
      // South chair
      {
        type: 'chair',
        position: {
          x: center.x,
          y: center.y + distance,
        },
      },
    ];
  },
};

/**
 * 4 chairs for square indoor tables (cardinal directions with spacing)
 * Used for indoor square tables
 */
const squareCardinal4: SeatingPreset = {
  name: 'square-cardinal-4',
  description: '4 chairs at cardinal directions for square tables',
  calculate: (config: AnyTableConfig): SeatingConfig[] => {
    if (config.shape !== 'square' && config.shape !== 'rectangular') {
      throw new Error('square-cardinal-4 preset only works with square/rectangular tables');
    }

    const center = getTableCenter(config);
    const size = config.shape === 'square' ? config.size : Math.min(config.width, config.height);
    const offset = size / 2 + 20;

    return [
      // North
      {
        type: 'chair',
        position: { x: center.x, y: center.y - offset },
      },
      // South
      {
        type: 'chair',
        position: { x: center.x, y: center.y + offset },
      },
      // West
      {
        type: 'chair',
        position: { x: center.x - offset, y: center.y },
      },
      // East
      {
        type: 'chair',
        position: { x: center.x + offset, y: center.y },
      },
    ];
  },
};

/**
 * Bench on wall (west or east) + 2 chairs opposite
 * Used for indoor tables 1 and 6
 */
const benchWallChairs2: SeatingPreset = {
  name: 'bench-wall-chairs-2',
  description: 'Vertical bench on wall side, 2 chairs opposite',
  calculate: (config: AnyTableConfig): SeatingConfig[] => {
    if (config.shape !== 'rectangular') {
      throw new Error('bench-wall-chairs-2 preset only works with rectangular tables');
    }

    const x = config.position.x;
    const y = config.position.y;
    const width = config.width;
    const height = config.height;

    // Determine if this is table 1 (west wall) or table 6 (east wall)
    // For simplicity, we'll provide both configurations
    // The actual implementation should check table position or have a parameter

    // Assuming west wall (table 1)
    return [
      // Vertical bench on west side
      {
        type: 'bench',
        position: {
          x: x - 20,
          y: y - 20,
        },
        dimensions: {
          width: 20,
          height: 100,
        },
      },
      // Chair 1 on east side
      {
        type: 'chair',
        position: {
          x: x + width + 15,
          y: y + 15,
        },
      },
      // Chair 2 on east side
      {
        type: 'chair',
        position: {
          x: x + width + 15,
          y: y + 45,
        },
      },
    ];
  },
};

// ============================================================================
// Preset Registry
// ============================================================================

const presetRegistry: Map<string, SeatingPreset> = new Map([
  [diagonal4.name, diagonal4],
  [cardinal4.name, cardinal4],
  [benchSouthChairs60_120.name, benchSouthChairs60_120],
  [benchHorizontal2.name, benchHorizontal2],
  [chairsVertical2.name, chairsVertical2],
  [squareCardinal4.name, squareCardinal4],
  [benchWallChairs2.name, benchWallChairs2],
]);

/**
 * Get a seating preset by name
 */
export function getSeatingPreset(name: string): SeatingPreset {
  const preset = presetRegistry.get(name);
  if (!preset) {
    throw new Error(`Unknown seating preset: ${name}`);
  }
  return preset;
}

/**
 * Get all available preset names
 */
export function getAvailablePresets(): string[] {
  return Array.from(presetRegistry.keys());
}

/**
 * Register a custom preset
 */
export function registerPreset(preset: SeatingPreset): void {
  presetRegistry.set(preset.name, preset);
}
