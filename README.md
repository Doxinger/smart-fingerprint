# smart-fingerprint

Lightweight browser fingerprint library with no server dependency.

It generates:
- `stable fingerprint` (more persistent traits)
- `full fingerprint` (richer browser/device signals)
- `session fingerprint` (tab/session-scoped signal)

Also includes:
- visitor ID generation
- fingerprint comparison (`similarity` + `confidence`)
- localStorage cache with TTL
- browser events
- ESM and UMD usage

## Features

- Fast client-side fingerprint collection
- Separate IDs for different stability levels:
  - `stableId`
  - `fullId`
  - `sessionId`
- Additional per-method IDs in full fingerprint:
  - `canvasId`
  - `webglId`
  - `fontId`
  - `audioId` (if enabled)
- Configurable signal collection:
  - `Canvas`
  - `WebGL`
  - `Fonts`
  - `Audio` (optional, disabled by default)

## Installation

```bash
npm install smart-fingerprint
```

Or copy the project files directly into your app.

## Quick Start (ESM)

```html
<script type="module">
  import SmartFingerprint from "./src/main.js";

  const fp = await SmartFingerprint.get();
  console.log(fp);
</script>
```

## Quick Start (UMD)

```html
<script src="./src/main.umd.js"></script>
<script>
  SmartFingerprint.get().then(console.log);
</script>
```

## API

### `SmartFingerprint.create(options?)`

Creates a reusable instance.

```js
const fp = SmartFingerprint.create({ includeAudio: true });
const result = await fp.get();
```

### `SmartFingerprint.get(options?)`

Collects fingerprint and returns:

```js
{
  visitorId,
  stableId,
  fullId,
  sessionId,
  confidence,
  stable,
  full,
  session,
  normalized,
  createdAt
}
```

### `SmartFingerprint.refresh(options?)`

Clears cache and recomputes fingerprint.

### `SmartFingerprint.compare(left, right, options?)`

Compares two fingerprints or `normalized` objects.

Returns:

```js
{
  similarity,
  confidence,
  sameVisitorLikely,
  score,
  maxScore
}
```

### `SmartFingerprint.on(eventName, handler, options?)`

Subscribes to browser events emitted by the library.

Supported event:
- `fingerprint:ready`

Example:

```js
const unsubscribe = SmartFingerprint.on("fingerprint:ready", (event) => {
  console.log(event.detail.result, event.detail.cached);
});
```

## Options

Default options:

```js
{
  includeCanvas: true,
  includeWebGL: true,
  includeFonts: true,
  includeAudio: false,
  autoCache: true,
  cacheKey: "__smart_fp_cache_v2__",
  cacheTtlMs: 1800000, // 30 min
  emitEvents: true,
  debug: false
}
```

## Full Fingerprint Methods

`full.methods` contains method-specific IDs:

```js
{
  canvasId: "cn_...",
  webglId: "wg_...",
  fontId: "ft_...",
  audioId: "au_..." // null when includeAudio is false
}
```

## Example Response

```js
{
  visitorId: "fp_8ef6b32e58a7d5e1",
  stableId: "st_a1b2c3d4e5f60789",
  fullId: "fu_2f7dc1254d0682af",
  sessionId: "ss_84aa4f9f2d3c1b7e",
  confidence: 0.91,
  stable: { id: "...", raw: { ... }, normalized: { ... } },
  full: {
    id: "...",
    raw: { ... },
    normalized: { ... },
    methods: {
      canvasId: "cn_...",
      webglId: "wg_...",
      fontId: "ft_...",
      audioId: null
    }
  },
  session: { id: "...", raw: { ... }, normalized: { ... } },
  normalized: { ... },
  createdAt: 1710000000000
}
```

## Notes

- Fingerprints can change after browser updates, driver/GPU changes, privacy settings, or anti-fingerprinting tools.
- Use `compare()` and `similarity` for probabilistic matching instead of strict equality checks.
- Respect user privacy laws and local regulations before using browser fingerprinting in production.
