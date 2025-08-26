/**
 * Template Module - Core templating functionality
 * 
 * Provides HTML template literals and rendering functions.
 */

export interface Template {
  strings: TemplateStringsArray;
  values: any[];
}

/**
 * HTML template literal tag function
 */
export function html(strings: TemplateStringsArray, ...values: any[]): Template {
  return { strings, values };
}

/**
 * Render a template into a container element
 */
export function render(template: Template, container: Element): void {
  const htmlString = buildHTML(template);
  container.innerHTML = htmlString;
}

/**
 * Build HTML string from a template
 */
export function buildHTML(template: Template): string {
  const { strings, values } = template;
  let result = "";

  for (let i = 0; i < strings.length; i++) {
    result += strings[i];

    if (i < values.length) {
      const value = values[i];

      if (value && typeof value === "object" && "strings" in value) {
        // Nested template
        result += buildHTML(value as Template);
      } else if (Array.isArray(value)) {
        // Array of templates or strings
        result += value
          .map((item) => {
            if (item && typeof item === "object" && "strings" in item) {
              return buildHTML(item as Template);
            }
            return String(item);
          })
          .join("");
      } else if (value !== null && value !== undefined) {
        result += String(value);
      }
    }
  }

  return result;
}

/**
 * Converts an object of class names to boolean values into a space-separated string
 */
export function classMap(classInfo: Record<string, boolean>): string {
  return Object.entries(classInfo)
    .filter(([_, value]) => value)
    .map(([className]) => className)
    .join(" ");
}

/**
 * Converts a style object into a CSS string
 */
export function styleMap(styleInfo: Record<string, any>): string {
  return Object.entries(styleInfo)
    .map(([property, value]) => {
      // Convert camelCase to kebab-case
      const cssProperty = property.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      return `${cssProperty}: ${value}`;
    })
    .join("; ");
}

/**
 * Helper to escape a value for HTML attributes
 */
function escapeAttributeValue(value: any): string {
  if (typeof value === "object" && value !== null) {
    // For objects, JSON.stringify and escape quotes for HTML attribute
    const json = JSON.stringify(value);
    return json.replace(/"/g, "&quot;");
  }
  // For primitives, convert to string
  return String(value);
}

/**
 * Conditionally outputs a data attribute if value is not undefined
 */
export function dataAttr(name: string, value: any): string {
  if (value === undefined) {
    return "";
  }
  return `data-${name}="${escapeAttributeValue(value)}"`;
}

/**
 * Converts class names to class selectors
 */
export function toClassSelectors<T extends Record<string, string>>(
  targets: T
): { [K in keyof T]: `.${T[K]}` } {
  return Object.fromEntries(
    Object.entries(targets).map(([key, value]) => [key, `.${value}`])
  ) as { [K in keyof T]: `.${T[K]}` };
}

/**
 * Replace a single element with a rendered template
 */
export function replaceElement(element: Element, template: Template): boolean {
  const temp = document.createElement("div");
  render(template, temp);

  if (temp.firstElementChild) {
    element.replaceWith(temp.firstElementChild);
    return true;
  }
  return false;
}

/**
 * Replace elements matching a selector with a new template
 */
export function replaceElements(container: Element, selector: string, template: Template | null | undefined): number {
  const elements = container.querySelectorAll(selector);
  let replacedCount = 0;

  elements.forEach((element) => {
    if (template) {
      // Create a temporary container to render the template
      const temp = document.createElement("div");
      render(template, temp);

      // Replace the element with all children from the temp container
      if (temp.firstElementChild) {
        element.replaceWith(temp.firstElementChild);
        replacedCount++;
      }
    } else {
      // If template is empty, remove the element
      element.remove();
      replacedCount++;
    }
  });

  return replacedCount;
}

/**
 * Reconcile container's children with a new set of elements
 * Preserves existing DOM elements when possible, minimizing reflows
 */
export function reconcileChildren(container: Element, newChildren: Element[]): void {
  const existingChildren = Array.from(container.children);
  
  // If no changes in length and all elements are the same, do nothing
  if (existingChildren.length === newChildren.length && 
      existingChildren.every((child, i) => child === newChildren[i])) {
    return;
  }
  
  // Create a document fragment for batch DOM updates
  const fragment = document.createDocumentFragment();
  
  // Add all new children to the fragment
  // If the child is already in the container, it will be moved (not cloned)
  newChildren.forEach(child => {
    fragment.appendChild(child);
  });
  
  // Clear container and append the fragment
  container.innerHTML = '';
  container.appendChild(fragment);
}