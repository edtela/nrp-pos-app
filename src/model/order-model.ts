import { createStore } from "@/lib/storage";
import { ALL, DataBinding, Update } from "@/lib/data-model-types";
import { MenuItem } from "@/types";
import { state } from "@/lib/data-model";

// Data Types
export type Order = {
  itemIds: string[];
  total: number;
};

export type OrderItem = {
  id: string;
  menuItem: MenuItem;
  modifiers: OrderModifier[];
  quantity: number;
  unitPrice: number;
  total: number;
};

export type OrderModifier = {
  menuItemId: string;
  name: string;
  quantity: number;
};

export type OrderPageData = {
  order: Order;
  items: Record<string, OrderItem>;
};

export const MAIN_ORDER_ID = "main";

let idCounter = 0;
export function generateOptimisticId(): string {
  const timestamp = Date.now();
  const counter = ++idCounter;
  return `opt-${timestamp}-${counter}`;
}

export function storageKey(id: string) {
  return `order-v2-${id}`;
}

export function getStore(id: string) {
  return createStore(storageKey(id), "session");
}

export function getOrder() {
  return createStore(storageKey(MAIN_ORDER_ID), "session").get({ items: [], total: 0 }) as Order;
}

export function getOrderItem(id: string) {
  return createStore(storageKey(id), "session").get() as OrderItem | undefined;
}

export function saveOrderItem(item: OrderItem) {
  // Generate ID if not provided
  if (!item.id) {
    item.id = generateOptimisticId();
  }

  let delta = item.total;
  createStore<OrderItem>(storageKey(item.id), "session").replace((old) => {
    if (old != null) {
      delta = item.total - old.total;
    }
    return item;
  });

  createStore<Order>(storageKey(MAIN_ORDER_ID), "session").replace((old) => {
    if (old == null) {
      return { itemIds: [item.id], total: item.total };
    }

    if (!old.itemIds.includes(item.id)) {
      return { itemIds: [...old.itemIds, item.id], total: old.total + delta };
    }

    return { ...old, total: old.total + delta };
  });
}

export function readOrderData() {
  const order = getOrder();
  const items: OrderPageData["items"] = {};
  for (const itemId of order.itemIds) {
    const item = getOrderItem(itemId);
    if (item) {
      items[item.id] = item;
    }
  }
  return { order, items };
}

export function orderModel() {
  const bindings: DataBinding<OrderPageData>[] = [
    {
      onChange: ["items", [ALL], "quantity"],
      update(item: OrderItem) {
        return { items: { [item.id]: { total: item.quantity * item.unitPrice } } };
      },
    },
    {
      onChange: ["items"],
      update(data: OrderPageData) {
        let total = 0;
        const orderIds = data.order.itemIds.filter((id) => data.items[id] != null);
        for (const item of Object.values(data.items)) {
          if (!orderIds.includes(item.id)) {
            orderIds.push(item.id);
          }
          total += item.total;
        }
        return { order: [{ itemIds: orderIds, total }] };
      },
    },
  ];

  const data: OrderPageData = readOrderData();
  const model = state(bindings);
  model.setData(data);

  return {
    getData() {
      return data;
    },
    update(stmt: Update<OrderPageData>) {
      const changes = model.update(stmt);
      if (changes?.order) {
        getStore(MAIN_ORDER_ID).set(data.order);
      }

      if (changes?.items) {
        Object.keys(changes.items).forEach((key) => {
          const item = data.items[key];
          getStore(key).set(item);
        });
      }

      return changes;
    },
  };
}
