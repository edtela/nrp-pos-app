# Event System Usage Examples

## Setup

First, initialize the global click handler in your app:

```javascript
import { initializeGlobalClickHandler } from '@/lib/html-template';

// Call once during app initialization
initializeGlobalClickHandler();
```

## Type-Safe Events

Define event constants and interfaces for type safety:

```typescript
// In your component file
export const VARIANT_SELECT_EVENT = 'variant-select';

export interface VariantSelectEventData {
  variantGroupId: string;
  variantId: string;
  selected: boolean;
}

// In template
html`<button 
  data-variant-group-id="${groupId}"
  data-variant-id="${variantId}"
  data-selected="${isSelected}"
  ${onClick(VARIANT_SELECT_EVENT)}
>Select</button>`

// In handler
import { addEventHandler } from '@/lib/html-template';

function variantSelectHandler({variantId, variantGroupId, selected}: VariantSelectEventData) {
  console.log(`Variant ${variantId} selected: ${selected}`);
  // selected is automatically converted to boolean
}

addEventHandler(container, VARIANT_SELECT_EVENT, variantSelectHandler);
```

## Basic Click Event

```javascript
// In template - onClick returns data attributes
html`<button ${onClick('button-click')}>Click me</button>`

// Renders as:
// <button data-click-event="button-click">Click me</button>

// Handler
container.addEventListener('app:button-click', (e) => {
  console.log('Button clicked', e.detail);
});
```

## Event with Data Attributes

```javascript
// In template - pass data through data-* attributes
html`<button 
  ${onClick('add-item')}
  data-item-id="${item.id}"
  data-price="${item.price}"
  data-quantity="1">
  Add ${item.name}
</button>`

// Renders as:
// <button data-click-event="add-item" data-item-id="pizza-1" data-price="12.99" data-quantity="1">
//   Add Margherita Pizza
// </button>

// Handler
container.addEventListener('app:add-item', (e) => {
  const { itemId, price, quantity } = e.detail.dataset;
  console.log(`Adding ${quantity} item ${itemId} at $${price}`);
});
```

## Multiple Actions Example

```javascript
// In template - each button has its own event
html`<div class="item-list">
  ${items.map(item => html`
    <div class="item">
      <span>${item.name}</span>
      <button ${onClick('edit-item')} data-id="${item.id}">Edit</button>
      <button ${onClick('delete-item')} data-id="${item.id}">Delete</button>
    </div>
  `)}
</div>`

// Renders as:
// <button data-click-event="edit-item" data-id="123">Edit</button>
// <button data-click-event="delete-item" data-id="123">Delete</button>

// Handlers
container.addEventListener('app:edit-item', (e) => {
  const { id } = e.detail.dataset;
  console.log(`Editing item ${id}`);
});

container.addEventListener('app:delete-item', (e) => {
  const { id } = e.detail.dataset;
  console.log(`Deleting item ${id}`);
});
```

## Event Detail Structure

All custom events include:
- `detail.target` - The element that triggered the event
- `detail.dataset` - All data-* attributes from the element
- `detail.originalEvent` - The original click event

## Benefits

1. **No inline JavaScript**: All handlers are in JavaScript files, not HTML
2. **CSP-friendly**: Works with strict Content Security Policies
3. **Single listener**: One global click handler instead of many
4. **Performance**: Event delegation is handled efficiently
5. **Declarative**: Event configuration is visible in the HTML
6. **Flexible**: Multiple ways to pass data to handlers