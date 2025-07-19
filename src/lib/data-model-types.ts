// Define symbols for batch operations
export const ALL = Symbol('*');
export const WHERE = Symbol('?');

// Changes structure - same shape as Data but all properties optional
export type DataChange<T> = {
    [K in keyof T]?: T[K] extends object ? DataChange<T[K]> : T[K];
}

export type UpdateValue<T> = T extends object ? Update<T> : T;
export type UpdateFunction<D, V> = (data: D, value: V) => UpdateValue<V>;
export type StaticKeyUpdate<T> = {
    [K in keyof T]?: UpdateValue<T[K]> | UpdateFunction<T, T[K]>;
}
export type OperatorUpdate<T> = {
    [ALL]?: UpdateValue<T[keyof T]> | UpdateFunction<T, T[keyof T]>;
    [WHERE]?: (value: T) => boolean;
}
export type Update<T> = OperatorUpdate<T> & StaticKeyUpdate<T>

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
