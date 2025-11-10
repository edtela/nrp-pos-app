/**
 * Anchor positioning utilities
 * Calculate anchor points and apply offsets
 */

import type { AnchorPosition, LayoutResult, Point, ResolvedOffset } from '../types.js';

/**
 * Get the anchor point coordinates for a given layout box
 *
 * @param layout - The layout box (position and size)
 * @param anchor - Which anchor position to use
 * @returns The x,y coordinates of the anchor point
 */
export function getAnchorPoint(layout: LayoutResult, anchor: AnchorPosition): Point {
  const { x, y, width, height } = layout;

  switch (anchor) {
    // Edges
    case 'top':
      return { x: x + width / 2, y };
    case 'bottom':
      return { x: x + width / 2, y: y + height };
    case 'left':
      return { x, y: y + height / 2 };
    case 'right':
      return { x: x + width, y: y + height / 2 };

    // Corners
    case 'top-left':
      return { x, y };
    case 'top-right':
      return { x: x + width, y };
    case 'bottom-left':
      return { x, y: y + height };
    case 'bottom-right':
      return { x: x + width, y: y + height };

    // Center
    case 'center':
      return { x: x + width / 2, y: y + height / 2 };

    default:
      throw new Error(`Unknown anchor position: ${anchor}`);
  }
}

/**
 * Apply offset to a point
 *
 * @param point - Starting point
 * @param offset - Offset to apply (defaults to {0, 0})
 * @returns New point with offset applied
 */
export function applyOffset(point: Point, offset?: ResolvedOffset): Point {
  const dx = offset?.x ?? 0;
  const dy = offset?.y ?? 0;

  return {
    x: point.x + dx,
    y: point.y + dy,
  };
}

/**
 * Calculate child position using dual-anchor system
 *
 * Formula: Child's anchor point = Container's anchor point + Offset
 *
 * @param containerLayout - Container's layout box
 * @param containerAnchor - Which anchor point on container
 * @param childSize - Child's dimensions
 * @param childAnchor - Which anchor point on child aligns to position
 * @param offset - Offset from container anchor
 * @returns Child's top-left position (x, y)
 */
export function calculateChildPosition(
  containerLayout: LayoutResult,
  containerAnchor: AnchorPosition,
  childSize: { width: number; height: number },
  childAnchor: AnchorPosition,
  offset?: ResolvedOffset
): Point {
  // 1. Get container's anchor point
  const containerPoint = getAnchorPoint(containerLayout, containerAnchor);

  // 2. Apply offset
  const targetPoint = applyOffset(containerPoint, offset);

  // 3. Calculate child's anchor point offset from its top-left
  // Create a temp layout at origin to get anchor offset
  const tempChildLayout: LayoutResult = {
    x: 0,
    y: 0,
    width: childSize.width,
    height: childSize.height,
  };
  const childAnchorOffset = getAnchorPoint(tempChildLayout, childAnchor);

  // 4. Child's top-left = target point - child anchor offset
  return {
    x: targetPoint.x - childAnchorOffset.x,
    y: targetPoint.y - childAnchorOffset.y,
  };
}

/**
 * Check if row layout should flow right-to-left based on anchor
 *
 * @param anchor - Container anchor position
 * @returns true if layout should flow right-to-left
 */
export function isRightToLeft(anchor: AnchorPosition): boolean {
  return anchor.includes('right');
}

/**
 * Check if column layout should flow bottom-to-top based on anchor
 *
 * @param anchor - Container anchor position
 * @returns true if layout should flow bottom-to-top
 */
export function isBottomToTop(anchor: AnchorPosition): boolean {
  return anchor.includes('bottom');
}
