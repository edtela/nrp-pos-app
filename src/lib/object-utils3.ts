import { MenuItem, VariantGroup } from "@/types";

// Define symbols for batch operations
const ALL = Symbol('*');
const WHERE = Symbol('?');

// Terminal types - primitives, null, or arrays
type Terminal = string | number | boolean | null | Array<any>;
type DataStructure = { [key: string]: Data };
type Data = Terminal | DataStructure;

// Changes structure - same shape as Data but all properties optional
type DataChange<T extends DataStructure> = {
    [K in keyof T]?: T[K] extends DataStructure ? DataChange<T[K]> : T[K];
};

type UpdateValue<T> = T extends DataStructure ? Update<T> : T;
type UpdateFunction<T> = ((current: T) => UpdateValue<T>)
type Update<T extends DataStructure> = {
    [K in keyof T]?: UpdateValue<T[K]> | UpdateFunction<T[K]>;
} & {
    [ALL]?: UpdateValue<T[keyof T]> | UpdateFunction<T[keyof T]>;
    [WHERE]?: (value: T) => boolean;
}

// Helper to check if a value is terminal (not a nested object)
function isTerminal(value: any): value is Terminal {
    return (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null ||
        Array.isArray(value)
    );
}

function isEmpty(obj: { [key: string]: unknown }) {
    for (const _ in obj) {
        return false;
    }
    return true;
}

function update<T extends DataStructure>(data: T, statement: Update<T>, changes: DataChange<T> = {}): DataChange<T> | undefined {
    const { [WHERE]: where, [ALL]: all, ...expanded } = statement;

    if (where && !where(data)) {
        return undefined;
    }

    if (all) {
        for (const key in data) {
            if ((expanded as any)[key] === undefined) {
                (expanded as any)[key] = all;
            }
        }
    }

    // Process each key in the expanded transform
    for (const key in expanded) {
        let updateValue = expanded[key];
        if (updateValue === undefined) {
            continue;
        }

        let dataValue = data[key];

        // If transformValue is a function, call it to get the actual transform
        if (typeof updateValue === 'function') {
            updateValue = updateValue(dataValue as any);
        }

        if (updateValue === dataValue) {
            continue;
        }

        if (isTerminal(updateValue)) {
            (data as any)[key] = (changes as any)[key] = updateValue;
            continue;
        }

        // transformValue is a nested object, recurse
        // If currentValue is terminal or doesn't exist, start with empty object
        if (!dataValue || isTerminal(dataValue)) {
            (data as any)[key] = {};
        }

        // Recursively apply nested transforms
        const nestedChanges = update(data[key] as DataStructure, updateValue as Update<DataStructure>, changes[key] as DataChange<DataStructure>);
        if (nestedChanges) {
            // If changes[key] was undefined prior to update we set it here
            (changes as any)[key] = nestedChanges;
        }
    }

    return isEmpty(changes) ? undefined : changes;
}

// Export the main functionality
export { update, ALL, WHERE };
export type { DataStructure, Terminal, DataChange, Update };
