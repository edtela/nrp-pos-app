/**
 * Container Component
 * Manages layout of child components using row, column, or manual positioning
 */

import type {
  Component,
  PreferredSize,
  LayoutResult,
  ResolvedContainerConfig,
  AnchorPosition,
} from '../types.js';
import { calculateChildPosition, getAnchorPoint, applyOffset, isRightToLeft, isBottomToTop } from '../layout/anchor.js';

/**
 * Container - arranges child components
 */
export class Container implements Component {
  private children: Component[] = [];

  constructor(
    private config: ResolvedContainerConfig,
    children: Component[]
  ) {
    this.children = children;
  }

  /**
   * Phase 1: Query preferred size
   * Queries all children and calculates container size
   */
  getPreferredSize(): PreferredSize {
    // If explicit size provided, use it
    if (this.config.width !== undefined || this.config.height !== undefined) {
      return {
        width: this.config.width,
        height: this.config.height,
      };
    }

    // Otherwise, calculate from children based on layout mode
    if (this.config.layout === 'row') {
      return this.calculateRowPreferredSize();
    } else if (this.config.layout === 'column') {
      return this.calculateColumnPreferredSize();
    }

    // Manual positioning - calculate bounds from children
    return this.calculateManualPreferredSize();
  }

  /**
   * Calculate preferred size for row layout
   */
  private calculateRowPreferredSize(): PreferredSize {
    const gap = this.config.gap ?? 0;
    let totalWidth = 0;
    let maxHeight = 0;

    for (let i = 0; i < this.children.length; i++) {
      const childSize = this.children[i].getPreferredSize();
      const childWidth = childSize.width ?? 0;
      const childHeight = childSize.height ?? 0;

      totalWidth += childWidth;
      if (i > 0) {
        totalWidth += gap;
      }

      maxHeight = Math.max(maxHeight, childHeight);
    }

    return {
      width: totalWidth || undefined,
      height: maxHeight || undefined,
    };
  }

  /**
   * Calculate preferred size for column layout
   */
  private calculateColumnPreferredSize(): PreferredSize {
    const gap = this.config.gap ?? 0;
    let totalHeight = 0;
    let maxWidth = 0;

    for (let i = 0; i < this.children.length; i++) {
      const childSize = this.children[i].getPreferredSize();
      const childWidth = childSize.width ?? 0;
      const childHeight = childSize.height ?? 0;

      totalHeight += childHeight;
      if (i > 0) {
        totalHeight += gap;
      }

      maxWidth = Math.max(maxWidth, childWidth);
    }

    return {
      width: maxWidth || undefined,
      height: totalHeight || undefined,
    };
  }

  /**
   * Calculate preferred size for manual positioning
   * Calculates width and height independently - only considers defined dimensions
   * Children with undefined dimensions will fill available space on that axis
   */
  private calculateManualPreferredSize(): PreferredSize {
    if (this.children.length === 0) {
      return { width: undefined, height: undefined };
    }

    const containerAnchor = this.config.anchor || 'center';

    // Calculate width and height separately
    const width = this.calculateManualWidth(containerAnchor);
    const height = this.calculateManualHeight(containerAnchor);

    return { width, height };
  }

  /**
   * Calculate width from children with defined widths
   * Handles all 9 anchor positions
   */
  private calculateManualWidth(containerAnchor: AnchorPosition): number | undefined {
    let maxLeft = 0;   // Maximum extent leftward (negative direction)
    let maxRight = 0;  // Maximum extent rightward (positive direction)
    let hasDefinedChildren = false;

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const childConfig = this.config.children?.[i];
      const childSize = child.getPreferredSize();

      // Skip children with undefined width - they will fill available space
      const width = childSize.width;
      if (width === undefined) {
        continue;
      }

      hasDefinedChildren = true;
      const childAnchor = childConfig?.anchor || containerAnchor;
      const childOffset = childConfig?.offset || { x: 0, y: 0 };

      // Calculate child's left and right edges from container anchor (at x=0)
      let childLeft: number;
      let childRight: number;

      if (childAnchor.includes('left')) {
        // Child's left edge positioned at offset
        childLeft = childOffset.x;
        childRight = childOffset.x + width;
      } else if (childAnchor.includes('right')) {
        // Child's right edge positioned at offset
        childLeft = childOffset.x - width;
        childRight = childOffset.x;
      } else {
        // Center, top, bottom - child centered at offset
        childLeft = childOffset.x - width / 2;
        childRight = childOffset.x + width / 2;
      }

      // Track maximum extents
      maxLeft = Math.max(maxLeft, Math.abs(childLeft));
      maxRight = Math.max(maxRight, Math.abs(childRight));
    }

