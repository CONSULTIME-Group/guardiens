/**
 * Lot A8 « Envois sûrs » : règles pures de la page Envois groupés.
 * Miroir serveur : supabase/functions/_shared/mass-email-dedupe.ts.
 */

/** Marqueurs de texte interne : un corps qui en contient un ne part jamais. */
export const INTERNAL_TEXT_MARKERS = ["Gabarit dédié", "owner-noel-2026", "TODO", "{{"] as const;

export function findInternalText(body: string | null | undefined): string[] {
  const text = body ?? "";
  return INTERNAL_TEXT_MARKERS.filter((m) => text.includes(m));
}

/**
 * Le corps n'est rendu au destinataire que pour un email libre. Avec un gabarit
 * (template_name), le serveur rend le gabarit et le corps reste une note interne.
 */
export function internalTextBlocking(body: string, templateName: string | undefined | null): string[] {
  if (templateName) return [];
  return findInternalText(body);
}

/** Préréglages périmés : visibles sous « Archivés », jamais sélectionnables pour un envoi. */
export const ARCHIVED_PRESET_KEYS: ReadonlySet<string> = new Set(["oser"]);

export interface ExclusionCounts {
  holdout?: number | null;
  pressure?: number | null;
  received?: number | null;
  answered?: number | null;
  admins?: number | null;
}

/** Récapitulatif en clair des exclusions actives, avant confirmation. */
export function exclusionRecap(c: ExclusionCounts): string[] {
  const out: string[] = [];
  if (typeof c.received === "number") out.push(`${c.received} déjà reçu, exclus`);
  if (typeof c.holdout === "number") out.push(`${c.holdout} du groupe témoin, exclus`);
  if (typeof c.pressure === "number") out.push(`${c.pressure} avec 3 emails ou plus en 7 jours, exclus`);
  if (typeof c.answered === "number") out.push(`${c.answered} ayant déjà répondu, exclus`);
  out.push(typeof c.admins === "number" ? `${c.admins} admins, toujours exclus` : "Admins, toujours exclus");
  return out;
}
