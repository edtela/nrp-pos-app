/**
 * DOM Update Module - DOM manipulation using DomNode
 * 
 * Provides DOM update functions that work with the DomNode wrapper
 * for null-safe operations.
 */

import { DomNode, dom } from "./dom-node";
import { Template, render } from "./template";

/**
 * DOM update utilities using DomNode for null-safe operations
 */
export const domUpdate = {
  /**
   * Set text content of an element selected by selector
   */
  setTextContent(container: Element, selector: string, value: string): void {
    dom(container).select(selector).setText(value);
  },

  /**
   * Set a style property on an element
   */
  setStyle(container: Element, selector: string, property: string, value: string): void {
    dom(container).select(selector).setStyle(property, value);
  },

  /**
   * Set visibility of an element
   */
  setVisibility(container: Element, selector: string, visible: boolean): void {
    dom(container).select(selector).setVisibility(visible);
  },

  /**
   * Set HTML content using a template
   */
  setHTML(container: Element, selector: string, template: Template): void {
    const element = container.querySelector(selector);
    if (element) {
      render(template, element);
    }
  }
};

/**
 * Enhanced DOM update utilities that return DomNode for chaining
 */
export class DomUpdater {
  private node: DomNode;

  constructor(element: Element | string | null) {
    this.node = typeof element === "string" ? dom(element) : dom(element);
  }

  /**
   * Select a child element for updates
   */
  select(selector: string): DomUpdater {
    return new DomUpdater(this.node.find(selector));
  }

  /**
   * Update text content
   */
  setText(value: string): DomUpdater {
    this.node.setText(value);
    return this;
  }

  /**
   * Update HTML content
   */
  setHTML(template: Template | string): DomUpdater {
    this.node.setHTML(template);
    return this;
  }

  /**
   * Update style properties
   */
  setStyle(property: string, value: string): DomUpdater {
    this.node.setStyle(property, value);
    return this;
  }

  /**
   * Update multiple style properties
   */
  setStyles(styles: Record<string, string>): DomUpdater {
    this.node.setStyles(styles);
    return this;
  }

  /**
   * Set visibility
   */
  setVisibility(visible: boolean): DomUpdater {
    this.node.setVisibility(visible);
    return this;
  }

  /**
   * Set display
   */
  setDisplay(display: string | boolean): DomUpdater {
    this.node.setDisplay(display);
    return this;
  }

  /**
   * Add classes
   */
  addClass(...classNames: string[]): DomUpdater {
    this.node.addClass(...classNames);
    return this;
  }

  /**
   * Remove classes
   */
  removeClass(...classNames: string[]): DomUpdater {
    this.node.removeClass(...classNames);
    return this;
  }

  /**
   * Toggle a class
   */
  toggleClass(className: string, force?: boolean): DomUpdater {
    this.node.toggleClass(className, force);
    return this;
  }

  /**
   * Set an attribute
   */
  setAttribute(name: string, value: any): DomUpdater {
    this.node.setAttribute(name, value);
    return this;
  }

  /**
   * Set a data attribute
   */
  setDataAttribute(name: string, value: any): DomUpdater {
    this.node.setDataAttribute(name, value);
    return this;
  }

  /**
   * Replace this element with a template
   */
  replaceWith(template: Template | Element): DomUpdater {
    this.node.replaceWith(template);
    return this;
  }

  /**
   * Remove this element
   */
  remove(): DomUpdater {
    this.node.remove();
    return this;
  }

  /**
   * Get the underlying DomNode
   */
  getDomNode(): DomNode {
    return this.node;
  }

  /**
   * Get the underlying element
   */
  getElement(): Element | null {
    return this.node.getElement();
  }

  /**
   * Check if element exists
   */
  exists(): boolean {
    return this.node.exists();
  }
}

/**
 * Factory function for creating a DomUpdater
 */
export function update(element: Element | string | null): DomUpdater {
  return new DomUpdater(element);
}

/**
 * Batch update multiple elements
 */
export interface BatchUpdate {
  selector: string;
  updates: {
    text?: string;
    html?: Template | string;
    styles?: Record<string, string>;
    visibility?: boolean;
    display?: string | boolean;
    addClass?: string[];
    removeClass?: string[];
    attributes?: Record<string, any>;
    dataAttributes?: Record<string, any>;
  };
}

/**
 * Apply batch updates to a container
 */
export function batchUpdate(container: Element, updates: BatchUpdate[]): void {
  const containerNode = dom(container);
  
  updates.forEach(({ selector, updates }) => {
    const node = containerNode.select(selector);
    
    if (updates.text !== undefined) {
      node.setText(updates.text);
    }
    
    if (updates.html !== undefined) {
      node.setHTML(updates.html);
    }
    
    if (updates.styles) {
      node.setStyles(updates.styles);
    }
    
    if (updates.visibility !== undefined) {
      node.setVisibility(updates.visibility);
    }
    
    if (updates.display !== undefined) {
      node.setDisplay(updates.display);
    }
    
    if (updates.addClass) {
      node.addClass(...updates.addClass);
    }
    
    if (updates.removeClass) {
      node.removeClass(...updates.removeClass);
    }
    
    if (updates.attributes) {
      Object.entries(updates.attributes).forEach(([name, value]) => {
        node.setAttribute(name, value);
      });
    }
    
    if (updates.dataAttributes) {
      Object.entries(updates.dataAttributes).forEach(([name, value]) => {
        node.setDataAttribute(name, value);
      });
    }
  });
}

/**
 * Conditional update helper
 */
export function conditionalUpdate(
  container: Element,
  condition: boolean,
  trueUpdates: BatchUpdate[],
  falseUpdates?: BatchUpdate[]
): void {
  if (condition) {
    batchUpdate(container, trueUpdates);
  } else if (falseUpdates) {
    batchUpdate(container, falseUpdates);
  }
}