import { iterateItems, Menu, MenuItem, VariantGroup } from "@/types";
import { anyChange, state, typeChange } from "@/lib/data-model";
import { ALL, DataBinding, Update, UpdateResult, WHERE } from "@/lib/data-model-types";

export type DisplayMenuItem = {
  data: MenuItem;
  selected?: boolean;
  included?: boolean;
  quantity: number;
  total: number;
};

export type OrderMenuItem = {
  data: MenuItem;
  selected?: boolean;
  included?: boolean;
  quantity: number;
  total: number;
  childrenPrice: number;
  unitPrice: number;
};

export type DisplayMenu = Menu<DisplayMenuItem>;

export function toOrderMenuItem(item: MenuItem): OrderMenuItem {
  return {
    data: item,
    childrenPrice: 0,
    unitPrice: item.price ?? 0,
    quantity: 1,
    total: item.price ?? 0,
  };
}

export function isOrderMenuItem(item: any): item is OrderMenuItem {
  return item != null && "childrenPrice" in item && "data" in item;
}

export type MenuPageData = {
  order?: OrderMenuItem;
  variants: Record<string, VariantGroup>;
  menu: Record<string, DisplayMenuItem>;
  displayMenu?: DisplayMenu;
};

const bindings: DataBinding<MenuPageData>[] = [
  // When parent order is set, update the variant of the menu
  {
    onChange: [{ order: typeChange }],
    update: (data: MenuPageData) => {
      console.log("PARENT SET");
      const variants = data.order?.data.variants;
      if (variants?.selectedId) {
        return {
          variants: {
            [variants.groupId]: {
              [WHERE]: (v: VariantGroup) => v != null,
              selectedId: variants.selectedId,
            },
          },
        };
      }
      return {};
    },
  },
  // Variant selection, update menu items and order
  {
    init: true,
    onChange: ["variants", [ALL], "selectedId"],
    update: (group: VariantGroup) => ({
      order: {
        [WHERE]: (order) => order != null && order.data.variants?.groupId === group.id,
        data: {
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
  {
    onChange: ["menu", [ALL], "included"],
    update(item: DisplayMenuItem) {
      if (item.included) {
        return { menu: { [item.data.id]: { selected: true, quantity: 1 } } };
      }
      return {};
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
        return { menu: { [item.data.id]: { quantity: 1 } } };
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
      const total = additionalQty * (item.data.price ?? 0);
      return { menu: { [item.data.id]: { total } } };
    },
  },
  {
    onChange: [{ menu: { [ALL]: { total: anyChange } } }],
    update(data: MenuPageData) {
      if (data.order) {
        let childrenPrice = Object.values(data.menu).reduce((sum, c) => (sum += c.total ?? 0), 0);
        return { order: { childrenPrice } };
      }
      return {};
    },
  },
  {
    onChange: [{ order: { price: anyChange, childrenPrice: anyChange, quantity: anyChange } }],
    update(data: MenuPageData) {
      const order = data.order;
      if (!order) return {};

      const price = order.data.price ?? 0;
      const unitPrice = price + Math.max(0, order.childrenPrice);
      const total = order.quantity * unitPrice;
      return { order: { unitPrice, total } };
    },
  },
];

export class MenuModel {
  data: MenuPageData = { variants: {}, menu: {} };
  model = state(bindings);

  setMenu(menu: Menu) {
    this.data = { variants: {}, menu: {} };
    for (let vg of Object.values(menu.variants ?? {})) {
      this.data.variants[vg.id] = { ...vg };
    }

    for (let item of iterateItems(menu.content)) {
      this.data.menu[item.id] = { data: item, quantity: 0, total: 0 };
    }

    return this.model.setData(this.data);
  }

  getMenuItem(id: string) {
    return this.data.menu[id];
  }

  update(stmt: Update<MenuPageData>, changes?: UpdateResult<MenuPageData>) {
    try {
      const dc = this.model.update(stmt, changes);
      return dc;
    } catch (e) {
      console.error(e);
    }
    return undefined;
  }
}
