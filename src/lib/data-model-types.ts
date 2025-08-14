// Define symbols for operations
export const ALL = Symbol("*"); // Apply update to all properties
export const WHERE = Symbol("?"); // Conditional filter for updates
export const DEFAULT = Symbol("{}");
export const CONTEXT = Symbol("$");
export const META = Symbol("#"); // Track structural changes (delete/replace) in DataChange

// Helper type to extract only string keys from T
type StringKeys<T> = Extract<keyof T, string>;

// Helper type to check if a property is optional
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

// Helper to convert union to intersection (for ALL operator)
// This ensures ALL only allows updates to properties common across all types
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

// Helper to get the value type for ALL operator
// - For arrays: the element type
// - For objects: intersection of all value types
type AllValueType<T extends object> = T extends readonly any[] ? T[number] : UnionToIntersection<T[keyof T]>;

export type DataChange<T> = UpdateResult<T>;

// Terminal update types - for non-object values
// - Functions can only be replaced using [T] syntax
// - Other values can be direct assignment or replacement
// - For unions containing objects, [T] syntax is allowed
type UpdateTerminal<T> = [T] extends [Function]
  ? [T] // Functions must use replacement syntax
  : Extract<T, object> extends never
    ? T
    : [T];

// Update type for arrays
// - Allows partial updates by index (string keys)
// - Supports [ALL] to update all elements
// - Each update can be a value or function
type UpdateArray<T extends readonly any[]> = {
  [index: string]: T extends readonly (infer E)[]
    ? Update<E> | ((value: E, data: T, index: string, ctx?: Record<string, any>) => Update<E>)
    : never;
} & {
  [ALL]?: T extends readonly (infer E)[] ? Update<E> | ((value: E, data: T, index: number) => Update<E>) : never;
};

// Update type for non-array objects
// - Each property can be updated with a value or function
// - Optional properties can be deleted with []
// - [ALL] updates all properties (type-safe intersection)
type UpdateNonArrayObject<T extends object> = {
  [K in StringKeys<T>]?:
    | Update<T[K]>
    | (IsOptional<T, K> extends true ? [] : never)
    | ((value: T[K], data: T, key: K, ctx?: Record<string, any>) => Update<T[K]>);
} & {
  [ALL]?: Update<AllValueType<T>> | ((value: AllValueType<T>, data: T, key: keyof T) => Update<AllValueType<T>>);
};

// Update type for objects (arrays and non-arrays)
// - Delegates to appropriate sub-type
// - WHERE predicate applies to the entire object
type UpdateObject<T extends object> = (T extends readonly any[] ? UpdateArray<T> : UpdateNonArrayObject<T>) & {
  [WHERE]?: (value: T, context?: Record<string, any>) => boolean;
  [DEFAULT]?: T;
  [CONTEXT]?: Record<string, any>;
};

// Main Update type
// - Routes to UpdateObject for objects (including null/undefined unions)
// - Routes to UpdateTerminal for primitives
// - Preserves null/undefined in unions
// - Allows [T] replacement for object types
export type Update<T> = [NonNullable<T>] extends [object]
  ?
      | (undefined extends T ? undefined : never)
      | (null extends T ? null : never)
      | UpdateObject<NonNullable<T>>
      | [NonNullable<T>]
  : UpdateTerminal<T>;

export type UpdateResult<T> = T extends readonly any[]
  ? {
      // For arrays, allow any string key (including numeric indices)
      [index: string]: T extends readonly (infer E)[] ? ([E] extends [object] ? UpdateResult<E> : E) : never;
      [META]?: { [index: string]: T extends readonly (infer E)[] ? UpdateResultMeta<E> : never };
    }
  : {
      // For objects, use StringKeys as before
      [K in StringKeys<T>]?: [T[K]] extends [object] ? UpdateResult<T[K]> : T[K];
    } & {
      [META]?: { [K in StringKeys<T>]?: UpdateResultMeta<T[K]> };
    };

export type UpdateResultMeta<T> = {
  original: T;
};

//----------- DATA BINDING --------------------------

export interface DataBinding<T> {
  init?: boolean;
  onChange: CapturePath<T> | ChangeDetector<T>;
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

export type CapturePath<_T = any> = CapturePathJS;

type PathElt = string | typeof ALL;
export type CapturePathJS = readonly [...(PathElt | PathElt[])[], PathElt | PathElt[] | ChangeDetector<any>];

// Helper type to decrement numbers
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export type CapturePathTS<T, Depth extends number = 6> = Depth extends 0
  ? never // Stop recursion at depth 0
  : T extends Record<string, any> & { length?: never }
    ?
        | // --- Paths for specific keys ---
        {
            [K in keyof T & string]:  // A path can be just the key or captured [key]
              | [K]
              | [[K]]
              // Or the key followed by a ChangeDetector (terminal)
              | ([T[K]] extends [object] ? [K, ChangeDetector<T[K]>] | [[K], ChangeDetector<T[K]>] : never)
              // Or continue with sub-paths (decrement depth)
              | (CapturePathTS<T[K], Prev[Depth]> extends never
                  ? never
                  : [K, ...CapturePathTS<T[K], Prev[Depth]>] | [[K], ...CapturePathTS<T[K], Prev[Depth]>]);
          }[keyof T & string]
        // --- Paths for the ALL symbol ---
        | (
            | [typeof ALL]
            | [[typeof ALL]]
            // Or ALL followed by a ChangeDetector (terminal)
            | [typeof ALL, ChangeDetector<AllValueType<T>>]
            | [[typeof ALL], ChangeDetector<AllValueType<T>>]
            // Or [ALL, ...sub-path] with capture support (decrement depth)
            | (CapturePathTS<Extract<T[keyof T], Record<string, any>>, Prev[Depth]> extends never
                ? never
                :
                    | [typeof ALL, ...CapturePathTS<Extract<T[keyof T], Record<string, any>>, Prev[Depth]>]
                    | [[typeof ALL], ...CapturePathTS<Extract<T[keyof T], Record<string, any>>, Prev[Depth]>])
          )
    : never;

export type ChangeDetectorFn<T> = (key: string, result?: UpdateResult<T>) => boolean;

// Helper type for array change detectors
type ArrayChangeDetector<T extends readonly any[]> = T extends readonly (infer E)[]
  ? {
      [index: string]: ChangeDetectorFn<T> | ([E] extends [object] ? ChangeDetector<E> : never);
    } & {
      [ALL]?: ChangeDetectorFn<T> | ([E] extends [object] ? ChangeDetector<E> : never);
    }
  : never;

// Helper type for object change detectors
type ObjectChangeDetector<T extends object> = {
  [K in StringKeys<T>]?: ChangeDetectorFn<T> | ([T[K]] extends [object] ? ChangeDetector<T[K]> : never);
} & {
  [ALL]?: ChangeDetectorFn<T> | ChangeDetector<AllValueType<T>>;
};

// Main ChangeDetector type
export type ChangeDetector<T> = T extends readonly any[]
  ? ArrayChangeDetector<T>
  : T extends object
    ? ObjectChangeDetector<T>
    : never;
