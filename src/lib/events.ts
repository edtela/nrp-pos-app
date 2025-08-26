/**
 * Events Module - UI event handling
 *
 * Manages click events and other UI interactions through data attributes.
 * Separate from the messaging system which handles app-level communication.
 */

export const CLICK_EVENT = "click-event";
export const STATE_UPDATE_EVENT = "state-update";

/**
 * Create data attributes for click handling
 */
export function onClick(eventTypeOrUpdate: string | object | undefined): string {
  return dataAttr(CLICK_EVENT, eventTypeOrUpdate);
}

/**
 * Update click handler on an existing DOM element
 */
export function updateOnClick(element: HTMLElement, eventTypeOrUpdate: string | object | undefined): void {
  setDataAttribute(element, CLICK_EVENT, eventTypeOrUpdate);
}

/**
 * Update a data attribute on an existing DOM element
 */
export function setDataAttribute(element: HTMLElement, name: string, value: any): void {
  if (value === undefined) {
    element.removeAttribute(`data-${name}`);
  } else {
    element.setAttribute(`data-${name}`, escapeAttributeValue(value));
  }
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
function dataAttr(name: string, value: any): string {
  if (value === undefined) {
    return "";
  }
  return `data-${name}="${escapeAttributeValue(value)}"`;
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
 * Type-safe event handler
 */
export type AppEventHandler<T> = (data: T) => void;
