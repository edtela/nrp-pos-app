import {
    ALL,
    WHERE,
    type DataChange,
    type Update,
    type StaticKeyUpdate,
    type UpdateValue,
    type UpdateFunction,
    type Binding
} from './data-model-types';

function isEmpty(obj: { [key: string]: unknown }) {
    for (const _ in obj) {
        return false;
    }
    return true;
}

export function update<T extends object>(data: T, statement?: Update<T>, changes: DataChange<T> = {}): DataChange<T> | undefined {
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

export function selectByPath<T>(data: T, path: readonly (string | symbol)[]): Partial<T> | undefined {
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

export function applyBinding<T>(data: T, changes: DataChange<T>, binding: Binding<T>) {
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

// Re-export symbols and types from data-model-types
export { ALL, WHERE };
export type { DataChange, Update, DataPath, BindingPath, Binding } from './data-model-types';