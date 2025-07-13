import { iterateItems, Menu, MenuItem, VariantGroup } from "@/types";
import { OrderEvent } from "./order-model";
import { setValues, forEachEntry } from "@/lib/object-utils";

export type MenuItemEvent = Partial<MenuItem>;
export type MenuEvent = Record<string, MenuItemEvent>;

export type VariantGroupEvent = { selectedId?: string };
export type VariantEvent = Record<string, VariantGroupEvent>;

export type MenuModelEvent = { order?: OrderEvent, menu?: MenuEvent, variant?: VariantEvent };

export class MenuModel {
    variants: Record<string, VariantGroup> = {};
    items: Record<string, MenuItem> = {};

    setMenu(menu: Menu) {
        const event: MenuModelEvent = { menu: {} };
        
        this.variants = {};
        for (let vg of Object.values(menu.variants ?? {})) {
            this.variants[vg.id] = { ...vg };
        };

        this.items = {};
        for (let item of iterateItems(menu.content)) {
            this.items[item.id] = item;

            if (item.variantGroupId && item.variantGroupId in this.variants) {
                item.selectedVariantId = this.variants[item.variantGroupId]?.selectedId;
            }
        }

        return event;
    }

    setVariant(groupId: string, selectedId: string) {
        const group = this.variants[groupId];
        if (group == null) {
            throw new Error(`variant group doesn't exist: ${groupId}`);
        }

        const variantEvent = setValues({ [groupId]: group }, { [groupId]: { selectedId } }) as VariantEvent;
        if (variantEvent) {
            return this.variantUpdated({ variant: variantEvent });
        }     
        return undefined;
    }

    private variantUpdated(event: MenuModelEvent) {
        for (const [groupId, group] of Object.entries(event?.variant ?? {})) {
             setValues({ menu: this.items }, {
                menu: forEachEntry
                    .where((_, item) => item.variantGroupId === groupId)
                    .map(() => ({ selectedVariantId: group.selectedId }))
            }, event);
        }
        return event;
    }
}