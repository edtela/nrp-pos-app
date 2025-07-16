// Define symbols for batch operations
const ALL = Symbol('*');
const WHERE = Symbol('?');

// Type-safe path through a data structure with ALL symbol support
type DataPath<T> = T extends Record<string, any>
    ? {
        // Exact paths for each key
        [K in keyof T]: [K] | (T[K] extends Record<string, any> ? [K, ...DataPath<T[K]>] : [K])
    }[keyof T]
    | [typeof ALL] // ALL at current level
    | (T[keyof T] extends Record<string, any>
        ? [typeof ALL, ...DataPath<T[keyof T]>] // ALL followed by common properties
        : [typeof ALL])
    : T extends any[]
    ? [number] // Specific index
    | [typeof ALL] // ALL elements
    | (T[number] extends Record<string, any> | any[]
        ? [number, ...DataPath<T[number]>] // Specific index with nested path
        | [typeof ALL, ...DataPath<T[number]>] // ALL with nested path
        : [number])
    : never;

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

        if (updateValue === null || typeof updateValue !== 'object') {
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

// Export the main functionality
export { update, ALL, WHERE };
export type { DataChange, Update, DataPath };

