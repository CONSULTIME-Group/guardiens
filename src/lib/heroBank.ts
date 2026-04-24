/**
 * Banque de 100 illustrations "carnet de voyage" pour les hero des profils gardiens.
 * Assignation déterministe : un même sitter.id voit toujours la même image.
 *
 * Composition thématique :
 *   - 01–70  : animaux & plantes (chiens, chats, NAC, jardins, intérieurs habités)
 *   - 71–80  : maison / lieu de vie (cuisine, véranda, entrée, fauteuil, bureau…)
 *   - 81–90  : entraide / coup de main (panier déposé, plante passée, clés transmises…)
 *   - 91–100 : village / quartier / partage (place, marché, tablée, jardin partagé…)
 *
 * 3 palettes mixées : terre automnal, vert/crème, or/sépia — style sketchbook plume + lavis.
 */

import { getMobileByIndex } from "./heroBankMobile";
import hero01 from "@/assets/hero-bank/hero-01.jpg";
import hero02 from "@/assets/hero-bank/hero-02.jpg";
import hero03 from "@/assets/hero-bank/hero-03.jpg";
import hero04 from "@/assets/hero-bank/hero-04.jpg";
import hero05 from "@/assets/hero-bank/hero-05.jpg";
import hero06 from "@/assets/hero-bank/hero-06.jpg";
import hero07 from "@/assets/hero-bank/hero-07.jpg";
import hero08 from "@/assets/hero-bank/hero-08.jpg";
import hero09 from "@/assets/hero-bank/hero-09.jpg";
import hero10 from "@/assets/hero-bank/hero-10.jpg";
import hero11 from "@/assets/hero-bank/hero-11.jpg";
import hero12 from "@/assets/hero-bank/hero-12.jpg";
import hero13 from "@/assets/hero-bank/hero-13.jpg";
import hero14 from "@/assets/hero-bank/hero-14.jpg";
import hero15 from "@/assets/hero-bank/hero-15.jpg";
import hero16 from "@/assets/hero-bank/hero-16.jpg";
import hero17 from "@/assets/hero-bank/hero-17.jpg";
import hero18 from "@/assets/hero-bank/hero-18.jpg";
import hero19 from "@/assets/hero-bank/hero-19.jpg";
import hero20 from "@/assets/hero-bank/hero-20.jpg";
import hero21 from "@/assets/hero-bank/hero-21.jpg";
import hero22 from "@/assets/hero-bank/hero-22.jpg";
import hero23 from "@/assets/hero-bank/hero-23.jpg";
import hero24 from "@/assets/hero-bank/hero-24.jpg";
import hero25 from "@/assets/hero-bank/hero-25.jpg";
import hero26 from "@/assets/hero-bank/hero-26.jpg";
import hero27 from "@/assets/hero-bank/hero-27.jpg";
import hero28 from "@/assets/hero-bank/hero-28.jpg";
import hero29 from "@/assets/hero-bank/hero-29.jpg";
import hero30 from "@/assets/hero-bank/hero-30.jpg";
import hero31 from "@/assets/hero-bank/hero-31.jpg";
import hero32 from "@/assets/hero-bank/hero-32.jpg";
import hero33 from "@/assets/hero-bank/hero-33.jpg";
import hero34 from "@/assets/hero-bank/hero-34.jpg";
import hero35 from "@/assets/hero-bank/hero-35.jpg";
import hero36 from "@/assets/hero-bank/hero-36.jpg";
import hero37 from "@/assets/hero-bank/hero-37.jpg";
import hero38 from "@/assets/hero-bank/hero-38.jpg";
import hero39 from "@/assets/hero-bank/hero-39.jpg";
import hero40 from "@/assets/hero-bank/hero-40.jpg";
import hero41 from "@/assets/hero-bank/hero-41.jpg";
import hero42 from "@/assets/hero-bank/hero-42.jpg";
import hero43 from "@/assets/hero-bank/hero-43.jpg";
import hero44 from "@/assets/hero-bank/hero-44.jpg";
import hero45 from "@/assets/hero-bank/hero-45.jpg";
import hero46 from "@/assets/hero-bank/hero-46.jpg";
import hero47 from "@/assets/hero-bank/hero-47.jpg";
import hero48 from "@/assets/hero-bank/hero-48.jpg";
import hero49 from "@/assets/hero-bank/hero-49.jpg";
import hero50 from "@/assets/hero-bank/hero-50.jpg";
import hero51 from "@/assets/hero-bank/hero-51.jpg";
import hero52 from "@/assets/hero-bank/hero-52.jpg";
import hero53 from "@/assets/hero-bank/hero-53.jpg";
import hero54 from "@/assets/hero-bank/hero-54.jpg";
import hero55 from "@/assets/hero-bank/hero-55.jpg";
import hero56 from "@/assets/hero-bank/hero-56.jpg";
import hero57 from "@/assets/hero-bank/hero-57.jpg";
import hero58 from "@/assets/hero-bank/hero-58.jpg";
import hero59 from "@/assets/hero-bank/hero-59.jpg";
import hero60 from "@/assets/hero-bank/hero-60.jpg";
import hero61 from "@/assets/hero-bank/hero-61.jpg";
import hero62 from "@/assets/hero-bank/hero-62.jpg";
import hero63 from "@/assets/hero-bank/hero-63.jpg";
import hero64 from "@/assets/hero-bank/hero-64.jpg";
import hero65 from "@/assets/hero-bank/hero-65.jpg";
import hero66 from "@/assets/hero-bank/hero-66.jpg";
import hero67 from "@/assets/hero-bank/hero-67.jpg";
import hero68 from "@/assets/hero-bank/hero-68.jpg";
import hero69 from "@/assets/hero-bank/hero-69.jpg";
import hero70 from "@/assets/hero-bank/hero-70.jpg";
import hero71 from "@/assets/hero-bank/hero-71.jpg";
import hero72 from "@/assets/hero-bank/hero-72.jpg";
import hero73 from "@/assets/hero-bank/hero-73.jpg";
import hero74 from "@/assets/hero-bank/hero-74.jpg";
import hero75 from "@/assets/hero-bank/hero-75.jpg";
import hero76 from "@/assets/hero-bank/hero-76.jpg";
import hero77 from "@/assets/hero-bank/hero-77.jpg";
import hero78 from "@/assets/hero-bank/hero-78.jpg";
import hero79 from "@/assets/hero-bank/hero-79.jpg";
import hero80 from "@/assets/hero-bank/hero-80.jpg";
import hero81 from "@/assets/hero-bank/hero-81.jpg";
import hero82 from "@/assets/hero-bank/hero-82.jpg";
import hero83 from "@/assets/hero-bank/hero-83.jpg";
import hero84 from "@/assets/hero-bank/hero-84.jpg";
import hero85 from "@/assets/hero-bank/hero-85.jpg";
import hero86 from "@/assets/hero-bank/hero-86.jpg";
import hero87 from "@/assets/hero-bank/hero-87.jpg";
import hero88 from "@/assets/hero-bank/hero-88.jpg";
import hero89 from "@/assets/hero-bank/hero-89.jpg";
import hero90 from "@/assets/hero-bank/hero-90.jpg";
import hero91 from "@/assets/hero-bank/hero-91.jpg";
import hero92 from "@/assets/hero-bank/hero-92.jpg";
import hero93 from "@/assets/hero-bank/hero-93.jpg";
import hero94 from "@/assets/hero-bank/hero-94.jpg";
import hero95 from "@/assets/hero-bank/hero-95.jpg";
import hero96 from "@/assets/hero-bank/hero-96.jpg";
import hero97 from "@/assets/hero-bank/hero-97.jpg";
import hero98 from "@/assets/hero-bank/hero-98.jpg";
import hero99 from "@/assets/hero-bank/hero-99.jpg";
import hero100 from "@/assets/hero-bank/hero-100.jpg";

