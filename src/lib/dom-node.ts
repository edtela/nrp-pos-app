/**
 * DomNode - A null-safe wrapper for DOM elements with built-in messaging
 * 
 * Provides chainable API for DOM manipulation that safely handles null elements.
 * All operations are no-ops when the wrapped element is null.
 */

import type { Template } from "./template";
import { render } from "./template";

/**
 * Message types for DOM-based communication
 */
export interface DomMessage {
  channel: string;
  data: any;
  timestamp: number;
  origin?: Element;
}

export interface DomRequest extends DomMessage {
  requestId: string;
}

export interface DomResponse extends DomMessage {
  requestId: string;
  error?: Error;
}

export type MessageHandler = (data: any, message: DomMessage) => void;
export type RequestHandler = (data: any, request: DomRequest) => any | Promise<any>;

/**
 * DomNode class - wraps a DOM element with null-safe operations
 */
export class DomNode {
  constructor(private element: Element | null) {}

  /**
   * Static factory methods
   */
  static fromSelector(selector: string, parent: Element | Document = document): DomNode {
    return new DomNode(parent.querySelector(selector));
  }

  static fromElement(element: Element | null): DomNode {
    return new DomNode(element);
  }

  static fromId(id: string): DomNode {
    return new DomNode(document.getElementById(id));
  }

  /**
   * Selection methods - all return DomNode instances
   */
  select(selector: string): DomNode {
    if (!this.element) return new DomNode(null);
    return new DomNode(this.element.querySelector(selector));
  }

  selectByClass(className: string): DomNode {
    return this.select(`.${className}`);
  }

  selectById(id: string): DomNode {
    if (!this.element) return new DomNode(null);
    return new DomNode(this.element.querySelector(`#${id}`));
  }

  selectAll(selector: string): DomNode[] {
    if (!this.element) return [];
    return Array.from(this.element.querySelectorAll(selector)).map(el => new DomNode(el));
  }

  /**
   * DOM manipulation methods - all are no-ops when element is null
   */
  setText(value: string): DomNode {
    if (this.element) {
      this.element.textContent = value;
    }
    return this;
  }

  setHTML(template: Template | string): DomNode {
    if (this.element) {
      if (typeof template === "string") {
        this.element.innerHTML = template;
      } else {
        render(template, this.element);
      }
    }
    return this;
  }

  setStyle(property: string, value: string): DomNode {
    if (this.element && this.element instanceof HTMLElement) {
      this.element.style.setProperty(property, value);
    }
    return this;
  }

  setStyles(styles: Record<string, string>): DomNode {
    if (this.element && this.element instanceof HTMLElement) {
      Object.entries(styles).forEach(([prop, value]) => {
        (this.element as HTMLElement).style.setProperty(prop, value);
      });
    }
    return this;
  }

  setVisibility(visible: boolean): DomNode {
    return this.setStyle("visibility", visible ? "visible" : "hidden");
  }

  setDisplay(display: string | boolean): DomNode {
    if (typeof display === "boolean") {
      return this.setStyle("display", display ? "" : "none");
    }
    return this.setStyle("display", display);
  }

  setAttribute(name: string, value: any): DomNode {
    if (this.element) {
      if (value === null || value === undefined) {
        this.element.removeAttribute(name);
      } else {
        this.element.setAttribute(name, String(value));
      }
    }
    return this;
  }

  setDataAttribute(name: string, value: any): DomNode {
    if (this.element && this.element instanceof HTMLElement) {
      if (value === undefined) {
        delete this.element.dataset[name];
      } else if (value === null) {
        this.element.dataset[name] = "";
      } else if (typeof value === "object") {
        this.element.dataset[name] = JSON.stringify(value);
      } else {
        this.element.dataset[name] = String(value);
      }
    }
    return this;
  }

  addClass(...classNames: string[]): DomNode {
    if (this.element) {
      this.element.classList.add(...classNames);
    }
    return this;
  }

  removeClass(...classNames: string[]): DomNode {
    if (this.element) {
      this.element.classList.remove(...classNames);
    }
    return this;
  }

  toggleClass(className: string, force?: boolean): DomNode {
    if (this.element) {
      this.element.classList.toggle(className, force);
    }
    return this;
  }

  hasClass(className: string): boolean {
    return this.element ? this.element.classList.contains(className) : false;
  }

  replaceWith(template: Template | Element): DomNode {
    if (this.element) {
      if (template instanceof Element) {
        this.element.replaceWith(template);
        this.element = template;
      } else {
        // Create temporary container to render template
        const temp = document.createElement("div");
        render(template, temp);
        
        if (temp.firstElementChild) {
          this.element.replaceWith(temp.firstElementChild);
          this.element = temp.firstElementChild;
        }
      }
    }
    return this;
  }

  remove(): DomNode {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    return this;
  }

  /**
   * Messaging methods
   */
  dispatch(type: "message" | "request", channel: string, data: any): DomNode {
    if (!this.element) return this;

    const message: DomMessage = {
      channel,
      data,
      timestamp: Date.now(),
      origin: this.element,
    };

    const eventType = type === "message" ? `dom:message:${channel}` : `dom:request:${channel}`;
    const event = new CustomEvent(eventType, {
      bubbles: true,
      detail: message,
    });

    this.element.dispatchEvent(event);
    return this;
  }

