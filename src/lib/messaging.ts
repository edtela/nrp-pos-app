/**
 * DOM-based Messaging System
 * 
 * Provides a message bus implementation using DOM events,
 * enabling decoupled communication between components without singletons.
 */

import { DomNode, type MessageHandler, type RequestHandler } from "./dom-node";

/**
 * Message channels for different domains
 */
export const MessageChannels = {
  // Navigation
  NAVIGATE: "navigate",
  NAVIGATE_BACK: "navigate:back",
  
  // State management
  STATE_UPDATE: "state:update",
  STATE_REQUEST: "state:request",
  
  // Order management
  ORDER_ADD: "order:add",
  ORDER_UPDATE: "order:update",
  ORDER_REMOVE: "order:remove",
  ORDER_CLEAR: "order:clear",
  
  // UI events
  MODAL_OPEN: "modal:open",
  MODAL_CLOSE: "modal:close",
  TOAST_SHOW: "toast:show",
  
  // Data requests
  DATA_FETCH: "data:fetch",
  DATA_SAVE: "data:save",
} as const;

export type MessageChannel = typeof MessageChannels[keyof typeof MessageChannels];

/**
 * Navigation message data types
 */
export interface NavigateMessage {
  to: "home" | "menu" | "order" | "modifier" | "back";
  menuId?: string;
  state?: Record<string, any>;
}

export interface StateUpdateMessage {
  path: string;
  value: any;
  merge?: boolean;
}

export interface OrderMessage {
  item?: any;
  itemId?: string;
  updates?: Record<string, any>;
}

/**
 * Message bus class for managing global message handlers
 */
export class MessageBus {
  private root: DomNode;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private requestHandlers: Map<string, RequestHandler> = new Map();

  constructor(root: Element | Document = document) {
    this.root = root instanceof Document ? new DomNode(root.documentElement) : new DomNode(root);
  }

  /**
   * Register a message handler for a specific channel
   */
  onMessage(channel: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      
      // Set up the actual DOM listener only once per channel
      this.root.onMessage(channel, (data, message) => {
        const handlers = this.handlers.get(channel);
        if (handlers) {
          handlers.forEach(h => h(data, message));
        }
      });
    }

    this.handlers.get(channel)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Register a request handler for a specific channel
   * Only one handler per channel is allowed for requests
   */
  onRequest(channel: string, handler: RequestHandler): () => void {
    if (this.requestHandlers.has(channel)) {
      console.warn(`Request handler for channel "${channel}" already exists, replacing...`);
    }

    this.requestHandlers.set(channel, handler);
    
    // Set up the DOM request listener
    this.root.onRequest(channel, handler);

    // Return unsubscribe function
    return () => {
      this.requestHandlers.delete(channel);
    };
  }

  /**
   * Send a message to all listeners
   */
  sendMessage(channel: string, data: any): void {
    this.root.dispatchMessage(channel, data);
  }

  /**
   * Send a request and wait for response
   */
  async sendRequest(channel: string, data: any, timeout?: number): Promise<any> {
    return this.root.dispatchRequest(channel, data, timeout);
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
    this.requestHandlers.clear();
  }
}

/**
 * Global message bus instance (optional - can create local instances too)
 */
let globalBus: MessageBus | null = null;

/**
 * Get or create the global message bus
 */
export function getMessageBus(): MessageBus {
  if (!globalBus) {
    globalBus = new MessageBus();
  }
  return globalBus;
}

/**
 * Navigation helper using messaging
 */
export class NavigationMessenger {
  private node: DomNode;

  constructor(element: Element | null = null) {
    this.node = new DomNode(element || document.body);
  }

  home(state?: Record<string, any>): void {
    this.node.dispatchMessage(MessageChannels.NAVIGATE, {
      to: "home",
      state,
    } as NavigateMessage);
  }

  menu(menuId: string, state?: Record<string, any>): void {
    this.node.dispatchMessage(MessageChannels.NAVIGATE, {
      to: "menu",
      menuId,
      state,
    } as NavigateMessage);
  }

  order(state?: Record<string, any>): void {
    this.node.dispatchMessage(MessageChannels.NAVIGATE, {
      to: "order",
      state,
    } as NavigateMessage);
  }

  modifier(state?: Record<string, any>): void {
    this.node.dispatchMessage(MessageChannels.NAVIGATE, {
      to: "modifier",
      state,
    } as NavigateMessage);
  }

  back(): void {
    this.node.dispatchMessage(MessageChannels.NAVIGATE, {
      to: "back",
    } as NavigateMessage);
  }
}

/**
 * Helper function to set up navigation listener
 */
export function setupNavigationListener(handler: (message: NavigateMessage) => void): () => void {
  const bus = getMessageBus();
  return bus.onMessage(MessageChannels.NAVIGATE, (data: NavigateMessage) => {
    handler(data);
  });
}

/**
 * Type-safe message dispatcher helper
 */
export function dispatch<T = any>(channel: string, data: T, element?: Element): void {
  const node = new DomNode(element || document.body);
  node.dispatchMessage(channel, data);
}

/**
 * Type-safe request helper
 */
export async function request<TRequest = any, TResponse = any>(
  channel: string,
  data: TRequest,
  element?: Element,
  timeout?: number
): Promise<TResponse> {
  const node = new DomNode(element || document.body);
  return node.dispatchRequest(channel, data, timeout);
}

/**
 * Decorator for automatic message handling (optional TypeScript feature)
 */
export function HandleMessage(channel: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store metadata for later registration
    if (!target._messageHandlers) {
      target._messageHandlers = [];
    }
    target._messageHandlers.push({ channel, method: propertyKey });
    
    return descriptor;
  };
}

/**
 * Register all decorated message handlers for a class instance
 */
export function registerMessageHandlers(instance: any, bus: MessageBus = getMessageBus()): () => void {
  const handlers = instance.constructor.prototype._messageHandlers || [];
  const unsubscribers: (() => void)[] = [];
  
  for (const { channel, method } of handlers) {
    const handler = instance[method].bind(instance);
    const unsubscribe = bus.onMessage(channel, handler);
    unsubscribers.push(unsubscribe);
  }
  
  // Return function to unsubscribe all handlers
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}