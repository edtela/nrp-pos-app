class EntryTransformer<T = any> {
  constructor(private filter?: (key: string, value: T) => boolean) {}
  
  where(predicate: (key: string, value: T) => boolean): EntryTransformer<T> {
    return new EntryTransformer(predicate);
  }
  
  map<R>(transform: (key: string, value: T) => R) {
    return {
      __forEach: true,
      fn: (key: string, value: T) => 
        (!this.filter || this.filter(key, value)) ? transform(key, value) : value
    };
  }
}

export const forEachEntry = new EntryTransformer();

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
    } else if (newValue && newValue.__forEach && typeof newValue.fn === 'function') {
      // Handle forEachEntry pattern
      if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        changeEvent[key] = {};
        for (const childKey in targetValue) {
          if (!targetValue.hasOwnProperty(childKey)) continue;
          
          const childValue = targetValue[childKey];
          const transformedValue = newValue.fn(childKey, childValue);
          
          if (transformedValue !== childValue) {
            const childResult = setValues(
              { [childKey]: targetValue[childKey] }, 
              { [childKey]: transformedValue },
              changeEvent[key]
            );
            if (childResult) {
              Object.assign(changeEvent[key], childResult);
            }
          }
        }
        // Remove empty event objects
        if (Object.keys(changeEvent[key]).length === 0) {
          delete changeEvent[key];
        }
      }
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