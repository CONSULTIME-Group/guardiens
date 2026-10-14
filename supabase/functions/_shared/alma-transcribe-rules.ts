/**
 * Lot A4 (audit Alma du 14/10/2026) : règles d'entrée de la dictée d'Alma.
 * Taille plafonnée à 2 Mo, types audio en liste fermée, surface et rôle en
 * liste fermée (le pilotage /admin/alma ne se laisse plus écrire par le
 * navigateur). Module pur, testé par vitest (src/__tests__/a4/).
 */

export const TRANSCRIBE_MAX_BYTES = 2 * 1024 * 1024;

/** Types audio acceptés (enregistreur du navigateur : Chrome webm, Safari mp4, Firefox ogg). */
export const TRANSCRIBE_MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

/** Extension du fichier envoyé au gateway, ou null pour un type hors liste. */
export function audioExtension(mime: string | null | undefined): string | null {
  const base = String(mime ?? "").split(";")[0].trim().toLowerCase();
  return TRANSCRIBE_MIME_EXTENSIONS[base] ?? null;
}

export const TRANSCRIBE_LIMIT_MESSAGE =
  "Vous avez dicté 20 messages aujourd'hui. Le clavier reste ouvert, la dictée revient demain.";

const SURFACE_RE = /^[a-z0-9_:-]{1,40}$/;

/** Surface journalisée : identifiant court, sinon « dictaphone ». */
export function closedSurface(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return SURFACE_RE.test(s) ? s : "dictaphone";
}

/** Rôle journalisé : owner ou sitter. */
export function closedRole(v: unknown): "owner" | "sitter" {
  return v === "sitter" ? "sitter" : "owner";
}
