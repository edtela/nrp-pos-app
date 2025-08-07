import { iterateItems, Menu, MenuItem, VariantGroup } from "@/types";
import { anyChange, state, typeChange } from "@/lib/data-model";
import { ALL, DataBinding, Update, UpdateResult, WHERE } from "@/lib/data-model-types";

export type DisplayMenuItem = MenuItem & {
  selected?: boolean;
  included?: number;
  quantity: number;
  total: number;
};

export type OrderMenuItem = DisplayMenuItem & {
  childrenPrice: number;
  unitPrice: number;
};

export type MenuPageData = {
  order?: OrderMenuItem;
  variants: Record<string, VariantGroup>;
  menu: Record<string, DisplayMenuItem>;
  bottom: BottomBarData;
};

export type BottomBarData = {
  left: {
    value: string | number;
    label: string;
  };
  action: {
    onClick?: any;
    label: string;
  };
  right: {
    value: string | number;
    label: string;
  };
};

const bindings: DataBinding<MenuPageData>[] = [
  // When parent order is set, update the variant of the menu
  {
    onChange: [{ order: typeChange }],
    update: (data: MenuPageData) => {
      console.log("PARENT SET");
      const variants = data.order?.variants;
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
        [WHERE]: (order) => order != null && order.variants?.groupId === group.id,
        variants: { selectedId: group.selectedId },
        price: (_, item) => item.variants?.price[group.selectedId],
      },
      menu: {
        [ALL]: {
          [WHERE]: (item) => item.variants?.groupId === group.id,
          variants: { selectedId: group.selectedId },
          price: (_, item) => item.variants?.price[group.selectedId],
        },
      },
    }),
  },
  {
    onChange: ["menu", [ALL], "included"],
    update(item: DisplayMenuItem) {
      if (item.included) {
        return { menu: { [item.id]: { selected: true, quantity: item.included } } };
      }
      return {};
    },
  },
  // Choice selection. On single selection, unselect others
  {
    onChange: ["menu", [ALL], "selected"],
    update(selectItem: DisplayMenuItem) {
      if (selectItem.selected && selectItem.constraints?.choice?.single) {
        return {
          menu: {
            [ALL]: {
              [WHERE]: (item) => item.constraints?.choice?.id === selectItem.constraints?.choice?.id,
              selected: (_, item) => item.id === selectItem.id,
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
        return { menu: { [item.id]: { quantity: item.included ?? 1 } } };
      }

      if (item.selected === false) {
        return { menu: { [item.id]: { quantity: 0 } } };
      }

      // Keep quantity for undefined selection
      return {};
    },
  },
  //update item total price
  {
    onChange: ["menu", [ALL], { price: anyChange, quantity: anyChange, included: anyChange }],
    update(item: DisplayMenuItem) {
      const additionalQty = (item.quantity ?? 0) - (item.included ?? 0);
      const total = additionalQty * (item.price ?? 0);
      return { menu: { [item.id]: { total } } };
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

      const price = order.price ?? 0;
      const unitPrice = price + Math.max(0, order.childrenPrice);
      const total = order.quantity * unitPrice;
      return { order: { unitPrice, total } };
    },
  },
  //update bottom ber
  {
    init: true,
    onChange: [{ order: typeChange }],
    update(page: MenuPageData) {
      if (page.order) {
        return {
          bottom: {
            left: {
              label: "Quantity",
            },
            action: {
              label: "Add to Order",
            },
            right: {
              label: "Total",
            },
          },
        };
      }
      return {};
    },
  },
  {
    onChange: [["order"], { total: anyChange, quantity: anyChange }],
    update(order: OrderMenuItem) {
      return { bottom: { left: { value: order.quantity }, right: { value: order.total.toFixed(2) } } };
    },
  },
];

const bottom: BottomBarData = {
  left: {
    value: 0,
    label: "Items",
  },
  action: {
    label: "View Order",
  },
  right: {
    value: 0,
    label: "Total",
  },
};

export class MenuModel {
  data: MenuPageData = { variants: {}, menu: {}, bottom };
  model = state(bindings);

  setMenu(menu: Menu) {
    this.data = { variants: {}, menu: {}, bottom };
    for (let vg of Object.values(menu.variants ?? {})) {
      this.data.variants[vg.id] = { ...vg };
    }

    for (let item of iterateItems(menu.content)) {
      this.data.menu[item.id] = { ...item, quantity: 0, total: 0 };
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
