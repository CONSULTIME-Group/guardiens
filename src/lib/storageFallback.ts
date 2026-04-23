type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "clear" | "key" | "length">;

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

function canUseStorage(storage: Storage | undefined) {
  if (!storage) return false;
  try {
    const probeKey = "__guardiens_storage_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function getSafeLocalStorage(): StorageLike {
  if (typeof window === "undefined") {
    return createMemoryStorage();
  }

  try {
    if (canUseStorage(window.localStorage)) {
      return window.localStorage;
    }
  } catch {}

  return createMemoryStorage();
}

export function getSafeSessionStorage(): StorageLike {
  if (typeof window === "undefined") {
    return createMemoryStorage();
  }

  try {
    if (canUseStorage(window.sessionStorage)) {
      return window.sessionStorage;
    }
  } catch {}

  return createMemoryStorage();
}

export function installStorageFallback() {
  if (typeof window === "undefined") return;

  if (!canUseStorage(window.localStorage)) {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
  }

  if (!canUseStorage(window.sessionStorage)) {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
  }
}