export const HERO_BANK: readonly string[] = [
  hero01,  hero02,  hero03,  hero04,  hero05,  hero06,  hero07,  hero08,  hero09,  hero10,
  hero11,  hero12,  hero13,  hero14,  hero15,  hero16,  hero17,  hero18,  hero19,  hero20,
  hero21,  hero22,  hero23,  hero24,  hero25,  hero26,  hero27,  hero28,  hero29,  hero30,
  hero31,  hero32,  hero33,  hero34,  hero35,  hero36,  hero37,  hero38,  hero39,  hero40,
  hero41,  hero42,  hero43,  hero44,  hero45,  hero46,  hero47,  hero48,  hero49,  hero50,
  hero51,  hero52,  hero53,  hero54,  hero55,  hero56,  hero57,  hero58,  hero59,  hero60,
  hero61,  hero62,  hero63,  hero64,  hero65,  hero66,  hero67,  hero68,  hero69,  hero70,
  hero71,  hero72,  hero73,  hero74,  hero75,  hero76,  hero77,  hero78,  hero79,  hero80,
  hero81,  hero82,  hero83,  hero84,  hero85,  hero86,  hero87,  hero88,  hero89,  hero90,
  hero91,  hero92,  hero93,  hero94,  hero95,  hero96,  hero97,  hero98,  hero99,  hero100,
];

