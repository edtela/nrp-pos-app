/**
 * DomNode - Simplified null-safe wrapper for DOM elements
 * 
 * Provides chainable API for DOM manipulation that safely handles null elements.
 * All operations are no-ops when the wrapped element is null.
 */

import type { Template } from "./template";
import { render } from "./template";

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
   * Simple event handling
   */
  on(eventType: string, handler: (data: any) => void): DomNode {
    if (this.element) {
      this.element.addEventListener(`app:${eventType}`, (e: Event) => {
        const customEvent = e as CustomEvent;
        const dataset = customEvent.detail?.dataset || customEvent.detail;
        // Pass dataset directly without type conversions
        handler(dataset);
      });
    }
    return this;
  }

  onClick(handler: (e: MouseEvent) => void): DomNode {
    if (this.element) {
      this.element.addEventListener("click", (e) => handler(e as MouseEvent));
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