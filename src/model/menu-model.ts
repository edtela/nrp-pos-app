import { iterateItems, Menu, MenuItem, VariantGroup } from "@/types";
import { model } from "@/lib/data-model";
import { ALL, DataBinding, Update, WHERE } from "@/lib/data-model-types";

export type DisplayMenuItem = MenuItem & {
    selected?: boolean;
}

export type MenuPageData = {
    variants: Record<string, VariantGroup>,
    menu: Record<string, DisplayMenuItem>
}

const initBindings: DataBinding<MenuPageData>[] = [
    {
        onChange: ['variants', [ALL], 'selectedId'],
        update: (group: VariantGroup) => ({
            menu: {
                [ALL]: {
                    [WHERE]: (item) => item.variants?.groupId === group.id,
                    variants: { selectedId: group.selectedId },
                    price: (item) => item.variants?.price[group.selectedId]
                }
            }
        })
    },
    {
        // Handle choice selection
        onChange: ['menu', [ALL], 'selected'],
        update(selectItem: DisplayMenuItem) {
            if (selectItem.selected && selectItem.constraints?.choice?.single) {
                return {
                    menu: {
                        [ALL]: {
                            [WHERE]: (item) => item.constraints?.choice?.id === selectItem.constraints?.choice?.id,
                            selected: (item) => item.id === selectItem.id
                        }
                    }
                }
            }
            return {};
        },
    }
]

const updateBindings: DataBinding<MenuPageData>[] = [
    ...initBindings
]

export class MenuModel {
    data: MenuPageData = { variants: {}, menu: {} };
    model = model(this.data, initBindings);

    setMenu(menu: Menu) {
        this.data = { variants: {}, menu: {} }
        for (let vg of Object.values(menu.variants ?? {})) {
            this.data.variants[vg.id] = { ...vg };
        };

        for (let item of iterateItems(menu.content)) {
            this.data.menu[item.id] = item;
        }

        this.model = model(this.data, updateBindings);
        return this.data;
    }

    getMenuItem(id: string) {
        return this.data.menu[id];
    }

    update(stmt: Update<MenuPageData>) {
        return this.model.update(stmt);
    }
}


