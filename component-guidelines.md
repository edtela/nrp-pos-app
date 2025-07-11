# Component Guidelines

## File Structure

Each component should follow this structure:

```typescript
/**
 * Component Name
 * Brief description of what the component does
 */

import { css } from '@linaria/core';
import { html, Template, onClick } from '@/lib/html-template';
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
 * Component Styles
 */
const componentContainer = css`
  /* styles */
`;

export const componentItemClass = css`
  /* Export if needed for selectors */
`;

/**
 * Component template - pure function
 */
export function componentTemplate(data: ComponentData): Template {
  return html`
    <div class="${componentContainer}">
      <!-- content -->
    </div>
  `;
}

/**
 * Component update function (if needed)
 */
export function componentUpdate(element: HTMLElement, event: ComponentEvent): void {
  // Update specific parts of the DOM
}
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

// Handle
import { addEventHandler } from '@/lib/html-template';

function itemSelectHandler({itemId, selected}: ItemSelectEventData) {
  // selected is automatically converted to boolean
  // handle selection
}

addEventHandler(container, ITEM_SELECT_EVENT, itemSelectHandler);
```

### 4. Styling
- Use Linaria CSS-in-JS for all styles
- Export class names that need to be used as selectors
- Follow Material Design 3 tokens from theme.ts
- Keep styles colocated with components

### 5. Updates
- Implement update functions for partial DOM updates
- Use the `replaceElements` utility for efficient updates
- Update functions receive the root element and event data

### 6. Naming Conventions

#### Files
- `kebab-case.ts` for all component files
- Match component purpose (e.g., `menu-item.ts`, `variant-selector.ts`)

#### Functions
- `camelCase` for all functions
- Template functions: `componentNameTemplate()`
- Update functions: `componentNameUpdate()`

#### CSS Classes
- `camelCase` for CSS class variables
- Descriptive names (e.g., `menuItemPrice`, not `price`)

#### Events
- `UPPER_SNAKE_CASE` for event name constants
- `kebab-case` for actual event names
- Descriptive event names (e.g., `'variant-select'`, not `'click'`)

### 7. Data Attributes
- Use semantic names (e.g., `data-item-id`, not `data-id`)
- Boolean values as strings ('true'/'false')
- Parse in handlers as needed

### 8. Documentation
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
import { html, Template, onClick } from '@/lib/html-template';
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
  price: string;
}

/**
 * Product Card Styles
 */
const productCard = css`
  display: flex;
  flex-direction: column;
  padding: ${mdSpacing.md};
  border-radius: 8px;
  background: ${mdColors.surface};
`;

const productName = css`
  ${mdTypography.titleMedium};
  color: ${mdColors.onSurface};
`;

export const productPriceClass = css`
  ${mdTypography.labelLarge};
  color: ${mdColors.primary};
`;

/**
 * Product card template
 */
export function productCardTemplate(product: Product): Template {
  return html`
    <div class="${productCard}" id="product-${product.id}">
      <h3 class="${productName}">${product.name}</h3>
      <span class="${productPriceClass}">$${product.price.toFixed(2)}</span>
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
export function productCardUpdate(element: HTMLElement, event: { price?: number }): void {
  if ('price' in event && event.price !== undefined) {
    replaceElements(
      element,
      `.${productPriceClass}`,
      html`<span class="${productPriceClass}">$${event.price.toFixed(2)}</span>`
    );
  }
}
```