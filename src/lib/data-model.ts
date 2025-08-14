import {
  ALL,
  WHERE,
  type DataChange,
  type Update,
  type DataBinding,
  UpdateResult,
  META,
  ChangeDetector,
  ChangeDetectorFn,
  DEFAULT,
} from "./data-model-types";

export function update<T extends object>(d: T, u?: Update<T>, c?: UpdateResult<T>): UpdateResult<T> | undefined {
  return updateImpl(d, u, c);
}

export function updateImpl(data: any, statement?: any, changes?: any): any {
  if (!statement) return undefined;

  const { [WHERE]: where, [ALL]: all, [DEFAULT]: defaulT, ...rest } = statement;
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

  function addValueChange(key: string, oldValue: any) {
    const newValue = data[key];

    if (oldValue != null && typeof oldValue === "object") {
      //we need to undo changes that may have occured before setting it as original
      const oldValueChanges = changes?.[key];
      if (oldValueChanges) {
        undoUpdateImpl(oldValue, oldValueChanges);
      }
    }

    if (!changes) {
      changes = {};
    }
    changes[key] = newValue;

    const meta = changes[META];
    if (meta) {
      if (!meta[key]) {
        // only record on first change, original value
        meta[key] = { original: oldValue };
      }
    } else {
      changes[META] = { [key]: { original: oldValue } };
    }
  }

  function updateKey(key: string, oldValue: any, newValue: any, replace = false) {
    if (oldValue === newValue) {
      return;
    }

    if (!replace && newValue != null && typeof newValue === "object") {
      if (oldValue == null || typeof oldValue !== "object") {
        //check the where statement before throwing error
        const where = newValue[WHERE];
        if (where && !where(oldValue)) {
          return;
        }

        const defaultValue = newValue[DEFAULT];
        if (defaultValue) {
          data[key] = structuredClone(defaultValue);
          updateImpl(data[key], newValue);
          addValueChange(key, oldValue);
          return;
        }

        console.error(`Can't partially update a non-object: ${key}`);
        return;
      }

      const change = updateImpl(oldValue, newValue, changes ? changes[key] : undefined);
      if (change) {
        if (changes) {
          changes[key] = change;
        } else {
          changes = { [key]: change };
        }
      }
      return;
    }

    // newValue null or not an object or full object, set directly
    data[key] = newValue;
    addValueChange(key, oldValue);
  }

  // Process each key in the expanded transform
  for (const key in staticUpdate) {
    let oldValue = data[key];

    const operand = staticUpdate[key];
    const staticOperand = typeof operand === "function" ? operand(oldValue, data, key) : operand;

    if (Array.isArray(staticOperand)) {
      if (staticOperand.length === 0) {
        delete data[key];
        addValueChange(key, oldValue);
        continue;
      }

      if (staticOperand.length === 1) {
        //structured clone can still fail for functions within operand
        const newValue = typeof staticOperand[0] === "function" ? staticOperand[0] : structuredClone(staticOperand[0]);
        updateKey(key, oldValue, newValue, true);
      } else {
        throw new Error("Multiple element arrays not allowed"); //TODO collect warning
      }
    } else {
      updateKey(key, oldValue, staticOperand);
    }
  }

  return changes;
}

export function undoUpdate<T extends object>(data: T, result: UpdateResult<T> | undefined) {
  return undoUpdateImpl(data, result);
}

function undoUpdateImpl(data: any, result: any) {
  if (data == null || typeof data !== "object" || result === undefined) {
    return data;
  }

  const { [META]: meta, ...rest } = result;
  for (const key in rest) {
    const change = rest[key];
    if (meta && key in meta) {
      data[key] = meta[key].original;
    } else {
      undoUpdateImpl(data[key], change);
    }
  }
}

export function hasChanges<T extends object>(result: UpdateResult<T> | undefined, detector: ChangeDetector<T>) {
  if (result === undefined) return false;

  const { [ALL]: all, ...rest } = detector;
  if (all) {
    for (const key in result) {
      if (!(key in rest)) {
        (rest as any)[key] = all;
      }
    }
  }

  for (const key in rest) {
    const keyDetector = (rest as any)[key];
    if (typeof keyDetector === "function") {
      if (keyDetector(key, result)) {
        return true;
      }
    } else if (keyDetector !== undefined) {
      if (hasChanges((result as any)[key], keyDetector)) {
        return true;
      }
    }
  }

  return false;
}

