import {
  safeNumber,
  parseUserAgent,
  getLanguageFamily,
  bucketCpu,
  bucketMemory,
  bucketTouch,
  getStorageSupport,
  hashObject
} from "./utils.js";

export async function collectStableFingerprint() {
  const nav = navigator;

  const raw = {
    rawUserAgent: nav.userAgent || "",
    language: nav.language || null,
    languages: Array.isArray(nav.languages) ? nav.languages.slice(0, 5) : [],
    hardwareConcurrency: safeNumber(nav.hardwareConcurrency),
    deviceMemory: safeNumber(nav.deviceMemory),
    maxTouchPoints: safeNumber(nav.maxTouchPoints),
    cookieEnabled: !!nav.cookieEnabled,
    pdfViewerEnabled: typeof nav.pdfViewerEnabled === "boolean" ? nav.pdfViewerEnabled : null,
    vendor: nav.vendor || null,
    platform: nav.platform || null,
    storageSupport: getStorageSupport()
  };

  const ua = parseUserAgent(raw.rawUserAgent);

  const normalized = {
    browserFamily: ua.browserFamily,
    browserMajorVersion: ua.browserMajorVersion,
    osFamily: ua.osFamily,
    platformType: ua.platformType,
    cpuCores: bucketCpu(raw.hardwareConcurrency),
    memoryBucket: bucketMemory(raw.deviceMemory),
    touchPointsBucket: bucketTouch(raw.maxTouchPoints),
    languageFamily: getLanguageFamily(raw.language, raw.languages),
    storageSupport: raw.storageSupport,
    cookieEnabled: raw.cookieEnabled,
    pdfViewerEnabled: raw.pdfViewerEnabled
  };

  const id = await hashObject(normalized, 16);

  return {
    id: `st_${id}`,
    raw,
    normalized
  };
}