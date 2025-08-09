import { createStore } from "@/lib/storage";
import { Order, OrderItem } from "@/pages/order-page";

export const MAIN_ORDER_ID = "main";

let idCounter = 0;

/**
 * Generate an optimistic ID for order items
 * Format: opt-{timestamp}-{counter}
 */
export function generateOptimisticId(): string {
  const timestamp = Date.now();
  const counter = ++idCounter;
  return `opt-${timestamp}-${counter}`;
}

export function storageKey(id: string) {
  return `order-v2-${id}`;
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
