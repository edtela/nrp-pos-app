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
  if (typeof item.price === 'number') {
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

export type MenuPageData = {
  order?: OrderMenuItem;
  variants: Record<string, VariantGroup>;
  menu: Record<string, DisplayMenuItem>;
};

const bindings: DataBinding<MenuPageData>[] = [
  // When parent order is set, update the variant of the menu
  {
    onChange: [{ order: typeChange }],
    update: (data: MenuPageData) => {
      const order = data.order;
      if (order == null) return {};

      const stmt: Update<MenuPageData> = { menu: {} };
      if (order.menuItem.subMenu?.included) {
        order.menuItem.subMenu.included.reduce((u, includedItem) => {
          (u as any)[includedItem.itemId] = {
            [WHERE]: (item: any) => item != null,
            included: true,
            selected: true,
            quantity: 1,
          };
          return u;
        }, stmt.menu);
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
        }, stmt.menu);
      }

      // Set variant selection if the menu item has variant pricing
      if (isVariantPricing(order.menuItem.price)) {
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
    },
  },
  // Variant selection, update menu items and order
  {
    init: true,
    onChange: ["variants", [ALL], "selectedId"],
    update: (group: VariantGroup, _, data) => {
      const updates: Update<MenuPageData> = {
        menu: {
          [ALL]: {
            [WHERE]: (item) => isVariantPricing(item.data.price) && item.data.price.groupId === group.id,
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
    onChange: ["menu", [ALL], "selected"],
    update(selectItem: DisplayMenuItem) {
      if (selectItem.selected && selectItem.data.constraints?.choice?.single) {
        return {
          menu: {
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
    onChange: ["menu", [ALL], "selected"],
    update(item: DisplayMenuItem) {
      if (item.selected === true) {
        if (item.quantity === 0) {
          return { menu: { [item.data.id]: { quantity: 1 } } };
        }
        return {};
      }

      if (item.selected === false) {
        return { menu: { [item.data.id]: { quantity: 0 } } };
      }

      // Keep quantity for undefined selection
      return {};
    },
  },
  //update item total price
  {
    onChange: ["menu", [ALL], { price: anyChange, quantity: anyChange, included: anyChange }],
    update(item: DisplayMenuItem) {
      const additionalQty = item.quantity - (item.included ? 1 : 0);
      const total = additionalQty * item.price;
      return { menu: { [item.data.id]: { total } } };
    },
  },
  {
    onChange: [{ menu: { [ALL]: { included: anyChange, quantity: anyChange } } }],
    update(data: MenuPageData) {
      if (data.order) {
        const modifiers: OrderModifier[] = Object.values(data.menu)
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
    onChange: [{ menu: { [ALL]: { total: anyChange } } }],
    update(data: MenuPageData) {
      if (data.order) {
        let modifiersPrice = Object.values(data.menu).reduce((sum, c) => (sum += c.total ?? 0), 0);
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
  data: MenuPageData = { variants: {}, menu: {} };
  model = state(bindings);

  setMenu(displayMenu: DisplayMenu) {
    this.data = { variants: {}, menu: {} };

    // Copy variants
    for (let vg of Object.values(displayMenu.variants ?? {})) {
      this.data.variants[vg.id] = { ...vg };
    }

    // Build menu map from DisplayMenu items (three-layer structure)
    for (const [id, item] of Object.entries(displayMenu.items)) {
      this.data.menu[id] = item as DisplayMenuItem;
    }

    return this.model.setData(this.data);
  }

  getMenuItem(id: string) {
    return this.data.menu[id];
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
