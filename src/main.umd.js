(function () {
  function safeNumber(value) {
    return Number.isFinite(value) ? value : null;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return "[" + value.map(stableStringify).join(",") + "]";
    }

    var keys = Object.keys(value).sort();
    var out = keys.map(function (key) {
      return JSON.stringify(key) + ":" + stableStringify(value[key]);
    });
    return "{" + out.join(",") + "}";
  }

  async function sha256Hex(input, sliceLength) {
    if (sliceLength === void 0) sliceLength = 16;
    var data = new TextEncoder().encode(String(input));
    var hashBuffer = await crypto.subtle.digest("SHA-256", data);
    var bytes = Array.from(new Uint8Array(hashBuffer));
    var hex = bytes.map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
    return sliceLength > 0 ? hex.slice(0, sliceLength) : hex;
  }

  async function hashObject(obj, sliceLength) {
    if (sliceLength === void 0) sliceLength = 16;
    return sha256Hex(stableStringify(obj), sliceLength);
  }

  function deepEqual(a, b) {
    return stableStringify(a) === stableStringify(b);
  }

  function getLanguageFamily(language, languages) {
    if (languages === void 0) languages = [];
    var value = language || languages[0] || null;
    if (!value) return null;
    return String(value).toLowerCase().split("-")[0];
  }

  function bucketCpu(cores) {
    if (!Number.isFinite(cores)) return null;
    if (cores <= 2) return "low";
    if (cores <= 4) return "mid";
    if (cores <= 8) return "high";
    return "xhigh";
  }

  function bucketMemory(memory) {
    if (!Number.isFinite(memory)) return null;
    if (memory <= 2) return "low";
    if (memory <= 4) return "mid";
    if (memory <= 8) return "high";
    return "xhigh";
  }

  function bucketTouch(points) {
    if (!Number.isFinite(points)) return null;
    if (points <= 0) return "none";
    if (points <= 2) return "low";
    if (points <= 5) return "mid";
    return "high";
  }

  function bucketScreen(width, height, availWidth, availHeight) {
    var values = [width, height, availWidth, availHeight]
      .map(function (v) { return Number(v); })
      .filter(function (v) { return Number.isFinite(v) && v > 0; });

    if (!values.length) return null;

    var maxSide = Math.max.apply(Math, values);
    var minSide = Math.min.apply(Math, values);
    var aspect = (maxSide / minSide).toFixed(2);

    var size = "unknown";
    if (maxSide <= 900) size = "small";
    else if (maxSide <= 1440) size = "medium";
    else if (maxSide <= 2200) size = "large";
    else size = "xlarge";

    return size + "_" + aspect;
  }

  function parseUserAgent(ua) {
    var s = String(ua || "");
    var lower = s.toLowerCase();

    var browserFamily = "other";
    var browserMajorVersion = null;

    var browserRules = [
      { name: "edge", regex: /edg\/(\d+)/i },
      { name: "opera", regex: /opr\/(\d+)/i },
      { name: "chrome", regex: /chrome\/(\d+)/i },
      { name: "firefox", regex: /firefox\/(\d+)/i },
      { name: "safari", regex: /version\/(\d+).+safari/i }
    ];

    for (var i = 0; i < browserRules.length; i++) {
      var rule = browserRules[i];
      var match = s.match(rule.regex);
      if (match) {
        browserFamily = rule.name;
        browserMajorVersion = String(Number(match[1]));
        break;
      }
    }

    var osFamily = "other";
    if (/windows nt/i.test(s)) osFamily = "windows";
    else if (/android/i.test(s)) osFamily = "android";
    else if (/(iphone|ipad|ipod|ios)/i.test(s)) osFamily = "ios";
    else if (/mac os x/i.test(s)) osFamily = "macos";
    else if (/linux/i.test(s)) osFamily = "linux";

    var platformType = "desktop";
    if (/mobile|iphone|android/i.test(lower)) platformType = "mobile";
    if (/ipad|tablet/i.test(lower)) platformType = "tablet";

    return {
      browserFamily: browserFamily,
      browserMajorVersion: browserMajorVersion,
      osFamily: osFamily,
      platformType: platformType
    };
  }

  function hasStorage(name) {
    try {
      var storage = window[name];
      if (!storage) return false;
      var key = "__fp_test__";
      storage.setItem(key, "1");
      storage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }

  function getStorageSupport() {
    return {
      localStorage: hasStorage("localStorage"),
      sessionStorage: hasStorage("sessionStorage"),
      indexedDB: typeof indexedDB !== "undefined"
    };
  }

  function getPluginsCount() {
    try {
      return navigator.plugins ? navigator.plugins.length : 0;
    } catch (e) {
      return 0;
    }
  }

  function getMimeTypesCount() {
    try {
      return navigator.mimeTypes ? navigator.mimeTypes.length : 0;
    } catch (e) {
      return 0;
    }
  }

  function getTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch (e) {
      return null;
    }
  }

  function similarityToConfidence(similarity) {
    if (similarity >= 0.9) return 0.98;
    if (similarity >= 0.82) return 0.92;
    if (similarity >= 0.72) return 0.84;
    if (similarity >= 0.58) return 0.68;
    if (similarity >= 0.45) return 0.52;
    return 0.3;
  }

  function randomId(len) {
    if (len === void 0) len = 16;
    var bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("").slice(0, len);
  }

  async function collectStableFingerprint() {
    var nav = navigator;

    var raw = {
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

    var ua = parseUserAgent(raw.rawUserAgent);

    var normalized = {
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

    var id = await hashObject(normalized, 16);

    return { id: "st_" + id, raw: raw, normalized: normalized };
  }

  async function getCanvasHash() {
    try {
      var canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 80;
      var ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.textBaseline = "top";
      ctx.font = "16px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(10, 10, 100, 30);

      ctx.fillStyle = "#069";
      ctx.fillText("smart-fingerprint", 12, 15);

      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("smart-fingerprint", 14, 17);
      ctx.globalCompositeOperation = "multiply";
      ctx.beginPath();
      ctx.arc(180, 40, 24, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 0, 255, 0.5)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(200, 40, 24, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(2.5, 2.5, canvas.width - 5, canvas.height - 5);

      return await sha256Hex(canvas.toDataURL(), 12);
    } catch (e) {
      return null;
    }
  }

  function bucketCount(value) {
    if (!Number.isFinite(value)) return null;
    if (value <= 0) return "none";
    if (value <= 4) return "low";
    if (value <= 10) return "mid";
    if (value <= 18) return "high";
    return "xhigh";
  }

  function bucketTextureSize(value) {
    if (!Number.isFinite(value)) return null;
    if (value <= 1024) return "low";
    if (value <= 4096) return "mid";
    if (value <= 8192) return "high";
    return "xhigh";
  }

  function getSafeWebGLParameter(gl, name) {
    try {
      var value = gl.getParameter(name);
      return value === undefined ? null : value;
    } catch (e) {
      return null;
    }
  }

  function getWebGLInfo() {
    var empty = {
      contextType: null,
      vendor: null,
      renderer: null,
      version: null,
      shadingLanguageVersion: null,
      maxTextureSize: null,
      maxCubeMapTextureSize: null,
      maxRenderBufferSize: null,
      maxVertexAttribs: null,
      extensionsCount: null,
      antialias: null,
      hash: null
    };

    try {
      var canvas = document.createElement("canvas");
      var gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return empty;

      var ext = gl.getExtension("WEBGL_debug_renderer_info");
      var attributes = gl.getContextAttributes ? gl.getContextAttributes() : null;
      var extensions = gl.getSupportedExtensions ? gl.getSupportedExtensions() : [];
      var hasWebGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;

      var vendor = ext ? getSafeWebGLParameter(gl, ext.UNMASKED_VENDOR_WEBGL) : getSafeWebGLParameter(gl, gl.VENDOR);
      var renderer = ext ? getSafeWebGLParameter(gl, ext.UNMASKED_RENDERER_WEBGL) : getSafeWebGLParameter(gl, gl.RENDERER);

      return {
        contextType: hasWebGL2 ? "webgl2" : "webgl",
        vendor: vendor || null,
        renderer: renderer || null,
        version: getSafeWebGLParameter(gl, gl.VERSION),
        shadingLanguageVersion: getSafeWebGLParameter(gl, gl.SHADING_LANGUAGE_VERSION),
        maxTextureSize: safeNumber(getSafeWebGLParameter(gl, gl.MAX_TEXTURE_SIZE)),
        maxCubeMapTextureSize: safeNumber(getSafeWebGLParameter(gl, gl.MAX_CUBE_MAP_TEXTURE_SIZE)),
        maxRenderBufferSize: safeNumber(getSafeWebGLParameter(gl, gl.MAX_RENDERBUFFER_SIZE)),
        maxVertexAttribs: safeNumber(getSafeWebGLParameter(gl, gl.MAX_VERTEX_ATTRIBS)),
        extensionsCount: safeNumber(extensions.length),
        antialias: attributes && typeof attributes.antialias === "boolean" ? attributes.antialias : null,
        hash: null
      };
    } catch (e) {
      return empty;
    }
  }

  var FONT_PROBE_TEXT = "mmmmmmmmmmlliWW@#";
  var FONT_PROBE_SIZE = "72px";
  var FONT_BASE_FAMILIES = ["monospace", "sans-serif", "serif"];
  var FONT_CANDIDATES = [
    "Arial",
    "Helvetica",
    "Times New Roman",
    "Times",
    "Georgia",
    "Verdana",
    "Trebuchet MS",
    "Tahoma",
    "Courier New",
    "Lucida Console",
    "Segoe UI",
    "Roboto",
    "Noto Sans",
    "Noto Serif",
    "Ubuntu",
    "Fira Sans",
    "Fira Code",
    "Source Sans Pro",
    "Source Code Pro",
    "PT Sans",
    "Inter",
    "Calibri",
    "Cambria",
    "Impact"
  ];

  function detectInstalledFonts() {
    try {
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      if (!ctx) return [];

      var baseWidths = {};
      for (var i = 0; i < FONT_BASE_FAMILIES.length; i++) {
        var baseFont = FONT_BASE_FAMILIES[i];
        ctx.font = FONT_PROBE_SIZE + " " + baseFont;
        baseWidths[baseFont] = ctx.measureText(FONT_PROBE_TEXT).width;
      }

      var detected = [];
      for (var j = 0; j < FONT_CANDIDATES.length; j++) {
        var candidate = FONT_CANDIDATES[j];
        var exists = false;
        for (var k = 0; k < FONT_BASE_FAMILIES.length; k++) {
          var base = FONT_BASE_FAMILIES[k];
          ctx.font = FONT_PROBE_SIZE + " \"" + candidate + "\"," + base;
          var width = ctx.measureText(FONT_PROBE_TEXT).width;
          if (Math.abs(width - baseWidths[base]) > 0.1) {
            exists = true;
            break;
          }
        }

        if (exists) {
          detected.push(candidate);
        }
      }

      return detected;
    } catch (e) {
      return [];
    }
  }

  async function getFontsInfo() {
    try {
      var detected = detectInstalledFonts();
      return {
        detected: detected,
        count: detected.length,
        hash: detected.length ? await sha256Hex(detected.join("|"), 12) : null
      };
    } catch (e) {
      return {
        detected: [],
        count: 0,
        hash: null
      };
    }
  }

  async function getAudioHash() {
    try {
      var AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!AudioCtx) return null;

      var ctx = new AudioCtx(1, 44100, 44100);
      var oscillator = ctx.createOscillator();
      var compressor = ctx.createDynamicsCompressor();

      oscillator.type = "triangle";
      oscillator.frequency.value = 10000;

      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;

      oscillator.connect(compressor);
      compressor.connect(ctx.destination);
      oscillator.start(0);

      var buffer = await ctx.startRendering();
      var channelData = buffer.getChannelData(0);

      var sum = 0;
      for (var i = 4500; i < 5000; i += 10) {
        sum += Math.abs(channelData[i] || 0);
      }

      return await sha256Hex(String(sum), 12);
    } catch (e) {
      return null;
    }
  }

  async function collectFullFingerprint(options) {
    if (options === void 0) options = {};

    var config = {
      includeCanvas: options.includeCanvas !== false,
      includeWebGL: options.includeWebGL !== false,
      includeFonts: options.includeFonts !== false,
      includeAudio: !!options.includeAudio
    };

    var screenObj = window.screen;

    var raw = {
      colorDepth: safeNumber(screenObj && screenObj.colorDepth),
      pixelDepth: safeNumber(screenObj && screenObj.pixelDepth),
      screenWidth: safeNumber(screenObj && screenObj.width),
      screenHeight: safeNumber(screenObj && screenObj.height),
      availWidth: safeNumber(screenObj && screenObj.availWidth),
      availHeight: safeNumber(screenObj && screenObj.availHeight),
      timezone: getTimezone(),
      timezoneOffset: Number.isFinite(new Date().getTimezoneOffset()) ? new Date().getTimezoneOffset() : null,
      devicePixelRatio: Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : null,
      doNotTrack: navigator.doNotTrack || window.doNotTrack || null,
      webdriver: !!navigator.webdriver,
      pluginsCount: getPluginsCount(),
      mimeTypesCount: getMimeTypesCount()
    };

    if (config.includeCanvas) raw.canvasHash = await getCanvasHash();

    if (config.includeWebGL) {
      raw.webgl = getWebGLInfo();
      if (raw.webgl && raw.webgl.contextType) {
        raw.webgl.hash = await hashObject({
          contextType: raw.webgl.contextType,
          vendor: raw.webgl.vendor,
          renderer: raw.webgl.renderer,
          version: raw.webgl.version,
          shadingLanguageVersion: raw.webgl.shadingLanguageVersion,
          maxTextureSize: raw.webgl.maxTextureSize,
          maxCubeMapTextureSize: raw.webgl.maxCubeMapTextureSize,
          maxRenderBufferSize: raw.webgl.maxRenderBufferSize,
          maxVertexAttribs: raw.webgl.maxVertexAttribs,
          extensionsCount: raw.webgl.extensionsCount,
          antialias: raw.webgl.antialias
        }, 12);
      }
    }

    if (config.includeFonts) raw.fonts = await getFontsInfo();
    if (config.includeAudio) raw.audioHash = await getAudioHash();

    var normalized = {
      colorDepth: raw.colorDepth,
      pixelDepth: raw.pixelDepth,
      screenBucket: bucketScreen(raw.screenWidth, raw.screenHeight, raw.availWidth, raw.availHeight),
      timezoneOffset: raw.timezoneOffset,
      devicePixelRatio: raw.devicePixelRatio,
      doNotTrack: raw.doNotTrack,
      webdriver: raw.webdriver,
      pluginsCount: raw.pluginsCount,
      mimeTypesCount: raw.mimeTypesCount,
      canvasHash: raw.canvasHash || null,
      fontsHash: raw.fonts && raw.fonts.hash || null,
      fontsCountBucket: bucketCount(raw.fonts && raw.fonts.count),
      audioHash: raw.audioHash || null,
      webglVendor: raw.webgl && raw.webgl.vendor || null,
      webglRenderer: raw.webgl && raw.webgl.renderer || null,
      webglVersion: raw.webgl && raw.webgl.version || null,
      webglShadingLanguageVersion: raw.webgl && raw.webgl.shadingLanguageVersion || null,
      webglExtensionsBucket: bucketCount(raw.webgl && raw.webgl.extensionsCount),
      webglTextureBucket: bucketTextureSize(raw.webgl && raw.webgl.maxTextureSize),
      webglAntialias: raw.webgl && typeof raw.webgl.antialias === "boolean" ? raw.webgl.antialias : null,
      webglHash: raw.webgl && raw.webgl.hash || null
    };

    var id = await hashObject(normalized, 16);
    var methods = {
      canvasId: raw.canvasHash ? "cn_" + raw.canvasHash : null,
      webglId: raw.webgl && raw.webgl.hash ? "wg_" + raw.webgl.hash : null,
      fontId: raw.fonts && raw.fonts.hash ? "ft_" + raw.fonts.hash : null,
      audioId: raw.audioHash ? "au_" + raw.audioHash : null
    };

    return { id: "fu_" + id, raw: raw, normalized: normalized, methods: methods };
  }

  function getPerfBucket() {
    try {
      var nav = performance && performance.navigation;
      if (nav && Number.isFinite(nav.type)) return "nav_" + nav.type;

      var entries = performance && performance.getEntriesByType && performance.getEntriesByType("navigation");
      if (entries && entries[0] && entries[0].type) return String(entries[0].type);

      return null;
    } catch (e) {
      return null;
    }
  }

  async function collectSessionFingerprint() {
    var raw = {
      href: location.href,
      pathname: location.pathname,
      referrer: document.referrer || null,
      historyLength: safeNumber(history.length),
      devicePixelRatio: Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : null,
      perfType: getPerfBucket(),
      timestampMinuteBucket: Math.floor(Date.now() / 60000),
      tabToken: sessionStorage.getItem("__fp_tab_token__") || null
    };

    if (!raw.tabToken) {
      raw.tabToken = randomId(20);
      try {
        sessionStorage.setItem("__fp_tab_token__", raw.tabToken);
      } catch (e) {}
    }

    var normalized = {
      pathname: raw.pathname,
      historyLength: raw.historyLength,
      devicePixelRatio: raw.devicePixelRatio,
      perfType: raw.perfType,
      tabToken: raw.tabToken
    };

    var id = await hashObject(normalized, 16);

    return { id: "ss_" + id, raw: raw, normalized: normalized };
  }

  function createCache(options) {
    if (options === void 0) options = {};
    var key = options.key || "__smart_fp_cache_v2__";
    var storage = options.storage || window.localStorage;
    var ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : 30 * 60 * 1000;

    function read() {
      try {
        var value = storage.getItem(key);
        if (!value) return null;

        var parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== "object") return null;

        if (Number.isFinite(parsed.savedAt) && ttlMs > 0 && Date.now() - parsed.savedAt > ttlMs) {
          storage.removeItem(key);
          return null;
        }

        return parsed.data || null;
      } catch (e) {
        return null;
      }
    }

    function write(data) {
      try {
        storage.setItem(key, JSON.stringify({ savedAt: Date.now(), data: data }));
        return true;
      } catch (e) {
        return false;
      }
    }

    function clear() {
      try {
        storage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }

    return { read: read, write: write, clear: clear, key: key, ttlMs: ttlMs };
  }

  function emitFingerprintEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail: detail }));
      return true;
    } catch (e) {
      return false;
    }
  }

  function onFingerprintEvent(name, handler, options) {
    window.addEventListener(name, handler, options);
    return function () {
      window.removeEventListener(name, handler, options);
    };
  }

  function SmartFingerprint(options) {
    this.options = Object.assign({
      includeCanvas: true,
      includeWebGL: true,
      includeFonts: true,
      includeAudio: false,
      autoCache: true,
      cacheKey: "__smart_fp_cache_v2__",
      cacheTtlMs: 30 * 60 * 1000,
      emitEvents: true,
      debug: false
    }, options || {});

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

  SmartFingerprint.prototype.get = async function (options) {
    if (options === void 0) options = {};
    var useCache = options.useCache !== false && this.options.autoCache !== false;

    if (useCache) {
      var cached = this.cache.read();
      if (cached) {
        if (this.options.emitEvents) {
          emitFingerprintEvent("fingerprint:ready", { result: cached, cached: true });
        }
        return cached;
      }
    }

    var stable = await collectStableFingerprint();
    var full = await collectFullFingerprint({
      includeCanvas: this.options.includeCanvas,
      includeWebGL: this.options.includeWebGL,
      includeFonts: this.options.includeFonts,
      includeAudio: this.options.includeAudio
    });
    var session = await collectSessionFingerprint();

    var normalized = Object.assign({}, stable.normalized, full.normalized, {
      sessionId: session.id
    });

    var visitorCoreId = await hashObject({
      stable: stable.normalized,
      full: full.normalized
    }, 16);

    var result = {
      visitorId: "fp_" + visitorCoreId,
      stableId: stable.id,
      fullId: full.id,
      sessionId: session.id,
      confidence: this.estimateConfidence(normalized),
      stable: stable,
      full: full,
      session: session,
      normalized: normalized,
      createdAt: Date.now()
    };

    if (useCache) {
      this.cache.write(result);
    }

    if (this.options.emitEvents) {
      emitFingerprintEvent("fingerprint:ready", { result: result, cached: false });
    }

    return result;
  };

  SmartFingerprint.prototype.refresh = async function () {
    this.cache.clear();
    return this.get({ useCache: false });
  };

  SmartFingerprint.prototype.readCache = function () {
    return this.cache.read();
  };

  SmartFingerprint.prototype.clearCache = function () {
    return this.cache.clear();
  };

  SmartFingerprint.prototype.compare = function (left, right) {
    var a = left.normalized ? left.normalized : left;
    var b = right.normalized ? right.normalized : right;

    var score = 0;
    var maxScore = 0;

    for (var key in this.weights) {
      if (!Object.prototype.hasOwnProperty.call(this.weights, key)) continue;
      var weight = this.weights[key];
      maxScore += weight;

      var av = a[key];
      var bv = b[key];

      if (av == null || bv == null) continue;

      if (typeof av === "object" && typeof bv === "object") {
        if (deepEqual(av, bv)) score += weight;
        continue;
      }

      if (av === bv) score += weight;
    }

    var similarity = maxScore > 0 ? Number((score / maxScore).toFixed(4)) : 0;

    return {
      similarity: similarity,
      confidence: similarityToConfidence(similarity),
      sameVisitorLikely: similarity >= 0.72,
      score: score,
      maxScore: maxScore
    };
  };

  SmartFingerprint.prototype.estimateConfidence = function (normalized) {
    var score = 0;
    var max = 0;

    function add(value, points) {
      max += points;
      if (value !== null && value !== undefined && value !== false) {
        score += points;
      }
    }

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

    var raw = max > 0 ? score / max : 0;
    return clamp(Number(raw.toFixed(2)), 0.15, 0.98);
  };

  window.SmartFingerprint = {
    create: function (options) {
      return new SmartFingerprint(options);
    },
    get: async function (options) {
      var fp = new SmartFingerprint(options);
      return fp.get();
    },
    refresh: async function (options) {
      var fp = new SmartFingerprint(options);
      return fp.refresh();
    },
    compare: function (left, right, options) {
      var fp = new SmartFingerprint(options);
      return fp.compare(left, right);
    },
    on: function (name, handler, options) {
      return onFingerprintEvent(name, handler, options);
    },
    version: "3.0.0"
  };
})();
