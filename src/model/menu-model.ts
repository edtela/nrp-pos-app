import { iterateItems, Menu, MenuItem, VariantGroup } from "@/types";
import { state, typeChange } from "@/lib/data-model";
import { ALL, DataBinding, Update, WHERE } from "@/lib/data-model-types";

export interface MenuOrderItem {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
}

export type DisplayMenuItem = MenuItem & {
    selected?: boolean;
    onClick?: Update<MenuPageData>;
}

export type MenuPageData = {
    activeMenu?: DisplayMenuItem['subMenu'];
    order?: MenuOrderItem & {
        children: Record<string, MenuOrderItem>,
        childrenPrice: number;
        unitPrice: number;
        totalPrice: number;
    }
    variants: Record<string, VariantGroup>,
    menu: Record<string, DisplayMenuItem>
}

const bindings: DataBinding<MenuPageData>[] = [
    {
        init: true,
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
                            selected: (_, item) => item.id === selectItem.id
                        }
                    }
                }
            }
            return {};
        },
    },
    {
        // Add/Remove child order
        init: true,
        onChange: ['menu', [ALL], 'selected'],
        update(item: DisplayMenuItem) {
            if (item.selected) {
                return {
                    [WHERE]: (d: MenuPageData) => d.order != null,
                    order: {
                        children: {
                            [item.id]: [{
                                menuItemId: item.id,
                                name: item.name,
                                quantity: 1,
                                price: item.price
                            }]
                        }
                    }
                }
            }
            return {
                [WHERE]: (d: MenuPageData) => d.order != null,
                order: { children: { [item.id]: [] } }
            }
        }
    },
    // Handle choice selection
    {
        onChange: ['menu', [ALL], 'selected'],
        update(item: DisplayMenuItem) {
            return { menu: { [item.id]: { onClick: [{ menu: { [item.id]: { selected: !item.selected } } }] } } };
        }
    },
    {
        // Update click behavior
        // TODO expand trigger to recognize type change. only needs to be triggered when changing null to value and init
        init: true,
        onChange: ['menu', [ALL]],
        detector: { menu: { [ALL]: { price: typeChange, subMenu: typeChange } } },
        update(item: DisplayMenuItem) {
            if (item.price == null) {
                if (item.subMenu) {
                    // Category
                    return { menu: { [item.id]: { onClick: [{ activeMenu: item.subMenu }] } } };
                }
                return { menu: { [item.id]: { onClick: [] } } }
            }

            if (item.subMenu) {
                // TODO add order info, variant and price
                return { menu: { [item.id]: { onClick: [{ activeMenu: item.subMenu }] } } };
            }

            return { menu: { [item.id]: { onClick: [{ menu: { [item.id]: { selected: !item.selected } } }] } } };
        }
    },
    {
        // Update child order price
        onChange: ['menu', [ALL], 'price'],
        update(item: DisplayMenuItem) {
            if (item.selected) {
                return {
                    [WHERE]: (d: MenuPageData) => d.order != null,
                    order: { children: { [item.id]: { price: item.price } } }
                }
            }
            return {}
        }
    },
    {
        onChange: [['order'], 'children'],
        update(order: MenuPageData['order']) {
            if (order === undefined) return {};

            const childrenPrice = Object.values(order.children)
                .filter(child => child !== undefined)
                .reduce((sum, child) => sum + child.quantity * child.price, 0);
            const unitPrice = (order.price + childrenPrice) * order.quantity;
            return { order: { childrenPrice, unitPrice, totalPrice: order.quantity * unitPrice } };
        }
    }
]

export class MenuModel {
    data: MenuPageData = { variants: {}, menu: {} };
    model = state(bindings);

    setMenu(menu: Menu) {
        this.data = { variants: {}, menu: {} }
        for (let vg of Object.values(menu.variants ?? {})) {
            this.data.variants[vg.id] = { ...vg };
        };

        for (let item of iterateItems(menu.content)) {
            this.data.menu[item.id] = item;
        }

        return this.model.setData(this.data);
    }

    getMenuItem(id: string) {
        return this.data.menu[id];
    }

    update(stmt: Update<MenuPageData>) {
        try {
            const dc = this.model.update(stmt);
            return dc;
        } catch (e) {
            console.error(e);
        }
        return undefined;
    }
}


