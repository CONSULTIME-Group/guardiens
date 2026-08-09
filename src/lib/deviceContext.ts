/**
 * Contexte d'appareil dérivé, joint à chaque événement analytics.
 *
 * Règle RGPD tenue ici : la chaîne de user agent brute n'est jamais stockée.
 * Elle est lue en mémoire, réduite à quelques champs catégoriels (type
 * d'appareil, système, version majeure) puis jetée. Ces champs n'ont pas la
 * granularité d'une empreinte, contrairement à la chaîne complète.
 */

export type DeviceType = "mobile" | "tablet" | "desktop";
export type DeviceOs = "ios" | "android" | "windows" | "macos" | "linux" | "chromeos" | "other";

export interface DeviceContext {
  device_type: DeviceType;
  os: DeviceOs;
  os_version_major: number | null;
  viewport_w: number | null;
  viewport_h: number | null;
}

function majorFrom(match: RegExpMatchArray | null): number | null {
  if (!match || !match[1]) return null;
  const n = parseInt(match[1].replace("_", "."), 10);
  return Number.isFinite(n) ? n : null;
}

/** Analyse pure, exposée pour les tests. */
export function parseDeviceContext(
  ua: string,
  opts: { width?: number; height?: number; maxTouchPoints?: number; platform?: string } = {},
): DeviceContext {
  const s = String(ua || "");
  const lower = s.toLowerCase();
  const width = typeof opts.width === "number" ? Math.round(opts.width) : null;
  const height = typeof opts.height === "number" ? Math.round(opts.height) : null;

  // iPadOS 13 et suivants se présentent comme un Macintosh tactile.
  const isIpadDesktopMode =
    /macintosh/.test(lower) && (opts.maxTouchPoints ?? 0) > 1;

  let os: DeviceOs = "other";
  let os_version_major: number | null = null;

  if (/android/.test(lower)) {
    os = "android";
    os_version_major = majorFrom(s.match(/Android\s+(\d+)/i));
  } else if (/iphone|ipad|ipod/.test(lower) || isIpadDesktopMode) {
    os = "ios";
    os_version_major = majorFrom(s.match(/OS\s+(\d+)[_.]/i)) ?? majorFrom(s.match(/Version\/(\d+)/i));
  } else if (/cros/.test(lower)) {
    os = "chromeos";
  } else if (/windows nt/.test(lower)) {
    os = "windows";
    os_version_major = majorFrom(s.match(/Windows NT\s+(\d+)/i));
  } else if (/mac os x|macintosh/.test(lower)) {
    os = "macos";
    os_version_major = majorFrom(s.match(/Mac OS X\s+(\d+)/i));
  } else if (/linux/.test(lower)) {
    os = "linux";
  }

  let device_type: DeviceType = "desktop";
  if (/ipad/.test(lower) || isIpadDesktopMode) {
    device_type = "tablet";
  } else if (/mobile|iphone|ipod/.test(lower)) {
    device_type = "mobile";
  } else if (/android/.test(lower)) {
    // Android sans le marqueur « Mobile » désigne une tablette.
    device_type = "tablet";
  } else if (/tablet|silk|kindle|playbook/.test(lower)) {
    device_type = "tablet";
  } else if (width !== null && width > 0 && width < 768) {
    device_type = "mobile";
  }

  return { device_type, os, os_version_major, viewport_w: width, viewport_h: height };
}

/** Contexte de l'appareil courant, ou null hors navigateur. */
export function getDeviceContext(): DeviceContext | null {
  if (typeof navigator === "undefined" || typeof window === "undefined") return null;
  try {
    return parseDeviceContext(navigator.userAgent, {
      width: window.innerWidth,
      height: window.innerHeight,
      maxTouchPoints: navigator.maxTouchPoints,
    });
  } catch {
    return null;
  }
}