export const anyChange: ChangeDetectorFn<any> = (key: string, r?: UpdateResult<any>) => {
  return r !== undefined && key in r;
};

export const typeChange: ChangeDetectorFn<any> = (key: string, r?: UpdateResult<any>) => {
  const meta = r?.[META];
  if (!meta || !(key in r) || !(key in meta)) return false;

  const newValue = r[key];
  const oldValue = meta[key]?.original;

  if (newValue === null) return oldValue !== null;
  if (oldValue === null) return newValue !== null;
  return typeof newValue !== typeof oldValue;
};

export function selectByPath<T>(data: T, path: readonly (string | symbol)[]): Partial<T> | undefined {
  if (path.length === 0 || data === null || typeof data != "object" || Array.isArray(data)) {
    return data;
  }

  const [head, ...tail] = path;

  let result: any;
  if (typeof head === "string") {
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

export function applyBindings<T extends object>(
  data: T,
  changes: UpdateResult<T>,
  bindings: DataBinding<T>[],
  init = false,
) {
  bindings.forEach((b) => applyBinding(data, changes, b, init));
}

export function applyBinding<T extends object>(
  data: T,
  changes: UpdateResult<T>,
  binding: DataBinding<T>,
  init = false,
) {
  if (init && !binding.init) {
    return;
  }

  let hasCapture = false;
  if (Array.isArray(binding.onChange)) {
    hasCapture = binding.onChange.findIndex((b) => Array.isArray(b)) >= 0;
  }

  const updateArgs = hasCapture ? [] : [data];
  const updates = extractBindingUpdates(data, init ? true : changes, binding, updateArgs, hasCapture);
  if (Array.isArray(updates)) {
    updates.forEach((u) => update(data, u, changes));
  } else {
    update(data, updates, changes);
  }
}

function extractBindingUpdates(
  data: any,
  change: any | true,
  binding: any,
  args: any[],
  hasCapture: boolean,
): Update<any> | Update<any>[] {
  const [head, ...tail] = Array.isArray(binding.onChange) ? binding.onChange : [binding.onChange];

  function extractSingle(key: string, addToArgs = false) {
    const keyChange = change === true ? change : change[key];

    let keyArgs = args;
    if (addToArgs) {
      keyArgs = [...keyArgs, key];
    }

    const keyData = data[key];
    if (Array.isArray(head)) {
      keyArgs = [...keyArgs, keyData];
    }

    if (tail.length === 0) {
      return binding.update(...keyArgs);
    }

    if (keyChange === undefined) {
      return {};
    }

    const keyBinding = { ...binding, onChange: tail as any };
    return extractBindingUpdates(keyData, keyChange, keyBinding, keyArgs, hasCapture);
  }

  let field = Array.isArray(head) ? head[0] : head;
  if (field === ALL) {
    const updates = [];

    for (const key in change === true ? data : change) {
      const result = extractSingle(key, !hasCapture);
      if (Array.isArray(result)) {
        updates.push(...result);
      } else {
        updates.push(result);
      }
    }
    return updates;
  }

  if (typeof field === "string") {
    if (change === true || field in change) {
      return extractSingle(field);
    }
    return {};
  }

  if (change === true || hasChanges(change, field)) {
    return binding.update(...args);
  }

  return {};
}

export function state<T extends object>(bindings: DataBinding<T>[]) {
  let data: T | undefined;

  return {
    setData(newData: T) {
      data = newData;
      if (data != null) {
        const changes: DataChange<T> = {} as any;
        applyBindings(data, changes, bindings, true);
        return changes;
      }
      return undefined;
    },
    update: (statement: Update<T>, changes?: UpdateResult<T>) => {
      if (data == null) throw Error("No data");

      changes = update(data, statement, changes);
      if (changes) {
        applyBindings(data, changes, bindings);
      }
      return changes;
    },
    updateAll: (statements: Update<T>[], changes?: UpdateResult<T>) => {
      if (data == null) throw Error("No data");

      for (const stmt of statements) {
        changes = update(data, stmt, changes);
      }

      if (changes) {
        applyBindings(data, changes, bindings);
      }
      return changes;
    },
  };
}
