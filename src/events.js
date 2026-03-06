export function emitFingerprintEvent(name, detail) {
  try {
    window.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function onFingerprintEvent(name, handler, options) {
  window.addEventListener(name, handler, options);
  return () => window.removeEventListener(name, handler, options);
}