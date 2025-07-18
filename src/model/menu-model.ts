import { iterateItems, Menu, MenuItem, VariantGroup } from "@/types";
import { model } from "@/lib/data-model";
import { ALL, DataBinding, WHERE } from "@/lib/data-model-types";

export type MenuPageData = {
    variants: Record<string, VariantGroup>,
    menu: Record<string, MenuItem>
}

const bindings: DataBinding<MenuPageData>[] = [
    {
        onChange: ['variants', [ALL], 'selectedId'],
        update: (group: VariantGroup) => ({
            menu: {
                [ALL]: {
                    [WHERE]: (item) => item.variants?.groupId === group.id,
                    variants: { selectedId: group.selectedId },
                    price: (_, item) => item.variants?.price[group.selectedId]
                }
            }
        })
    }
]

export class MenuModel {
    model = model({ variants: {}, menu: {} }, bindings);

    setMenu(menu: Menu) {
        const data: MenuPageData = { variants: {}, menu: {} }
        for (let vg of Object.values(menu.variants ?? {})) {
            data.variants[vg.id] = { ...vg };
        };

        for (let item of iterateItems(menu.content)) {
            data.menu[item.id] = item;
        }

        this.model = model(data, bindings);
        return data;
    }

    setVariant(groupId: string, selectedId: string) {
        return this.model.update({ variants: { [groupId]: { selectedId } } });
    }
}


