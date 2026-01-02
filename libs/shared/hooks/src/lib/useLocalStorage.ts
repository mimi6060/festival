/**
 * useLocalStorage Hook
 * Persist state in localStorage with type safety
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

type SetValue<T> = T | ((prevValue: T) => T);

interface UseLocalStorageOptions<T> {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  initializeWithValue?: boolean;
}

// ============================================================================
// useLocalStorage Hook
// ============================================================================

/**
 * Persist state in localStorage
 * @param key - The localStorage key
 * @param initialValue - Initial value if key doesn't exist
 * @param options - Serialization options
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>
): [T, (value: SetValue<T>) => void, () => void] {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    initializeWithValue = true,
  } = options ?? {};

  // Read from localStorage
  const readValue = useCallback((): T => {
    // Check if window is defined (SSR check)
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserializer(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue, deserializer]);

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (initializeWithValue) {
      return readValue();
    }
    return initialValue;
  });

  // Set value in localStorage
  const setValue = useCallback(
    (value: SetValue<T>) => {
      if (typeof window === 'undefined') {
        console.warn(
          `Tried to set localStorage key "${key}" even though environment is not a browser`
        );
        return;
      }

      try {
        // Allow value to be a function
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Save to state
        setStoredValue(valueToStore);

        // Save to localStorage
        window.localStorage.setItem(key, serializer(valueToStore));

        // Dispatch event for other tabs/windows
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: serializer(valueToStore),
          })
        );
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, serializer]
  );

  // Remove from localStorage
  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);

      // Dispatch event for other tabs/windows
      window.dispatchEvent(
        new StorageEvent('storage', {
          key,
          newValue: null,
        })
      );
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes in other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(deserializer(event.newValue));
        } catch {
          setStoredValue(initialValue);
        }
      } else if (event.key === key && event.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue, deserializer]);

  // Sync with localStorage on mount (for SSR)
  useEffect(() => {
    if (!initializeWithValue) {
      setStoredValue(readValue());
    }
  }, [initializeWithValue, readValue]);

  return [storedValue, setValue, removeValue];
}

// ============================================================================
// useSessionStorage Hook
// ============================================================================

/**
 * Persist state in sessionStorage
 * Same API as useLocalStorage but uses sessionStorage
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
  options?: Omit<UseLocalStorageOptions<T>, 'initializeWithValue'>
): [T, (value: SetValue<T>) => void, () => void] {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
  } = options ?? {};

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? deserializer(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue, deserializer]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback(
    (value: SetValue<T>) => {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        setStoredValue(valueToStore);
        window.sessionStorage.setItem(key, serializer(valueToStore));
      } catch (error) {
        console.warn(`Error setting sessionStorage key "${key}":`, error);
      }
    },
    [key, storedValue, serializer]
  );

  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// ============================================================================
// useLocalStorageObject Hook
// ============================================================================

/**
 * Store an object in localStorage with partial update support
 */
export function useLocalStorageObject<T extends Record<string, unknown>>(
  key: string,
  initialValue: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [value, setValue, removeValue] = useLocalStorage<T>(key, initialValue);

  const updateValue = useCallback(
    (updates: Partial<T>) => {
      setValue((prev) => ({ ...prev, ...updates }));
    },
    [setValue]
  );

  return [value, updateValue, removeValue];
}

// ============================================================================
// useLocalStorageArray Hook
// ============================================================================

/**
 * Store an array in localStorage with array manipulation helpers
 */
export function useLocalStorageArray<T>(
  key: string,
  initialValue: T[] = []
): {
  value: T[];
  push: (item: T) => void;
  remove: (index: number) => void;
  removeBy: (predicate: (item: T) => boolean) => void;
  update: (index: number, item: T) => void;
  clear: () => void;
  set: (items: T[]) => void;
} {
  const [value, setValue, clearValue] = useLocalStorage<T[]>(key, initialValue);

  const push = useCallback(
    (item: T) => {
      setValue((prev) => [...prev, item]);
    },
    [setValue]
  );

  const remove = useCallback(
    (index: number) => {
      setValue((prev) => prev.filter((_, i) => i !== index));
    },
    [setValue]
  );

  const removeBy = useCallback(
    (predicate: (item: T) => boolean) => {
      setValue((prev) => prev.filter((item) => !predicate(item)));
    },
    [setValue]
  );

  const update = useCallback(
    (index: number, item: T) => {
      setValue((prev) => prev.map((v, i) => (i === index ? item : v)));
    },
    [setValue]
  );

  const clear = useCallback(() => {
    setValue([]);
  }, [setValue]);

  return {
    value,
    push,
    remove,
    removeBy,
    update,
    clear,
    set: setValue,
  };
}

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all localStorage keys
 */
export function getLocalStorageKeys(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key) {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Get localStorage size in bytes
 */
export function getLocalStorageSize(): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key) {
      const value = window.localStorage.getItem(key);
      if (value) {
        total += key.length + value.length;
      }
    }
  }
  return total * 2; // UTF-16 uses 2 bytes per character
}

/**
 * Clear all localStorage with optional prefix filter
 */
export function clearLocalStorage(prefix?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!prefix) {
    window.localStorage.clear();
    return;
  }

  const keys = getLocalStorageKeys();
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      window.localStorage.removeItem(key);
    }
  }
}

export default useLocalStorage;
