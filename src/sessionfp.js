import { hashObject, randomId, safeNumber } from "./utils.js";

function getPerfBucket() {
  try {
    const nav = performance?.navigation;
    if (nav && Number.isFinite(nav.type)) {
      return `nav_${nav.type}`;
    }

    const entries = performance?.getEntriesByType?.("navigation");
    if (entries && entries[0]?.type) {
      return String(entries[0].type);
    }

    return null;
  } catch {
    return null;
  }
}

export async function collectSessionFingerprint() {
  const raw = {
    href: location.href,
    pathname: location.pathname,
    referrer: document.referrer || null,
    historyLength: safeNumber(history.length),
    devicePixelRatio: Number.isFinite(window.devicePixelRatio)
      ? window.devicePixelRatio
      : null,
    perfType: getPerfBucket(),
    timestampMinuteBucket: Math.floor(Date.now() / 60000),
    tabToken: sessionStorage.getItem("__fp_tab_token__") || null
  };

  if (!raw.tabToken) {
    raw.tabToken = randomId(20);
    try {
      sessionStorage.setItem("__fp_tab_token__", raw.tabToken);
    } catch {}
  }

  const normalized = {
    pathname: raw.pathname,
    historyLength: raw.historyLength,
    devicePixelRatio: raw.devicePixelRatio,
    perfType: raw.perfType,
    tabToken: raw.tabToken
  };

  const id = await hashObject(normalized, 16);

  return {
    id: `ss_${id}`,
    raw,
    normalized
  };
}