/**
 * Lot perf 14 (26/10/2026) : les photos des pages ville viennent de Wikimedia
 * Commons, en original (souvent plusieurs Mo) ou en vignette de 3 840 px. On
 * sert la vignette standard de 960 px (palier admis par Wikimedia), assez pour
 * un cadre de 1 024 px de large au plus. Toute autre adresse est rendue telle
 * quelle ; une vignette déjà plus petite que 960 px n'est jamais agrandie.
 */
const UPLOAD = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/(commons|[a-z]{2,3})\//;
export const WIKIMEDIA_THUMB_WIDTH = 960;

export function wikimediaThumb(url: string | null | undefined, width = WIKIMEDIA_THUMB_WIDTH): string {
  if (!url) return "";
  const m = url.match(UPLOAD);
  if (!m || url.includes("?")) return url;
  const base = m[0];
  const rest = url.slice(base.length);
  // Vignette existante : …/thumb/a/ab/Nom.jpg/3840px-Nom.jpg
  const thumb = rest.match(/^thumb\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)\/(lang[a-z-]+-)?(\d+)px-([^/]+)$/);
  if (thumb) {
    const [, a, ab, name, lang = "", px, tail] = thumb;
    if (Number(px) <= width) return url;
    return `${base}thumb/${a}/${ab}/${name}/${lang}${width}px-${tail}`;
  }
  // Original : …/a/ab/Nom.jpg (SVG, TIFF et autres formats laissés tels quels)
  const orig = rest.match(/^([0-9a-f])\/([0-9a-f]{2})\/([^/]+\.(?:jpe?g|png|webp))$/i);
  if (orig) {
    const [, a, ab, name] = orig;
    return `${base}thumb/${a}/${ab}/${name}/${width}px-${name}`;
  }
  return url;
}
