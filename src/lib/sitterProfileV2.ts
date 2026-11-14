/**
 * Fiche gardien publique v2 (lot FG1, 14/11/2026, maquettes Claude Design
 * « Fiche gardien publique · avant / après » validées par Jérémie).
 * Règles pures : chiffres du bandeau, libellés neutres du quotidien,
 * provenance d'une ouverture de fiche (lot FG0).
 */
import { formatRatingFr } from "@/lib/formatRatingFr";

export type GlanceItem = { value: string; label: string; anchor?: string };

/** Expérience déclarée (StepExperience : Débutant, 1-3 ans, 3-5 ans, 5+ ans). */
export function experienceGlance(raw: string | null | undefined): GlanceItem | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v || v.startsWith("débutant") || v.startsWith("debutant")) return null;
  if (v.startsWith("5+") || v.includes("plus de 5")) return { value: "5 ans +", label: "d'expérience de garde" };
  if (v.startsWith("3-5") || v.startsWith("3 à 5")) return { value: "3 à 5 ans", label: "d'expérience de garde" };
  if (v.startsWith("1-3") || v.startsWith("1 à 3")) return { value: "1 à 3 ans", label: "d'expérience de garde" };
  return null;
}

/**
 * Chiffres du bandeau sous la gouache. Seuls les chiffres qui existent
 * s'affichent : aucune garde ni note à zéro. La note ne s'affiche qu'ici et
 * dans la section des avis.
 */
export function glanceItems(input: {
  completedSits: number;
  avgRating: number;
  reviewCount: number;
  experience: string | null | undefined;
  memberSince: string | null | undefined;
}): GlanceItem[] {
  const out: GlanceItem[] = [];
  if (input.completedSits > 0) {
    out.push({ value: String(input.completedSits), label: input.completedSits > 1 ? "gardes sur Guardiens" : "garde sur Guardiens" });
  }
  if (input.reviewCount > 0 && input.avgRating > 0) {
    out.push({ value: `${formatRatingFr(input.avgRating)} / 5`, label: `d'après ${input.reviewCount} avis`, anchor: "avis" });
  }
  const exp = experienceGlance(input.experience);
  if (exp) out.push(exp);
  const since = input.memberSince ? new Date(input.memberSince) : null;
  if (since && !Number.isNaN(since.getTime())) {
    const label = since.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    out.push({ value: label.charAt(0).toUpperCase() + label.slice(1), label: "membre depuis" });
  }
  return out;
}

/**
 * Libellés du style de vie lus par un visiteur. Les valeurs enregistrées sont
 * au masculin (« Sportif », « Joueur ») et aucune colonne ne porte le genre :
 * la fiche les dit en mots neutres. Valeurs en base inchangées.
 */
const LIFESTYLE_PUBLIC: Record<string, string> = {
  "Sportif / grandes balades": "Sport et grandes balades",
  "Sportif outdoor": "Sport en plein air",
  Joueur: "Jeux",
  "Tranquille / casanier": "Calme, à la maison",
  "Lève-tôt": "Lève-tôt",
  "Couche-tard": "Couche-tard",
};
export const lifestylePublicLabel = (v: string): string => LIFESTYLE_PUBLIC[v] ?? v;

/** Provenance d'une ouverture de fiche (paramètre ?depuis=). */
export const PROFILE_SOURCES = ["candidature", "conversation", "coup-de-main", "sortie"] as const;
export type ProfileSource = (typeof PROFILE_SOURCES)[number];

export function readProfileSource(raw: string | null | undefined): ProfileSource | "direct" {
  const v = String(raw ?? "").trim().toLowerCase();
  return (PROFILE_SOURCES as readonly string[]).includes(v) ? (v as ProfileSource) : "direct";
}

/** Adresse d'une fiche avec sa provenance ; l'adresse canonique reste /gardiens/:id. */
export const sitterProfileHref = (id: string, source: ProfileSource): string =>
  `/gardiens/${id}?depuis=${source}`;

/** Une ouverture mesurée par session d'onglet, fiche et provenance. */
export function shouldTrackProfileOpen(storage: Pick<Storage, "getItem" | "setItem"> | null, id: string, source: string): boolean {
  if (!storage) return true;
  const key = `guardiens_profile_opened:${id}:${source}`;
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, "1");
  } catch {
    return true;
  }
  return true;
}
