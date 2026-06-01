/**
 * pdfjs-dist v5 uses Bluebird-style Promise.try, which is not in native JS / Zone.js.
 * Must run before pdfjs-dist is imported.
 */
export function installPromiseTryPolyfill(): void {
  const P = Promise as PromiseConstructor & {
    try?: (fn: (...args: unknown[]) => unknown, ...args: unknown[]) => Promise<unknown>;
  };
  if (typeof P.try === 'function') {
    return;
  }
  P.try = function (fn: (...args: unknown[]) => unknown, ...args: unknown[]) {
    return Promise.resolve().then(() => fn(...args));
  };
}

installPromiseTryPolyfill();
