import { Menu, MenuItem, VariantGroup, isVariantPricing } from "@/types";
import { anyChange, state, typeChange } from "@/lib/data-model";
import { ALL, DataBinding, Update, UpdateResult, WHERE } from "@/lib/data-model-types";
import { OrderItem, OrderModifier } from "./order-model";

export type DisplayMenuItem = {
  data: MenuItem;
  price: number; // Computed price based on selected variant or fixed price
  selected?: boolean;
  included?: boolean;
  quantity: number;
  total: number;
};

export function toDisplayMenuItem(data: MenuItem) {
  //TODO make price optional
  return { data, price: data.price ?? 0, quantity: 0, total: 0 };
}

export type OrderMenuItem = {
  order?: OrderItem;
  menuItem: MenuItem;
  quantity: number;
  modifiers: OrderModifier[];
  modifiersPrice: number;
  unitPrice: number;
  total: number;
};

export type DisplayMenu = Menu<DisplayMenuItem>;

export function toOrderMenuItem(item: MenuItem, variantId?: string): OrderMenuItem {
  // Compute the price based on whether it's fixed or variant-based
  let price = 0;
  if (typeof item.price === "number") {
    price = item.price;
  } else if (item.price && variantId) {
    price = item.price.prices[variantId] ?? 0;
  }

  return {
    menuItem: item,
    modifiers: [],
    modifiersPrice: 0,
    unitPrice: price,
    quantity: 1,
    total: price,
  };
}

export type MenuPageData = DisplayMenu & {
  order?: OrderMenuItem;
};

const bindings: DataBinding<MenuPageData>[] = [
  // When parent order is set, update the variant of the menu
  {
    onChange: [{ order: typeChange }],
    update: orderChanged,
  },
  // Variant selection, update menu items and order
  {
    init: true,
    onChange: ["variants", ALL, "selectedId"],
    update: (data: MenuPageData, groupId: string) => {
      const group = data.variants?.[groupId]!;
      const updates: Update<MenuPageData> = {
        items: {
          [ALL]: {
            [WHERE]: (item) => isVariantPricing(item.data.price) && item.data.price.groupId === groupId,
            price: (_, item) => {
              if (isVariantPricing(item.data.price)) {
                return item.data.price.prices[group.selectedId] ?? 0;
              }
              return 0;
            },
          },
        },
      };

      // Update order if it has variant pricing
      if (data.order && isVariantPricing(data.order.menuItem.price) && data.order.menuItem.price.groupId === group.id) {
        const newPrice = data.order.menuItem.price.prices[group.selectedId] ?? 0;
        updates.order = {
          unitPrice: newPrice,
          total: newPrice * (data.order?.quantity ?? 1),
        };
      }

      return updates;
    },
  },
  // Choice selection. On single selection, unselect others
  {
    onChange: ["items", [ALL], "selected"],
    update(selectItem: DisplayMenuItem) {
      if (selectItem.selected && selectItem.data.constraints?.choice?.single) {
        return {
          items: {
            [ALL]: {
              [WHERE]: (item) => item.data.constraints?.choice?.id === selectItem.data.constraints?.choice?.id,
              selected: (_, item) => item.data.id === selectItem.data.id,
            },
          },
        };
      }
      return {};
    },
  },
  // On selection change upate quantity
  {
    onChange: ["items", [ALL], "selected"],
    update(item: DisplayMenuItem) {
      if (item.selected === true) {
        if (item.quantity === 0) {
          return { items: { [item.data.id]: { quantity: 1 } } };
        }
        return {};
      }

      if (item.selected === false) {
        return { items: { [item.data.id]: { quantity: 0 } } };
      }

      // Keep quantity for undefined selection
      return {};
    },
  },
  //update item total price
  {
    onChange: ["items", [ALL], { price: anyChange, quantity: anyChange, included: anyChange }],
    update(item: DisplayMenuItem) {
      const additionalQty = item.quantity - (item.included ? 1 : 0);
      const total = additionalQty * item.price;
      return { items: { [item.data.id]: { total } } };
    },
  },
  {
    onChange: [{ items: { [ALL]: { included: anyChange, quantity: anyChange } } }],
    update(data: MenuPageData) {
      if (data.order) {
        const modifiers: OrderModifier[] = Object.values(data.items)
          .filter((item) => {
            if (item.included) {
              return item.quantity !== 1 && !item.data.constraints?.choice?.single;
            }
            return item.quantity > 0;
          })
          .map((item) => ({
            menuItemId: item.data.id,
            name: item.data.name,
            quantity: item.quantity,
            price: item.price,
          }));
        console.log("SETTIGN MODS: ");
        return { order: { modifiers: [modifiers] } };
      }
      return {};
    },
  },
  {
    onChange: [{ items: { [ALL]: { total: anyChange } } }],
    update(data: MenuPageData) {
      if (data.order) {
        let modifiersPrice = Object.values(data.items).reduce((sum, c) => (sum += c.total ?? 0), 0);
        return { order: { modifiersPrice: Math.max(0, modifiersPrice) } };
      }
      return {};
    },
  },
  {
    onChange: [{ order: { price: anyChange, modifiersPrice: anyChange, quantity: anyChange } }],
    update(data: MenuPageData) {
      const order = data.order;
      if (!order) return {};

      const unitPrice = order.unitPrice + order.modifiersPrice;
      const total = order.quantity * unitPrice;
      return { order: { unitPrice, total } };
    },
  },
];

