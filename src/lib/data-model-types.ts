// Define symbols for operations
export const ALL = Symbol('*');      // Apply update to all properties
export const WHERE = Symbol('?');    // Conditional filter for updates
export const DELETIONS = Symbol('-'); // Track deleted properties in DataChange
export const STRUCTURE = Symbol('structure'); // Track structural changes (delete/replace) in DataChange

// Helper type to extract only string keys from T
type StringKeys<T> = Extract<keyof T, string>;

// Helper type to check if a property is optional
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

// DataChange tracks what changed in the data object
// - If a key exists, it was changed (even if set to undefined)
// - The value represents the current value after the change
// - [STRUCTURE] record tracks structural changes: 'delete' for deletions, 'replace' for replacements
// - Only string keys from T are tracked (symbols in data are ignored)
// - For union types, only common properties are tracked (non-distributive)
// - For arrays, allows any string index for partial updates
export type DataChange<T> = T extends readonly any[] ? {
    // For arrays, allow any string key (including numeric indices)
    [index: string]: T extends readonly (infer E)[] ? 
        [E] extends [object] ? DataChange<E> : E 
        : never;
} & {
    [STRUCTURE]?: Record<string, 'delete' | 'replace'>;
} : {
    // For objects, use StringKeys as before
    [K in StringKeys<T>]?: [T[K]] extends [object] ? DataChange<T[K]> : T[K];
} & {
    [STRUCTURE]?: Record<StringKeys<T>, 'delete' | 'replace'>;
}

// Static update operand - direct values and operations
// For each property type V at key K in type T:
// - V: Update with a partial value (for objects) or direct value (for primitives)
// - [V]: Create/replace with a complete new value
// - []: Delete the property (only allowed for optional properties)
// - Update<V>: Nested update (only for object types, non-distributive for unions)
// - For arrays: Also allows partial updates with numeric string indices
// - For function properties, direct value assignment is disabled to avoid ambiguity
export type StaticUpdateOperand<T, K extends keyof T> =
    | (T[K] extends Function ? never : T[K])          // Direct value (disabled for functions)
    | [T[K]]                                           // Create/replace operation
    | (IsOptional<T, K> extends true ? [] : never)    // Delete operation (optional only)
    | ([NonNullable<T[K]>] extends [object] ? Update<T[K]> : never)  // Nested update (objects only, non-distributive)
    | ([NonNullable<T[K]>] extends [readonly any[]] ? { [index: string]: T[K] extends readonly (infer E)[] ? E : never } : never);  // Array index updates

// Function update operand - compute updates based on current data
// - Receives the full data object and current property value
// - Returns a static update operand to apply
// - Disabled for function properties to avoid ambiguity
export type FunctionUpdateOperand<T, K extends keyof T> =
    T[K] extends Function ? never : (data: T, value: T[K]) => StaticUpdateOperand<T, K>;

// Combined update operand - either static or function-based
export type UpdateOperand<T, K extends keyof T> = StaticUpdateOperand<T, K> | FunctionUpdateOperand<T, K>;

// Update specific properties by key
// Only string keys from T can be updated (symbols in data are ignored)
export type StaticUpdate<T> = {
    [K in StringKeys<T>]?: UpdateOperand<T, K>
}

// Operator-based updates
// - [ALL]: Apply the same update to all properties (must be valid for all property types)
// - [WHERE]: Filter condition - update only applies if predicate returns true
export type OperatorUpdate<T> = {
    [ALL]?: UpdateOperand<T, StringKeys<T>>;
    [WHERE]?: (value: T) => boolean;
}

// Complete update type combining operators and static key updates
export type Update<T> = OperatorUpdate<T> & StaticUpdate<T>

//----------- DATA BINDING --------------------------

