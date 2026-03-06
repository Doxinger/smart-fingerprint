export function safeNumber(value) {
  return Number.isFinite(value) ? value : null;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const out = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${out.join(",")}}`;
}

export async function sha256Hex(input, sliceLength = 16) {
  const data = new TextEncoder().encode(String(input));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hashBuffer));
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return sliceLength > 0 ? hex.slice(0, sliceLength) : hex;
}

export async function hashObject(obj, sliceLength = 16) {
  return sha256Hex(stableStringify(obj), sliceLength);
}

export function deepEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

export function getLanguageFamily(language, languages = []) {
  const value = language || languages[0] || null;
  if (!value) return null;
  return String(value).toLowerCase().split("-")[0];
}

export function bucketCpu(cores) {
  if (!Number.isFinite(cores)) return null;
  if (cores <= 2) return "low";
  if (cores <= 4) return "mid";
  if (cores <= 8) return "high";
  return "xhigh";
}

export function bucketMemory(memory) {
  if (!Number.isFinite(memory)) return null;
  if (memory <= 2) return "low";
  if (memory <= 4) return "mid";
  if (memory <= 8) return "high";
  return "xhigh";
}

export function bucketTouch(points) {
  if (!Number.isFinite(points)) return null;
  if (points <= 0) return "none";
  if (points <= 2) return "low";
  if (points <= 5) return "mid";
  return "high";
}

export function bucketScreen(width, height, availWidth, availHeight) {
  const values = [width, height, availWidth, availHeight]
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);

  if (!values.length) return null;

  const maxSide = Math.max(...values);
  const minSide = Math.min(...values);
  const aspect = (maxSide / minSide).toFixed(2);

  let size = "unknown";
  if (maxSide <= 900) size = "small";
  else if (maxSide <= 1440) size = "medium";
  else if (maxSide <= 2200) size = "large";
  else size = "xlarge";

  return `${size}_${aspect}`;
}

export function parseUserAgent(ua) {
  const s = String(ua || "");
  const lower = s.toLowerCase();

  let browserFamily = "other";
  let browserMajorVersion = null;

  const browserRules = [
    { name: "edge", regex: /edg\/(\d+)/i },
    { name: "opera", regex: /opr\/(\d+)/i },
    { name: "chrome", regex: /chrome\/(\d+)/i },
    { name: "firefox", regex: /firefox\/(\d+)/i },
    { name: "safari", regex: /version\/(\d+).+safari/i }
  ];

  for (const rule of browserRules) {
    const match = s.match(rule.regex);
    if (match) {
      browserFamily = rule.name;
      browserMajorVersion = String(Number(match[1]));
      break;
    }
  }

  let osFamily = "other";
  if (/windows nt/i.test(s)) osFamily = "windows";
  else if (/android/i.test(s)) osFamily = "android";
  else if (/(iphone|ipad|ipod|ios)/i.test(s)) osFamily = "ios";
  else if (/mac os x/i.test(s)) osFamily = "macos";
  else if (/linux/i.test(s)) osFamily = "linux";

  let platformType = "desktop";
  if (/mobile|iphone|android/i.test(lower)) platformType = "mobile";
  if (/ipad|tablet/i.test(lower)) platformType = "tablet";

  return {
    browserFamily,
    browserMajorVersion,
    osFamily,
    platformType
  };
}

export function hasStorage(name) {
  try {
    const storage = window[name];
    if (!storage) return false;
    const key = "__fp_test__";
    storage.setItem(key, "1");
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getStorageSupport() {
  return {
    localStorage: hasStorage("localStorage"),
    sessionStorage: hasStorage("sessionStorage"),
    indexedDB: typeof indexedDB !== "undefined"
  };
}

export function getPluginsCount() {
  try {
    return navigator.plugins ? navigator.plugins.length : 0;
  } catch {
    return 0;
  }
}

export function getMimeTypesCount() {
  try {
    return navigator.mimeTypes ? navigator.mimeTypes.length : 0;
  } catch {
    return 0;
  }
}

export function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export function similarityToConfidence(similarity) {
  if (similarity >= 0.9) return 0.98;
  if (similarity >= 0.82) return 0.92;
  if (similarity >= 0.72) return 0.84;
  if (similarity >= 0.58) return 0.68;
  if (similarity >= 0.45) return 0.52;
  return 0.3;
}

export function randomId(len = 16) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}
