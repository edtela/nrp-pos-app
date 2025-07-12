export function setValues(target: any, values: any, event?: Record<string, any>): Record<string, any> | undefined {
  function isTerminal(value: any): boolean {
    return (
      value === null ||
      value === undefined ||
      typeof value !== 'object' ||
      Array.isArray(value)
    );
  }

  let hasChanges = false;
  const changeEvent = event || {};

  for (const key in values) {
    if (!values.hasOwnProperty(key)) continue;

    const targetValue = target[key];
    let newValue = values[key];

    // If newValue is a function, execute it with the key
    if (typeof newValue === 'function') {
      newValue = newValue(key);
    }

    if (targetValue === newValue) {
      continue;
    }

    hasChanges = true;

    if (isTerminal(newValue)) {
      target[key] = newValue;
      changeEvent[key] = newValue;
    } else {
      if (targetValue === undefined || targetValue === null || typeof targetValue !== 'object' || Array.isArray(targetValue)) {
        target[key] = {};
      }
      changeEvent[key] = {};
      setValues(target[key], newValue, changeEvent[key]);
      // Remove empty event objects
      if (Object.keys(changeEvent[key]).length === 0) {
        delete changeEvent[key];
      }
    }
  }

  return hasChanges ? changeEvent : undefined;
}