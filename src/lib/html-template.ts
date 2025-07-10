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
    .join(' ');
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
      const cssProperty = property.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
      return `${cssProperty}: ${value}`;
    })
    .join('; ');
}

/**
 * Replace elements matching a selector with a new template
 * @param container The container element to search within
 * @param selector The CSS selector to find elements to replace
 * @param template The template to render as replacement (null/undefined to remove)
 * @returns The number of elements replaced
 */
export function replaceElements(container: Element, selector: string, template: Template | null | undefined): number {
  const elements = container.querySelectorAll(selector);
  let replacedCount = 0;
  
  elements.forEach(element => {
    if (template) {
      // Create a temporary container to render the template
      const temp = document.createElement('div');
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

function buildHTML(template: Template): string {
  const { strings, values } = template;
  let result = '';
  
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    
    if (i < values.length) {
      const value = values[i];
      
      if (value && typeof value === 'object' && 'strings' in value) {
        // Nested template
        result += buildHTML(value as Template);
      } else if (Array.isArray(value)) {
        // Array of templates or strings
        result += value.map(item => {
          if (item && typeof item === 'object' && 'strings' in item) {
            return buildHTML(item as Template);
          }
          return String(item);
        }).join('');
      } else if (value !== null && value !== undefined) {
        // Regular value
        result += String(value);
      }
    }
  }
  
  return result;
}