// Build metadata injected at build time via vite `define`.
// See vite.config.ts.
declare const __BUILD_ID__: string;
declare const __BUILD_TIME__: string;
declare const __BUILD_MODE__: string;

export const BUILD_ID: string =
  typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
export const BUILD_TIME: string =
  typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : new Date().toISOString();
export const BUILD_MODE: string =
  typeof __BUILD_MODE__ !== "undefined" ? __BUILD_MODE__ : "development";

/**
 * Extract the hash from the currently loaded main JS bundle.
 * Reads <script src="/assets/index-XXXXX.js"> from the document.
 * Returns null in dev (no hashed bundle).
 */
export function getCurrentBundleHash(): string | null {
  if (typeof document === "undefined") return null;
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"));
  for (const s of scripts) {
    const m = s.src.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/);
    if (m) return m[1];
  }
  return null;
}
