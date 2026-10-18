// Lot ADM3 (18/10/2026) : brouillons d'annonce complets, prêts à publier.
// Règle unique : celle du formulaire de création (missingDraftItems, partagée
// avec la relance des brouillons dormants), plus quatre conditions d'admin :
// - jamais publiée ni retirée par son propriétaire (décision de Jérémie du
//   18/10/2026 : un brouillon retiré se republie seulement avec son accord) ;
// - date de début aujourd'hui ou plus tard ;
// - ville renseignée (garde-fou guard_sit_publish_requires_city).
import { missingDraftItems, type MissingDraftItem } from "../../../supabase/functions/_shared/sit-draft-missing.ts";

export interface DraftLike {
  id: string;
  user_id?: string | null;
  status?: string | null;
  title?: string | null;
  city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  absence_reason?: string | null;
  sitter_expectations?: string | null;
  cover_photo_url?: string | null;
  published_at?: string | null;
  unpublished_at?: string | null;
  last_unpublished_reason?: string | null;
}

export interface OwnerDraftContext {
  hasProperty: boolean;
  hasPhoto: boolean;
  hasPets: boolean;
}

export interface DraftReadiness {
  ready: boolean;
  /** Ce qui manque, avec les libellés du formulaire ; vide si prêt. */
  missing: MissingDraftItem[];
  /** Raison d'admin qui écarte le brouillon, ou null. */
  blocked: "not_draft" | "withdrawn" | "past" | "no_city" | null;
}

/** Jour de Paris au format AAAA-MM-JJ. */
export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function draftReadiness(sit: DraftLike, ctx: OwnerDraftContext | undefined, today: string = parisToday()): DraftReadiness {
  if (sit.status !== "draft") return { ready: false, missing: [], blocked: "not_draft" };
  if (sit.published_at || sit.unpublished_at || sit.last_unpublished_reason) return { ready: false, missing: [], blocked: "withdrawn" };
  if (!sit.start_date || sit.start_date.slice(0, 10) < today) return { ready: false, missing: [], blocked: "past" };
  const missing = missingDraftItems({
    title: sit.title,
    start_date: sit.start_date,
    end_date: sit.end_date,
    absence_reason: sit.absence_reason,
    sitter_expectations: sit.sitter_expectations,
    cover_photo_url: sit.cover_photo_url,
    // Contexte inconnu : on ne conclut jamais « prêt ».
    hasProperty: ctx ? ctx.hasProperty : false,
    hasPhoto: ctx ? ctx.hasPhoto : false,
    hasPets: ctx ? ctx.hasPets : false,
  });
  if (missing.length) return { ready: false, missing, blocked: null };
  if (!sit.city || !sit.city.trim()) return { ready: false, missing: [], blocked: "no_city" };
  return { ready: true, missing: [], blocked: null };
}

/** Colonnes d'annonce lues pour juger un brouillon. */
export const DRAFT_COLUMNS =
  "id, user_id, status, title, city, start_date, end_date, absence_reason, sitter_expectations, cover_photo_url, published_at, unpublished_at, last_unpublished_reason";

/**
 * Contexte propriétaire (logement, photos, animaux), lu pour les seuls
 * propriétaires de brouillons. Même lecture que loadMissingDraftItems.
 */
export async function loadOwnerDraftContexts(
  supabase: any,
  ownerIds: string[],
): Promise<Map<string, OwnerDraftContext>> {
  const out = new Map<string, OwnerDraftContext>();
  const ids = [...new Set(ownerIds.filter(Boolean))];
  if (!ids.length) return out;
  const { data: props, error } = await supabase
    .from("properties")
    .select("id, user_id, photos, cover_photo_url")
    .in("user_id", ids);
  if (error) throw error;
  const propIds = (props ?? []).map((p: any) => p.id);
  const petsBy = new Map<string, number>();
  if (propIds.length) {
    const { data: pets, error: pErr } = await supabase.from("pets").select("property_id").in("property_id", propIds);
    if (pErr) throw pErr;
    for (const p of pets ?? []) petsBy.set(p.property_id, (petsBy.get(p.property_id) ?? 0) + 1);
  }
  for (const id of ids) {
    const prop = (props ?? []).find((p: any) => p.user_id === id);
    if (!prop) { out.set(id, { hasProperty: false, hasPhoto: false, hasPets: true }); continue; }
    const photos = Array.isArray(prop.photos) ? prop.photos : [];
    out.set(id, {
      hasProperty: true,
      hasPhoto: photos.length > 0 || Boolean(prop.cover_photo_url),
      hasPets: (petsBy.get(prop.id) ?? 0) > 0,
    });
  }
  return out;
}

/** Brouillons prêts à publier, lus en trois requêtes. */
export async function loadReadyDrafts(supabase: any, today: string = parisToday()): Promise<DraftLike[]> {
  const { data, error } = await supabase
    .from("sits")
    .select(DRAFT_COLUMNS)
    .eq("status", "draft")
    .is("published_at", null)
    .is("unpublished_at", null)
    .gte("start_date", today)
    .limit(500);
  if (error) throw error;
  const drafts = (data ?? []) as DraftLike[];
  const ctx = await loadOwnerDraftContexts(supabase, drafts.map((d) => d.user_id ?? ""));
  return drafts.filter((d) => draftReadiness(d, ctx.get(d.user_id ?? ""), today).ready);
}
