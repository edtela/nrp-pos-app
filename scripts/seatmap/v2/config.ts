/**
 * Configuration loading and parsing
 * Converts user-facing JSON with unit strings to resolved configs with numbers
 */

import type {
  RootConfig,
  ComponentConfig,
  BoxConfig,
  ContainerConfig,
  TableConfig,
  ResolvedComponentConfig,
  ResolvedBoxConfig,
  ResolvedContainerConfig,
  ResolvedTableConfig,
  Component,
} from './types.js';
import { parseUnit, parseOffset } from './units.js';
import { Box } from './components/box.js';
import { Container } from './components/container.js';
import { Table } from './components/table.js';
import { resolveTemplates } from './template-resolver.js';

/**
 * Resolve a component configuration
 * Parses all unit strings to numbers
 * @param parentAnchor - Anchor from parent container (for inheritance)
 */
export function resolveComponentConfig(
  config: ComponentConfig,
  baseUnit: number,
  parentAnchor?: string
): ResolvedComponentConfig {
  if (config.type === 'box') {
    return resolveBoxConfig(config, baseUnit, parentAnchor);
  } else if (config.type === 'container') {
    return resolveContainerConfig(config, baseUnit, parentAnchor);
  } else if (config.type === 'table') {
    return resolveTableConfig(config, baseUnit, parentAnchor);
  }

  throw new Error(`Unknown component type: ${config.type}`);
}

/**
 * Resolve box configuration
 */
function resolveBoxConfig(
  config: BoxConfig,
  baseUnit: number,
  parentAnchor?: string
): ResolvedBoxConfig {
  return {
    type: 'box',
    name: config.name,
    width: parseUnit(config.width, baseUnit),
    height: parseUnit(config.height, baseUnit),
    fill: config.fill,
    anchor: config.anchor ?? parentAnchor,
    offset: parseOffset(config.offset, baseUnit),
  };
}

/**
 * Resolve container configuration
 */
function resolveContainerConfig(
  config: ContainerConfig,
  baseUnit: number,
  parentAnchor?: string
): ResolvedContainerConfig {
  // Use explicit anchor or inherit from parent
  const anchor = config.anchor ?? parentAnchor;

  // Pass this container's anchor to children for inheritance
  const resolvedChildren = config.children?.map((child) =>
    resolveComponentConfig(child, baseUnit, anchor)
  );

  return {
    type: 'container',
    name: config.name,
    layout: config.layout,
    gap: parseUnit(config.gap, baseUnit),
    spacing: config.spacing,
    alignment: config.alignment,
    padding: parseUnit(config.padding, baseUnit),
    width: parseUnit(config.width, baseUnit),
    height: parseUnit(config.height, baseUnit),
    fill: config.fill,
    anchor,
    offset: parseOffset(config.offset, baseUnit),
    children: resolvedChildren,
  };
}

/**
 * Resolve table configuration
 */
function resolveTableConfig(
  config: TableConfig,
  baseUnit: number,
  parentAnchor?: string
): ResolvedTableConfig {
  return {
    type: 'table',
    name: config.name,
    shape: config.shape,
    capacity: config.capacity,
    aspectRatio: config.aspectRatio ?? 1.0,
    baseUnit,
    fill: config.fill,
    stroke: config.stroke,
    anchor: config.anchor ?? parentAnchor,
    offset: parseOffset(config.offset, baseUnit),
  };
}

/**
 * Create component instance from resolved config
 */
export function createComponent(config: ResolvedComponentConfig): Component {
  if (config.type === 'box') {
    return new Box(config);
  } else if (config.type === 'container') {
    const children = (config.children || []).map(createComponent);
    return new Container(config, children);
  } else if (config.type === 'table') {
    return new Table(config);
  }

  throw new Error(`Unknown component type: ${config.type}`);
}

/**
 * Load and parse root configuration
 */
export function loadConfig(rootConfig: RootConfig): {
  baseUnit: number;
  rootComponent: Component;
} {
  const baseUnit = rootConfig.baseUnit;

  // Step 1: Resolve templates and defaults (before unit parsing)
  const resolvedChildren = rootConfig.children.map(child =>
    resolveTemplates(child, rootConfig.defaults, rootConfig.templates)
  );

  // Step 2: Parse units and create resolved configs
  const rootContainerConfig: ResolvedContainerConfig = {
    type: 'container',
    layout: null, // Manual layout at root
    anchor: rootConfig.anchor || 'center',
    children: resolvedChildren.map((child) => resolveComponentConfig(child, baseUnit)),
  };

  // Step 3: Create component instances
  const rootChildren = (rootContainerConfig.children || []).map(createComponent);
  const rootComponent = new Container(rootContainerConfig, rootChildren);

  return {
    baseUnit,
    rootComponent,
  };
}
