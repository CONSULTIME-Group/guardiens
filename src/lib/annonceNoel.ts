/**
 * Email de Noël v3 (lot V1) : appel de la fonction annonce-noel et règles
 * pures de la page /annonce-noel/:jeton. Logique de dates, d'animaux et de
 * textes partagée avec le serveur (supabase/functions/_shared/owner-noel-v3.ts).
 */
import { supabase } from "@/integrations/supabase/client";

export * from "../../supabase/functions/_shared/owner-noel-v3.ts";

export interface AnnonceNoelState {
  ok: true;
  state: "valid";
  first_name: string;
  city: string | null;
  has_city: boolean;
  variant: "pret" | "photo" | "logement";
  has_property: boolean;
  property_type: string | null;
  pets: Array<{ name: string | null; species: string | null }>;
  pets_answered: boolean;
  dates: { start: string; end: string };
  dates_answered: boolean;
  questions: boolean;
  photo_count: number;
  photo_url: string | null;
  published: boolean;
  draft: {
    id: string;
    status: string;
    title: string | null;
    start_date: string | null;
    end_date: string | null;
    text: string | null;
    cover_photo_url: string | null;
  } | null;
  nearby: {
    count: number;
    label: string | null;
    sitters: Array<{ id: string; firstName: string; avatarUrl?: string; distanceKm: number }>;
  } | null;
}

export type AnnonceNoelResult = AnnonceNoelState | { ok: false; state?: string; reason?: string };

export type AnnonceNoelBody =
  | { mode: "peek" | "prepare" }
  | { mode: "property"; type: "house" | "apartment" | "other" }
  | { mode: "pets"; pets: Array<{ kind: "dog" | "cat" | "other"; name?: string }> }
  | { mode: "pets"; none: true }
  | { mode: "dates"; choice: "vacances" | "noel" | "nouvel_an" }
  | { mode: "dates"; start: string; end: string }
  | { mode: "photo_url"; ext: string }
  | { mode: "photo_done"; path: string };

export async function callAnnonceNoel(token: string, body: AnnonceNoelBody): Promise<AnnonceNoelResult & { path?: string; upload_token?: string }> {
  const { data, error } = await supabase.functions.invoke("annonce-noel", { body: { token, ...body } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    try { return ctx ? await ctx.json() : { ok: false, reason: "error" }; } catch { return { ok: false, reason: "error" }; }
  }
  return data as AnnonceNoelResult & { path?: string; upload_token?: string };
}

export type AnnonceNoelStep = "logement" | "pets" | "dates" | "photo" | "ready";

/**
 * Prochain écran. Les questions (animaux, dates) ne s'ouvrent que pour un
 * logement décrit sur cette page : un propriétaire qui avait déjà décrit son
 * logement va droit à la photo ou à l'annonce, dates modifiables ensuite.
 */
export function nextStep(s: Pick<AnnonceNoelState, "has_property" | "questions" | "pets_answered" | "dates_answered" | "photo_count">): AnnonceNoelStep {
  if (!s.has_property) return "logement";
  if (s.questions && !s.pets_answered) return "pets";
  if (s.questions && !s.dates_answered) return "dates";
  if (s.photo_count === 0) return "photo";
  return "ready";
}

/** « 1 sur 3 » à « 3 sur 3 » pour les questions, rien ailleurs. */
export function stepLabel(step: AnnonceNoelStep): string | null {
  if (step === "logement") return "1 sur 3";
  if (step === "pets") return "2 sur 3";
  if (step === "dates") return "3 sur 3";
  return null;
}

export const PLACE_TYPES = [
  { type: "house" as const, label: "Une maison", noted: "Une maison, c'est noté" },
  { type: "apartment" as const, label: "Un appartement", noted: "Un appartement, c'est noté" },
  { type: "other" as const, label: "Un autre lieu", noted: "C'est noté" },
];

export const notedLine = (type: string | null) => PLACE_TYPES.find((p) => p.type === type)?.noted ?? "C'est noté";

export const isPlaceType = (v: string | null): v is "house" | "apartment" | "other" =>
  v === "house" || v === "apartment" || v === "other";

/** Adresse de publication : la fiche de l'annonce, connexion demandée si besoin. */
export const publishHref = (draftId: string) => `/sits/${draftId}?publier=1`;
export const editHref = (draftId: string) => `/sits/${draftId}/edit`;

/** Libellé de proximité de l'écran prêt : « 90 gardiens à moins de 50 km la découvrent dès sa publication. » */
export function readyNearbyLine(count: number | null | undefined): string | null {
  if (!count || count <= 0) return null;
  return `${count === 1 ? "1 gardien" : `${count} gardiens`} à moins de 50 km ${count === 1 ? "la découvre" : "la découvrent"} dès sa publication.`;
}

/** Extension acceptée par la fonction (jpg, jpeg, png, webp). */
export function photoExt(file: { name?: string; type?: string }): string {
  const t = (file.type ?? "").toLowerCase();
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  return "jpg";
}