/**
 * Ancrage horizontal optimal pour chaque image, calculé hors-ligne par
 * `/tmp/analyze_hero_anchors.py` (analyse pixel des bords gauche/droit pour
 * détecter spirales de carnet, texte parasite, hachures denses).
 *
 * Sémantique CSS object-position :
 *   - 'left'   → object-position: 0%   → l'image colle à gauche, le crop rogne la DROITE
 *   - 'right'  → object-position: 100% → l'image colle à droite, le crop rogne la GAUCHE
 *   - 'center' → object-position: 50%  → bords équivalents, recadrage symétrique
 *
 * Distribution actuelle : 18 left / 51 center / 31 right (sur 100).
 */
export type HeroAnchor = "left" | "center" | "right";

export const HERO_ANCHORS: readonly HeroAnchor[] = [
  "center"  , "center"  , "center"  , "left"    , "center"  , "center"  , "right"   , "right"   , "right"   , "center"  , // 01-10
  "left"    , "center"  , "center"  , "center"  , "center"  , "left"    , "left"    , "right"   , "left"    , "center"  , // 11-20
  "left"    , "right"   , "center"  , "right"   , "right"   , "right"   , "left"    , "right"   , "center"  , "right"   , // 21-30
  "right"   , "right"   , "right"   , "center"  , "center"  , "left"    , "center"  , "right"   , "left"    , "center"  , // 31-40
  "left"    , "center"  , "center"  , "center"  , "right"   , "right"   , "center"  , "center"  , "left"    , "center"  , // 41-50
  "right"   , "center"  , "left"    , "center"  , "right"   , "center"  , "center"  , "left"    , "right"   , "left"    , // 51-60
  "center"  , "center"  , "center"  , "center"  , "center"  , "left"    , "right"   , "right"   , "right"   , "center"  , // 61-70
  "center"  , "center"  , "center"  , "center"  , "center"  , "center"  , "center"  , "center"  , "right"   , "left"    , // 71-80
  "center"  , "right"   , "center"  , "center"  , "center"  , "center"  , "right"   , "right"   , "center"  , "right"   , // 81-90
  "center"  , "right"   , "right"   , "left"    , "center"  , "center"  , "center"  , "right"   , "left"    , "right"   , // 91-100
];

/**
 * Hash FNV-1a 32 bits (déterministe, distribution uniforme correcte).
 */
function hashStringToIndex(input: string, modulo: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash % modulo;
}

