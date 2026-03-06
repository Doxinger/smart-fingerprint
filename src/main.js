import { SmartFingerprint } from "./core.js";
import { onFingerprintEvent } from "./events.js";

const defaultInstance = new SmartFingerprint({
  includeCanvas: true,
  includeWebGL: true,
  includeFonts: true,
  includeAudio: false,
  autoCache: true,
  emitEvents: true
});

window.SmartFingerprint = {
  create(options = {}) {
    return new SmartFingerprint(options);
  },

  async get(options = {}) {
    const fp = new SmartFingerprint(options);
    return fp.get();
  },

  async refresh(options = {}) {
    const fp = new SmartFingerprint(options);
    return fp.refresh();
  },

  compare(left, right, options = {}) {
    const fp = new SmartFingerprint(options);
    return fp.compare(left, right);
  },

  on(name, handler, options) {
    return onFingerprintEvent(name, handler, options);
  },

  version: "3.0.0"
};

export { SmartFingerprint };
export default defaultInstance;
