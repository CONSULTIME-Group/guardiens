/**
 * Classification WCAG « large-scale text ».
 *
 * Définition officielle (WCAG 2.1 SC 1.4.3, Understanding doc) :
 *   « Large-scale text — with at least 18 point or 14 point bold or
 *     font size that would yield equivalent size for Chinese, Japanese
 *     and Korean (CJK) fonts. »
 *
 * Conversion pt → px (référence CSS, 96 dpi) :
 *   1pt = 96/72 px = 1.3333… px
 *   18pt  = 24    px  (exact)
 *   14pt  = 18.6667 px (≈ 18 + 2/3)
 *
 * Le seuil de poids « bold » selon WCAG = font-weight numérique ≥ 700,
 * ou la valeur résolue par le navigateur pour les mots-clés `bold`/`bolder`.
 * `getComputedStyle()` renvoie quasi-toujours une valeur numérique, mais
 * sur certains navigateurs/AT, les mots-clés peuvent transiter — on les
 * gère explicitement.
 *
 * Module pur (aucune dépendance Playwright). Le code source est aussi
 * exporté sous forme de string (`WCAG_TEXT_SIZE_SCRIPT`) pour injection
 * dans le navigateur via `addScriptTag`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Conversions de référence (CSS reference pixel = 1/96 inch). */
export const PX_PER_PT = 96 / 72; // ≈ 1.3333…
export const PT_18_IN_PX = 18 * PX_PER_PT; // = 24
export const PT_14_IN_PX = 14 * PX_PER_PT; // ≈ 18.6667

/** Poids minimum considéré « bold » par WCAG. */
export const WCAG_BOLD_THRESHOLD = 700;

/** Tolérance pour absorber les arrondis sub-pixel des navigateurs. */
const EPSILON_PX = 0.05;

/**
 * Résout un `font-weight` CSS (mot-clé OU nombre) vers son équivalent numérique.
 * Suit la table CSS Fonts Module Level 4 § 2.5.
 *
 *   normal  → 400
 *   bold    → 700
 *   bolder  → varie selon le parent ; getComputedStyle renvoie déjà le résolu,
 *             mais en fallback on assume 700.
 *   lighter → idem, fallback 100.
 *   nombre  → renvoyé tel quel
 */
export function resolveFontWeight(raw: string | number | null | undefined): number {
  if (raw == null) return 400;
  if (typeof raw === "number") return raw;
  const trimmed = String(raw).trim().toLowerCase();
  if (!trimmed) return 400;
  switch (trimmed) {
    case "normal":
      return 400;
    case "bold":
      return 700;
    case "bolder":
      return 700;
    case "lighter":
      return 100;
  }
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : 400;
}

/** Convertit une dimension `font-size` (px renvoyé par getComputedStyle) en points. */
export function pxToPt(px: number): number {
  return px / PX_PER_PT;
}

export type TextSizeClass = "large" | "normal";

/**
 * Détermine si un texte relève du seuil WCAG « large » et donc du ratio 3:1
 * au lieu de 4.5:1.
 *
 * @param fontSizePx  Taille effective en pixels CSS (issue de getComputedStyle).
 * @param fontWeight  Valeur brute (string ou number) issue de getComputedStyle.
 */
export function classifyWcagTextSize(
  fontSizePx: number,
  fontWeight: string | number | null | undefined
): TextSizeClass {
  if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) return "normal";

  const weight = resolveFontWeight(fontWeight);

  // Règle 1 : ≥ 18pt (= 24px), quel que soit le poids
  if (fontSizePx + EPSILON_PX >= PT_18_IN_PX) return "large";

  // Règle 2 : ≥ 14pt (≈ 18.6667px) ET bold (≥ 700)
  if (
    fontSizePx + EPSILON_PX >= PT_14_IN_PX &&
    weight >= WCAG_BOLD_THRESHOLD
  ) {
    return "large";
  }

  return "normal";
}

/** Seuil de contraste WCAG AA correspondant. */
export function wcagAaThreshold(cls: TextSizeClass): 3.0 | 4.5 {
  return cls === "large" ? 3.0 : 4.5;
}

/**
 * Variante prête à l'emploi prenant directement un `CSSStyleDeclaration`
 * (l'objet renvoyé par `window.getComputedStyle`).
 */
export function classifyFromComputedStyle(style: {
  fontSize: string;
  fontWeight: string;
}): TextSizeClass {
  const px = parseFloat(style.fontSize);
  return classifyWcagTextSize(px, style.fontWeight);
}

/**
 * Code source (string) à injecter dans la page via `page.addScriptTag`.
 *
 * Expose sur `window` :
 *   - __wcagClassifyTextSize(fontSizePx, fontWeight): "large" | "normal"
 *   - __wcagAaThreshold("large" | "normal"): 3 | 4.5
 *   - __wcagResolveFontWeight(raw): number
 *   - __wcagConstants: { PX_PER_PT, PT_18_IN_PX, PT_14_IN_PX, WCAG_BOLD_THRESHOLD }
 */
export const WCAG_TEXT_SIZE_SCRIPT = `
(() => {
  const PX_PER_PT = 96 / 72;
  const PT_18_IN_PX = 18 * PX_PER_PT;
  const PT_14_IN_PX = 14 * PX_PER_PT;
  const WCAG_BOLD_THRESHOLD = 700;
  const EPSILON_PX = 0.05;

  function resolveFontWeight(raw) {
    if (raw == null) return 400;
    if (typeof raw === 'number') return raw;
    const t = String(raw).trim().toLowerCase();
    if (!t) return 400;
    if (t === 'normal') return 400;
    if (t === 'bold') return 700;
    if (t === 'bolder') return 700;
    if (t === 'lighter') return 100;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : 400;
  }

  function classify(fontSizePx, fontWeight) {
    if (!Number.isFinite(fontSizePx) || fontSizePx <= 0) return 'normal';
    const w = resolveFontWeight(fontWeight);
    if (fontSizePx + EPSILON_PX >= PT_18_IN_PX) return 'large';
    if (fontSizePx + EPSILON_PX >= PT_14_IN_PX && w >= WCAG_BOLD_THRESHOLD) return 'large';
    return 'normal';
  }

  const w = /** @type {any} */ (window);
  w.__wcagClassifyTextSize = classify;
  w.__wcagAaThreshold = (cls) => (cls === 'large' ? 3.0 : 4.5);
  w.__wcagResolveFontWeight = resolveFontWeight;
  w.__wcagConstants = { PX_PER_PT, PT_18_IN_PX, PT_14_IN_PX, WCAG_BOLD_THRESHOLD };
})();
`;

declare global {
  interface Window {
    __wcagClassifyTextSize?: (
      fontSizePx: number,
      fontWeight: string | number
    ) => TextSizeClass;
    __wcagAaThreshold?: (cls: TextSizeClass) => 3.0 | 4.5;
    __wcagResolveFontWeight?: (raw: string | number) => number;
    __wcagConstants?: {
      PX_PER_PT: number;
      PT_18_IN_PX: number;
      PT_14_IN_PX: number;
      WCAG_BOLD_THRESHOLD: number;
    };
  }
}
