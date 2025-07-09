import { MenuItem, VariantPrice } from '@/types/menu';

// Generate optimistic IDs for OrderItems
let idCounter = 0;
export function generateOptimisticId(): string {
  return `order-item-${Date.now()}-${idCounter++}`;
}

export function getNumberPrice(price: number | VariantPrice | undefined, variantGroupId?: string) {
  if (typeof price === 'number') {
    return price;
  }

  if (variantGroupId && price !== undefined && variantGroupId in price) {
    return price[variantGroupId];
  }

  return undefined;
}

export interface DataStore<T extends { id: string }> {
  generateId(key?: string): string;
  get(id: string): T | undefined;
  save(item: T): void;
}

class SessionDataStore<T extends { id: string }> implements DataStore<T> {

  generateId(key?: string): string {
    return key ? `order-item-${key}` : `order-item-${Date.now()}-${idCounter++}`;
  }

  get(id: string): T | undefined {
    const stored = sessionStorage.getItem(id);
    return stored ? JSON.parse(stored) as T : undefined;
  }

  save(item: T): void {
    sessionStorage.setItem(item.id, JSON.stringify(item));
  }
}

interface OrderItemValues {
  parentId?: string;

  quantity: number;
  variantGroupId?: string;
  price: number;

  children: string[];
  childrenPrice: number;

  unitPrice: number;
  totalPrice: number;
}

export interface OrderStoreItem extends OrderItemValues {
  id: string;
  menuItem: MenuItem
};

export type OrderEventItem = Partial<OrderItemValues> | OrderStoreItem;

export interface OrderEvent {
  order: OrderEventItem;
  children: OrderEvents;
}

export type OrderEvents = { [id: string]: OrderEvent };

export function isOrderItem(e: OrderEventItem): e is OrderStoreItem {
  return "id" in e;
}

export function emptyOrder(id: string, menuItem: MenuItem): OrderStoreItem {
  return {
    id,
    menuItem,
    quantity: 1,
    price: 0,
    children: [],
    childrenPrice: 0,
    unitPrice: 0,
    totalPrice: 0
  };
}

const LIVE_ITEM_KEY = "live-item";

/**
 * Order Model - Manages OrderItem creation and manipulation
 * Updates are done in-place without cloning for performance
 */
export class OrderModel {

  private store: OrderStore;

  constructor(store: DataStore<OrderStoreItem> = new SessionDataStore()) {
    this.store = new OrderStore(store);
  }

  run(fn: (om: OrderModel) => void): OrderEvents {
    return this.store.execute(() => fn(this));
  }

  get(id: string) {
    return this.store.get(id);
  }

  removeByMenuItem(parentId: string, menuItemId: string) {
    const parent = this.get(parentId);
    if (parent) {
      const newChildren = parent.children.filter(cId => this.get(cId)!.menuItem.id === menuItemId);
      if (parent.children.length != newChildren.length) {
        this.store.setValue(parentId, 'children', [...newChildren]);
      }
    }
  }

  addFromMenuItem(menuItem: MenuItem, parentId?: string, variantGroupId?: string, quantity = 1) {
    let parent: OrderStoreItem | undefined;
    if (parentId != null) {
      parent = this.store.get(parentId);
      if (parent == null) {
        throw new Error(`Could not find parent with ID: ${parentId}`);
      }

      const children = parent.children.map(childId => this.store.get(childId));
      const existing = children.find(c => c && c.menuItem.id == menuItem.id && c.children.length === 0 && c.variantGroupId === variantGroupId);
      if (existing) {
        return this.setQuantity(existing.id, existing.quantity + 1);
      }
    }

    const id = this.store.generateId(parent ? LIVE_ITEM_KEY : undefined);
    const order = emptyOrder(id, menuItem);

    order.quantity = quantity;
    this.setVariantPrice(order, variantGroupId ?? parent!.variantGroupId);

    this.store.add(order, parent?.id);
  }

  setQuantity(orderId: string, quantity: number) {
    this.store.setValue(orderId, 'quantity', quantity);
  }

  setVariant(orderId: string, variantGroupId: string) {
    this.setVariantImpl(orderId, variantGroupId);
  }

