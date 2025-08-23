import { Menu, MenuItem, MenuPreUpdate, VariantGroup, isVariantPricing } from "@/types";
import { anyChange, state, typeChange } from "@/lib/data-model";
import { ALL, DataBinding, Update, UpdateResult, WHERE } from "@/lib/data-model-types";
import { OrderItem, OrderModifier } from "./order-model";

export function extractPricing(item: MenuItem, variants?: Record<string, VariantGroup>) {
  if (typeof item.price === "number") {
    return { price: item.price };
  }

  if (isVariantPricing(item.price)) {
    // Use the default selected variant's price
    const variantGroup = variants?.[item.price.groupId];
    if (variantGroup) {
      const price = item.price.prices[variantGroup.selectedId] ?? 0;
      return { price, variantId: variantGroup.selectedId };
    }
  }

  return { price: 0 };
}

export type DisplayMenuItem = {
  data: MenuItem;
  price: number; // Computed price based on selected variant or fixed price
  variantId?: string;
  selected?: boolean;
  included?: boolean;
  quantity: number;
  total: number;
  isCategory: boolean;
  isSingleChoice?: boolean; // Computed from choice definition (true if min=1 and max=1)
  isRequired?: boolean; // Computed from constraints (true if min >= 1)
};

export function toDisplayMenuItem(data: MenuItem, menu: DisplayMenu | Menu): DisplayMenuItem {
  // Compute isSingleChoice from choice definition if available
  const choices = menu.choices;
  let isSingleChoice: boolean | undefined;
  if (choices && data.constraints.choiceId) {
    const choice = choices[data.constraints.choiceId];
    if (choice) {
      isSingleChoice = choice.min === 1 && choice.max === 1;
    }
  }

  // Compute isRequired from constraints
  const isRequired = data.constraints.min !== undefined && data.constraints.min >= 1;
  const isCategory = data.price == null;

  const { price, variantId } = extractPricing(data, menu.variants);
  return { data, price, variantId, quantity: 0, total: 0, isCategory, isSingleChoice, isRequired };
}

export type DisplayMenu = Menu<DisplayMenuItem>;

export function toDisplayMenu(menu: Menu): DisplayMenu {
  const displayItems: Record<string, DisplayMenuItem> = {};

  for (const [id, item] of Object.entries(menu.items)) {
    displayItems[id] = toDisplayMenuItem(item, menu);
  }

  return { ...menu, items: displayItems };
}

export function toOrderItem(item: MenuItem, pageData: MenuPageData): OrderItem {
  // Compute the price based on whether it's fixed or variant-based
  let price = 0;
  let variant: OrderItem["variant"];
  if (typeof item.price === "number") {
    price = item.price;
  } else if (item.price) {
    const group = (pageData.variants ?? {})[item.price.groupId];
    variant = group.variants.find((v) => v.id === group.selectedId);
    price = item.price.prices[group.selectedId] ?? 0;
  }

  return {
    id: "",
    menuItem: item,
    modifiers: [],
    price,
    variant,
    modifiersPrice: 0,
    unitPrice: price,
    quantity: 1,
    total: price,
  };
}

export type MenuPageData = DisplayMenu & {
  order?: OrderItem;
};

export function toDisplayMenuUpdate(stmt: MenuPreUpdate, menu: DisplayMenu): Update<DisplayMenu> {
  const itemsUpdate = stmt.items;
  if (!itemsUpdate) {
    return stmt as Update<DisplayMenu>;
  }

  const dItemsUpdate: Record<string, Update<DisplayMenuItem>> = {};

  for (const key in itemsUpdate) {
    const itemStmt = itemsUpdate[key];
    if (typeof itemStmt === "function") {
      throw Error("Invalid update");
    }

    if (Array.isArray(itemStmt)) {
      const dItem = toDisplayMenuItem(itemStmt[0], menu);
      dItemsUpdate[key] = [dItem];
    } else {
      dItemsUpdate[key] = { data: itemStmt };
    }
  }

  return { ...stmt, items: dItemsUpdate } as Update<DisplayMenu>;
}

