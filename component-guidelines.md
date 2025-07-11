# Component Guidelines

## File Structure

Each component should follow this structure:

```typescript
/**
 * Component Name
 * Brief description of what the component does
 */

import { css } from '@linaria/core';
import { html, Template, onClick, addEventHandler } from '@/lib/html-template';
import { /* types */ } from '@/types';
import { /* theme tokens */ } from '@/styles/theme';

/**
 * Event constants
 */
export const COMPONENT_ACTION_EVENT = 'component-action';

/**
 * Component template - pure function
 */
export function template(data: ComponentData): Template {
  return html`
    <div class="${styles.container}">
      <!-- content -->
    </div>
  `;
}

/**
 * Component update function (if needed)
 */
export function update(element: HTMLElement, event: ComponentEvent): void {
  // Update specific parts of the DOM
}

/**
 * Attach event handler with data transformation
 */
export function addActionEventHandler(container: HTMLElement, handler: (id: string) => void): void {
  addEventHandler(container, COMPONENT_ACTION_EVENT, (rawData) => {
    handler(rawData.id);
  });
}

/**
 * Component Styles
 */
export const styles = {
  container: css`
    /* styles */
  `,
  
  item: css`
    /* Export if needed for selectors */
  `
} as const;
```

## Key Principles

### 1. Pure Template Functions
- Templates should be pure functions that take data and return a Template
- No side effects or DOM manipulation in templates
- Use descriptive parameter names (e.g., `data`, not `props`)

### 2. Type Safety
- Export event name constants to avoid magic strings
- Use typed parameters in handler functions
- Use TypeScript strict mode

### 3. Event Handling

#### Forwarding Pattern
When a parent component simply forwards events to child components without additional logic, use direct assignment:

```typescript
// Good - direct assignment for simple forwarding
export const addVariantHandler = VariantGroupUI.addSelectEventHandler;
export const addMenuItemHandler = MenuItemUI.addClickEventHandler;

// Avoid - unnecessary wrapper function
export function addVariantHandler(
  container: HTMLElement,
  handler: (groupId: string, variantId: string) => void
): void {
  VariantGroupUI.addSelectEventHandler(container, handler);
}
```

#### Handler Function Parameters
Define handler functions with specific typed parameters instead of data objects:

```typescript
// Good - specific parameters
export function addClickEventHandler(
  container: HTMLElement,
  handler: (id: string, selected: boolean) => void
): void {
  addEventHandler(container, CLICK_EVENT, (rawData) => {
    handler(rawData.id, rawData.selected === 'true');
  });
}

// Avoid - unnecessary data objects
export function addClickEventHandler(
  container: HTMLElement,
  handler: (data: { id: string; selected: boolean }) => void
): void {
  // ...
}
```

### 4. Event System
- Use data attributes for event configuration
- Use descriptive event names (no prefix needed)
- Use constants for event names
- Implement event handler functions with typed parameters
- The `addEventHandler` utility automatically converts data types

Example:
```typescript
// Define event constant
export const ITEM_SELECT_EVENT = 'item-select';

// Use in template
${onClick(ITEM_SELECT_EVENT)}
data-item-id="${item.id}"
data-selected="${item.selected}"

// Attach handler with typed parameters
export function addSelectEventHandler(
  container: HTMLElement,
  handler: (itemId: string, selected: boolean) => void
): void {
  addEventHandler(container, ITEM_SELECT_EVENT, (rawData) => {
    // addEventHandler automatically converts 'true'/'false' to boolean
    handler(rawData.itemId, rawData.selected);
  });
}
```

### 5. Component Organization

Components follow a consistent order:
1. **Event constants** - Public event name constants
2. **Template functions** - Main component rendering
3. **Update functions** - DOM update logic
4. **Event handler functions** - Type-safe event attachment
5. **Styles** - CSS-in-JS styles at the bottom

### 6. Naming Conventions

#### Files
- `kebab-case.ts` for all component files
- Match component purpose (e.g., `menu-item.ts`, `variant-selector.ts`)