/**
 * Catégories thématiques de la banque, avec poids cibles de répartition.
 *
 * La banque physique contient 70 images animaux/plantes + 30 maison/entraide/partage,
 * mais on ne veut PAS que 70% des profils tombent sur le thème animaux. On stratifie
 * donc la sélection en deux étapes :
 *   1. Choix déterministe de la CATÉGORIE selon les poids ci-dessous
 *   2. Choix déterministe de l'IMAGE à l'intérieur de la catégorie
 *
 * Résultat : variété thématique réelle (~40% animaux, ~20% maison, ~20% entraide,
 * ~20% village/partage) tout en gardant la stabilité par sitter.id.
 */
export type HeroCategoryName = "animals" | "home" | "mutual_aid" | "village";

type HeroCategoryRange = {
  name: HeroCategoryName;
  range: readonly [number, number]; // [start, endExclusive] (1-indexé fichiers)
};

/**
 * Plages de fichiers par catégorie (figées : reflètent l'organisation physique
 * de la banque). Les POIDS de répartition sont eux séparés et configurables
 * dynamiquement (table `hero_weights`, par défaut 40/20/20/20).
 */
const HERO_CATEGORY_RANGES: readonly HeroCategoryRange[] = [
  { name: "animals",    range: [1, 71]   }, // hero-01 → hero-70
  { name: "home",       range: [71, 81]  }, // hero-71 → hero-80
  { name: "mutual_aid", range: [81, 91]  }, // hero-81 → hero-90
  { name: "village",    range: [91, 101] }, // hero-91 → hero-100
];

/**
 * Poids cibles de répartition entre catégories.
 * Modifiables à chaud via la table `hero_weights` (admin only).
 */
export type HeroWeights = Record<HeroCategoryName, number>;

export const DEFAULT_HERO_WEIGHTS: HeroWeights = {
  animals: 40,
  home: 20,
  mutual_aid: 20,
  village: 20,
};

/**
 * Sélection stratifiée déterministe :
 *   1. Premier hash → choisit la catégorie selon les poids fournis
 *   2. Second hash (sel différent) → choisit une image dans la catégorie
 *
 * `weights` est paramétrable pour permettre l'ajustement à chaud sans rebuild.
 * Un poids à 0 exclut totalement la catégorie. Si tous les poids sont 0 (cas
 * pathologique bloqué par le CHECK SQL), on retombe sur les valeurs par défaut.
 */
function getIndex(
  sitterId?: string | null,
  weights: HeroWeights = DEFAULT_HERO_WEIGHTS
): number {
  return resolveSelection(sitterId, weights).index;
}

/** Index de référence par catégorie utilisé comme fallback déterministe. */
const CATEGORY_FALLBACK_INDEX: Record<HeroCategoryName, number> = {
  animals: 0,     // hero-01
  home: 70,       // hero-71
  mutual_aid: 80, // hero-81
  village: 90,    // hero-91
};

/** True si l'index pointe sur un asset utilisable (string non vide). */
function isValidAsset(idx: number): boolean {
  if (idx < 0 || idx >= HERO_BANK.length) return false;
  const url = HERO_BANK[idx];
  return typeof url === "string" && url.length > 0;
}

/** Index de fallback valide pour la catégorie demandée (3 niveaux de repli). */
function getCategoryFallbackIndex(category: HeroCategoryName): number {
  const preferred = CATEGORY_FALLBACK_INDEX[category];
  if (isValidAsset(preferred)) return preferred;
  const range = HERO_CATEGORY_RANGES.find((c) => c.name === category);
  if (range) {
    const [start, endExclusive] = range.range;
    for (let i = start - 1; i < endExclusive - 1; i++) {
      if (isValidAsset(i)) return i;
    }
  }
  for (let i = 0; i < HERO_BANK.length; i++) {
    if (isValidAsset(i)) return i;
  }
  return 0;
}

/** URL de fallback cohérente avec la catégorie (utile pour `<img onError>`). */
export function getCategoryFallbackImage(category: HeroCategoryName): string {
  return HERO_BANK[getCategoryFallbackIndex(category)];
}