export class MenuModel {
  data: MenuPageData = {} as MenuPageData;
  model = state(bindings);

  setMenu(displayMenu: DisplayMenu) {
    // Just spread the displayMenu and add order property
    this.data = {
      ...displayMenu,
      order: undefined,
    };

    return this.model.setData(this.data);
  }

  getMenuItem(id: string) {
    return this.data.items[id];
  }

  update(stmt: Update<MenuPageData>, changes?: UpdateResult<MenuPageData>) {
    try {
      return this.model.update(stmt, changes);
    } catch (e) {
      console.error(e);
    }
    return undefined;
  }

  updateAll(stmts: Update<MenuPageData>[], changes?: UpdateResult<MenuPageData>) {
    try {
      return this.model.updateAll(stmts, changes);
    } catch (e) {
      console.error(e);
    }
    return undefined;
  }
}

function orderChanged(data: MenuPageData) {
  const order = data.order;
  if (order == null) return {};

  const itemGroupChanges: Record<string, { remove: string[]; add: string[] }> = {};

  const stmt: Update<MenuPageData> = { items: {} };
  if (order.menuItem.subMenu?.included) {
    for (const included of order.menuItem.subMenu.included) {
      const itemId = included.item?.id || included.itemId;
      
      if (included.item) {
        // Replace/add the custom item
        (stmt.items as any)[included.item.id] = [toDisplayMenuItem(included.item)];
      } else {
        // Update existing item properties
        (stmt.items as any)[included.itemId] = {
          [WHERE]: (item: any) => item != null,
          included: true,
          selected: true,
          quantity: 1,
        };
      }

      // Handle moving items between groups
      if (included.display && data.itemGroups) {
        for (const [groupId, group] of Object.entries(data.itemGroups)) {
          const hasItem = group.itemIds.includes(itemId);
          const shouldHaveItem = groupId === included.display;
          
          if (hasItem && !shouldHaveItem) {
            // Remove from this group
            if (!itemGroupChanges[groupId]) {
              itemGroupChanges[groupId] = { remove: [], add: [] };
            }
            itemGroupChanges[groupId].remove.push(itemId);
          } else if (!hasItem && shouldHaveItem) {
            // Add to this group
            if (!itemGroupChanges[groupId]) {
              itemGroupChanges[groupId] = { remove: [], add: [] };
            }
            itemGroupChanges[groupId].add.push(itemId);
          }
        }
      }
    }
  }

  for (const [groupId, changes] of Object.entries(itemGroupChanges)) {
    const itemGroup = data.itemGroups?.[groupId];
    if (itemGroup) {
      // Start with existing items, remove unwanted, add new ones
      const ids = itemGroup.itemIds.filter((id) => !changes.remove.includes(id));
      changes.add.forEach((add) => {
        if (!ids.includes(add)) {
          ids.push(add);
        }
      });

      if (!stmt.itemGroups) {
        stmt.itemGroups = {};
      }
      (stmt.itemGroups as any)[groupId] = { itemIds: [ids] };
    }
  }

  if (order.order) {
    //override selected and quantity for included
    order.order.modifiers.reduce((u, mod) => {
      (u as any)[mod.menuItemId] = {
        ...((u as any)[mod.menuItemId] ?? {}),
        [WHERE]: (item: any) => item != null,
        selected: mod.quantity > 0,
        quantity: mod.quantity,
      };
      return u;
    }, stmt.items);
  }

  // Set variant selection if the menu item has variant pricing
  if (isVariantPricing(order.menuItem.price) && data.variants) {
    const variantGroup = data.variants[order.menuItem.price.groupId];
    if (variantGroup) {
      stmt.variants = {
        [order.menuItem.price.groupId]: {
          [WHERE]: (v: VariantGroup) => v != null,
          selectedId: variantGroup.selectedId,
        },
      };
    }
  }

  return stmt;
}