export interface DataBinding<T> {
    onChange: CapturePath<T>;
    /**
     * Function that generates an Update object based on the binding path and data.
     * 
     * The arguments passed to this function depend on whether the onChange path contains capture groups:
     * 
     * 1. WITH CAPTURE GROUPS (wrapped arrays like [ALL] or ['key']):
     *    - Arguments are the captured values in the order they appear in the path
     *    - Example: onChange: ['variants', [ALL], 'selectedId']
     *      - When variants.size.selectedId changes, args: [variantGroup]
     *        where variantGroup is the value at data.variants.size
     * 
     * 2. WITHOUT CAPTURE GROUPS:
     *    - First argument is always the full data object
     *    - Followed by wildcard keys (for ALL symbols) in the order they appear
     *    - Example: onChange: ['variants', ALL, 'selectedId']
     *      - When variants.size.selectedId changes, args: [data, 'size']
     *        where 'size' is the key that matched ALL
     * 
     * This design allows update functions to access any data they need:
     * - Use capture groups for convenience when you only need specific values
     * - Use non-capture mode when you need access to the full data structure
     */
    update: (...args: any[]) => Update<T>;
}

//----------- DATA PATHS ----------------------------

export type DataPath<T> =
    // Base case: Only allow non-array objects. Primitives, functions, and arrays are terminal.
    T extends Record<string, any> & { length?: never } ?
    (
        // --- Paths for specific keys ---
        {
            // For each key K in T...
            [K in keyof T & string]:
            // A path can be just the key itself, e.g., ['users']
            | [K]
            // Or, if T[K] is pathable, a path can be [K, ...sub-path]
            | (DataPath<T[K]> extends never ? never : [K, ...DataPath<T[K]>])
        }[keyof T & string] // Unionize all possible paths
    ) |
    (
        // --- Paths for the ALL symbol ---
        // A path can be the ALL symbol for the current level, e.g., [ALL]
        | [typeof ALL]
        // Or, it can be [ALL, ...sub-path] where the sub-path is valid for any
        // object-like value within T.
        | (DataPath<Extract<T[keyof T], Record<string, any>>> extends never ? never
            : [typeof ALL, ...DataPath<Extract<T[keyof T], Record<string, any>>>])
    )
    : never;

// Helper type to decrement numbers
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type CapturePath<T, Depth extends number = 6> =
    Depth extends 0
    ? never  // Stop recursion at depth 0
    : T extends Record<string, any> & { length?: never } ?
    (
        // --- Paths for specific keys ---
        {
            [K in keyof T & string]:
            // A path can be just the key or captured [key]
            | [K] | [[K]]
            // Or continue with sub-paths (decrement depth)
            | (CapturePath<T[K], Prev[Depth]> extends never ? never
                : [K, ...CapturePath<T[K], Prev[Depth]>]
                | [[K], ...CapturePath<T[K], Prev[Depth]>])
        }[keyof T & string]
    ) |
    (
        // --- Paths for the ALL symbol ---
        | [typeof ALL] | [[typeof ALL]]
        // Or [ALL, ...sub-path] with capture support (decrement depth)
        | (CapturePath<Extract<T[keyof T], Record<string, any>>, Prev[Depth]> extends never ? never
            : [typeof ALL, ...CapturePath<Extract<T[keyof T], Record<string, any>>, Prev[Depth]>]
            | [[typeof ALL], ...CapturePath<Extract<T[keyof T], Record<string, any>>, Prev[Depth]>])
    )
    : never;

// ----------- STRICT UPDATE TYPES (FUTURE IMPLEMENTATION) -----------
// These types provide strict undefined handling for updates:
// - Required fields cannot be set to undefined
// - Optional fields can still be undefined
// - All properties remain optional in the update object
/*
// Helper types
type IncludesUndefined<T> = undefined extends T ? true : false;
type StrictValue<T> = IncludesUndefined<T> extends true ? T : Exclude<T, undefined>;

// Core update value type (same as current)
export type UpdateValue<T> = T extends object ? Update<T> : T;

// Function that produces an update value
export type UpdateFunction<D, V> = (data: D, value: V) => UpdateValue<V>;

// Common type that combines both direct values and functions
export type UpdateOperand<D, V> = UpdateValue<StrictValue<V>> | UpdateFunction<D, V>;

// Simplified update types using UpdateOperand
export type StaticKeyUpdate<T> = {
    [K in keyof T]?: UpdateOperand<T, T[K]>;
}

export type OperatorUpdate<T> = {
    [ALL]?: T[keyof T] extends infer V ? UpdateOperand<T, V> : never;
    [WHERE]?: (value: T) => boolean;
}

export type Update<T> = OperatorUpdate<T> & StaticKeyUpdate<T>
*/