const DEFAULT_KEY = "__smart_fp_cache_v2__";

export function createCache(options = {}) {
  const key = options.key || DEFAULT_KEY;
  const storage = options.storage || window.localStorage;
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : 30 * 60 * 1000;

  function read() {
    try {
      const value = storage.getItem(key);
      if (!value) return null;

      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object") return null;

      if (
        Number.isFinite(parsed.savedAt) &&
        ttlMs > 0 &&
        Date.now() - parsed.savedAt > ttlMs
      ) {
        storage.removeItem(key);
        return null;
      }

      return parsed.data || null;
    } catch {
      return null;
    }
  }

  function write(data) {
    try {
      storage.setItem(
        key,
        JSON.stringify({
          savedAt: Date.now(),
          data
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  function clear() {
    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  return { read, write, clear, key, ttlMs };
}