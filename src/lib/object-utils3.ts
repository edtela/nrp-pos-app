// Define symbols for batch operations
const ALL = Symbol('*');
const WHERE = Symbol('?');

type DataPath<T> =
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

type BindingPath<T, Depth extends number = 5> =
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
            | (BindingPath<T[K], Prev[Depth]> extends never ? never
                : [K, ...BindingPath<T[K], Prev[Depth]>]
                | [[K], ...BindingPath<T[K], Prev[Depth]>])
        }[keyof T & string]
    ) |
    (
        // --- Paths for the ALL symbol ---
        | [typeof ALL] | [[typeof ALL]]
        // Or [ALL, ...sub-path] with capture support (decrement depth)
        | (BindingPath<Extract<T[keyof T], Record<string, any>>, Prev[Depth]> extends never ? never
            : [typeof ALL, ...BindingPath<Extract<T[keyof T], Record<string, any>>, Prev[Depth]>]
            | [[typeof ALL], ...BindingPath<Extract<T[keyof T], Record<string, any>>, Prev[Depth]>])
    )
    : never;

// Helper type to decrement numbers
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface Binding<T> {
    onChange: BindingPath<T>;
    update: (...args: any[]) => Update<T>;
}

// Changes structure - same shape as Data but all properties optional
type DataChange<T> = {
    [K in keyof T]?: T[K] extends object ? DataChange<T[K]> : T[K];
};

type UpdateValue<T> = T extends object ? Update<T> : T;
type UpdateFunction<T> = (value: T) => UpdateValue<T>;
type StaticKeyUpdate<T> = {
    [K in keyof T]?: UpdateValue<T[K]> | UpdateFunction<T[K]>;
}
type OperatorUpdate<T> = {
    [ALL]?: UpdateValue<T[keyof T]> | UpdateFunction<T[keyof T]>;
    [WHERE]?: (value: T) => boolean;
}
type Update<T> = OperatorUpdate<T> & StaticKeyUpdate<T>

function isEmpty(obj: { [key: string]: unknown }) {
    for (const _ in obj) {
        return false;
    }
    return true;
}

function update<T extends object>(data: T, statement?: Update<T>, changes: DataChange<T> = {}): DataChange<T> | undefined {
    if (!statement) return undefined;

    const { [WHERE]: where, [ALL]: all, ...rest } = statement;
    const expanded = rest as StaticKeyUpdate<T>;

    if (where && !where(data)) {
        return undefined;
    }

    if (all) {
        for (const key in data) {
            if (expanded[key] === undefined) {
                (expanded as any)[key] = all;
            }
        }
    }

    function getUpdateValue<V>(d: V, u?: UpdateValue<V> | UpdateFunction<V>): UpdateValue<V> | undefined {
        if (typeof u === 'function') {
            return (u as UpdateFunction<V>)(d);
        }
        return u;
    }

    // Process each key in the expanded transform
    for (const key in expanded) {
        let dataValue = data[key];
        const updateValue = getUpdateValue(dataValue, expanded[key]);
        if (updateValue === undefined || updateValue === dataValue) {
            continue;
        }

        if (updateValue === null || typeof updateValue !== 'object' || Array.isArray(updateValue)) {
            data[key] = changes[key] = updateValue;
            continue;
        }

        if (!dataValue || typeof dataValue !== 'object') {
            data[key] = dataValue = {} as any;
        }

        const nestedChanges = update(dataValue as any, updateValue, changes[key] as any);
        if (nestedChanges) {
            // If changes[key] was undefined prior to update we set it here
            changes[key] = nestedChanges as any;
        }
    }

    return isEmpty(changes) ? undefined : changes;
}

function selectByPath<T>(data: T, path: readonly (string | symbol)[]): Partial<T> | undefined {
    if (path.length === 0 || data === null || typeof data != 'object' || Array.isArray(data)) {
        return data;
    }

    const [head, ...tail] = path;

    const result: any = {};
    if (typeof head === 'string') {
        const value = selectByPath((data as any)[head], tail as any);
        if (value !== undefined) result[head] = value;
    } else if (head === ALL) {
        for (const key in data) {
            const value = selectByPath(data[key], tail as any);
            if (value !== undefined) result[key] = value;
        }
    }

    return isEmpty(result) ? undefined : result;
}

function applyBinding<T>(data: T, changes: DataChange<T>, binding: Binding<T>) {
    const updates = extractBindingUpdates(data, changes, binding, []);
    if (Array.isArray(updates)) {
        updates.forEach(u => update(data, u, changes));
    } else {
        update(data, updates, changes);
    }
}

function extractBindingUpdates(data: any, change: any, binding: Binding<any>, args: any[]): Update<any> | Update<any>[] {
    const [head, ...tail] = binding.onChange;

    function extractSingle(key: string) {
        const keyChange = change[key];
        if (keyChange === undefined) {
            return {};
        }

        let keyArgs = args;
        const keyData = data[key];
        if (Array.isArray(head)) {
            keyArgs = [...args, keyData];
        }

        if (tail.length === 0) {
            return binding.update(...keyArgs);
        }

        const keyBinding = { ...binding, onChange: tail as any };
        return extractBindingUpdates(keyData, keyChange, keyBinding, keyArgs);
    }

    let field = Array.isArray(head) ? head[0] : head;
    if (typeof field === 'string') {
        return extractSingle(field);
    }

    if (field === ALL) {
        const updates = [];
        for (const key in change) {
            const result = extractSingle(key);
            if (Array.isArray(result)) {
                updates.push(...result);
            } else {
                updates.push(result);
            }
        }
        return updates;
    }

    return {};
}

// Export the main functionality
export { ALL, WHERE, update, selectByPath, applyBinding };
export type { DataChange, Update, DataPath, BindingPath, Binding };

