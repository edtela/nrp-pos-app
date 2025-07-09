/**
 * Menu Content Model
 * Manages state and business logic for menu content
 */

import { Menu, MenuItem, MenuGroup, Choice, isItemGroup, isNestedGroup, isSaleItem } from '@/types/menu';
import { Cells } from '@/types/display';
import { getNumberPrice, OrderEvents, OrderModel, OrderStoreItem } from './order-model';

/**
 * Menu content data structure
 */
export interface MenuContentData {
  variants: VariantSelectorData[];
  content: MenuGroupData;
}

/**
 * Menu group data structure
 */
export type MenuGroupData = ItemGroupData | NestedGroupData;

export interface ItemGroupData {
  type: 'items';
  header?: Cells;
  items: MenuItemData[];
}

export interface NestedGroupData {
  type: 'nested';
  header?: Cells;
  groups: MenuGroupData[];
}

export interface MenuItemData {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  price?: number;
  selected: boolean;
  interactionType: 'navigate' | 'radio' | 'checkbox' | 'none';
}

/**
 * Variant option data
 */
export interface VariantOption {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Complete data structure for variant selector
 */
export interface VariantSelectorData {
  id: string;
  label?: string;
  options: VariantOption[];
  selectedOptionId: string;
}

/**
 * Menu content data changes
 */
export interface MenuContentDataChange {
  menuItem?: {
    [id: string]: MenuItemDataChange;
  };
  variant?: {
    [id: string]: VariantSelectorDataChange;
  };
}

export interface MenuItemDataChange {
  price?: {
    value?: number;
  };
  selected?: {
    value: boolean;
  };
}

/**
 * Partial data structure for updates
 */
export interface VariantSelectorDataChange {
  selectedOptionId?: {
    value: string;
  };
}

/**
 * Combined model change result
 */
export interface ModelChangeResult {
  menu: MenuContentDataChange;
  order?: OrderEvents;
}

/**
 * Choice group model for managing selection constraints
 */
class ChoiceGroupModel {
  private itemIds: Set<string>;
  private constraints: { min: number; max: number };

  constructor(_choiceId: string, choice: Choice) {
    this.itemIds = new Set();
    this.constraints = {
      min: choice.min ?? 0,
      max: choice.max ?? Infinity
    };
  }

  addItem(itemId: string): void {
    this.itemIds.add(itemId);
  }

  /**
   * Handle selection and return changes for all affected items
   */
  handleSelection(selectedId: string, currentSelections: Set<string>): Map<string, MenuItemDataChange> {
    const changes = new Map<string, MenuItemDataChange>();
    const isCurrentlySelected = currentSelections.has(selectedId);

    // Radio button behavior (max = 1)
    if (this.constraints.max === 1) {
      if (this.constraints.min === 1 && isCurrentlySelected) {
        // Required radio - can't deselect
        return changes;
      }

      // Deselect all others
      this.itemIds.forEach(itemId => {
        if (itemId !== selectedId && currentSelections.has(itemId)) {
          changes.set(itemId, { selected: { value: false } });
        }
      });

      // Toggle selected item
      changes.set(selectedId, { selected: { value: !isCurrentlySelected } });
    } else {
      // Checkbox behavior - simple toggle for now
      changes.set(selectedId, { selected: { value: !isCurrentlySelected } });
    }

    return changes;
  }
}

/**
 * Menu content model
 */
export class MenuContentModel {
  private menu: Menu;
  private menuItems: Map<string, MenuItem> = new Map();
  private menuItemData: Map<string, MenuItemData> = new Map();
  private variantData: Map<string, VariantSelectorData> = new Map();
  private choiceGroups: Map<string, ChoiceGroupModel> = new Map();
  private includedItemIds: Set<string> = new Set();
  private selectedVariants: Map<string, string> = new Map();
  private selectedItems: Set<string> = new Set();

  /**
   * @param orderItem 
   * @param initialVariants 
   */

  constructor(menu: Menu, private orderModel: OrderModel, private orderId?: string, initialVariants?: Map<string, string>) {
    this.menu = menu;

    let orderItem: OrderStoreItem | undefined;
    if (orderId) {
      orderModel.get(orderId);
    }

    // Initialize included items
    if (orderItem?.menuItem.subMenu?.included) {
      orderItem.menuItem.subMenu.included.forEach(id => {
        this.includedItemIds.add(id);
      });
    }

    // Initialize variants
    if (menu.variants) {
      Object.entries(menu.variants).forEach(([variantId, variantGroup]) => {
        const selectedId = initialVariants?.get(variantId) || variantGroup.selectedId;
        this.selectedVariants.set(variantId, selectedId);
      });
    }

    // Initialize selected items from order item
    if (orderItem) {
      this.initializeSelectedItems();
    }

    // Build choice groups
    this.buildChoiceGroups();
  }

