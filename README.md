# Smart Fingerprint

![npm](https://img.shields.io/npm/v/@doxinger/smart-fingerprint)
![npm downloads](https://img.shields.io/npm/dm/@doxinger/smart-fingerprint)
![license](https://img.shields.io/npm/l/@doxinger/smart-fingerprint)

Lightweight **browser fingerprint library** with no server dependency.

It generates:

- **stable fingerprint** – more persistent device/browser traits  
- **full fingerprint** – richer browser/device signals  
- **session fingerprint** – tab/session scoped signal  

Also includes:

- visitor ID generation
- fingerprint comparison (`similarity` + `confidence`)
- localStorage cache with TTL
- browser events
- ESM and UMD usage

---

# Features

- Fast client-side fingerprint collection
- No server dependency
- Separate IDs for different stability levels:

```
stableId
fullId
sessionId
```

Additional per-method IDs in full fingerprint:

```
canvasId
webglId
fontId
audioId
```

Configurable signal collection:

```
Canvas
WebGL
Fonts
Audio (optional)
```

Built-in similarity scoring:

```
similarity
confidence
```

---

# Installation

```bash
npm install @doxinger/smart-fingerprint
```

---

# CDN Usage

You can also use the library without npm.

### jsDelivr

```html
<script src="https://cdn.jsdelivr.net/npm/@doxinger/smart-fingerprint/src/main.umd.js"></script>
```

### unpkg

```html
<script src="https://unpkg.com/@doxinger/smart-fingerprint/src/main.umd.js"></script>
```

---

# Quick Start (Node / Bundlers)

```javascript
import SmartFingerprint from "@doxinger/smart-fingerprint";

const fp = await SmartFingerprint.get();

console.log(fp.visitorId);
```

---

# Quick Start (Browser ESM)

```html
<script type="module">
import SmartFingerprint from "@doxinger/smart-fingerprint";

const fp = await SmartFingerprint.get();

console.log(fp);
</script>
```

---

# Quick Start (UMD)

```html
<script src="https://cdn.jsdelivr.net/npm/@doxinger/smart-fingerprint/src/main.umd.js"></script>

<script>
SmartFingerprint.get().then(console.log);
</script>
```

---

# API

## SmartFingerprint.create(options?)

Creates a reusable instance.

```javascript
const fp = SmartFingerprint.create({
  includeAudio: true
});

const result = await fp.get();
```

---

## SmartFingerprint.get(options?)

Collects fingerprint and returns:

```json
{
  "visitorId": "fp_...",
  "stableId": "st_...",
  "fullId": "fu_...",
  "sessionId": "ss_...",
  "confidence": 0.91,
  "stable": {},
  "full": {},
  "session": {},
  "normalized": {},
  "createdAt": 1710000000000
}
```

---

## SmartFingerprint.refresh(options?)

Clears cache and recomputes fingerprint.

---

## SmartFingerprint.compare(left, right)

Compares two fingerprints or normalized objects.

Returns:

```json
{
  "similarity": 0.84,
  "confidence": 0.91,
  "sameVisitorLikely": true,
  "score": 82,
  "maxScore": 100
}
```

---

## SmartFingerprint.on(eventName, handler)

Subscribe to events emitted by the library.

Supported event:

```
fingerprint:ready
```

Example:

```javascript
const unsubscribe = SmartFingerprint.on("fingerprint:ready", (event) => {
  console.log(event.detail.result, event.detail.cached);
});
```

---

# Options

Default configuration:

```javascript
{
  includeCanvas: true,
  includeWebGL: true,
  includeFonts: true,
  includeAudio: false,
  autoCache: true,
  cacheKey: "__smart_fp_cache_v2__",
  cacheTtlMs: 1800000,
  emitEvents: true,
  debug: false
}
```

---

# Full Fingerprint Methods

`full.methods` contains method-specific IDs.

```json
{
  "canvasId": "cn_...",
  "webglId": "wg_...",
  "fontId": "ft_...",
  "audioId": "au_..."
}
```

---

# Example Response

```json
{
  "visitorId": "fp_8ef6b32e58a7d5e1",
  "stableId": "st_a1b2c3d4e5f60789",
  "fullId": "fu_2f7dc1254d0682af",
  "sessionId": "ss_84aa4f9f2d3c1b7e",
  "confidence": 0.91,
  "stable": {
    "id": "...",
    "raw": {},
    "normalized": {}
  },
  "full": {
    "id": "...",
    "raw": {},
    "normalized": {},
    "methods": {
      "canvasId": "cn_...",
      "webglId": "wg_...",
      "fontId": "ft_...",
      "audioId": null
    }
  },
  "session": {
    "id": "...",
    "raw": {},
    "normalized": {}
  },
  "normalized": {},
  "createdAt": 1710000000000
}
```

---

# Notes

- Fingerprints can change after browser updates, driver/GPU changes, privacy settings, or anti-fingerprinting tools.
- Use `compare()` and `similarity` for **probabilistic matching** instead of strict equality checks.
- Respect **user privacy laws and local regulations** when using browser fingerprinting in production.

---

# License

Apache-2.0
