interface StorageKey<T> {
  key: string;
  _type?: T;
}

export function createKey<T>(key: string): StorageKey<T> {
  return { key };
}

export function getItem<T>(storageKey: StorageKey<T>, storage: Storage = localStorage): T | null {
  const value = storage.getItem(storageKey.key);
  if (value === null) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function setItem<T>(storageKey: StorageKey<T>, value: T, storage: Storage = localStorage): void {
  storage.setItem(storageKey.key, JSON.stringify(value));
}

export function replaceItem<T>(
  storageKey: StorageKey<T>, 
  updater: (currentValue: T | null) => T,
  storage: Storage = localStorage
): T {
  const currentValue = getItem(storageKey, storage);
  const newValue = updater(currentValue);
  setItem(storageKey, newValue, storage);
  return newValue;
}

export interface Store<T> {
  get(): T | null;
  get(defaultValue: T): T;
  set(value: T): void;
  replace(updater: (currentValue: T | null) => T): T;
}

export function createStore<T>(key: string, storageType: 'local' | 'session' = 'local'): Store<T> {
  const storage = storageType === 'session' ? sessionStorage : localStorage;
  const storageKey = createKey<T>(key);
  
  return {
    get: ((defaultValue?: T) => {
      const value = getItem(storageKey, storage);
      return value !== null ? value : defaultValue ?? null;
    }) as any,
    set: (value: T) => setItem(storageKey, value, storage),
    replace: (updater: (currentValue: T | null) => T) => replaceItem(storageKey, updater, storage)
  };
}