  private setVariantImpl(orderId: string, variantGroupId: string) {
    const order = this.store.get(orderId);
    if (order == null) {
      throw Error(`Cound not find order with ID: ${orderId}`);
    }

    this.setVariantPrice(order, variantGroupId);
    order.children.forEach(childId => this.setVariantImpl(childId, variantGroupId));
  }

  private setVariantPrice(order: OrderStoreItem, variantGroupId?: string) {
    const menuItemPrice = order.menuItem.price;
    if (menuItemPrice == null) {
      throw new Error(`Cannot set price for menu item without price: ${order.menuItem.id}`);
    }

    if (typeof menuItemPrice === 'number') {
      this.store.setValue(order.id, "price", menuItemPrice);
      return;
    }

    if (variantGroupId == null || !(variantGroupId in menuItemPrice)) {
      throw new Error(`Variant '${variantGroupId}' not specified in: ${order.menuItem.id}`);
    }

    this.store.setValue(order.id, "variantGroupId", variantGroupId)
    this.store.setValue(order.id, "price", menuItemPrice[variantGroupId]);
  }
}

class OrderStore {

  private cache: { [id: string]: OrderStoreItem } = {};
  private eventMap: OrderEvents = {};

  constructor(private store: DataStore<OrderStoreItem>) {
  }

  generateId(id?: string) {
    return this.store.generateId(id);
  }

  get(id: string): OrderStoreItem | undefined {
    let order: OrderStoreItem | undefined = this.cache[id];
    if (!order) {
      order = this.store.get(id);
      if (order) {
        this.cache[id] = order;
      }
    }
    return order;
  }

  add(order: OrderStoreItem, parentId?: string) {
    if (this.get(order.id)) {
      throw new Error(`Order '${order.id}' already exists`)
    }

    if (order.parentId != null) {
      throw new Error(`Order '${order.id}' created with existing parent '${order.parentId}'`)
    }

    if (order.children.length > 0) {
      throw new Error(`Order '${order.id}' created with existing children`)
    }

    this.cache[order.id] = order;
    this.eventMap[order.id] = { order: order, children: {} };

    if (parentId) {
      const parent = this.get(parentId);
      if (parent == null) {
        throw (`Parent order doesn't exist: '${parentId}'`);
      }

      this.setValue(order.id, 'parentId', parent.id);
      this.setValue(parentId, 'children', [...parent.children, order.id]); // new array needed
    }
  }

  setValue<K extends keyof OrderItemValues>(id: string, key: K, value: OrderItemValues[K]): boolean {
    const values: OrderItemValues | undefined = this.get(id);
    if (!values) return false;

    if (values[key] !== value) {
      values[key] = value;

      let event = this.eventMap[id];
      if (event) {
        event.order[key] = value;
      } else {
        event = this.eventMap[id] = { order: { [key]: value }, children: {} };
        this.addToParentEvent(values.parentId, id, event);
      }
      return true;
    }
    return false;
  }

  private addToParentEvent(parentId: string | undefined, childId: string, child: OrderEvent) {
    if (parentId) {
      let parent = this.eventMap[parentId];
      if (parent) {
        parent.children[childId] = child;
      } else {
        parent = this.eventMap[parentId] = { order: {}, children: { [childId]: child } };
        this.addToParentEvent(this.get(parentId)?.parentId, parentId, parent);
      }
    }
  }

  execute(fn: () => void) {
    try {
      fn();

      const commited: Record<string, boolean> = {};
      Object.keys(this.eventMap).forEach(k => this.commitOrder(k, commited));

      const eventMap = this.eventMap;
      this.eventMap = {};
      return eventMap;
    } catch (e) {
      this.cache = {};
      throw e;
    }
  }

  commitOrder(id: string, commited: Record<string, boolean>) {
    if (commited[id] || !(id in this.eventMap)) {
      return;
    }
    commited[id] = true;

    const order = this.get(id);
    if (!order) return;

    order.children.forEach(c => this.commitOrder(c, commited));

    if (order.children.findIndex(cId => cId in this.eventMap) >= 0) {
      const p = order.children.map(cId => this.get(cId)).reduce((sum, child) => sum + child!.totalPrice, 0);
      this.setValue(id, 'childrenPrice', p);
    }

    this.setValue(id, 'unitPrice', order.childrenPrice + order.price);
    this.setValue(id, 'totalPrice', order.quantity * order.unitPrice);
  }
}