#### Functions
- Simple, descriptive names: `template()`, `update()`
- Event handlers: `addClickEventHandler()`, `addSelectEventHandler()`, etc.
- No prefixes needed when using namespace imports

#### Imports
- Use namespace imports for components:
  ```typescript
  import * as MenuItemUI from '@/components/menu-item';
  
  // Usage
  MenuItemUI.template(data);
  MenuItemUI.addClickEventHandler(container, handler);
  ```

#### CSS Classes
- Group all styles in a single `styles` object
- Use camelCase for property names
- Export the object as const

#### Events
- `UPPER_SNAKE_CASE` for event name constants
- `kebab-case` for actual event names
- Descriptive event names (e.g., `'variant-select'`, not `'click'`)

### 7. Styling
- Use Linaria CSS-in-JS for all styles
- Group all styles in a `styles` object at the bottom of the file
- Export specific classes if needed for selectors
- Follow Material Design 3 tokens from theme.ts

### 8. Updates
- Implement update functions for partial DOM updates
- Use the `replaceElements` utility for efficient updates
- Update functions receive the root element and specific update data

### 9. Data Attributes
- Use semantic names (e.g., `data-item-id`, not `data-id`)
- Boolean values as strings ('true'/'false')
- The `addEventHandler` utility automatically converts types

### 10. Documentation
- Add JSDoc comments for exported functions
- Document handler function parameters
- Include usage examples for complex components

## Example Component

```typescript
/**
 * Product Card Component
 * Displays a product with image, name, price, and add button
 */

import { css } from '@linaria/core';
import { html, Template, onClick, addEventHandler } from '@/lib/html-template';
import { Product } from '@/types';
import { mdColors, mdSpacing, mdTypography } from '@/styles/theme';

/**
 * Event constants
 */
export const ADD_TO_CART_EVENT = 'add-to-cart';

/**
 * Product card template
 */
export function template(product: Product): Template {
  return html`
    <div class="${styles.card}" id="product-${product.id}">
      <h3 class="${styles.name}">${product.name}</h3>
      <span class="${styles.price}">$${product.price.toFixed(2)}</span>
      <button
        ${onClick(ADD_TO_CART_EVENT)}
        data-product-id="${product.id}"
        data-product-name="${product.name}"
        data-price="${product.price}"
      >
        Add to Cart
      </button>
    </div>
  `;
}

/**
 * Update product card (e.g., price change)
 */
export function update(element: HTMLElement, event: { price?: number }): void {
  if ('price' in event && event.price !== undefined) {
    replaceElements(
      element,
      `.${styles.price}`,
      html`<span class="${styles.price}">$${event.price.toFixed(2)}</span>`
    );
  }
}

/**
 * Attach event handler
 */
export function addCartEventHandler(
  container: HTMLElement,
  handler: (productId: string, productName: string, price: number) => void
): void {
  addEventHandler(container, ADD_TO_CART_EVENT, (rawData) => {
    // addEventHandler automatically converts numeric strings to numbers
    handler(rawData.productId, rawData.productName, rawData.price);
  });
}

/**
 * Product Card Styles
 */
export const styles = {
  card: css`
    display: flex;
    flex-direction: column;
    padding: ${mdSpacing.md};
    border-radius: 8px;
    background: ${mdColors.surface};
  `,

  name: css`
    ${mdTypography.titleMedium};
    color: ${mdColors.onSurface};
  `,

  price: css`
    ${mdTypography.labelLarge};
    color: ${mdColors.primary};
  `
} as const;
```

## Usage Example

```typescript
// In parent component
import * as ProductCardUI from '@/components/product-card';

// Render
const product = { id: '123', name: 'Widget', price: 19.99 };
const template = ProductCardUI.template(product);

// Attach handler
function addToCartHandler(productId: string, productName: string, price: number) {
  console.log(`Adding ${productName} to cart for $${price}`);
}

ProductCardUI.addCartEventHandler(container, addToCartHandler);
```