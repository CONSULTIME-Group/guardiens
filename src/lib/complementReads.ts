/**
 * Lots BAS1 et BAS2 (16/11/2026) : lectures de complément d'une liste
 * (photos, avis, animaux, écussons, fiches des auteurs) qui ne bloquent
 * jamais la liste.
 *
 * Seule la lecture principale d'une liste peut afficher une erreur. Une
 * source de complément en erreur est traitée comme vide (pas de photo, pas
 * de note, etc.), la liste s'affiche, et l'erreur part une seule fois par
 * chargement dans le journal des erreurs avec la source en contexte, sans
 * message à l'écran.
 */
import { reportError } from "@/lib/errorLogger";

export type ComplementResult = { data?: unknown[] | null; error?: unknown };

export type SettledComplements<K extends string> = {
  rows: Record<K, any[]>;
  failed: { source: K; error: unknown }[];
};

/**
 * Rassemble chaque source, donnée en un résultat ou en lots ; une source
 * dont un lot échoue reste vide en entier. L'ordre des sources en erreur
 * suit l'ordre des clés.
 */
export function settleComplements<K extends string>(
  results: Record<K, ComplementResult | ComplementResult[] | null | undefined>,
): SettledComplements<K> {
  const rows = {} as Record<K, any[]>;
  const failed: SettledComplements<K>["failed"] = [];
  for (const source of Object.keys(results) as K[]) {
    const raw = results[source];
    const chunks: ComplementResult[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
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

export function complementErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return String(error);
}

/** Une seule trace par chargement, avec les sources en erreur en contexte. */
export function reportComplementFailures<K extends string>(
  component: string,
  failed: SettledComplements<K>["failed"],
  report: typeof reportError = reportError,
): void {
  if (failed.length === 0) return;
  const sources = failed.map((f) => f.source);
  const first = failed[0];
  report(
    new Error(`Compléments indisponibles pour ${component} (${sources.join(", ")}) : ${complementErrorMessage(first.error)}`),
    {
      component,
      source: first.source,
      sources,
      messages: failed.map((f) => ({ source: f.source, message: complementErrorMessage(f.error) })),
    },
    { fingerprintKey: `${component}-complements:${sources.join(",")}` },
  );
}