    if (!hasDefinedChildren) {
      return undefined;
    }

    // Calculate container width based on anchor position
    if (containerAnchor === 'center' || containerAnchor === 'top' || containerAnchor === 'bottom') {
      // Centered horizontally: extend symmetrically
      const maxExtent = Math.max(maxLeft, maxRight);
      return maxExtent * 2;
    } else if (containerAnchor.includes('left')) {
      // Anchored at left: extends rightward only
      return maxRight;
    } else {
      // Anchored at right: extends leftward only
      return maxLeft;
    }
  }

  /**
   * Calculate height from children with defined heights
   * Handles all 9 anchor positions
   */
  private calculateManualHeight(containerAnchor: AnchorPosition): number | undefined {
    let maxTop = 0;    // Maximum extent upward (negative direction)
    let maxBottom = 0; // Maximum extent downward (positive direction)
    let hasDefinedChildren = false;

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const childConfig = this.config.children?.[i];
      const childSize = child.getPreferredSize();

      // Skip children with undefined height - they will fill available space
      const height = childSize.height;
      if (height === undefined) {
        continue;
      }

      hasDefinedChildren = true;
      const childAnchor = childConfig?.anchor || containerAnchor;
      const childOffset = childConfig?.offset || { x: 0, y: 0 };

      // Calculate child's top and bottom edges from container anchor (at y=0)
      let childTop: number;
      let childBottom: number;

      if (childAnchor.includes('top')) {
        // Child's top edge positioned at offset
        childTop = childOffset.y;
        childBottom = childOffset.y + height;
      } else if (childAnchor.includes('bottom')) {
        // Child's bottom edge positioned at offset
        childTop = childOffset.y - height;
        childBottom = childOffset.y;
      } else {
        // Center, left, right - child centered at offset
        childTop = childOffset.y - height / 2;
        childBottom = childOffset.y + height / 2;
      }

      // Track maximum extents
      maxTop = Math.max(maxTop, Math.abs(childTop));
      maxBottom = Math.max(maxBottom, Math.abs(childBottom));
    }

    if (!hasDefinedChildren) {
      return undefined;
    }

    // Calculate container height based on anchor position
    if (containerAnchor === 'center' || containerAnchor === 'left' || containerAnchor === 'right') {
      // Centered vertically: extend symmetrically
      const maxExtent = Math.max(maxTop, maxBottom);
      return maxExtent * 2;
    } else if (containerAnchor.includes('top')) {
      // Anchored at top: extends downward only
      return maxBottom;
    } else {
      // Anchored at bottom: extends upward only
      return maxTop;
    }
  }

  /**
   * Phase 2: Calculate layout for all children
   * This is the new phase - determines position and size for each child
   */
  private calculateChildLayouts(containerLayout: LayoutResult): LayoutResult[] {
    if (this.config.layout === 'row') {
      return this.calculateRowLayout(containerLayout);
    } else if (this.config.layout === 'column') {
      return this.calculateColumnLayout(containerLayout);
    }

    // Manual positioning
    return this.calculateManualLayout(containerLayout);
  }

  /**
   * Calculate row layout
   * Children arranged horizontally with gap between them
   * Flow direction determined by anchor (left-to-right or right-to-left)
   */
  private calculateRowLayout(containerLayout: LayoutResult): LayoutResult[] {
    const gap = this.config.gap ?? 0;
    const childLayouts: LayoutResult[] = [];
    const anchor = this.config.anchor || 'center';
    const rightToLeft = isRightToLeft(anchor);

    // Starting position depends on flow direction
    let currentX = rightToLeft
      ? containerLayout.x + containerLayout.width  // Start at right edge
      : containerLayout.x;                          // Start at left edge

    for (const child of this.children) {
      const childSize = child.getPreferredSize();
      const width = childSize.width ?? 0;
      const height = childSize.height ?? containerLayout.height;

      // For now, align to top (y = containerLayout.y)
      // TODO: implement alignment modes (start, center, end)
      const y = containerLayout.y;

      if (rightToLeft) {
        // Place from right to left: subtract width first, then place
        currentX -= width;
        childLayouts.push({
          x: currentX,
          y,
          width,
          height,
        });
        currentX -= gap;  // Subtract gap after placing
      } else {
        // Place from left to right: place first, then add width
        childLayouts.push({
          x: currentX,
          y,
          width,
          height,
        });
        currentX += width + gap;
      }
    }

    return childLayouts;
  }

  /**
   * Calculate column layout
   * Children arranged vertically with gap between them
   * Flow direction determined by anchor (top-to-bottom or bottom-to-top)
   */
  private calculateColumnLayout(containerLayout: LayoutResult): LayoutResult[] {
    const gap = this.config.gap ?? 0;
    const childLayouts: LayoutResult[] = [];
    const anchor = this.config.anchor || 'center';
    const bottomToTop = isBottomToTop(anchor);

    // Starting position depends on flow direction
    let currentY = bottomToTop
      ? containerLayout.y + containerLayout.height  // Start at bottom edge
      : containerLayout.y;                           // Start at top edge

    for (const child of this.children) {
      const childSize = child.getPreferredSize();
      const width = childSize.width ?? containerLayout.width;
      const height = childSize.height ?? 0;

      // For now, align to left (x = containerLayout.x)
      // TODO: implement alignment modes (start, center, end)
      const x = containerLayout.x;

      if (bottomToTop) {
        // Place from bottom to top: subtract height first, then place
        currentY -= height;
        childLayouts.push({
          x,
          y: currentY,
          width,
          height,
        });
        currentY -= gap;  // Subtract gap after placing
      } else {
        // Place from top to bottom: place first, then add height
        childLayouts.push({
          x,
          y: currentY,
          width,
          height,
        });
        currentY += height + gap;
      }
    }

    return childLayouts;
  }

  /**
   * Calculate available space from anchor point to container edges
   */
  private calculateAvailableSpace(
    containerLayout: LayoutResult,
    targetPoint: { x: number; y: number },
    childAnchor: AnchorPosition
  ): { width: number; height: number } {
    const containerLeft = containerLayout.x;
    const containerTop = containerLayout.y;
    const containerRight = containerLayout.x + containerLayout.width;
    const containerBottom = containerLayout.y + containerLayout.height;

    let width = containerLayout.width;
    let height = containerLayout.height;

    // Calculate available width based on horizontal component of anchor
    if (childAnchor.includes('left')) {
      // Extends from left edge to right
      width = containerRight - targetPoint.x;
    } else if (childAnchor.includes('right')) {
      // Extends from right edge to left
      width = targetPoint.x - containerLeft;
    } else {
      // Center or vertical-only anchor - use full width
      width = containerLayout.width;
    }

    // Calculate available height based on vertical component of anchor
    if (childAnchor.includes('top')) {
      // Extends from top edge downward
      height = containerBottom - targetPoint.y;
    } else if (childAnchor.includes('bottom')) {
      // Extends from bottom edge upward
      height = targetPoint.y - containerTop;
    } else if (childAnchor === 'center') {
      // Center - use full height
      height = containerLayout.height;
    } else {
      // Horizontal-only anchor (left/right) - use full height
      height = containerLayout.height;
    }

    return { width, height };
  }

  /**
   * Calculate manual layout using anchor + offset
   * Uses dual-anchor positioning system
   * Children with undefined size fill available space from anchor to edge
   */
  private calculateManualLayout(containerLayout: LayoutResult): LayoutResult[] {
    const childLayouts: LayoutResult[] = [];
    const containerAnchor = this.config.anchor || 'center';

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const childConfig = this.config.children?.[i];
      const childSize = child.getPreferredSize();
      const childAnchor = childConfig?.anchor || containerAnchor;
      const childOffset = childConfig?.offset || { x: 0, y: 0 };

      // Calculate where the anchor point will land
      const containerAnchorPoint = getAnchorPoint(containerLayout, containerAnchor);
      const targetPoint = applyOffset(containerAnchorPoint, childOffset);

      // Calculate available space from anchor to edges
      const availableSpace = this.calculateAvailableSpace(
        containerLayout,
        targetPoint,
        childAnchor
      );

      // Use available space for undefined dimensions
      const width = childSize.width ?? availableSpace.width;
      const height = childSize.height ?? availableSpace.height;

      const position = calculateChildPosition(
        containerLayout,
        containerAnchor,
        { width, height },
        childAnchor,
        childOffset
      );

      childLayouts.push({
        x: position.x,
        y: position.y,
        width,
        height,
      });
    }

    return childLayouts;
  }

  /**
   * Phase 3: Render with calculated layout
   */
  render(layout: LayoutResult): string {
    // Calculate layouts for all children
    const childLayouts = this.calculateChildLayouts(layout);

    let svg = '<g class="container">\n';

    // Render background if fill is defined (renders first = bottom layer)
    if (this.config.fill) {
      svg += `  <rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" fill="${this.config.fill}" />\n`;
    }

    // Render all children on top
    for (let i = 0; i < this.children.length; i++) {
      const childSvg = this.children[i].render(childLayouts[i]);
      svg += `  ${childSvg}\n`;
    }

    svg += '</g>';

    return svg;
  }
}
