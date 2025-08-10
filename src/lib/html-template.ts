export const CLICK_EVENT = "click-event";
export const STATE_UPDATE_EVENT = "state-update";

export interface Template {
  strings: TemplateStringsArray;
  values: any[];
}

export function html(strings: TemplateStringsArray, ...values: any[]): Template {
  return { strings, values };
}

export function render(template: Template, container: Element): void {
  const htmlString = buildHTML(template);
  container.innerHTML = htmlString;
}

/**
 * Converts an object of class names to boolean values into a space-separated string
 * @param classInfo - Object with class names as keys and boolean values
 * @returns Space-separated string of active class names
 */
export function classMap(classInfo: Record<string, boolean>): string {
  return Object.entries(classInfo)
    .filter(([_, value]) => value)
    .map(([className]) => className)
    .join(" ");
}

/**
 * Converts a style object into a CSS string
 * @param styleInfo - Object with CSS property names as keys
 * @returns CSS string suitable for inline styles
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
 * @param value - The value to escape
 * @returns Escaped string suitable for HTML attributes
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
 * @param name - The data attribute name (without 'data-' prefix)
 * @param value - The value to set (if undefined, returns empty string)
 * @returns Data attribute string or empty string
 */
export function dataAttr(name: string, value: any): string {
  if (value === undefined) {
    return "";
  }
  return `data-${name}="${escapeAttributeValue(value)}"`;
}

/**
 * Update a data attribute on an existing DOM element
 * @param element - The element to update
 * @param name - The data attribute name (without 'data-' prefix)
 * @param value - The value to set (if undefined, removes the attribute)
 */
export function updateDataAttr(element: HTMLElement, name: string, value: any): void {
  if (value === undefined) {
    element.removeAttribute(`data-${name}`);
  } else {
    element.setAttribute(`data-${name}`, escapeAttributeValue(value));
  }
}

/**
 * Replace elements matching a selector with a new template
 * @param container The container element to search within
 * @param selector The CSS selector to find elements to replace
 * @param template The template to render as replacement (null/undefined to remove)
 * @returns The number of elements replaced
 */
/**
 * Replace a single element with a rendered template
 * @param element - The element to replace
 * @param template - The template to render
 * @returns true if replacement was successful
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
 * Create data attributes for click handling
 * @param eventTypeOrUpdate The type of event to dispatch (will be prefixed with 'app:') or an update object
 * @returns Data attributes string
 */
export function onClick(eventTypeOrUpdate: string | object | undefined): string {
  return dataAttr(CLICK_EVENT, eventTypeOrUpdate);
}

/**
 * Global click handler that processes data-click-event attributes
 * Call this once during app initialization
 */
export function initializeGlobalClickHandler(root: Element = document.body): void {
  root.addEventListener("click", (e: Event) => {
    const target = e.target as HTMLElement;

    // Find the closest element with click event data
    const eventElement = target.closest(`[data-${CLICK_EVENT}]`) as HTMLElement;

    if (!eventElement) return;

    const clickEventData = eventElement.getAttribute(`data-${CLICK_EVENT}`);
    if (!clickEventData) return; // Handle case where attribute exists but is empty

    // Dispatch the custom event
    dispatchCustomEvent(eventElement, clickEventData, e as MouseEvent);
  });
}

/**
 * Dispatch a custom event with collected data
 */
function dispatchCustomEvent(target: HTMLElement, eventData: string, originalEvent: MouseEvent): void {
  let eventType: string;
  let detail: any;

  // Try to parse as JSON first
  try {
    // Unescape HTML entities
    const unescaped = eventData.replace(/&quot;/g, '"');
    const parsed = JSON.parse(unescaped);

    if (typeof parsed === "object" && parsed !== null) {
      // It's an object - use generic event type and pass the object as detail
      eventType = STATE_UPDATE_EVENT;
      detail = parsed;
    } else {
      // Parsed but not an object, treat as string
      eventType = eventData;
      detail = {
        target,
        dataset: { ...target.dataset },
        originalEvent,
      };
    }
  } catch {
    // Not JSON, treat as string event type
    eventType = eventData;
    detail = {
      target,
      dataset: { ...target.dataset },
      originalEvent,
    };
  }

  // Create and dispatch custom event
  const customEvent = new CustomEvent(`app:${eventType}`, {
    bubbles: true,
    detail,
  });

  target.dispatchEvent(customEvent);
}

/**
 * Update click handler on an existing DOM element
 * @param element The element to update
 * @param eventTypeOrUpdate The new click handler value
 */
export function updateOnClick(element: HTMLElement, eventTypeOrUpdate: string | object | undefined): void {
  updateDataAttr(element, CLICK_EVENT, eventTypeOrUpdate);
}

/**
 * Type-safe event handler
 */
export type AppEventHandler<T> = (data: T) => void;

/**
 * Add a type-safe event handler
 * @param element The element to attach the listener to
 * @param eventName The event name (without 'app:' prefix)
 * @param handler The event handler function
 */
export function addEventHandler<T extends Record<string, any>>(
  element: Element,
  eventName: string,
  handler: AppEventHandler<T>,
): void {
  element.addEventListener(`app:${eventName}`, (e: Event) => {
    const customEvent = e as CustomEvent;
    const { dataset } = customEvent.detail;

    // Convert dataset strings to proper types based on common patterns
    const data = {} as T;
    for (const [key, value] of Object.entries(dataset)) {
      if (value === "true" || value === "false") {
        (data as any)[key] = value === "true";
      } else if (value && !isNaN(Number(value))) {
        // Only convert to number if it's a valid number
        (data as any)[key] = Number(value);
      } else {
        (data as any)[key] = value;
      }
    }

    handler(data);
  });
}

function buildHTML(template: Template): string {
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
        // Regular value
        result += String(value);
      }
    }
  }

  return result;
}