const bindings: DataBinding<MenuPageData>[] = [
  // When parent order is set, update selected variant, item selection
  {
    onChange: [{ order: typeChange }],
    update: orderChanged,
  },
  // Variant selection, update menu items and order
  {
    onChange: ["variants", ALL, "selectedId"],
    update: variantChanged,
  },
  //update required based on min constraints
  {
    onChange: ["items", [ALL], "data", "constraints", "min"],
    update: (item: DisplayMenuItem) => {
      return { items: { [item.data.id]: { isRequired: (item.data.constraints.min ?? 0) > 0 } } };
    },
  },
  // Choice selection. On single selection, unselect others
  {
    onChange: ["items", [ALL], "selected"],
    update(selectItem: DisplayMenuItem) {
      if (selectItem.selected && selectItem.isSingleChoice) {
        return {
          items: {
            [ALL]: {
              [WHERE]: (item) => item.data.constraints?.choiceId === selectItem.data.constraints?.choiceId,
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
  //create list of modifiers whenever included flag or quantity changes
  //can be done on selection
  {
    onChange: [{ items: { [ALL]: { included: anyChange, quantity: anyChange } } }],
    update: updateModifiers,
  },
  //When the total of any item changes, recalculate order.modifiersPrice
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
  //Update order unit price and total
  {
    onChange: [{ order: { price: anyChange, modifiersPrice: anyChange, quantity: anyChange } }],
    update(data: MenuPageData) {
      const order = data.order;
      if (!order) return {};

      const unitPrice = order.price + order.modifiersPrice;
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
      const itemId = included.itemId;
      (stmt.items as any)[included.itemId] = {
        [WHERE]: (item: any) => item != null,
        included: true,
        selected: true,
        quantity: 1,
      };

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

  if (order.modifiers.length > 0) {
    //override selected and quantity for included
    order.modifiers.reduce((u, mod) => {
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
  if (order.variant && isVariantPricing(order.menuItem.price)) {
    stmt.variants = {
      [WHERE]: (v) => v != null,
      [order.menuItem.price.groupId]: {
        [WHERE]: (v: VariantGroup) => v != null,
        selectedId: order.variant.id,
      },
    };
  }

  return stmt;
}

function variantChanged(data: MenuPageData, groupId: string) {
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
        variantId: group.selectedId,
      },
    },
  };

  // Update order if it has variant pricing
  if (data.order && isVariantPricing(data.order.menuItem.price) && data.order.menuItem.price.groupId === group.id) {
    const variant = group.variants.find((v) => v.id === group.selectedId);
    const newPrice = data.order.menuItem.price.prices[group.selectedId] ?? 0;
    updates.order = {
      price: newPrice,
      variant: variant,
    };
  }

  return updates;
}

function updateModifiers(data: MenuPageData): Update<MenuPageData> {
  if (!data.order) return {};

  const modifiers: OrderModifier[] = Object.values(data.items)
    .map((item) => {
      let modType: OrderModifier["modType"] | undefined;
      if (item.included) {
        if (item.quantity !== 1 && !item.isSingleChoice) {
          modType = "remove";
        }
      } else if (item.quantity > 0) {
        modType = item.price > 0 ? "add" : "modify";
      }

      if (modType) {
        return {
          menuItemId: item.data.id,
          name: item.data.name,
          quantity: item.quantity,
          price: item.price,
          modType,
        };
      }

      return undefined;
    })
    .filter((a) => a != null)
    .sort((a, b) => {
      if (a.modType === b.modType) {
        return a.name.localeCompare(b.name);
      }
      return a.modType === "remove" ? -1 : a.modType === "add" ? -1 : 1;
    });
  return { order: { modifiers: [modifiers] } };
}
