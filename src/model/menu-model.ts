import { isVariantPrice, iterateItems, Menu, MenuItem, VariantGroup } from "@/types";
import { OrderEvent } from "./order-model";

export type MenuItemEvent = Partial<MenuItem>;
export type MenuEvent = Record<string, MenuItemEvent>;

export type VariantGroupEvent = { selectedId?: string };
export type VariantEvent = Record<string, VariantGroupEvent>;

export type MenuModelEvent = { order?: OrderEvent, menu?: MenuEvent, variant?: VariantEvent };

export class MenuModel {
    variants: Record<string, VariantGroup> = {};
    items: Record<string, MenuItem> = {};

    setMenu(menu: Menu) {
        this.items = {};
        for (let item of iterateItems(menu.content)) {
            this.items[item.id] = item;
        }

        const event: MenuModelEvent = { menu: {} };
        this.variants = {};
        for (let vg of Object.values(menu.variants ?? {})) {
            this.variants[vg.id] = { ...vg };
            this.variantUpdated(vg.id, event);
        };

        return event;
    }

    setVariant(groupId: string, selectedId: string) {
        const event: MenuModelEvent = { menu: {}, variant: {} };

        const group = this.variants[groupId];
        if (group == null) {
            throw new Error(`variant group doesn't exist: ${groupId}`);
        }

        if (group.selectedId != selectedId) {
            group.selectedId = selectedId;
            event.variant![groupId] = {selectedId};
            this.variantUpdated(groupId, event);
        }
        return event;
    }

    private variantUpdated(groupId: string, event: MenuModelEvent) {
        for (const item of Object.values(this.items)) {
            if (item.variantGroupId === groupId) {
                const price = item.price;
                if (isVariantPrice(price)) {
                    if (item.variantGroupId in this.variants) {
                        const variantGroup = this.variants[item.variantGroupId];
                        if (variantGroup.selectedId in price) {
                            const fixedPrice = price[variantGroup.selectedId];
                            if (event.menu![item.id]) {
                                event.menu![item.id] = { ...event.menu![item.id], price: fixedPrice }
                            } else {
                                event.menu![item.id] = { price: fixedPrice };
                            }
                        }
                    }
                }
            }
        }
    }
}