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

export const ENRICHMENT_SOURCES = [
  "public_badge_attributions",
  "public_emergency_sitter_profiles",
  "sitter_gallery",
  "reviews",
  "public_responsiveness",
  "public_profiles",
] as const;

export type EnrichmentSource = (typeof ENRICHMENT_SOURCES)[number];

type ChunkResult = { data?: unknown[] | null; error?: unknown };

export type SettledEnrichment = {
  rows: Record<EnrichmentSource, any[]>;
  failed: { source: EnrichmentSource; error: unknown }[];
};

/** Rassemble les lots de chaque source ; une source dont un lot échoue reste vide. */
export function settleEnrichment(results: Record<EnrichmentSource, ChunkResult[]>): SettledEnrichment {
  const rows = {} as Record<EnrichmentSource, any[]>;
  const failed: SettledEnrichment["failed"] = [];
  for (const source of ENRICHMENT_SOURCES) {
    const chunks = results[source] ?? [];
    const broken = chunks.find((r) => r?.error);
    if (broken) {
      rows[source] = [];
      failed.push({ source, error: broken.error });
    } else {
      rows[source] = chunks.flatMap((r) => (Array.isArray(r?.data) ? r.data : []));
    }
  }
  return { rows, failed };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return String(error);
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
    new Error(`Enrichissement des gardiens indisponible (${sources.join(", ")}) : ${errorMessage(first.error)}`),
    {
      component: "SearchOwner",
      source: first.source,
      sources,
      messages: failed.map((f) => ({ source: f.source, message: errorMessage(f.error) })),
    },
    { fingerprintKey: `search-owner-enrichment:${sources.join(",")}` },
  );
}
