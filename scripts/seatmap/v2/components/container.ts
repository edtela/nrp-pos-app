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
import { calculateChildPosition, getAnchorPoint, applyOffset, isRightToLeft, isBottomToTop, getRowAlignmentY, getColumnAlignmentX, getSpacingStartPosition } from '../layout/anchor.js';

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
    const padding = this.config.padding ?? 0;
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
      width: totalWidth ? totalWidth + 2 * padding : undefined,
      height: maxHeight ? maxHeight + 2 * padding : undefined,
    };
  }

  /**
   * Calculate preferred size for column layout
   */
  private calculateColumnPreferredSize(): PreferredSize {
    const gap = this.config.gap ?? 0;
    const padding = this.config.padding ?? 0;
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
      width: maxWidth ? maxWidth + 2 * padding : undefined,
      height: totalHeight ? totalHeight + 2 * padding : undefined,
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
    const padding = this.config.padding ?? 0;

    // Calculate width and height separately
    const width = this.calculateManualWidth(containerAnchor);
    const height = this.calculateManualHeight(containerAnchor);

    return {
      width: width !== undefined ? width + 2 * padding : undefined,
      height: height !== undefined ? height + 2 * padding : undefined,
    };
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
   * Spacing and alignment are anchor-relative
   */
  private calculateRowLayout(containerLayout: LayoutResult): LayoutResult[] {
    const gap = this.config.gap ?? 0;
    const spacing = this.config.spacing ?? 'start';
    const alignment = this.config.alignment ?? 'start';
    const padding = this.config.padding ?? 0;
    const childLayouts: LayoutResult[] = [];
    const anchor = this.config.anchor || 'center';
    const rightToLeft = isRightToLeft(anchor);

    // Create padded inner rectangle for child layout
    const innerLayout: LayoutResult = {
      x: containerLayout.x + padding,
      y: containerLayout.y + padding,
      width: containerLayout.width - 2 * padding,
      height: containerLayout.height - 2 * padding,
    };

    // Calculate total width of children with gaps
    let totalWidth = 0;
    const childSizes: { width: number; height: number }[] = [];
    for (const child of this.children) {
      const childSize = child.getPreferredSize();
      const width = childSize.width ?? innerLayout.width;
      const height = innerLayout.height;
      childSizes.push({ width, height });
      totalWidth += width;
    }
    // Add gaps between children (n-1 gaps for n children)
    if (this.children.length > 1) {
      totalWidth += gap * (this.children.length - 1);
    }

    // Calculate starting position based on spacing mode
    let currentX = getSpacingStartPosition(
      innerLayout.x,
      innerLayout.width,
      totalWidth,
      spacing,
      rightToLeft
    );

    // Place children
    for (let i = 0; i < this.children.length; i++) {
      const { width, height } = childSizes[i];

      // Calculate Y position based on alignment mode (cross-axis)
      const y = getRowAlignmentY(innerLayout, anchor, alignment, height);

      if (rightToLeft) {
        // Place from right to left: subtract width first, then place
        currentX -= width;
        childLayouts.push({ x: currentX, y, width, height });
        currentX -= gap;  // Subtract gap after placing
      } else {
        // Place from left to right: place first, then add width
        childLayouts.push({ x: currentX, y, width, height });
        currentX += width + gap;
      }
    }

    return childLayouts;
  }

  /**
   * Calculate column layout
   * Children arranged vertically with gap between them
   * Flow direction determined by anchor (top-to-bottom or bottom-to-top)
   * Spacing and alignment are anchor-relative
   */
  private calculateColumnLayout(containerLayout: LayoutResult): LayoutResult[] {
    const gap = this.config.gap ?? 0;
    const spacing = this.config.spacing ?? 'start';
    const alignment = this.config.alignment ?? 'start';
    const padding = this.config.padding ?? 0;
    const childLayouts: LayoutResult[] = [];
    const anchor = this.config.anchor || 'center';
    const bottomToTop = isBottomToTop(anchor);

    // Create padded inner rectangle for child layout
    const innerLayout: LayoutResult = {
      x: containerLayout.x + padding,
      y: containerLayout.y + padding,
      width: containerLayout.width - 2 * padding,
      height: containerLayout.height - 2 * padding,
    };

    // Calculate total height of children with gaps
    let totalHeight = 0;
    const childSizes: { width: number; height: number }[] = [];
    for (const child of this.children) {
      const childSize = child.getPreferredSize();
      const width = innerLayout.width;
      const height = childSize.height ?? innerLayout.height;
      childSizes.push({ width, height });
      totalHeight += height;
    }
    // Add gaps between children (n-1 gaps for n children)
    if (this.children.length > 1) {
      totalHeight += gap * (this.children.length - 1);
    }

    // Calculate starting position based on spacing mode
    let currentY = getSpacingStartPosition(
      innerLayout.y,
      innerLayout.height,
      totalHeight,
      spacing,
      bottomToTop
    );

    // Place children
    for (let i = 0; i < this.children.length; i++) {
      const { width, height } = childSizes[i];

      // Calculate X position based on alignment mode (cross-axis)
      const x = getColumnAlignmentX(innerLayout, anchor, alignment, width);

      if (bottomToTop) {
        // Place from bottom to top: subtract height first, then place
        currentY -= height;
        childLayouts.push({ x, y: currentY, width, height });
        currentY -= gap;  // Subtract gap after placing
      } else {
        // Place from top to bottom: place first, then add height
        childLayouts.push({ x, y: currentY, width, height });
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
    const padding = this.config.padding ?? 0;
    const childLayouts: LayoutResult[] = [];
    const containerAnchor = this.config.anchor || 'center';

    // Create padded inner rectangle for child layout
    const innerLayout: LayoutResult = {
      x: containerLayout.x + padding,
      y: containerLayout.y + padding,
      width: containerLayout.width - 2 * padding,
      height: containerLayout.height - 2 * padding,
    };

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      const childConfig = this.config.children?.[i];
      const childSize = child.getPreferredSize();
      const childAnchor = childConfig?.anchor || containerAnchor;
      const childOffset = childConfig?.offset || { x: 0, y: 0 };

      // Calculate where the anchor point will land
      const containerAnchorPoint = getAnchorPoint(innerLayout, containerAnchor);
      const targetPoint = applyOffset(containerAnchorPoint, childOffset);

      // Calculate available space from anchor to edges
      const availableSpace = this.calculateAvailableSpace(
        innerLayout,
        targetPoint,
        childAnchor
      );

      // Use available space for undefined dimensions
      const width = childSize.width ?? availableSpace.width;
      const height = childSize.height ?? availableSpace.height;

      const position = calculateChildPosition(
        innerLayout,
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
   * Calculate horizontal offset to position content within allocated space
   * Uses spacing attribute to determine alignment (start/center/end)
   */
  private calculateContentOffsetX(allocatedWidth: number, contentWidth: number): number {
    if (allocatedWidth <= contentWidth) {
      return 0; // No offset if content fills or exceeds allocated space
    }

    const spacing = this.config.spacing ?? 'start';
    const availableSpace = allocatedWidth - contentWidth;

    // For row layout, spacing affects horizontal positioning
    if (this.config.layout === 'row') {
      if (spacing === 'center') {
        return availableSpace / 2;
      } else if (spacing === 'end') {
        return availableSpace;
      }
      // 'start' and 'even' both use 0 offset
      return 0;
    }

    // For column/manual layout, use anchor-based positioning
    // Default to center for non-row layouts
    return availableSpace / 2;
  }

  /**
   * Calculate vertical offset to position content within allocated space
   * Uses spacing attribute to determine alignment (start/center/end)
   */
  private calculateContentOffsetY(allocatedHeight: number, contentHeight: number): number {
    if (allocatedHeight <= contentHeight) {
      return 0; // No offset if content fills or exceeds allocated space
    }

    const spacing = this.config.spacing ?? 'start';
    const availableSpace = allocatedHeight - contentHeight;

    // For column layout, spacing affects vertical positioning
    if (this.config.layout === 'column') {
      if (spacing === 'center') {
        return availableSpace / 2;
      } else if (spacing === 'end') {
        return availableSpace;
      }
      // 'start' and 'even' both use 0 offset
      return 0;
    }

    // For row/manual layout, use anchor-based positioning
    // Default to center for non-column layouts
    return availableSpace / 2;
  }

  /**
   * Phase 3: Render with calculated layout
   * Container now fills allocated space and positions content based on spacing
   */
  render(layout: LayoutResult): string {
    // Get our preferred (content) size
    const preferredSize = this.getPreferredSize();
    const contentWidth = preferredSize.width ?? layout.width;
    const contentHeight = preferredSize.height ?? layout.height;

    // Calculate content offset based on spacing (when allocated > content)
    const offsetX = this.calculateContentOffsetX(layout.width, contentWidth);
    const offsetY = this.calculateContentOffsetY(layout.height, contentHeight);

    // Create adjusted layout for content area
    const contentLayout: LayoutResult = {
      x: layout.x + offsetX,
      y: layout.y + offsetY,
      width: contentWidth,
      height: contentHeight,
    };

    // Calculate layouts for all children within content area
    const childLayouts = this.calculateChildLayouts(contentLayout);

    let svg = '<g class="container">\n';

    // Render background at full allocated size (renders first = bottom layer)
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
