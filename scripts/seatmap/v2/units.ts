/**
 * Unit parsing and conversion
 * Single conversion point: parse units once at config load time
 */

import type { UnitValue } from './types.js';

/**
 * Parse a unit value to pixels
 *
 * @param value - Unit value from configuration
 * @param baseUnit - Pixel value for 1s (e.g., 30)
 * @returns Pixel value, or undefined for auto-sizing
 *
 * Examples:
 * - "2s" → 60 (when baseUnit = 30)
 * - "30px" → 30
 * - 50 → 50
 * - undefined → undefined (auto)
 */
export function parseUnit(value: UnitValue, baseUnit: number): number | undefined {
  // undefined means auto-size
  if (value === undefined) {
    return undefined;
  }

  // Direct number value
  if (typeof value === 'number') {
    return value;
  }

  // String value - parse unit
  const trimmed = value.trim();

  // Seat-relative units: "2s", "0.5s"
  if (trimmed.endsWith('s')) {
    const number = parseFloat(trimmed.slice(0, -1));
    if (isNaN(number)) {
      throw new Error(`Invalid seat unit: ${value}`);
    }
    return number * baseUnit;
  }

  // Pixel units: "30px"
  if (trimmed.endsWith('px')) {
    const number = parseFloat(trimmed.slice(0, -2));
    if (isNaN(number)) {
      throw new Error(`Invalid pixel unit: ${value}`);
    }
    return number;
  }

  // No unit specified - treat as pixels
  const number = parseFloat(trimmed);
  if (isNaN(number)) {
    throw new Error(`Invalid unit value: ${value}`);
  }
  return number;
}

/**
 * Parse offset object
 */
export function parseOffset(
  offset: { x?: UnitValue; y?: UnitValue } | undefined,
  baseUnit: number
): { x: number | undefined; y: number | undefined } {
  if (!offset) {
    return { x: 0, y: 0 };
  }

  return {
    x: parseUnit(offset.x, baseUnit) ?? 0,
    y: parseUnit(offset.y, baseUnit) ?? 0,
  };
}
