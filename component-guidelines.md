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
 * Event data interfaces
 */
export interface ComponentActionEventData {
  id: string;
  // other relevant data
}

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
export function attach(container: HTMLElement, handler: (data: ComponentActionEventData) => void): void {
  addEventHandler(container, COMPONENT_ACTION_EVENT, (rawData) => {
    const data: ComponentActionEventData = {
      id: rawData.id,
      // Transform data as needed (e.g., string to boolean)
    };
    handler(data);
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
- Define interfaces for all event data
- Export event name constants to avoid magic strings
- Use TypeScript strict mode

### 3. Event Handling
- Use data attributes for event configuration
- Prefix custom events with 'app:'
- Define clear event data interfaces
- Use constants for event names
- Implement `attach` methods for type-safe event handling

Example:
```typescript
// Define
export const ITEM_SELECT_EVENT = 'item-select';
export interface ItemSelectEventData {
  itemId: string;
  selected: boolean;
}

// Use in template
${onClick(ITEM_SELECT_EVENT)}
data-item-id="${item.id}"
data-selected="${item.selected}"

// Attach handler
export function attach(container: HTMLElement, handler: (data: ItemSelectEventData) => void): void {
  addEventHandler(container, ITEM_SELECT_EVENT, (rawData) => {
    const data: ItemSelectEventData = {
      itemId: rawData.itemId,
      selected: rawData.selected === 'true'  // Convert string to boolean
    };
    handler(data);
  });
}
```

### 4. Component Organization

Components follow a consistent order:
1. **Event constants and interfaces** - Public API for events
2. **Template functions** - Main component rendering
3. **Update functions** - DOM update logic
4. **Attach functions** - Event handler attachment
5. **Styles** - CSS-in-JS styles at the bottom

### 5. Naming Conventions

#### Files
- `kebab-case.ts` for all component files
- Match component purpose (e.g., `menu-item.ts`, `variant-selector.ts`)

#### Functions
- Simple, descriptive names: `template()`, `update()`, `attach()`
- No prefixes needed when using namespace imports

#### Imports
- Use namespace imports for components:
  ```typescript
  import * as MenuItemUI from '@/components/menu-item';
  
  // Usage
  MenuItemUI.template(data);
  MenuItemUI.attach(container, handler);
  ```

#### CSS Classes
- Group all styles in a single `styles` object
- Use camelCase for property names
- Export the object as const

#### Events
- `UPPER_SNAKE_CASE` for event name constants
- `kebab-case` for actual event names
- Descriptive event names (e.g., `'variant-select'`, not `'click'`)

### 6. Styling
- Use Linaria CSS-in-JS for all styles
- Group all styles in a `styles` object at the bottom of the file
- Export specific classes if needed for selectors
- Follow Material Design 3 tokens from theme.ts

### 7. Updates
- Implement update functions for partial DOM updates
- Use the `replaceElements` utility for efficient updates
- Update functions receive the root element and event data

### 8. Data Attributes
- Use semantic names (e.g., `data-item-id`, not `data-id`)
- Boolean values as strings ('true'/'false')
- Handle type conversion in `attach` methods

### 9. Documentation
- Add JSDoc comments for exported functions
- Document event data interfaces
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
 * Event data interfaces
 */
export interface AddToCartEventData {
  productId: string;
  productName: string;
  price: number;
}

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
export function attach(container: HTMLElement, handler: (data: AddToCartEventData) => void): void {
  addEventHandler(container, ADD_TO_CART_EVENT, (rawData) => {
    const data: AddToCartEventData = {
      productId: rawData.productId,
      productName: rawData.productName,
      price: parseFloat(rawData.price)  // Convert string to number
    };
    handler(data);
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
function addToCartHandler({productId, productName, price}: ProductCardUI.AddToCartEventData) {
  console.log(`Adding ${productName} to cart for $${price}`);
}

ProductCardUI.attach(container, addToCartHandler);
```