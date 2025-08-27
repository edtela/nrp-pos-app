// Re-export symbols and types from tsqn
import { 
  ALL, 
  WHERE, 
  DEFAULT, 
  CONTEXT, 
  META,
  type Update,
  type UpdateResult,
  type UpdateResultMeta,
  type ChangeDetector,
  type ChangeDetectorFn
} from "@/vendor/tsqn/index.js";

export { 
  ALL, 
  WHERE, 
  DEFAULT, 
  CONTEXT, 
  META,
  type Update,
  type UpdateResult,
  type UpdateResultMeta,
  type ChangeDetector,
  type ChangeDetectorFn
};

// Helper types for internal use
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;
type AllValueType<T extends object> = T extends readonly any[] ? T[number] : UnionToIntersection<T[keyof T]>;

export type DataChange<T> = UpdateResult<T>;

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

