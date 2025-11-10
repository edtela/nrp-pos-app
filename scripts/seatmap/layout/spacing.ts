/**
 * Spacing and Positioning Utilities
 * Helper functions for calculating table positions and spacing
 */

import type { Point } from '../types.js';

/**
 * Calculate evenly spaced positions along a line
 * @param count Number of positions
 * @param start Start coordinate
 * @param end End coordinate
 * @returns Array of positions
 */
export function calculateEvenSpacing(count: number, start: number, end: number): number[] {
  const span = end - start;
  const spacing = span / (count + 1);
  return Array.from({ length: count }, (_, i) => Math.round(start + spacing * (i + 1)));
}

/**
 * Calculate positions for rectangular tables accounting for table width
 * Ensures proper gaps between tables
 * @param count Number of tables
 * @param start Start coordinate
 * @param end End coordinate
 * @param tableWidth Width of each table
 * @returns Array of center positions
 */
export function calculateRectangularSpacing(
  count: number,
  start: number,
  end: number,
  tableWidth: number
): number[] {
  const span = end - start;
  const totalTableWidth = count * tableWidth;
  const availableGapSpace = span - totalTableWidth;
  const gapSize = availableGapSpace / (count + 1);

  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    const centerX = start + gapSize * (i + 1) + tableWidth * i + tableWidth / 2;
    positions.push(Math.round(centerX));
  }
  return positions;
}

/**
 * Calculate grid positions for tables
 * @param rows Number of rows
 * @param cols Number of columns
 * @param startX Start X coordinate
 * @param startY Start Y coordinate
 * @param spacingX Horizontal spacing between tables
 * @param spacingY Vertical spacing between tables
 * @returns Array of points in grid layout
 */
export function calculateGridPositions(
  rows: number,
  cols: number,
  startX: number,
  startY: number,
  spacingX: number,
  spacingY: number
): Point[] {
  const positions: Point[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      positions.push({
        x: Math.round(startX + col * spacingX),
        y: Math.round(startY + row * spacingY),
      });
    }
  }

  return positions;
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Check if two rectangular bounds overlap
 */
export function overlaps(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
): boolean {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
