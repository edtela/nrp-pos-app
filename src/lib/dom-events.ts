/**
 * Simple DOM Event Helpers
 * 
 * Lightweight utilities for DOM-based messaging using native CustomEvent.
 * Events automatically clean up when DOM nodes are removed.
 */

/**
 * Dispatch a custom event from an element
 */
export function dispatch(element: Element | null, type: string, data?: any): void {
  if (!element) return;
  
  element.dispatchEvent(new CustomEvent(type, {
    bubbles: true,
    detail: data
  }));
}

/**
 * Listen for a custom event on an element
 */
export function listen<T = any>(
  element: Element | null, 
  type: string, 
  handler: (data: T, event: CustomEvent<T>) => void
): void {
  if (!element) return;
  
  element.addEventListener(type, (e: Event) => {
    const customEvent = e as CustomEvent<T>;
    handler(customEvent.detail, customEvent);
  });
}

/**
 * Listen for a custom event once
 */
export function once<T = any>(
  element: Element | null,
  type: string,
  handler: (data: T, event: CustomEvent<T>) => void
): void {
  if (!element) return;
  
  element.addEventListener(type, (e: Event) => {
    const customEvent = e as CustomEvent<T>;
    handler(customEvent.detail, customEvent);
  }, { once: true });
}

/**
 * Navigation event types
 */
export interface NavigateEvent {
  to: 'home' | 'menu' | 'order' | 'back';
  menuId?: string;
  state?: any;
}

/**
 * Dispatch navigation event
 */
export function navigate(element: Element | null, to: NavigateEvent['to'], options?: { menuId?: string; state?: any }): void {
  dispatch(element, 'app:navigate', {
    to,
    ...options
  } as NavigateEvent);
}

/**
 * Common app event types
 */
export const AppEvents = {
  NAVIGATE: 'app:navigate',
  ORDER_ADD: 'app:order:add',
  ORDER_UPDATE: 'app:order:update',
  ORDER_REMOVE: 'app:order:remove',
  STATE_UPDATE: 'app:state:update',
} as const;

/**
 * Helper to create typed event dispatchers for components
 */
export function createDispatcher<T = any>(element: Element | null) {
  return (type: string, data?: T) => dispatch(element, type, data);
}

/**
 * Helper to create typed event listeners for components  
 */
export function createListener<T = any>(element: Element | null) {
  return (type: string, handler: (data: T) => void) => listen(element, type, handler);
}