/** Résultat complet de la sélection — exposé pour QA et monitoring. */
export type HeroSelection = {
  index: number;
  category: HeroCategoryName;
  /** True si on a dû tomber sur le fallback de la catégorie. */
  fellBack: boolean;
};

/**
 * Sélection stratifiée déterministe avec fallback thématique.
 *
 * Étapes :
 *   1. Premier hash → choisit la catégorie selon les poids fournis
 *   2. Second hash (sel différent) → choisit une image dans la catégorie
 *   3. Si l'asset est manquant → fallback déterministe sur l'image de
 *      référence de la même catégorie (cohérence thématique préservée).
 */
function resolveSelection(
  sitterId?: string | null,
  weights: HeroWeights = DEFAULT_HERO_WEIGHTS
): HeroSelection {
  // Cas dégénéré : pas d'ID → fallback "animals" (catégorie principale).
  if (!sitterId) {
    return {
      index: getCategoryFallbackIndex("animals"),
      category: "animals",
      fellBack: true,
    };
  }

  const total =
    weights.animals + weights.home + weights.mutual_aid + weights.village;
  const safeWeights = total > 0 ? weights : DEFAULT_HERO_WEIGHTS;
  const safeTotal =
    safeWeights.animals +
    safeWeights.home +
    safeWeights.mutual_aid +
    safeWeights.village;

  // 1. Choix de catégorie via hash sur la somme des poids.
  const catTicket = hashStringToIndex(sitterId, safeTotal);
  let cumulative = 0;
  let chosen: HeroCategoryRange = HERO_CATEGORY_RANGES[0];
  for (const cat of HERO_CATEGORY_RANGES) {
    cumulative += safeWeights[cat.name];
    if (catTicket < cumulative) {
      chosen = cat;
      break;
    }
  }

  // 2. Choix d'image dans la catégorie via un hash décorrélé.
  const [start, endExclusive] = chosen.range;
  const span = Math.max(0, endExclusive - start);

  // Catégorie vide (config corrompue) → fallback direct.
  if (span <= 0) {
    return {
      index: getCategoryFallbackIndex(chosen.name),
      category: chosen.name,
      fellBack: true,
    };
  }

  const intra = hashStringToIndex(`hero-img:${sitterId}`, span);
  const candidate = start - 1 + intra;

  // Asset manquant → fallback dans la même catégorie.
  if (!isValidAsset(candidate)) {
    return {
      index: getCategoryFallbackIndex(chosen.name),
      category: chosen.name,
      fellBack: true,
    };
  }

  return { index: candidate, category: chosen.name, fellBack: false };
}

/**
 * API publique de la sélection complète — utile pour les pages de QA et le
 * monitoring (savoir si on a dû fallback).
 */
export function getSitterHeroSelection(
  sitterId?: string | null,
  weights?: HeroWeights
): HeroSelection {
  return resolveSelection(sitterId, weights);
}

/**
 * Helper interne : résout l'index hero final.
 *
 * Priorité :
 *   1. `overrideIndex` (choix manuel du gardien sauvegardé en base) s'il est
 *      défini ET valide (>= 0 et < HERO_BANK.length).
 *   2. Sinon, sélection automatique par hash du `sitterId` + pondération
 *      des catégories (admin live).
 *
 * Cette indirection permet aux callers (page publique, OG image, etc.) de
 * passer simplement `profile.hero_image_index` sans avoir à se soucier de
 * la validité ou du fallback.
 */
function resolveIndex(
  sitterId?: string | null,
  weights?: HeroWeights,
  overrideIndex?: number | null
): number {
  if (
    overrideIndex !== null &&
    overrideIndex !== undefined &&
    Number.isInteger(overrideIndex) &&
    overrideIndex >= 0 &&
    overrideIndex < HERO_BANK.length
  ) {
    return overrideIndex;
  }
  return getIndex(sitterId, weights);
}

