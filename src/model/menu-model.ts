import { Menu, MenuItem, VariantGroup } from "@/types";
import { getAllMenuItems } from "@/lib/menu-compat";
import { anyChange, state, typeChange } from "@/lib/data-model";
import { ALL, DataBinding, Update, UpdateResult, WHERE } from "@/lib/data-model-types";
import { OrderItem, OrderModifier } from "./order-model";

export type DisplayMenuItem = {
  data: MenuItem;
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

export function toOrderMenuItem(item: MenuItem): OrderMenuItem {
  return {
    menuItem: item,
    modifiers: [],
    modifiersPrice: 0,
    unitPrice: item.price ?? 0,
    quantity: 1,
    total: item.price ?? 0,
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

      if (order.menuItem.variants?.selectedId) {
        const variants = order.menuItem.variants;
        stmt.variants = {
          [variants.groupId]: {
            [WHERE]: (v: VariantGroup) => v != null,
            selectedId: variants.selectedId,
          },
        };
      }

      return stmt;
    },
  },
  // Variant selection, update menu items and order
  {
    init: true,
    onChange: ["variants", [ALL], "selectedId"],
    update: (group: VariantGroup) => ({
      order: {
        [WHERE]: (order) => order != null && order.menuItem.variants?.groupId === group.id,
        menuItem: {
          variants: { selectedId: group.selectedId },
          price: (_, item) => item.variants?.price[group.selectedId],
        },
      },
      menu: {
        [ALL]: {
          [WHERE]: (item) => item.data.variants?.groupId === group.id,
          data: {
            variants: { selectedId: group.selectedId },
            price: (_, item) => item.variants?.price[group.selectedId],
          },
        },
      },
    }),
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
    onChange: ["menu", [ALL], { data: { price: anyChange }, quantity: anyChange, included: anyChange }],
    update(item: DisplayMenuItem) {
      const additionalQty = item.quantity - (item.included ? 1 : 0);
      const total = additionalQty * (item.data.price ?? 0);
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
            price: item.data.price ?? 0,
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

      const price = order.menuItem.price ?? 0;
      const unitPrice = price + order.modifiersPrice;
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

    // Build menu map from DisplayMenu items
    // Handle both three-layer and legacy structures
    if ('items' in displayMenu && 'itemGroups' in displayMenu) {
      // Three-layer structure - items are already DisplayMenuItems
      for (const [id, item] of Object.entries(displayMenu.items)) {
        this.data.menu[id] = item as any as DisplayMenuItem;
      }
    } else if ('content' in (displayMenu as any)) {
      // Legacy structure
      const allItems = getAllMenuItems(displayMenu);
      for (const item of allItems) {
        if ('data' in (item as any)) {
          this.data.menu[(item as unknown as DisplayMenuItem).data.id] = item as unknown as DisplayMenuItem;
        }
      }
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
