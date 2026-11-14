/**
 * Logo de saison (lot NOEL1, 14/11/2026).
 *
 * Du 1er décembre au 6 janvier inclus, à l'heure de Paris, le logotype
 * « guardiens » texte cède la place au logotype de Noël (g au bonnet, neige,
 * houx) et le favicon prend le g au bonnet. Le reste de l'année, rien ne
 * change. Le thème sombre garde le logotype texte : les lettres brunes de
 * l'image ne se lisent pas sur fond sombre.
 *
 * Recette avant décembre : ajouter ?noel=1 à n'importe quelle adresse
 * (retenu pour l'onglet), ?noel=0 pour l'enlever.
 */

export type Season = "noel" | null;

const PREVIEW_KEY = "guardiens_season_preview";

/** Mois (1 à 12) et jour à Paris pour une date donnée. */
function parisMonthDay(now: Date): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { month, day };
}

/** Vrai du 1er décembre au 6 janvier inclus, heure de Paris. */
export function isChristmasWindow(now: Date = new Date()): boolean {
  const { month, day } = parisMonthDay(now);
  return month === 12 || (month === 1 && day <= 6);
}

/** Lit ?noel=1 ou ?noel=0, et le garde pour l'onglet. */
function readPreview(): Season | "off" | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const param = new URLSearchParams(window.location.search).get("noel");
    if (param === "1") window.sessionStorage.setItem(PREVIEW_KEY, "noel");
    if (param === "0") window.sessionStorage.setItem(PREVIEW_KEY, "off");
    const stored = window.sessionStorage.getItem(PREVIEW_KEY);
    if (stored === "noel") return "noel";
    if (stored === "off") return "off";
  } catch {
    /* stockage indisponible : la date décide */
  }
  return undefined;
}

export function currentSeason(now: Date = new Date()): Season {
  const preview = readPreview();
  if (preview === "noel") return "noel";
  if (preview === "off") return null;
  return isChristmasWindow(now) ? "noel" : null;
}

export const NOEL_WORDMARK = {
  src: "/brand/noel/guardiens-noel-80.webp",
  srcSet: "/brand/noel/guardiens-noel-80.webp 1x, /brand/noel/guardiens-noel-120.webp 1.5x, /brand/noel/guardiens-noel-120.webp 2x",
  /** Rapport largeur sur hauteur de l'image (275 × 80). */
  ratio: 275 / 80,
};

export const NOEL_FAVICON_32 = "/brand/noel/g-noel-32.png";
export const NOEL_FAVICON_64 = "/brand/noel/g-noel-64.png";

/**
 * Pose le favicon de saison. Appelé une fois au démarrage ; sans effet hors
 * saison. Le fichier /favicon.ico reste celui de l'année.
 */
export function applySeasonalFavicon(doc: Document = document, now: Date = new Date()): void {
  if (currentSeason(now) !== "noel") return;
  const icons = doc.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
  icons.forEach((link) => link.remove());
  for (const [href, sizes] of [
    [NOEL_FAVICON_32, "32x32"],
    [NOEL_FAVICON_64, "64x64"],
  ] as const) {
    const link = doc.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.setAttribute("sizes", sizes);
    link.href = href;
    link.dataset.season = "noel";
    doc.head.appendChild(link);
  }
}
