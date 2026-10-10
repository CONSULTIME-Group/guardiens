/**
 * Signaux publics d'un profil (lot L3) : entraide déclarée, dernière visite,
 * réactivité. Logique pure, partagée par la fiche (L5) et les cartes (L4).
 * Aucune donnée inventée : une source absente, invalide ou future reste neutre.
 */
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { SkillSpot } from "@/lib/sitterSkillGroups";

/* ── Entraide ──────────────────────────────────────────────────────── */

export interface HelpOfferCategory {
  key: string;
  label: string;
  spot: SkillSpot;
}

/** Catégories d'entraide (profiles.skill_categories) vers gouaches existantes. */
const HELP_CATEGORY_DEFS: Record<string, { label: string; spot: SkillSpot }> = {
  animaux: { label: "Animaux", spot: "spot-chien" },
  jardin: { label: "Jardin", spot: "spot-jardin" },
  coups_de_main: { label: "Bricolage et coups de main", spot: "spot-bricolage" },
  competences: { label: "Savoirs et langues", spot: "spot-bienetre" },
};

export interface HelpOffer {
  /** Vrai seulement si le membre a déclaré être disponible (opt-in). */
  offered: boolean;
  categories: HelpOfferCategory[];
  line: string | null;
}

/**
 * Offre d'entraide déclarée. Seul available_for_help === true vaut offre ;
 * une compétence seule n'est jamais une intention d'aider.
 */
export function declaredHelpOffer(input: {
  availableForHelp: boolean | null | undefined;
  skillCategories: string[] | null | undefined;
  helpsWith: string | null | undefined;
}): HelpOffer {
  if (input.availableForHelp !== true) return { offered: false, categories: [], line: null };
  const seen = new Set<string>();
  const categories: HelpOfferCategory[] = [];
  for (const raw of input.skillCategories ?? []) {
    const key = String(raw).trim().toLowerCase();
    const def = HELP_CATEGORY_DEFS[key];
    if (def && !seen.has(key)) {
      seen.add(key);
      categories.push({ key, ...def });
    }
  }
  const line = input.helpsWith?.trim() || null;
  return { offered: true, categories, line };
}

/** L'onglet entraide existe si une offre est déclarée OU s'il y a un historique. */
export function hasEntraideFacet(offer: HelpOffer, missionCount: number): boolean {
  return offer.offered || missionCount > 0;
}

/** Texte du bandeau, seulement pour une offre déclarée. */
export function entraideOfferBandText(offer: HelpOffer, firstName: string, city: string | null): string | null {
  if (!offer.offered) return null;
  if (offer.line) return `${firstName} l'écrit ainsi : « ${offer.line} »`;
  const where = city ? ` autour de ${city}` : "";
  if (offer.categories.length === 0) return `${firstName} propose un coup de main${where}.`;
  const labels = offer.categories.map((c) => c.label.toLowerCase());
  return `${firstName} propose un coup de main${where} : ${labels.join(", ")}.`;
}

/* ── Dernière visite ───────────────────────────────────────────────── */

/** Formulation approximative, jamais l'heure exacte. Null, invalide ou futur : null. */
export function lastVisitLabel(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Tolérance d'horloge de 5 minutes, au-delà une date future est ignorée.
  if (d.getTime() - now.getTime() > 5 * 60 * 1000) return null;
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays <= 7) return "cette semaine";
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return "ce mois-ci";
  return `en ${format(d, "MMMM yyyy", { locale: fr })}`;
}

/* ── Réactivité ────────────────────────────────────────────────────── */

/**
 * Contrat unique de réactivité publique : vue public_responsiveness,
 * 90 jours glissants, 5 contacts minimum. Elle ne publie qu'un palier de
 * délai médian (pas de taux, pas de numérateur ni dénominateur) : aucun
 * pourcentage n'est donc affiché ni déduit.
 */
export const RESPONSIVENESS_CONTRACT = { windowDays: 90, minContacts: 5 } as const;

export const RESPONSIVENESS_SCOPE_NOTE =
  "Calculé sur les 90 derniers jours, à partir de 5 échanges reçus au moins.";

export const RESPONSIVENESS_ABSENT_NOTE =
  "Pas encore assez d'échanges récents pour indiquer un délai de réponse.";
