/**
 * Lot BAS1 (16/11/2026) : enrichissement de la liste des gardiens
 * (/recherche-gardiens), sans jamais bloquer la liste.
 *
 * Les six lectures d'enrichissement (écussons, gardien d'urgence, galerie,
 * avis, réactivité, entraide) ne décident pas de l'affichage : une source en
 * erreur est traitée comme vide (pas de badge, pas de photo, pas de note) et
 * la liste s'affiche. La galerie gardien, par exemple, n'est lisible que par
 * un membre connecté : un visiteur reçoit une erreur à chaque chargement.
 */
import { reportError } from "@/lib/errorLogger";
import { complementErrorMessage, settleComplements, type ComplementResult, type SettledComplements } from "@/lib/complementReads";

export const ENRICHMENT_SOURCES = [
  "public_badge_attributions",
  "public_emergency_sitter_profiles",
  "sitter_gallery",
  "reviews",
  "public_responsiveness",
  "public_profiles",
] as const;

export type EnrichmentSource = (typeof ENRICHMENT_SOURCES)[number];

type ChunkResult = ComplementResult;

export type SettledEnrichment = SettledComplements<EnrichmentSource>;

/** Rassemble les lots de chaque source ; une source dont un lot échoue reste vide. */
export function settleEnrichment(results: Record<EnrichmentSource, ChunkResult[]>): SettledEnrichment {
  const ordered = {} as Record<EnrichmentSource, ChunkResult[]>;
  for (const source of ENRICHMENT_SOURCES) ordered[source] = results[source] ?? [];
  return settleComplements(ordered);
}

/** Une seule trace par chargement, avec les sources en erreur en contexte, sans message à l'écran. */
export function reportEnrichmentFailures(
  failed: SettledEnrichment["failed"],
  report: typeof reportError = reportError,
): void {
  if (failed.length === 0) return;
  const sources = failed.map((f) => f.source);
  const first = failed[0];
  report(
    new Error(`Enrichissement des gardiens indisponible (${sources.join(", ")}) : ${complementErrorMessage(first.error)}`),
    {
      component: "SearchOwner",
      source: first.source,
      sources,
      messages: failed.map((f) => ({ source: f.source, message: complementErrorMessage(f.error) })),
    },
    { fingerprintKey: `search-owner-enrichment:${sources.join(",")}` },
  );
}
