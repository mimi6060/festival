// Web globals for React Native compatibility
// Must be imported before any React Native code

// @ts-expect-error - React Native global
globalThis.__DEV__ = true;

// @ts-expect-error - React Native global
globalThis.process = globalThis.process || { env: { NODE_ENV: 'development' } };

export {};