  /**
   * Get the complete data structure for rendering
   */
  getData(): MenuContentData {
    // Build variant data
    const variants: VariantSelectorData[] = [];
    if (this.menu.variants) {
      Object.entries(this.menu.variants).forEach(([variantId, variantGroup]) => {
        const data: VariantSelectorData = {
          id: variantId,
          label: variantGroup.name,
          options: variantGroup.variants.map(v => ({
            id: v.id,
            name: v.name,
            icon: v.icon
          })),
          selectedOptionId: this.selectedVariants.get(variantId) || variantGroup.selectedId
        };
        variants.push(data);
        this.variantData.set(variantId, data);
      });
    }

    // Process menu content
    const processedContent = this.processMenuGroup(this.menu.content);

    return {
      variants,
      content: processedContent
    };
  }

  /**
   * Get menu item for navigation
   */
  getMenuItem(itemId: string): MenuItem | undefined {
    return this.menuItems.get(itemId);
  }

  /**
   * Get selected variant for an item
   */
  getSelectedVariant(variantId: string): string | undefined {
    return this.selectedVariants.get(variantId);
  }

  /**
   * Handle menu item toggle event
   */
  handleItemToggle(itemId: string): MenuContentDataChange | null {
    const item = this.menuItems.get(itemId);
    if (!item || !isSaleItem(item)) return null;

    const menuItemChanges: MenuContentDataChange['menuItem'] = {};

    // Handle choice constraints
    if (item.choiceId && this.choiceGroups.has(item.choiceId)) {
      const choiceGroup = this.choiceGroups.get(item.choiceId)!;
      const itemChanges = choiceGroup.handleSelection(itemId, this.selectedItems);

      // Apply changes to model state and build change object
      itemChanges.forEach((change, id) => {
        if (change.selected) {
          if (change.selected.value) {
            this.selectedItems.add(id);
          } else {
            this.selectedItems.delete(id);
          }
          menuItemChanges[id] = change;

          // Update the stored data
          const data = this.menuItemData.get(id);
          if (data) {
            data.selected = change.selected.value;
          }
        }
      });
    } else {
      // Simple toggle
      const isSelected = this.selectedItems.has(itemId);
      const newSelected = !isSelected;

      if (newSelected) {
        this.selectedItems.add(itemId);
      } else {
        this.selectedItems.delete(itemId);
      }

      menuItemChanges![itemId] = { selected: { value: newSelected } };

      // Update the stored data
      const data = this.menuItemData.get(itemId);
      if (data) {
        data.selected = newSelected;
      }
    }

    const orderChanges = this.orderModel.run((om) => {
      Object.keys(menuItemChanges).forEach(k => {
        const menuItem = this.menuItemData.get(k);
        if (menuItem) {
          const change = menuItemChanges[k];
          if (change.selected) {
            if (change.selected.value) {
              om.addFromMenuItem(menuItem, this.orderId);
            } else if (this.orderId) {
              om.removeByMenuItem(this.orderId, menuItem.id);
            }
          }
        }
      });
    });

    const changes: MenuContentDataChange = { menuItem: menuItemChanges };
    return changes;
  }

  /**
   * Handle variant change event
   */
  handleVariantChange(variantGroupId: string, variantId: string): ModelChangeResult | null {
    if (!this.menu.variants?.[variantGroupId]) return null;

    // Update selected variant
    this.selectedVariants.set(variantGroupId, variantId);

    // Update variant data
    const variantData = this.variantData.get(variantGroupId);
    if (variantData) {
      variantData.selectedOptionId = variantId;
    }

    // Build menu changes
    const menuChanges: MenuContentDataChange = {
      variant: {
        [variantGroupId]: { selectedOptionId: { value: variantId } }
      },
      menuItem: {}
    };


    // Update all item prices that depend on this variant
    this.menuItemData.forEach((data, itemId) => {
      const item = this.menuItems.get(itemId);
      if (item?.variantGroupId === variantGroupId && item.price !== undefined) {
        const newPrice = getNumberPrice(item.price, variantId);
        if (data.price !== newPrice) {
          data.price = newPrice;
          menuChanges.menuItem![itemId] = { price: { value: newPrice } };
        }
      }
    });

    const orderId = this.orderId;
    if (orderId) {
      const orderChanges = this.orderModel.run((om) => om.setVariant(orderId, variantId));
      return { menu: menuChanges, order: orderChanges };
    }

    return { menu: menuChanges };
  }

  /**
   * Get current order item
   */
  getOrderItem(): OrderStoreItem | undefined {
    return this.orderId ? this.orderModel.get(this.orderId) : undefined;
  }

