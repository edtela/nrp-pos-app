# Component Guidelines

This document describes the component architecture patterns used in the NRP POS application and provides guidelines for creating and maintaining components.

## Component Architecture Overview

The NRP application uses a custom lightweight component system built on top of a lit-html-compatible templating engine. This architecture provides efficient rendering and updates without the overhead of a full framework.

### Core Concepts

1. **Template Functions** - Pure functions that generate HTML templates
2. **Update Functions** - Efficient DOM update handlers
3. **Classes Objects** - Centralized CSS class name definitions
4. **Hydrate Functions** - Event handler attachment and initialization (pages only)

## Component Structure

### Basic Component Pattern

```typescript
// component-name.ts
import './component-name.css';
import { html, Template } from '@/lib/html-template';
import { Context } from '@/lib/context';

/**
 * Component data interface
 */
export interface ComponentData {
  // Define your component's data structure
}

/**
 * Component template - pure function
 */
export function template(data: ComponentData, context?: Context): Template {
  // Translation functions at the start
  const buttonText = () => context?.lang === 'it' ? 'Invia' : 
                          context?.lang === 'sq' ? 'Dërgo' : 'Send';
  
  return html`
    <div class="${classes.container}">
      <button class="${classes.button}">${buttonText()}</button>
    </div>
  `;
}

/**
 * Component class names
 */
export const classes = {
  container: 'component-container',
  button: 'component-button'
} as const;

/**
 * Update function for efficient DOM updates
 * 
 * Standard signature - components that only need changes:
 */
export function update(
  container: Element,
  changes: DataChange<ComponentData>,
  context: Context
): void {
  // Update only changed parts of the DOM
  if ('someProperty' in changes) {
    replaceElement(container.querySelector('.element'), newTemplate);
  }
}

/**
 * Alternative signature - components that need full data:
 */
export function update(
  container: Element,
  changes: DataChange<ComponentData>,
  context: Context,
  data: ComponentData  // Include only if needed for re-renders
): void {
  // Can do surgical updates OR full re-renders
  if (needsFullRerender) {
    render(template(data, context), container);
  }
}
```

### Page Component Pattern

Pages extend the basic component pattern with hydration for event handling and state management:

```typescript
// page-name.ts
import { Template } from '@/lib/html-template';
import { Context } from '@/lib/context';

/**
 * Page template
 */
export function template(data: PageData, context?: Context): Template {
  return html`
    <div class="${layoutStyles.pageContainer}">
      <header>${HeaderComponent.template(headerData, context)}</header>
      <main>${ContentComponent.template(contentData, context)}</main>
    </div>
  `;
}

/**
 * Page hydration - attaches event handlers and initializes state
 */
export function hydrate(container: Element, data: PageData, context?: Context): void {
  // Initialize event handlers
  addEventHandler(container, 'custom-event', (eventData) => {
    // Handle event
  });
  
  // Initialize child components
  ChildComponent.hydrate(childElement, childData, context);
  
  // Set up state management
  const model = new DataModel();
  model.init(data);
}

/**
 * Page update function
 */
export function update(
  container: Element,
  changes: DataChange<PageData>,
  context: Context,
  data: PageData
): void {
  // Update page sections as needed
  ChildComponent.update(childContainer, changes.child, context, data.child);
}
```

## Update Function Contract

### Ownership Model
The update function has a clear ownership model:
- **OWNS**: The content (children) of the container
- **DOES NOT OWN**: The container's attributes, styles, dataset, classes, etc.

### Standard Signature
```typescript
export function update(
  container: Element,       // Element type enforces ownership boundary
  changes: DataChange<T>,   // What changed
  context: Context,         // Runtime context (language, currency, etc.)
  data?: T                  // Full data - only if component needs it
): void
```

### Key Principles
1. **Container Type**: Use `Element` not `HTMLElement` to prevent modifying container properties
2. **Content Ownership**: The function may replace all container content
3. **Container Preservation**: Never modify container's attributes/styles/classes
4. **Data Parameter**: Only include if the component needs full data for re-renders
5. **Context Required**: Context is always available and should be required

### Examples

#### Simple Update (changes only)
```typescript
// menu-item.ts - only needs changes
export function update(
  container: Element,
  changes: DataChange<MenuItem>,
  context: Context
): void {
  if ('price' in changes) {
    const priceEl = container.querySelector('.price');
    if (priceEl) {
      priceEl.textContent = formatPrice(changes.price, context.currency);
    }
  }
}
```

#### Complex Update (needs full data)
```typescript
// menu-content.ts - may need to re-render
export function update(
  container: Element,
  changes: DataChange<MenuData>,
  context: Context,
  data: MenuData  // Included because re-renders are possible
): void {
  if (needsFullRerender(changes)) {
    render(template(data, context), container);
  } else {
    // Surgical updates
    updateSpecificItems(container, changes, context);
  }
}
```

### Wrapper Pattern
If you need to preserve elements around a component:
```typescript
// Instead of passing the parent directly:
// ❌ ComponentUpdate(parentDiv, changes, context);

// Wrap the component in its own container:
// ✓ <div class="parent">
//     <div class="component-wrapper">
//       <!-- Component owns this content -->
//     </div>
//   </div>
// ComponentUpdate(wrapperDiv, changes, context);
```

## Translation Pattern

### Inline Translations in Templates

For simple UI text that needs translation, define translation functions at the beginning of template functions:

