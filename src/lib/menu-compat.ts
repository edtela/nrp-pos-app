/**
 * Menu Compatibility Layer
 * Converts between three-layer menu structure and legacy content structure for UI
 */

import { Menu, MenuItem, ItemGroup, MenuGroup, LegacyItemGroup, LegacyNestedGroup, Cells, Cell, DataCell } from "@/types";

/**
 * Check if a menu uses the new three-layer structure
 */
export function isThreeLayerMenu(menu: any): boolean {
  return 'items' in menu && 'itemGroups' in menu && 'layout' in menu && !('content' in menu);
}

/**
 * Convert three-layer menu to legacy content structure for UI compatibility
 */
export function convertToLegacyContent<T = MenuItem>(menu: Menu<T> | any): MenuGroup<T> {
  if (!isThreeLayerMenu(menu)) {
    // Already has content structure
    return (menu as any).content;
  }

  // Process the layout to build legacy content
  return processLayoutToContent(menu.layout, menu.items, menu.itemGroups);
}

/**
 * Process layout cells to build legacy content structure
 */
function processLayoutToContent<T>(
  layout: Cells,
  items: Record<string, T>,
  itemGroups: Record<string, ItemGroup>
): MenuGroup<T> {
  const cells = Array.isArray(layout) ? layout : [layout];
  const groups: MenuGroup<T>[] = [];
  let currentHeader: Cells | undefined;
  
  for (const cell of cells) {
    if (isItemGroupCell(cell)) {
      // This is an item group reference
      const groupId = cell.data as string;
      const group = itemGroups[groupId];
      
      if (group) {
        const groupItems: T[] = [];
        for (const itemId of group.itemIds) {
          const item = items[itemId];
          if (item) {
            groupItems.push(item);
          }
        }
        
        groups.push({
          header: currentHeader,
          items: groupItems
        } as LegacyItemGroup<T>);
        
        currentHeader = undefined; // Reset header after using it
      }
    } else if (isVariantCell(cell)) {
      // Skip variant cells, they're handled elsewhere
      continue;
    } else {
      // Accumulate as header for next group
      if (currentHeader) {
        currentHeader = Array.isArray(currentHeader) ? [...currentHeader, cell] : [currentHeader, cell];
      } else {
        currentHeader = cell;
      }
    }
  }
  
  // If we have multiple groups, return as nested group
  if (groups.length > 1) {
    return {
      groups
    } as LegacyNestedGroup<T>;
  } else if (groups.length === 1) {
    return groups[0];
  } else {
    // Fallback: return all items as a single group
    return {
      header: currentHeader,
      items: Object.values(items)
    } as LegacyItemGroup<T>;
  }
}

/**
 * Check if a cell is an item group DataCell
 */
function isItemGroupCell(cell: Cell): cell is DataCell {
  return 'type' in cell && cell.type === 'item-group';
}

/**
 * Check if a cell is a variant selection DataCell
 */
function isVariantCell(cell: Cell): cell is DataCell {
  return 'type' in cell && cell.type === 'variant-selection';
}

/**
 * Get all items from a menu (works with both structures)
 */
export function getAllMenuItems<T = MenuItem>(menu: Menu<T> | any): T[] {
  if (isThreeLayerMenu(menu)) {
    return Object.values(menu.items);
  }
  
  // Legacy structure - extract from content
  const items: T[] = [];
  function extractItems(group: MenuGroup<T>) {
    if ('items' in group && group.items) {
      items.push(...group.items);
    }
    if ('groups' in group && group.groups) {
      for (const subGroup of group.groups) {
        extractItems(subGroup);
      }
    }
  }
  
  if (menu.content) {
    extractItems(menu.content);
  }
  
  return items;
}

/**
 * Map items in a menu (works with both structures)
 */
export function mapMenuItems<I, O>(menu: Menu<I> | any, mapper: (item: I) => O): MenuGroup<O> | Record<string, O> {
  if (isThreeLayerMenu(menu)) {
    const mappedItems: Record<string, O> = {};
    for (const [id, item] of Object.entries(menu.items)) {
      mappedItems[id] = mapper(item as I);
    }
    return mappedItems;
  }
  
  // Legacy structure - map content recursively
  function mapGroup(group: MenuGroup<I>): MenuGroup<O> {
    if ('items' in group && group.items) {
      return {
        ...group,
        items: group.items.map(mapper)
      } as LegacyItemGroup<O>;
    }
    if ('groups' in group && group.groups) {
      return {
        ...group,
        groups: group.groups.map(mapGroup)
      } as LegacyNestedGroup<O>;
    }
    return group as any;
  }
  
  return mapGroup(menu.content);
}