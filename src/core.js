import { collectStableFingerprint } from "./stablefp.js";
import { collectFullFingerprint } from "./fullfp.js";
import { collectSessionFingerprint } from "./sessionfp.js";
import { createCache } from "./cache.js";
import {
  hashObject,
  deepEqual,
  similarityToConfidence,
  clamp
} from "./utils.js";
import { emitFingerprintEvent } from "./events.js";

export class SmartFingerprint {
  constructor(options = {}) {
    this.options = {
      includeCanvas: true,
      includeWebGL: true,
      includeFonts: true,
      includeAudio: false,
      autoCache: true,
      cacheKey: "__smart_fp_cache_v2__",
      cacheTtlMs: 30 * 60 * 1000,
      emitEvents: true,
      debug: false,
      ...options
    };

    this.cache = createCache({
      key: this.options.cacheKey,
      ttlMs: this.options.cacheTtlMs
    });

    this.weights = {
      browserFamily: 22,
      browserMajorVersion: 10,
      osFamily: 18,
      platformType: 10,
      cpuCores: 10,
      memoryBucket: 8,
      touchPointsBucket: 6,
      languageFamily: 3,
      storageSupport: 6,
      cookieEnabled: 2,
      pdfViewerEnabled: 2,
      colorDepth: 2,
      pixelDepth: 1,
      screenBucket: 4,
      timezoneOffset: 2,
      devicePixelRatio: 2,
      doNotTrack: 2,
      webdriver: 4,
      pluginsCount: 1,
      mimeTypesCount: 1,
      canvasHash: 6,
      fontsHash: 7,
      fontsCountBucket: 2,
      audioHash: 4,
      webglVendor: 3,
      webglRenderer: 3,
      webglVersion: 2,
      webglShadingLanguageVersion: 1,
      webglExtensionsBucket: 2,
      webglTextureBucket: 2,
      webglAntialias: 1,
      webglHash: 4
    };
  }

  async get(options = {}) {
    const useCache = options.useCache !== false && this.options.autoCache !== false;

    if (useCache) {
      const cached = this.cache.read();
      if (cached) {
        if (this.options.emitEvents) {
          emitFingerprintEvent("fingerprint:ready", {
            result: cached,
            cached: true
          });
        }
        return cached;
      }
    }

    const stable = await collectStableFingerprint();
    const full = await collectFullFingerprint({
      includeCanvas: this.options.includeCanvas,
      includeWebGL: this.options.includeWebGL,
      includeFonts: this.options.includeFonts,
      includeAudio: this.options.includeAudio
    });
    const session = await collectSessionFingerprint();

    const normalized = {
      ...stable.normalized,
      ...full.normalized,
      sessionId: session.id
    };

    const visitorCoreId = await hashObject(
      {
        stable: stable.normalized,
        full: full.normalized
      },
      16
    );

    const result = {
      visitorId: `fp_${visitorCoreId}`,
      stableId: stable.id,
      fullId: full.id,
      sessionId: session.id,
      confidence: this.estimateConfidence(normalized),
      stable,
      full,
      session,
      normalized,
      createdAt: Date.now()
    };

    if (useCache) {
      this.cache.write(result);
    }

    if (this.options.emitEvents) {
      emitFingerprintEvent("fingerprint:ready", {
        result,
        cached: false
      });
    }

    return result;
  }

  async refresh() {
    this.cache.clear();
    return this.get({ useCache: false });
  }

  readCache() {
    return this.cache.read();
  }

  clearCache() {
    return this.cache.clear();
  }

  compare(left, right) {
    const a = left.normalized ? left.normalized : left;
    const b = right.normalized ? right.normalized : right;

    let score = 0;
    let maxScore = 0;

    for (const [key, weight] of Object.entries(this.weights)) {
      maxScore += weight;

      const av = a[key];
      const bv = b[key];

      if (av == null || bv == null) {
        continue;
      }

      if (typeof av === "object" && typeof bv === "object") {
        if (deepEqual(av, bv)) {
          score += weight;
        }
        continue;
      }

      if (av === bv) {
        score += weight;
      }
    }

    const similarity = maxScore > 0 ? Number((score / maxScore).toFixed(4)) : 0;

    return {
      similarity,
      confidence: similarityToConfidence(similarity),
      sameVisitorLikely: similarity >= 0.72,
      score,
      maxScore
    };
  }

  estimateConfidence(normalized) {
    let score = 0;
    let max = 0;

    const add = (value, points) => {
      max += points;
      if (value !== null && value !== undefined && value !== false) {
        score += points;
      }
    };

    add(normalized.browserFamily, 15);
    add(normalized.browserMajorVersion, 8);
    add(normalized.osFamily, 15);
    add(normalized.platformType, 10);
    add(normalized.cpuCores, 10);
    add(normalized.memoryBucket, 8);
    add(normalized.touchPointsBucket, 6);
    add(normalized.languageFamily, 2);
    add(normalized.storageSupport, 6);
    add(normalized.colorDepth, 2);
    add(normalized.screenBucket, 4);
    add(normalized.timezoneOffset, 2);
    add(normalized.canvasHash, 10);
    add(normalized.fontsHash, 8);
    add(normalized.fontsCountBucket, 2);
    add(normalized.audioHash, 4);
    add(normalized.webglVendor, 5);
    add(normalized.webglRenderer, 5);
    add(normalized.webglVersion, 3);
    add(normalized.webglShadingLanguageVersion, 2);
    add(normalized.webglExtensionsBucket, 2);
    add(normalized.webglTextureBucket, 2);
    add(normalized.webglAntialias, 1);
    add(normalized.webglHash, 4);

    const raw = max > 0 ? score / max : 0;
    return clamp(Number(raw.toFixed(2)), 0.15, 0.98);
  }
}