/**
 * Retourne l'URL de l'image hero assignée à un gardien donné.
 * - Stable : un même ID donne toujours la même image (à poids constants).
 * - `weights` permet d'utiliser une configuration personnalisée (admin live).
 * - `overrideIndex` (optionnel) : choix manuel du gardien, prend le pas sur le hash.
 *
 * Fallback : si pas d'ID ni d'override valide, on prend la première image.
 */
export function getSitterHeroImage(
  sitterId?: string | null,
  weights?: HeroWeights,
  overrideIndex?: number | null
): string {
  return HERO_BANK[resolveIndex(sitterId, weights, overrideIndex)];
}

/**
 * Retourne l'ancrage horizontal optimal pour l'image assignée à ce gardien.
 */
export function getSitterHeroAnchor(
  sitterId?: string | null,
  weights?: HeroWeights,
  overrideIndex?: number | null
): HeroAnchor {
  return HERO_ANCHORS[resolveIndex(sitterId, weights, overrideIndex)] ?? "center";
}

/**
 * Retourne les deux URLs (desktop JPG 1536×544 + mobile WebP 768×272) à utiliser
 * conjointement dans un `<img srcset>`.
 */
export function getSitterHeroSources(
  sitterId?: string | null,
  weights?: HeroWeights,
  overrideIndex?: number | null
): { desktop: string; mobile: string } {
  const idx = resolveIndex(sitterId, weights, overrideIndex);
  return {
    desktop: HERO_BANK[idx],
    mobile: getMobileByIndex(idx) ?? HERO_BANK[idx],
  };
}

/**
 * Retourne le nom de catégorie d'une image donnée (par index 0-based de HERO_BANK).
 * Utile pour la galerie de QA et les statistiques.
 */
export function getCategoryByBankIndex(idx: number): HeroCategoryName {
  const fileNum = idx + 1;
  for (const cat of HERO_CATEGORY_RANGES) {
    if (fileNum >= cat.range[0] && fileNum < cat.range[1]) return cat.name;
  }
  return "animals";
}

// ============================================================================
// VALIDATION DE LA BANQUE
// ----------------------------------------------------------------------------
// Garde-fou : vérifie que la structure thématique reste cohérente. Une catégorie
// vide rendrait la sélection stratifiée incohérente (division par zéro côté
// `getIndex`) ; une catégorie trop déséquilibrée (ex : 1 seule image pour 25 %
// du trafic) provoquerait une saturation visuelle.
// ============================================================================

export type HeroBankIssue = {
  severity: "error" | "warning";
  category: HeroCategoryName;
  /** Code court machine-readable. */
  code:
    | "empty_category"
    | "out_of_bounds"
    | "underpopulated"
    | "overpopulated";
  message: string;
  /** Nombre d'images dans la catégorie au moment du contrôle. */
  count: number;
};

export type HeroBankValidationReport = {
  ok: boolean;
  totalImages: number;
  perCategory: Record<HeroCategoryName, number>;
  issues: HeroBankIssue[];
};

/** Seuil minimal absolu : une catégorie active doit avoir au moins ce nombre d'images. */
const MIN_IMAGES_PER_CATEGORY = 3;
/** Seuil de déséquilibre : on alerte si la part réelle d'images < (poids cible × ce ratio). */
const UNDERPOPULATION_RATIO = 0.5;
/** Seuil de surreprésentation : on alerte si une catégorie occupe physiquement >70 % de la banque. */
const OVERPOPULATION_THRESHOLD = 0.7;

const CATEGORY_LABELS_FR: Record<HeroCategoryName, string> = {
  animals: "animaux & plantes",
  home: "maison",
  mutual_aid: "entraide",
  village: "village & partage",
};