  /**
   * Initialize selected items from order item
   */
  private initializeSelectedItems(): void {
    const orderItem = this.getOrderItem();
    if (!orderItem) return;

    // If we have modifiers, use them to determine selection
    if (orderItem.children.length > 0) {
      // Mark all modifiers as selected
      orderItem.children.map(cId => this.orderModel.get(cId)).forEach(modifier => {
        if (modifier) {
          this.selectedItems.add(modifier.menuItem.id);
        }
      });
    } else {
      // No modifiers yet - this is a fresh order
      // All included items should be selected by default
      this.includedItemIds.forEach(itemId => {
        this.selectedItems.add(itemId);
      });
    }

  }

  /**
   * Build choice groups from menu
   */
  private buildChoiceGroups(): void {
    const processGroup = (group: MenuGroup) => {
      if (isItemGroup(group)) {
        group.items.forEach(item => {
          this.menuItems.set(item.id, item);
          if (item.choiceId && this.menu.choices?.[item.choiceId]) {
            if (!this.choiceGroups.has(item.choiceId)) {
              this.choiceGroups.set(
                item.choiceId,
                new ChoiceGroupModel(item.choiceId, this.menu.choices[item.choiceId])
              );
            }
            this.choiceGroups.get(item.choiceId)!.addItem(item.id);
          }
        });
      } else if (isNestedGroup(group)) {
        group.groups.forEach(processGroup);
      }
    };

    processGroup(this.menu.content);
  }

  /**
   * Process menu group into data structure
   */
  private processMenuGroup(group: MenuGroup, extractToArray?: MenuItemData[]): MenuGroupData {
    if (isItemGroup(group)) {
      const items: MenuItemData[] = [];

      // Check if this is an extractIncluded group
      if (group.options?.extractIncluded) {
        // This is a placeholder group - it will receive extracted items from parent
        // Items will be populated by the parent's extractToArray
      } else {
        // Normal item group processing
        group.items.forEach(item => {
          const data = this.buildMenuItemData(item);
          this.menuItemData.set(item.id, data);

          // If we're in extraction mode and this item is included, extract it
          if (extractToArray && this.includedItemIds.has(item.id)) {
            extractToArray.push(data);
          } else if (!extractToArray || !this.includedItemIds.has(item.id)) {
            // Otherwise add to regular items
            items.push(data);
          }
        });
      }

      // Pass through header Cells directly
      const header = group.header;

      return {
        type: 'items',
        header,
        items
      };
    } else if (isNestedGroup(group)) {
      const processedGroups: MenuGroupData[] = [];
      let extractedItems: MenuItemData[] | null = null;
      let extractIncludedGroup: MenuGroupData | null = null;

      // Process groups in order
      group.groups.forEach((g) => {
        // Check if this is the extractIncluded marker
        if (isItemGroup(g) && g.options?.extractIncluded) {
          // Start extraction mode for subsequent groups
          extractedItems = [];
          extractIncludedGroup = this.processMenuGroup(g, extractedItems);
          processedGroups.push(extractIncludedGroup);
        } else {
          // Process the group, passing the extraction array if we're after the marker
          const processed = this.processMenuGroup(g, extractedItems || undefined);
          processedGroups.push(processed);
        }
      });

      // If we extracted items, update the extractIncluded group with them
      if (extractedItems !== null && extractIncludedGroup !== null) {
        const group = extractIncludedGroup as MenuGroupData;
        if (group.type === 'items') {
          group.items = extractedItems;
        }
      }

      // Pass through header Cells directly
      const header = group.header;

      return {
        type: 'nested',
        header,
        groups: processedGroups
      };
    }

    throw new Error('Invalid menu group type');
  }

  /**
   * Build menu item data
   */
  private buildMenuItemData(item: MenuItem): MenuItemData {
    // Determine interaction type
    let interactionType: MenuItemData['interactionType'] = 'none';

    if (item.subMenu) {
      interactionType = 'navigate';
    } else if (isSaleItem(item)) {
      if (item.choiceId && this.menu.choices?.[item.choiceId]) {
        const choice = this.menu.choices[item.choiceId];
        interactionType = choice.max === 1 ? 'radio' : 'checkbox';
      } else {
        interactionType = 'checkbox';
      }
    }

    // Calculate price
    const variant = item.variantGroupId ? this.selectedVariants.get(item.variantGroupId) : undefined;
    const price = item.price !== undefined ? getNumberPrice(item.price, variant) : undefined;

    // Check if selected - now that initializeSelectedItems properly sets up the state,
    // we can simply check if the item is in selectedItems
    const isSelected = this.selectedItems.has(item.id);


    return {
      id: item.id,
      name: item.name,
      description: item.description,
      icon: item.icon,
      price,
      selected: isSelected,
      interactionType
    };
  }
}