import { iterateItems, Menu, MenuItem, VariantGroup } from "@/types";
import { OrderEvent } from "./order-model";
import { ALL, WHERE, update, type BindingPath, type Binding, type Update } from "@/lib/data-model";

export type MenuItemEvent = Partial<MenuItem>;
export type MenuEvent = Record<string, MenuItemEvent>;

export type VariantGroupEvent = { selectedId?: string };
export type VariantEvent = Record<string, VariantGroupEvent>;

export type MenuModelEvent = { order?: OrderEvent, menu?: MenuEvent, variant?: VariantEvent };

export type MenuDataModel = {
    variants: Record<string, VariantGroup>,
    menu: Record<string, MenuItem>
}

export class MenuModel {
    data: MenuDataModel = { variants: {}, menu: {} }

    setMenu(menu: Menu) {
        const event: MenuModelEvent = { menu: {} };

        this.data.variants = {};
        for (let vg of Object.values(menu.variants ?? {})) {
            this.data.variants[vg.id] = { ...vg };
        };

        this.data.menu = {};
        for (let item of iterateItems(menu.content)) {
            this.data.menu[item.id] = item;

            if (item.variantGroupId && item.variantGroupId in this.data.variants) {
                item.selectedVariantId = this.data.variants[item.variantGroupId]?.selectedId;
            }
        }

        return event;
    }

    setVariant(groupId: string, selectedId: string) {
        const group = this.data.variants[groupId];
        if (group == null) {
            throw new Error(`variant group doesn't exist: ${groupId}`);
        }

        const variantEvent = update({ [groupId]: group }, { [groupId]: { selectedId } }) as VariantEvent;
        if (variantEvent) {
            return this.variantUpdated({ variant: variantEvent });
        }
        return undefined;
    }

    private variantUpdated(event: MenuModelEvent) {
        for (const [groupId, group] of Object.entries(event?.variant ?? {})) {
            update(this.data, {
                menu: {
                    [ALL]: {
                        [WHERE]: (item: MenuItem) => item.variantGroupId === groupId,
                        selectedVariantId: group.selectedId
                    }
                }
            }, event);
        }
        return event;
    }
}

function variantUpdate(group: VariantGroup): Update<MenuDataModel> {
    return {
        menu: {
            [ALL]: {
                [WHERE]: (item: MenuItem) => item.variantGroupId === group.id,
                selectedVariantId: group.selectedId
            }
        }
    }
}

const variantBinding: Binding<MenuDataModel> = {
    onChange: ['variants', [ALL], 'selectedId'] as BindingPath<MenuDataModel>,
    update: variantUpdate
}

