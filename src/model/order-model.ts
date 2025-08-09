import { createStore } from "@/lib/storage";
import { Order, OrderItem } from "@/pages/order-page";

export const MAIN_ORDER_ID = "main";

export function storageKey(id: string) {
  return `order-v1-${id}`;
}

export function getOrder() {
  return createStore(storageKey(MAIN_ORDER_ID), "session").get({ items: [], total: 0 });
}

export function getOrderItem(id: string) {
  return createStore(storageKey(id), "session").get();
}

export function saveOrderItem(item: OrderItem) {
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
      return { itemIds: [item.id], total: old.total + delta };
    }

    return old;
  });
}