/**
 * Valide la cohérence de la banque par rapport aux poids fournis.
 *
 * Erreurs (bloquantes pour la sélection) :
 *   - une catégorie référencée par les poids n'a aucune image disponible
 *   - une plage déborde de la banque physique (start/end incohérents)
 *
 * Warnings (la sélection fonctionne, mais l'expérience visuelle est mauvaise) :
 *   - une catégorie a beaucoup moins d'images que ce que son poids exigerait
 *     (ex : on alloue 25 % du trafic à 2 images → 12,5 % du trafic par image)
 *   - une catégorie occupe physiquement >70 % de la banque (manque de variété)
 */
export function validateHeroBank(
  weights: HeroWeights = DEFAULT_HERO_WEIGHTS,
  totalBankSize: number = HERO_BANK.length
): HeroBankValidationReport {
  const issues: HeroBankIssue[] = [];
  const perCategory = {} as Record<HeroCategoryName, number>;

  const totalWeight =
    weights.animals + weights.home + weights.mutual_aid + weights.village;

  for (const cat of HERO_CATEGORY_RANGES) {
    const [start, endExclusive] = cat.range;
    const count = Math.max(0, endExclusive - start);
    perCategory[cat.name] = count;
    const label = CATEGORY_LABELS_FR[cat.name];

    // 1. Plage hors-banque
    if (start < 1 || endExclusive - 1 > totalBankSize || start >= endExclusive) {
      issues.push({
        severity: "error",
        category: cat.name,
        code: "out_of_bounds",
        count,
        message: `Catégorie « ${label} » : plage [${start}–${endExclusive - 1}] invalide (banque de ${totalBankSize} images).`,
      });
      continue;
    }

    // 2. Catégorie vide alors qu'elle a un poids > 0 → erreur bloquante
    const weight = weights[cat.name];
    if (count === 0 && weight > 0) {
      issues.push({
        severity: "error",
        category: cat.name,
        code: "empty_category",
        count,
        message: `Catégorie « ${label} » vide mais pondérée à ${weight}. Aucune image ne peut être assignée.`,
      });
      continue;
    }

    // 3. Catégorie active mais sous le seuil minimal → erreur bloquante
    if (weight > 0 && count > 0 && count < MIN_IMAGES_PER_CATEGORY) {
      issues.push({
        severity: "error",
        category: cat.name,
        code: "underpopulated",
        count,
        message: `Catégorie « ${label} » : seulement ${count} image(s) pour un poids de ${weight}. Minimum requis : ${MIN_IMAGES_PER_CATEGORY}.`,
      });
      continue;
    }

    // 4. Déséquilibre soft : poids élevé / peu d'images → warning
    if (totalWeight > 0 && weight > 0 && count > 0) {
      const expectedShare = weight / totalWeight; // part de trafic
      const actualShare = count / totalBankSize; // part physique
      if (actualShare < expectedShare * UNDERPOPULATION_RATIO) {
        issues.push({
          severity: "warning",
          category: cat.name,
          code: "underpopulated",
          count,
          message: `Catégorie « ${label} » sous-fournie : ${count} image(s) (${(actualShare * 100).toFixed(1)} % de la banque) pour ${(expectedShare * 100).toFixed(1)} % du trafic visé. Risque de répétition visible.`,
        });
      }
    }

    // 5. Surreprésentation physique (>70 % de la banque)
    if (count / totalBankSize > OVERPOPULATION_THRESHOLD) {
      issues.push({
        severity: "warning",
        category: cat.name,
        code: "overpopulated",
        count,
        message: `Catégorie « ${label} » occupe ${((count / totalBankSize) * 100).toFixed(0)} % de la banque physique (>70 %). Pensez à enrichir les autres catégories.`,
      });
    }
  }

  // 6. Tous les poids à 0 → erreur globale (catégorie « animals » utilisée par convention)
  if (totalWeight === 0) {
    issues.push({
      severity: "error",
      category: "animals",
      code: "empty_category",
      count: 0,
      message: "Tous les poids sont à 0 : aucune catégorie ne peut être sélectionnée.",
    });
  }

  return {
    ok: !issues.some((i) => i.severity === "error"),
    totalImages: totalBankSize,
    perCategory,
    issues,
  };
}

