export function setValues(target: any, values: any, event: Record<string, any> = {}): Record<string, any> {
  function isTerminal(value: any): boolean {
    return (
      value === null ||
      value === undefined ||
      typeof value !== 'object' ||
      Array.isArray(value)
    );
  }

  function processPath(currentTarget: any, currentValues: any, path: string[] = []): void {
    for (const key in currentValues) {
      if (!currentValues.hasOwnProperty(key)) continue;

      const targetValue = currentTarget[key];
      const newValue = currentValues[key];
      const currentPath = [...path, key];
      const pathString = currentPath.join('.');

      if (targetValue === newValue) {
        continue;
      }

      if (isTerminal(newValue)) {
        currentTarget[key] = newValue;
        event[pathString] = newValue;
      } else {
        if (targetValue === undefined || targetValue === null || typeof targetValue !== 'object' || Array.isArray(targetValue)) {
          currentTarget[key] = {};
        }
        processPath(currentTarget[key], newValue, currentPath);
      }
    }
  }

  processPath(target, values);
  return event;
}