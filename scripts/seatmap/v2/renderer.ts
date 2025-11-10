/**
 * SVG Renderer
 * Executes three-phase layout and generates SVG output
 */

import type { Component, LayoutResult, PreferredSize } from './types.js';

/**
 * Render options
 */
export interface RenderOptions {
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  padding?: number;
}

/**
 * Render a component tree to SVG
 *
 * Three-phase process:
 * 1. Query preferred size from root
 * 2. Calculate layout (position + size)
 * 3. Render to SVG
 */
export function renderToSVG(
  rootComponent: Component,
  options: RenderOptions = {}
): string {
  // Phase 1: Query preferred size
  const preferredSize = rootComponent.getPreferredSize();

  // Determine final size
  const padding = options.padding ?? 20;
  const contentWidth = preferredSize.width ?? 800;
  const contentHeight = preferredSize.height ?? 600;
  const viewBoxWidth = options.viewBoxWidth ?? contentWidth + padding * 2;
  const viewBoxHeight = options.viewBoxHeight ?? contentHeight + padding * 2;

  // Phase 2: Calculate root layout
  // Position root at center of viewbox
  const rootLayout: LayoutResult = {
    x: (viewBoxWidth - contentWidth) / 2,
    y: (viewBoxHeight - contentHeight) / 2,
    width: contentWidth,
    height: contentHeight,
  };

  // Phase 3: Render
  const content = rootComponent.render(rootLayout);

  // Generate SVG document
  let svg = '<?xml version="1.0" encoding="UTF-8"?>\n';
  svg += `<svg viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `  <!-- V2 Seatmap System -->\n\n`;
  svg += `  ${content}\n`;
  svg += '</svg>';

  return svg;
}
