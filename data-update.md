# Data Update System

A powerful, type-safe data update system for JavaScript/TypeScript that enables declarative updates with automatic change tracking.

## Core Concepts

### Update Statement
An update statement describes how to transform data. It can contain:
- Direct value assignments
- Function transformations
- Conditional logic
- Bulk operations

### Change Tracking
Every update automatically produces a change result that tracks:
- What values changed
- Original values before the update
- Structural changes (additions/deletions)

## Basic Updates

### Direct Value Updates
```javascript
const data = { user: { name: 'Alice', age: 30 } };

const changes = update(data, {
  user: { age: 31 }
});

// Result: data.user.age = 31
// Changes: { user: { age: 31, [META]: { age: { original: 30 } } } }
```

### Function Updates
Transform values using functions that receive:
1. Current value
2. Parent object
3. Property key
4. Context variables (optional)

```javascript
update(data, {
  user: {
    name: (current) => current.toUpperCase(),
    age: (current, user) => user.age + 1
  }
});
```

## Symbols and Operators

### ALL - Bulk Updates
Apply the same update to all properties in an object or array:

```javascript
update(data, {
  products: {
    [ALL]: { inStock: true }  // Set all products to in stock
  }
});
```

### WHERE - Conditional Updates
Apply updates only when a condition is met:

```javascript
update(data, {
  users: {
    [ALL]: {
      [WHERE]: (user) => user.age >= 65,
      category: 'senior'  // Only update users 65 and older
    }
  }
});
```

### DEFAULT - Null Field Initialization
Provide a template for initializing null fields before applying updates:

```javascript
const data = { user: { profile: null } };

update(data, {
  user: {
    profile: {
      [DEFAULT]: { name: '', bio: '' },  // Initialize if null
      name: 'Alice',
      bio: 'Developer'
    }
  }
});

// Result: profile created with { name: 'Alice', bio: 'Developer' }
```

### CONTEXT - Variable Passing
Pass variables through the update traversal for use in functions:

```javascript
update(data, {
  [CONTEXT]: { taxRate: 0.08, discount: 0.1 },
  items: {
    [ALL]: {
      finalPrice: (price, item, key, ctx) => 
        price * (1 - ctx.discount) * (1 + ctx.taxRate)
    }
  }
});
```

Context can be overridden at any level:
```javascript
{
  [CONTEXT]: { multiplier: 1.0 },
  specialItems: {
    [CONTEXT]: { multiplier: 1.5 },  // Override for special items
    price: (current, item, key, ctx) => current * ctx.multiplier
  }
}
```

## Replacement vs Partial Updates

### The `[]` Operator
The `[]` syntax is used to **replace entire values** rather than partially update them. This works for any type of value, not just arrays.

### Full Replacement with `[value]`
Wrap a value in `[]` to replace the entire field:

```javascript
// Replace entire object (not merge)
update(data, {
  user: [{ name: 'Bob', age: 25 }]  // Replaces whole user object
});

// Replace entire array
update(data, {
  items: [{ id: 1, name: 'Item' }]  // Replaces whole array
});

// Replace nested values
update(data, {
  config: {
    database: [{ host: 'localhost', port: 5432 }]  // Replace database object
  }
});
```

### Deletion with Empty `[]`
Use empty `[]` to delete optional properties:

```javascript
update(data, {
  user: {
    nickname: [],  // Delete nickname field
    tempData: []   // Delete tempData field
  }
});

// Also works for array indices
update(data, {
  items: {
    [2]: []  // Delete index 2 from array
  }
});
```

### Partial Updates (Default Behavior)
Without `[]`, objects are partially updated (merged):

```javascript
const data = { 
  user: { name: 'Alice', age: 30, city: 'NYC' } 
};

// Partial update - only age changes, name and city remain
update(data, {
  user: { age: 31 }
});
// Result: { name: 'Alice', age: 31, city: 'NYC' }

// Full replacement - only age exists after update
update(data, {
  user: [{ age: 31 }]
});
// Result: { age: 31 }
```

### Arrays: Partial vs Replacement
For array elements, the same principle applies:

```javascript
// Partial update of array element (merge)
update(data, {
  items: {
    [0]: { quantity: 5 }  // Updates quantity, keeps other properties
  }
});

// Full replacement of array element
update(data, {
  items: {
    [0]: [{ id: 1, quantity: 5 }]  // Replaces entire element
  }
});
```

## Change Result Structure

The update function returns a change object that mirrors the structure of updates:

```javascript
{
  user: {
    name: 'ALICE',
    age: 31,
    [META]: {
      name: { original: 'alice' },
      age: { original: 30 }
    }
  }
}
```

### META Symbol
The `META` symbol stores metadata about changes:
- `original`: The value before the update
- Used for undo operations
- Tracks structural changes (additions/deletions)

### No Changes
If no values actually change, `update()` returns `undefined`:

```javascript
const changes = update(data, {
  user: { age: 30 }  // Same as current value
});
// changes = undefined
```

## Advanced Patterns

### Nested Updates
Updates flow through nested structures:

```javascript
update(data, {
  company: {
    departments: {
      engineering: {
        budget: 100000,
        employees: {
          [ALL]: { bonus: 1000 }
        }
      }
    }
  }
});
```

### Cross-Reference Updates
Functions can access the entire data structure:

```javascript
update(data, {
  summary: (current, rootData) => ({
    total: rootData.items.reduce((sum, item) => sum + item.price, 0),
    count: rootData.items.length
  })
});
```

### Computed Values
Derive values from other parts of the data:

```javascript
update(data, {
  order: (current, rootData) => ({
    ...current,
    subtotal: rootData.items.reduce((sum, i) => sum + i.price * i.qty, 0),
    tax: (current, order) => order.subtotal * 0.08,
    total: (current, order) => order.subtotal + order.tax
  })
});
```

## Type Safety

The system is fully type-safe in TypeScript:
- Update structure must match data structure
- Functions receive properly typed parameters
- Optional properties can be deleted with `[]`
- Required properties cannot be deleted

## Use Cases

1. **Form State Management** - Update form fields with validation
2. **Shopping Cart** - Update quantities, calculate totals
3. **Configuration** - Bulk update settings
4. **Data Transformation** - Transform API responses
5. **State Synchronization** - Track what changed for efficient updates

## Benefits

- **Declarative** - Describe what should change, not how
- **Immutable Updates** - Original data is modified in place, but changes are tracked
- **Automatic Change Tracking** - Know exactly what changed
- **Type Safe** - Full TypeScript support
- **Composable** - Combine multiple update patterns
- **Efficient** - Only processes actual changes