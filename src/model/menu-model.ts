import { isVariantPrice, iterateItems, Menu, MenuItem, VariantGroup } from "@/types";
import { OrderEvent } from "./order-model";

export type MenuItemEvent = Partial<MenuItem>;
export type MenuEvent = Record<string, MenuItemEvent>;
export type MenuModelEvent = { order?: OrderEvent, menu?: MenuEvent };

export class MenuModel {
    variants: Record<string, VariantGroup> = {};
    items: Record<string, MenuItem> = {};

    setMenu(menu: Menu) {
        const event: MenuModelEvent = {menu: {}};

        this.variants = {};
        for (let vg of Object.values(menu.variants ?? {})) {
            this.variants[vg.id] = { ...vg };
        };

        this.items = {};
        for (let item of iterateItems(menu.content)) {
            this.items[item.id] = item;

            const price = item.price;
            if (isVariantPrice(price)) {
                if (item.variantGroupId && item.variantGroupId in this.variants) {
                    const variantGroup = this.variants[item.variantGroupId];
                    if (variantGroup.selectedId in price) {
                        const fixedPrice = price[variantGroup.selectedId];
                        event.menu![item.id] = {price: fixedPrice};    
                    }
                }
            }
        }

        return event;
    }
}