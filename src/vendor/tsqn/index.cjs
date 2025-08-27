"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ALL: () => ALL,
  CONTEXT: () => CONTEXT,
  DEFAULT: () => DEFAULT,
  META: () => META,
  WHERE: () => WHERE,
  anyChange: () => anyChange,
  hasChanges: () => hasChanges,
  select: () => select,
  transaction: () => transaction,
  typeChange: () => typeChange,
  undo: () => undo,
  update: () => update
});
module.exports = __toCommonJS(index_exports);

// src/symbols.ts
var ALL = Symbol("*");
var WHERE = Symbol("?");
var DEFAULT = Symbol("{}");
var CONTEXT = Symbol("$");
var META = Symbol("#");

// src/update.ts
function update(d, u, c) {
  return updateImpl(d, u, c);
}
function updateImpl(data, statement, changes, context) {
  if (!statement) return void 0;
  const { [WHERE]: where, [ALL]: all, [DEFAULT]: defaulT, [CONTEXT]: vars, ...rest } = statement;
  const staticUpdate = rest;
  if (vars) {
    context = context ? { ...context, ...vars } : vars;
  }
  if (where && !where(data, context)) {
    return changes;
  }
  if (all) {
    for (const key in data) {
      if (staticUpdate[key] === void 0) {
        staticUpdate[key] = all;
      }
    }
  }
  function addValueChange(key, oldValue) {
    const newValue = data[key];
    if (oldValue != null && typeof oldValue === "object") {
      const oldValueChanges = changes?.[key];
      if (oldValueChanges) {
        undoImpl(oldValue, oldValueChanges);
      }
    }
    if (!changes) {
      changes = {};
    }
    changes[key] = newValue;
    const meta = changes[META];
    if (meta) {
      if (!meta[key]) {
        meta[key] = { original: oldValue };
      }
    } else {
      changes[META] = { [key]: { original: oldValue } };
    }
  }
  function updateKey(key, oldValue, newValue, replace = false) {
    if (oldValue === newValue) {
      return;
    }
    if (!replace && newValue != null && typeof newValue === "object") {
      if (oldValue == null || typeof oldValue !== "object") {
        const where2 = newValue[WHERE];
        if (where2 && !where2(oldValue, context)) {
          return;
        }
        const defaultValue = newValue[DEFAULT];
        if (defaultValue) {
          data[key] = structuredClone(defaultValue);
          updateImpl(data[key], newValue, void 0, context);
          addValueChange(key, oldValue);
          return;
        }
        throw Error(`Can't partially update a non-object: ${key}`);
      }
      const change = updateImpl(oldValue, newValue, changes ? changes[key] : void 0, context);
      if (change) {
        if (changes) {
          changes[key] = change;
        } else {
          changes = { [key]: change };
        }
      }
      return;
    }
    data[key] = newValue;
    addValueChange(key, oldValue);
  }
  for (const key in staticUpdate) {
    let oldValue = data[key];
    const operand = staticUpdate[key];
    const staticOperand = typeof operand === "function" ? operand(oldValue, data, key, context) : operand;
    if (Array.isArray(staticOperand)) {
      if (staticOperand.length === 0) {
        delete data[key];
        addValueChange(key, oldValue);
        continue;
      }
      if (staticOperand.length === 1) {
        const newValue = typeof staticOperand[0] === "function" ? staticOperand[0] : structuredClone(staticOperand[0]);
        updateKey(key, oldValue, newValue, true);
      } else {
        throw new Error("Multiple element arrays not allowed");
      }
    } else {
      updateKey(key, oldValue, staticOperand);
    }
  }
  return changes;
}
function undo(data, result) {
  return undoImpl(data, result);
}
function undoImpl(data, result) {
  if (data == null || typeof data !== "object" || result === void 0) {
    return data;
  }
  const { [META]: meta, ...rest } = result;
  for (const key in rest) {
    const change = rest[key];
    if (meta && key in meta) {
      data[key] = meta[key].original;
    } else {
      undoImpl(data[key], change);
    }
  }
}
function transaction(data) {
  let changes;
  return {
    update(stmt) {
      changes = updateImpl(data, stmt, changes);
      return this;
    },
    commit: () => {
      const v = changes;
      changes = void 0;
      return v;
    },
    revert: () => {
      if (changes) {
        undo(data, changes);
      }
      changes = void 0;
    }
  };
}

// src/select.ts
function select(data, stmt) {
  const result = selectImpl(data, stmt);
  return result === NO_RESULT ? void 0 : result;
}
var NO_RESULT = Symbol();
function selectImpl(data, stmt) {
  const { [ALL]: all, [WHERE]: where, ...rest } = stmt;
  if (where && !where(data)) {
    return NO_RESULT;
  }
  if (data == null || typeof data !== "object") {
    return data;
  }
  let result = NO_RESULT;
  function addToResult(key, keyStmt) {
    if (Array.isArray(data)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0) {
        return;
      }
    }
    let keyValue = NO_RESULT;
    if (keyStmt === true) {
      keyValue = data[key];
    } else if (keyStmt != null && typeof keyStmt === "object") {
      keyValue = selectImpl(data[key], keyStmt);
    }
    if (keyValue !== NO_RESULT) {
      if (result == NO_RESULT) {
        result = Array.isArray(data) ? [] : {};
      }
      result[key] = keyValue;
    }
  }
  if (all) {
    for (const key in data) {
      addToResult(key, all);
    }
  }
  if (Array.isArray(result) && result.length > 0) {
    result = result.filter((v, i) => i in result);
  }
  for (const key in rest) {
    addToResult(key, rest[key]);
  }
  return result;
}

// src/change-detection.ts
function hasChanges(result, detector) {
  if (result === void 0) return false;
  const { [ALL]: all, ...rest } = detector;
  if (all) {
    for (const key in result) {
      if (!(key in rest)) {
        rest[key] = all;
      }
    }
  }
  for (const key in rest) {
    const keyDetector = rest[key];
    if (typeof keyDetector === "function") {
      if (keyDetector(key, result)) {
        return true;
      }
    } else if (keyDetector !== void 0) {
      if (hasChanges(result[key], keyDetector)) {
        return true;
      }
    }
  }
  return false;
}
var anyChange = (key, r) => {
  return r !== void 0 && key in r;
};
var typeChange = (key, r) => {
  const meta = r?.[META];
  if (!meta || !(key in r) || !(key in meta)) return false;
  const newValue = r[key];
  const oldValue = meta[key]?.original;
  if (newValue === null) return oldValue !== null;
  if (oldValue === null) return newValue !== null;
  return typeof newValue !== typeof oldValue;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ALL,
  CONTEXT,
  DEFAULT,
  META,
  WHERE,
  anyChange,
  hasChanges,
  select,
  transaction,
  typeChange,
  undo,
  update
});
//# sourceMappingURL=index.cjs.map