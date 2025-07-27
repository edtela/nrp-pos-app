// Define symbols for operations
export const ALL = Symbol('*');      // Apply update to all properties
export const WHERE = Symbol('?');    // Conditional filter for updates
export const DELETIONS = Symbol('-'); // Track deleted properties in DataChange
export const STRUCTURE = Symbol('structure'); // Track structural changes (delete/replace) in DataChange

// Helper type to extract only string keys from T
type StringKeys<T> = Extract<keyof T, string>;

// Helper type to check if a property is optional
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

// Helper to convert union to intersection (for ALL operator)
// This ensures ALL only allows updates to properties common across all types
type UnionToIntersection<U> = 
    (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

// Helper to get the value type for ALL operator
// - For arrays: the element type
// - For objects: intersection of all value types
type AllValueType<T extends object> = 
    T extends readonly any[]
        ? T[number]
        : UnionToIntersection<T[keyof T]>;

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

// Terminal update types - for non-object values
// - Functions can only be replaced using [T] syntax
// - Other values can be direct assignment or replacement
// - For unions containing objects, [T] syntax is allowed
type UpdateTerminal<T> = 
    [T] extends [Function]
        ? [T]  // Functions must use replacement syntax
        : (Extract<T, object> extends never ? T : [T]);

// Update type for arrays
// - Allows partial updates by index (string keys)
// - Supports [ALL] to update all elements
// - Each update can be a value or function
type UpdateArray<T extends readonly any[]> = {
    [index: string]: T extends readonly (infer E)[] 
        ? Update<E> | ((value: E, data: T, index: string) => Update<E>)
        : never
} & {
    [ALL]?: T extends readonly (infer E)[] 
        ? Update<E> | ((value: E, data: T, index: number) => Update<E>)
        : never;
}

// Update type for non-array objects
// - Each property can be updated with a value or function
// - Optional properties can be deleted with []
// - [ALL] updates all properties (type-safe intersection)
type UpdateNonArrayObject<T extends object> = {
    [K in StringKeys<T>]?: 
        | Update<T[K]> 
        | (IsOptional<T, K> extends true ? [] : never)
        | ((value: T[K], data: T, key: K) => Update<T[K]>)
} & {
    [ALL]?: Update<AllValueType<T>> | ((value: AllValueType<T>, data: T, key: keyof T) => Update<AllValueType<T>>);
}

// Update type for objects (arrays and non-arrays)
// - Delegates to appropriate sub-type
// - WHERE predicate applies to the entire object
type UpdateObject<T extends object> = 
    (T extends readonly any[] 
        ? UpdateArray<T>
        : UpdateNonArrayObject<T>
    ) & {
        [WHERE]?: (value: T) => boolean;
    };

// Main Update type
// - Routes to UpdateObject for objects (including null/undefined unions)
// - Routes to UpdateTerminal for primitives
// - Preserves null/undefined in unions
// - Allows [T] replacement for object types
export type Update<T> = [NonNullable<T>] extends [object]
    ? (undefined extends T ? undefined : never) |
      (null extends T ? null : never) |
      UpdateObject<NonNullable<T>> |
      [NonNullable<T>]
    : UpdateTerminal<T>;

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