```typescript
export function template(data: Data, context?: Context): Template {
  // Translation functions
  const title = () => {
    switch(context?.lang) {
      case 'sq': return 'Titull';
      case 'it': return 'Titolo';
      default: return 'Title';
    }
  };
  
  const description = () => context?.lang === 'sq' ? 'Përshkrim' : 
                            context?.lang === 'it' ? 'Descrizione' : 
                            'Description';
  
  return html`
    <h1>${title()}</h1>
    <p>${description()}</p>
  `;
}
```

### Module-Level Translations

For translations needed in update functions or across multiple functions:

```typescript
// Module-level translation helpers
const translations = {
  error: (lang?: Language) => {
    switch(lang) {
      case 'sq': return 'Gabim';
      case 'it': return 'Errore';
      default: return 'Error';
    }
  },
  success: (lang?: Language) => lang === 'sq' ? 'Sukses' : 
                                 lang === 'it' ? 'Successo' : 
                                 'Success'
};

export function update(element: Element, changes: any, data: any, context?: Context) {
  if (changes.error) {
    showMessage(translations.error(context?.lang));
  }
}
```

## Context Object

The context object provides runtime information to components:

```typescript
interface Context {
  lang: Language;           // Current language ('sq' | 'en' | 'it')
  currency: CurrencyFormat;  // Currency formatting preferences
  // Additional context as needed
}
```

## Event Handling

### Custom Events

Use custom events for component communication:

```typescript
// Define event constant
export const ITEM_SELECTED_EVENT = 'item-selected';

// In template
html`<div ${onClick(ITEM_SELECTED_EVENT)}>Click me</div>`

// In hydrate function
addEventHandler(container, ITEM_SELECTED_EVENT, (data) => {
  // Handle event
});
```

### Data Attributes

Use data attributes for state and configuration:

```typescript
html`<div ${dataAttr('selected', isSelected)}>Item</div>`

// Update in DOM
setDataAttribute(element, 'selected', newValue);
```

## State Management

### Data Models

Use data models for complex state management:

```typescript
class ComponentModel extends DataModel<ComponentData> {
  // Model implementation
}

// In hydrate function
const model = new ComponentModel();
model.init(initialData);

// Update handling
function runUpdate(stmt: Update<ComponentData>) {
  const changes = model.update(stmt);
  update(container, changes, model.data, context);
}
```

## Best Practices

### 1. Pure Template Functions
- Templates should be pure functions with no side effects
- All data should be passed as parameters
- Use context for runtime configuration

### 2. Efficient Updates
- Only update changed DOM elements
- Use `replaceElements` for targeted updates
- Batch related updates when possible

### 3. CSS Organization
- Co-locate CSS files with components
- Use class objects for type-safe class names
- Follow BEM or similar naming convention

### 4. Event Handling
- Use custom events for loose coupling
- Define event constants for type safety
- Handle events in hydrate functions

### 5. Translation Guidelines
- Keep translations close to usage
- Use functions for dynamic translations
- Provide fallbacks to default language

### 6. Type Safety
- Define interfaces for all data structures
- Use const assertions for class objects
- Type all event data

## Common Patterns

### Conditional Rendering

```typescript
html`${condition ? html`<div>Show this</div>` : ''}`
```

### List Rendering

```typescript
html`${items.map(item => html`<li>${item.name}</li>`)}`
```

### Dynamic Classes

```typescript
html`<div class="${classMap({
  [classes.active]: isActive,
  [classes.disabled]: isDisabled
})}"></div>`
```

### Dynamic Styles

```typescript
html`<div style="${styleMap({
  color: textColor,
  backgroundColor: bgColor
})}"></div>`
```

## Testing Components

### Unit Testing Templates

```typescript
test('renders correctly', () => {
  const template = Component.template(data, context);
  const html = buildHTML(template);
  expect(html).toContain('expected content');
});
```

### Testing Updates

```typescript
test('updates on data change', () => {
  const element = document.createElement('div');
  render(Component.template(initialData), element);
  
  Component.update(element, changes, newData, context);
  expect(element.querySelector('.selector')).toHaveTextContent('updated');
});
```

## Performance Considerations

1. **Minimize Re-renders** - Update only changed elements
2. **Use Memoization** - Cache expensive computations
3. **Virtual Scrolling** - For long lists
4. **Lazy Loading** - Load components on demand
5. **Event Delegation** - Use global handlers when possible

## Migration Guide

When updating existing components to support context:

1. Add `context?: Context` parameter to template function
2. Add translation functions at template start
3. Update function signatures to accept context
4. Pass context through to child components
5. Test with different language settings

## TODO: Architecture Improvements

### Immediate Priorities
- [ ] Standardize update function patterns across all components
- [ ] Add missing classes exports for consistency
- [ ] Improve type safety for custom events
- [ ] Create component generator script

### Performance Optimizations
- [ ] Implement component memoization helpers
- [ ] Add virtual scrolling utility for long lists
- [ ] Optimize re-render boundaries
- [ ] Add performance monitoring

### Developer Experience
- [ ] Create testing utilities for components
- [ ] Improve error messages and debugging
- [ ] Add component documentation generator
- [ ] Create visual component explorer

### Future Enhancements
- [ ] Add component lifecycle hooks
- [ ] Implement component composition utilities
- [ ] Create state management helpers
- [ ] Add animation/transition utilities