/**
 * Template Resolution
 * Resolves defaults and template references in component configurations
 */

import type {
  ComponentConfig,
  ContainerConfig,
  Defaults,
  Templates,
} from './types.js';

/**
 * Merge properties with correct precedence
 * Later properties override earlier ones
 * Performs shallow merge - simple values overwrite, objects merge properties
 */
function mergeProperties(
  base: Record<string, any>,
  override: Record<string, any>
): Record<string, any> {
  const result = { ...base };

  for (const key in override) {
    const overrideValue = override[key];

    // Skip undefined values - they don't override
    if (overrideValue === undefined) {
      continue;
    }

    const baseValue = result[key];

    // If base has object and override has object, merge them
    if (
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue) &&
      typeof overrideValue === 'object' &&
      !Array.isArray(overrideValue)
    ) {
      result[key] = { ...baseValue, ...overrideValue };
    } else {
      // Otherwise, override completely replaces base
      result[key] = overrideValue;
    }
  }

  return result;
}

/**
 * Get type-based defaults for a component
 */
function getDefaultsForType(
  type: string,
  defaults?: Defaults
): Partial<ComponentConfig> {
  if (!defaults) {
    return {};
  }

  switch (type) {
    case 'table':
      return (defaults.table as Partial<ComponentConfig>) || {};
    case 'container':
      return (defaults.container as Partial<ComponentConfig>) || {};
    case 'box':
      return (defaults.box as Partial<ComponentConfig>) || {};
    default:
      return {};
  }
}

/**
 * Get template by name
 */
function getTemplate(
  templateName: string,
  templates?: Templates
): ComponentConfig | undefined {
  if (!templates) {
    return undefined;
  }

  const template = templates[templateName];

  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  // Validate: templates cannot have 'use' property (prevents circular refs)
  if ('use' in template) {
    throw new Error(`Template "${templateName}" cannot contain 'use' property (circular reference prevention)`);
  }

  return template;
}

/**
 * Resolve a single component's templates and defaults
 * Returns new config with merged properties
 * Order: defaults → template → instance (later overrides earlier)
 */
function resolveComponent(
  config: ComponentConfig,
  defaults?: Defaults,
  templates?: Templates
): ComponentConfig {
  // Start with type defaults
  let resolved: Record<string, any> = getDefaultsForType(config.type, defaults);

  // Apply template if referenced
  if ('use' in config && config.use) {
    const template = getTemplate(config.use, templates);
    if (template) {
      resolved = mergeProperties(resolved, template as Record<string, any>);
    }
  }

  // Apply instance properties (highest precedence)
  resolved = mergeProperties(resolved, config as Record<string, any>);

  // Remove 'use' property from final config (it's only for template reference)
  delete resolved.use;

  return resolved as ComponentConfig;
}

/**
 * Recursively resolve templates for component tree
 * Main entry point
 */
export function resolveTemplates(
  config: ComponentConfig,
  defaults?: Defaults,
  templates?: Templates
): ComponentConfig {
  // Resolve this component
  const resolved = resolveComponent(config, defaults, templates);

  // Recursively process children if this is a container
  if (resolved.type === 'container') {
    const containerConfig = resolved as ContainerConfig;
    if (containerConfig.children && containerConfig.children.length > 0) {
      containerConfig.children = containerConfig.children.map(child =>
        resolveTemplates(child, defaults, templates)
      );
    }
  }

  return resolved;
}
