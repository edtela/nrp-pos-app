import {
    ALL,
    WHERE,
    type DataChange,
    type Update,
    type DataBinding,
    STRUCTURE
} from './data-model-types';

export function update<T extends object>(data: T, statement?: Update<T>, changes?: DataChange<T>): DataChange<T> | undefined {
    return updateImpl(data, statement, changes);
}

export function updateImpl(data: any, statement?: any, changes?: any): any {
    if (!statement) return undefined;

    const { [WHERE]: where, [ALL]: all, ...rest } = statement;
    const staticUpdate = rest;

    if (where && !where(data)) {
        return changes;
    }

    if (all) {
        for (const key in data) {
            if (staticUpdate[key] === undefined) {
                staticUpdate[key] = all;
            }
        }
    }

    function addChange(key: string, newValue: any) {
        if (!changes) {
            changes = {};
        }
        changes[key] = newValue;
    }

    function structureChange(key: string, change: 'delete' | 'replace') {
        if (!changes) {
            changes = {};
        }

        let sc = changes[STRUCTURE];
        if (!sc) {
            sc = changes[STRUCTURE] = {};
        }
        sc[key] = change;
    }

    function updateKey(key: string, value: any, newValue: any, replace = false) {
        if (value === newValue) {
            return;
        }

        if (!replace && newValue != null && typeof newValue === 'object') {
            if (value == null || typeof value !== 'object') {
                throw Error(`Can't partially update a non-object`);
            }

            const change = updateImpl(value, newValue, changes ? changes[key] : undefined);
            if (change) {
                addChange(key, change);
            }
            return;
        }

        // newValue null or not an object or full object, set directly 
        data[key] = newValue;
        addChange(key, newValue);
    }

    // Process each key in the expanded transform
    for (const key in staticUpdate) {
        let value = data[key];

        const operand = staticUpdate[key];
        const staticOperand = typeof operand === 'function' ? operand(value, data, key) : operand;

        if (Array.isArray(staticOperand)) {
            if (staticOperand.length === 0) {
                delete data[key];
                addChange(key, undefined);
                structureChange(key, 'delete');
                continue;
            }

            if (staticOperand.length === 1) {
                updateKey(key, value, staticOperand[0], true);
                structureChange(key, 'replace');
            } else {
                throw new Error('Multiple element arrays not allowed'); //TODO collect warning
            }
        } else {
            updateKey(key, value, staticOperand);
        }
    }

    return changes;
}

export function selectByPath<T>(data: T, path: readonly (string | symbol)[]): Partial<T> | undefined {
    if (path.length === 0 || data === null || typeof data != 'object' || Array.isArray(data)) {
        return data;
    }

    const [head, ...tail] = path;

    let result: any;
    if (typeof head === 'string') {
        const value = selectByPath((data as any)[head], tail as any);
        if (value !== undefined) result = { [head]: value };
    } else if (head === ALL) {
        for (const key in data) {
            const value = selectByPath(data[key], tail as any);
            if (value !== undefined) {
                if (!result) {
                    result = {};
                }
                result[key] = value;
            }
        }
    }

    return result;
}

export function applyBindings<T extends object>(data: T, changes: DataChange<T>, bindings: DataBinding<T>[], init = false) {
    bindings.forEach(b => applyBinding(data, changes, b, init));
}

export function applyBinding<T extends object>(data: T, changes: DataChange<T>, binding: DataBinding<T>, init = false) {
    if (init && !binding.init) {
        return;
    }

    const hasCapture = binding.onChange.findIndex(b => Array.isArray(b)) >= 0;
    const updateArgs = hasCapture ? [] : [data];
    const updates = extractBindingUpdates(data, init ? data : changes, binding, updateArgs, hasCapture);
    if (Array.isArray(updates)) {
        updates.forEach(u => update(data, u, changes));
    } else {
        update(data, updates, changes);
    }
}

function extractBindingUpdates(data: any, change: any, binding: DataBinding<any>, args: any[], hasCapture: boolean): Update<any> | Update<any>[] {
    const [head, ...tail] = binding.onChange;

    function extractSingle(key: string, addToArgs = false) {
        const keyChange = change[key];
        if (keyChange === undefined) {
            return {};
        }

        let keyArgs = args;
        if (addToArgs) {
            keyArgs = [...keyArgs, key]
        }

        const keyData = data[key];
        if (Array.isArray(head)) {
            keyArgs = [...keyArgs, keyData];
        }

        if (tail.length === 0) {
            return binding.update(...keyArgs);
        }

        const keyBinding = { ...binding, onChange: tail as any };
        return extractBindingUpdates(keyData, keyChange, keyBinding, keyArgs, hasCapture);
    }

    let field = Array.isArray(head) ? head[0] : head;
    if (typeof field === 'string') {
        return extractSingle(field);
    }

    if (field === ALL) {
        const updates = [];
        for (const key in change) {
            const result = extractSingle(key, !hasCapture);
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

export function state<T extends object>(bindings: DataBinding<T>[]) {
    let data: T | undefined;

    return {
        setData(newData: T) {
            data = newData;
            if (data != null) {
                const changes: DataChange<T> = {} as any
                applyBindings(data, changes, bindings, true);
                return changes;
            }
            return undefined;
        },
        update: (statement: Update<T>) => {
            if (data == null) throw Error('No data');

            const changes = update(data, statement);
            if (changes) {
                applyBindings(data, changes, bindings);
            }
            return changes;
        }
    }
}
