import {
  safeNumber,
  bucketScreen,
  getTimezone,
  sha256Hex,
  hashObject,
  getPluginsCount,
  getMimeTypesCount
} from "./utils.js";

const FONT_PROBE_TEXT = "mmmmmmmmmmlliWW@#";
const FONT_PROBE_SIZE = "72px";
const FONT_BASE_FAMILIES = ["monospace", "sans-serif", "serif"];
const FONT_CANDIDATES = [
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
    const value = gl.getParameter(name);
    return value ?? null;
  } catch {
    return null;
  }
}

async function getCanvasHash() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 80;

    const ctx = canvas.getContext("2d");
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
  } catch {
    return null;
  }
}

function getWebGLInfo() {
  const empty = {
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
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");

    if (!gl) {
      return empty;
    }

    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const attributes = gl.getContextAttributes?.();
    const extensions = gl.getSupportedExtensions?.() || [];
    const contextType =
      typeof WebGL2RenderingContext !== "undefined" &&
      gl instanceof WebGL2RenderingContext
        ? "webgl2"
        : "webgl";

    const vendor = ext
      ? getSafeWebGLParameter(gl, ext.UNMASKED_VENDOR_WEBGL)
      : getSafeWebGLParameter(gl, gl.VENDOR);
    const renderer = ext
      ? getSafeWebGLParameter(gl, ext.UNMASKED_RENDERER_WEBGL)
      : getSafeWebGLParameter(gl, gl.RENDERER);

    return {
      contextType,
      vendor: vendor || null,
      renderer: renderer || null,
      version: getSafeWebGLParameter(gl, gl.VERSION),
      shadingLanguageVersion: getSafeWebGLParameter(gl, gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize: safeNumber(getSafeWebGLParameter(gl, gl.MAX_TEXTURE_SIZE)),
      maxCubeMapTextureSize: safeNumber(
        getSafeWebGLParameter(gl, gl.MAX_CUBE_MAP_TEXTURE_SIZE)
      ),
      maxRenderBufferSize: safeNumber(getSafeWebGLParameter(gl, gl.MAX_RENDERBUFFER_SIZE)),
      maxVertexAttribs: safeNumber(getSafeWebGLParameter(gl, gl.MAX_VERTEX_ATTRIBS)),
      extensionsCount: safeNumber(extensions.length),
      antialias: typeof attributes?.antialias === "boolean" ? attributes.antialias : null,
      hash: null
    };
  } catch {
    return empty;
  }
}

async function getAudioHash() {
  try {
    const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx(1, 44100, 44100);
    const oscillator = ctx.createOscillator();
    const compressor = ctx.createDynamicsCompressor();

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

    const buffer = await ctx.startRendering();
    const channelData = buffer.getChannelData(0);

    let sum = 0;
    for (let i = 4500; i < 5000; i += 10) {
      sum += Math.abs(channelData[i] || 0);
    }

    return await sha256Hex(String(sum), 12);
  } catch {
    return null;
  }
}

function detectInstalledFonts() {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const baseWidths = {};
    for (const baseFont of FONT_BASE_FAMILIES) {
      ctx.font = `${FONT_PROBE_SIZE} ${baseFont}`;
      baseWidths[baseFont] = ctx.measureText(FONT_PROBE_TEXT).width;
    }

    const detected = [];
    for (const candidate of FONT_CANDIDATES) {
      const exists = FONT_BASE_FAMILIES.some((baseFont) => {
        ctx.font = `${FONT_PROBE_SIZE} "${candidate}",${baseFont}`;
        const width = ctx.measureText(FONT_PROBE_TEXT).width;
        return Math.abs(width - baseWidths[baseFont]) > 0.1;
      });

      if (exists) {
        detected.push(candidate);
      }
    }

    return detected;
  } catch {
    return [];
  }
}

async function getFontsInfo() {
  try {
    const detected = detectInstalledFonts();
    return {
      detected,
      count: detected.length,
      hash: detected.length ? await sha256Hex(detected.join("|"), 12) : null
    };
  } catch {
    return {
      detected: [],
      count: 0,
      hash: null
    };
  }
}

export async function collectFullFingerprint(options = {}) {
  const config = {
    includeCanvas: true,
    includeWebGL: true,
    includeFonts: true,
    includeAudio: false,
    ...options
  };

  const screenObj = window.screen;

  const raw = {
    colorDepth: safeNumber(screenObj?.colorDepth),
    pixelDepth: safeNumber(screenObj?.pixelDepth),
    screenWidth: safeNumber(screenObj?.width),
    screenHeight: safeNumber(screenObj?.height),
    availWidth: safeNumber(screenObj?.availWidth),
    availHeight: safeNumber(screenObj?.availHeight),
    timezone: getTimezone(),
    timezoneOffset: Number.isFinite(new Date().getTimezoneOffset())
      ? new Date().getTimezoneOffset()
      : null,
    devicePixelRatio: Number.isFinite(window.devicePixelRatio)
      ? window.devicePixelRatio
      : null,
    doNotTrack: navigator.doNotTrack || window.doNotTrack || null,
    webdriver: !!navigator.webdriver,
    pluginsCount: getPluginsCount(),
    mimeTypesCount: getMimeTypesCount()
  };

  if (config.includeCanvas) {
    raw.canvasHash = await getCanvasHash();
  }

  if (config.includeWebGL) {
    raw.webgl = getWebGLInfo();
    if (raw.webgl?.contextType) {
      raw.webgl.hash = await hashObject(
        {
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
        },
        12
      );
    }
  }

  if (config.includeFonts) {
    raw.fonts = await getFontsInfo();
  }

  if (config.includeAudio) {
    raw.audioHash = await getAudioHash();
  }

  const normalized = {
    colorDepth: raw.colorDepth,
    pixelDepth: raw.pixelDepth,
    screenBucket: bucketScreen(
      raw.screenWidth,
      raw.screenHeight,
      raw.availWidth,
      raw.availHeight
    ),
    timezoneOffset: raw.timezoneOffset,
    devicePixelRatio: raw.devicePixelRatio,
    doNotTrack: raw.doNotTrack,
    webdriver: raw.webdriver,
    pluginsCount: raw.pluginsCount,
    mimeTypesCount: raw.mimeTypesCount,
    canvasHash: raw.canvasHash || null,
    fontsHash: raw.fonts?.hash || null,
    fontsCountBucket: bucketCount(raw.fonts?.count),
    audioHash: raw.audioHash || null,
    webglVendor: raw.webgl?.vendor || null,
    webglRenderer: raw.webgl?.renderer || null,
    webglVersion: raw.webgl?.version || null,
    webglShadingLanguageVersion: raw.webgl?.shadingLanguageVersion || null,
    webglExtensionsBucket: bucketCount(raw.webgl?.extensionsCount),
    webglTextureBucket: bucketTextureSize(raw.webgl?.maxTextureSize),
    webglAntialias:
      typeof raw.webgl?.antialias === "boolean" ? raw.webgl.antialias : null,
    webglHash: raw.webgl?.hash || null
  };

  const id = await hashObject(normalized, 16);
  const methods = {
    canvasId: raw.canvasHash ? `cn_${raw.canvasHash}` : null,
    webglId: raw.webgl?.hash ? `wg_${raw.webgl.hash}` : null,
    fontId: raw.fonts?.hash ? `ft_${raw.fonts.hash}` : null,
    audioId: raw.audioHash ? `au_${raw.audioHash}` : null
  };

  return {
    id: `fu_${id}`,
    raw,
    normalized,
    methods
  };
}
