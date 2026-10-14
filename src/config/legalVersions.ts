/**
 * Lot J2b (14/10/2026) : versions des textes légaux et calendrier.
 *
 * Source unique côté site, alignée sur la table legal_document_versions
 * (supabase/prepared-migrations/20261014150000_j2b_versions_legales.sql,
 * verrou src/__tests__/j2b/). Une version qui touche aux droits des membres
 * est publiée 30 jours avant son entrée en vigueur (CGU v8, article 15) et
 * l'email de préavis part le jour de la publication.
 */
export type LegalDocument = "cgu" | "cgs" | "privacy";

export interface LegalVersion {
  document: LegalDocument;
  version: string;
  /** Jour de mise en ligne du texte (AAAA-MM-JJ, heure de Paris). */
  publishedOn: string;
  /** Jour d'entrée en vigueur (AAAA-MM-JJ, heure de Paris). */
  effectiveOn: string;
  /** Vrai si la version exige une acceptation expresse à la connexion. */
  requiresReaccept: boolean;
}

export const LEGAL_VERSIONS: readonly LegalVersion[] = [
  { document: "cgu", version: "8", publishedOn: "2026-10-14", effectiveOn: "2026-10-14", requiresReaccept: false },
  { document: "cgs", version: "2", publishedOn: "2026-10-14", effectiveOn: "2026-10-14", requiresReaccept: false },
  { document: "privacy", version: "5", publishedOn: "2026-10-14", effectiveOn: "2026-10-14", requiresReaccept: false },
  { document: "cgu", version: "9", publishedOn: "2026-10-16", effectiveOn: "2026-11-16", requiresReaccept: true },
  { document: "cgs", version: "3", publishedOn: "2026-10-16", effectiveOn: "2026-11-16", requiresReaccept: true },
  // Information alignée sur les CGU v9 (identité, mineurs, contrôle automatisé), effet immédiat.
  { document: "privacy", version: "6", publishedOn: "2026-10-16", effectiveOn: "2026-10-16", requiresReaccept: false },
];

/** Jour courant à Paris, AAAA-MM-JJ. */
export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Version en vigueur d'un document à une date donnée. */
export function versionInForce(document: LegalDocument, today: string = parisToday()): LegalVersion {
  const candidates = LEGAL_VERSIONS.filter((v) => v.document === document && v.effectiveOn <= today);
  return candidates.sort((a, b) => b.effectiveOn.localeCompare(a.effectiveOn))[0];
}

/** Version publiée mais pas encore en vigueur, s'il y en a une. */
export function upcomingVersion(document: LegalDocument, today: string = parisToday()): LegalVersion | null {
  return LEGAL_VERSIONS.find((v) => v.document === document && v.publishedOn <= today && v.effectiveOn > today) ?? null;
}

/** Date lisible en français (16 novembre 2026). */
export function frenchDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}
