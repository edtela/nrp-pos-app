import {
  update as tsqnUpdate,
  undo as tsqnUndo,
  hasChanges as tsqnHasChanges,
  anyChange,
  typeChange,
  ALL,
  WHERE,
  DEFAULT,
  CONTEXT,
  META,
  type Update,
  type UpdateResult,
} from "tsqn";
import { type DataChange, type DataBinding } from "./data-model-types";

// Re-export from tsqn
export const update = tsqnUpdate;
export const undoUpdate = tsqnUndo;
export const hasChanges = tsqnHasChanges;
export { anyChange, typeChange, ALL, WHERE, DEFAULT, CONTEXT, META };

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