  dispatchMessage(channel: string, data: any): DomNode {
    return this.dispatch("message", channel, data);
  }

  async dispatchRequest(channel: string, data: any, timeout: number = 5000): Promise<any> {
    if (!this.element) {
      throw new Error("Cannot dispatch request from null element");
    }

    const element = this.element; // Capture element reference for closure
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const request: DomRequest = {
      channel,
      data,
      timestamp: Date.now(),
      origin: element,
      requestId,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        element.removeEventListener(`dom:response:${requestId}`, responseHandler);
        reject(new Error(`Request timeout for channel: ${channel}`));
      }, timeout);

      const responseHandler = (event: Event) => {
        clearTimeout(timeoutId);
        const response = (event as CustomEvent<DomResponse>).detail;
        
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response.data);
        }
      };

      element.addEventListener(`dom:response:${requestId}`, responseHandler, { once: true });

      const event = new CustomEvent(`dom:request:${channel}`, {
        bubbles: true,
        detail: request,
      });

      element.dispatchEvent(event);
    });
  }

  /**
   * Event handling methods
   */
  on(eventType: string, handler: EventListener | EventListenerObject, options?: AddEventListenerOptions): DomNode {
    if (this.element) {
      this.element.addEventListener(eventType, handler, options);
    }
    return this;
  }

  off(eventType: string, handler: EventListener | EventListenerObject, options?: EventListenerOptions): DomNode {
    if (this.element) {
      this.element.removeEventListener(eventType, handler, options);
    }
    return this;
  }

  once(eventType: string, handler: EventListener | EventListenerObject): DomNode {
    return this.on(eventType, handler, { once: true });
  }

  onClick(handler: EventListener): DomNode {
    return this.on("click", handler);
  }

  onMessage(channel: string, handler: MessageHandler): DomNode {
    if (this.element) {
      const wrappedHandler = (event: Event) => {
        const message = (event as CustomEvent<DomMessage>).detail;
        handler(message.data, message);
      };
      this.element.addEventListener(`dom:message:${channel}`, wrappedHandler as EventListener);
    }
    return this;
  }

  onRequest(channel: string, handler: RequestHandler): DomNode {
    if (this.element) {
      const wrappedHandler = async (event: Event) => {
        const request = (event as CustomEvent<DomRequest>).detail;
        const responseChannel = `dom:response:${request.requestId}`;
        
        try {
          const result = await handler(request.data, request);
          const response: DomResponse = {
            channel: request.channel,
            data: result,
            timestamp: Date.now(),
            requestId: request.requestId,
          };
          
          const responseEvent = new CustomEvent(responseChannel, {
            bubbles: true,
            detail: response,
          });
          
          // Dispatch response back to the origin element
          request.origin?.dispatchEvent(responseEvent);
        } catch (error) {
          const response: DomResponse = {
            channel: request.channel,
            data: null,
            timestamp: Date.now(),
            requestId: request.requestId,
            error: error as Error,
          };
          
          const responseEvent = new CustomEvent(responseChannel, {
            bubbles: true,
            detail: response,
          });
          
          request.origin?.dispatchEvent(responseEvent);
        }
      };
      
      this.element.addEventListener(`dom:request:${channel}`, wrappedHandler as EventListener);
    }
    return this;
  }

  /**
   * Utility methods
   */
  exists(): boolean {
    return this.element !== null;
  }

  getElement(): Element | null {
    return this.element;
  }

  getAttribute(name: string): string | null {
    return this.element ? this.element.getAttribute(name) : null;
  }

  getDataAttribute(name: string): any {
    if (!this.element || !(this.element instanceof HTMLElement)) return null;
    
    const value = this.element.dataset[name];
    if (value === undefined) return null;
    
    // Try to parse JSON values
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Query methods that work with the element
   */
  find(selector: string): Element | null {
    return this.element ? this.element.querySelector(selector) : null;
  }

  findAll(selector: string): Element[] {
    return this.element ? Array.from(this.element.querySelectorAll(selector)) : [];
  }

  /**
   * Parent/child navigation
   */
  parent(): DomNode {
    return new DomNode(this.element?.parentElement || null);
  }

  closest(selector: string): DomNode {
    return new DomNode(this.element?.closest(selector) || null);
  }

  children(): DomNode[] {
    if (!this.element) return [];
    return Array.from(this.element.children).map(el => new DomNode(el));
  }

  firstChild(): DomNode {
    return new DomNode(this.element?.firstElementChild || null);
  }

  lastChild(): DomNode {
    return new DomNode(this.element?.lastElementChild || null);
  }

  /**
   * Conditional operations
   */
  ifExists(callback: (node: DomNode) => void): DomNode {
    if (this.element) {
      callback(this);
    }
    return this;
  }

  map<T>(mapper: (node: DomNode) => T): T | null {
    return this.element ? mapper(this) : null;
  }
}

/**
 * Helper function to create DomNode from various inputs
 */
export function dom(input: string | Element | null): DomNode {
  if (typeof input === "string") {
    // If it starts with #, search by ID, otherwise use as selector
    if (input.startsWith("#")) {
      return DomNode.fromId(input.slice(1));
    }
    return DomNode.fromSelector(input);
  }
  return DomNode.fromElement(input);
}