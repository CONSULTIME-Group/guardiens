/**
 * Lot 2, G5 / G5b : gardes ouvertes triées par distance à la commune du
 * membre, score d'affinité calculé comme sur les cartes d'annonces
 * (computeAffinityResultFull). On trie, on n'élimine jamais.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile, fetchMySitterProfile } from "@/lib/myProfile";
import { fetchOpenPublishedSits } from "@/lib/dashboardShared";
import { publicProfilesLoader } from "@/lib/batchedReads";
import { computeAffinityResultFull, type AffinityResult } from "@/lib/affinityScore";
import { haversineDistance } from "@/utils/geo";
import { pickFirstSteps, pickNearbyNeeds, FIRST_STEP_NEEDS_RADIUS_KM } from "@/lib/arrival";
import { deriveCategoriesFromCompetences } from "@/lib/skills/categories";
import { computeSitterCompletion, type CompletionItem } from "@/lib/profileCompletion";

export interface FirstStepCard {
  id: string; title: string | null; city: string; start_date: string | null; end_date: string | null;
  cover: string | null; distanceKm: number | null; affinity: AffinityResult | null;
}

export interface FirstStepNeedCard {
  id: string; path: string; title: string; city: string; category: string | null; description: string | null; distanceKm: number | null;
}

export interface FirstStepData {
  city: string; hasNear: boolean; best: FirstStepCard | null; nearCount: number; total: number; closest: FirstStepCard[];
  completion: number; missing: CompletionItem[]; hasAvatar: boolean; hasSkills: boolean; alertActive: boolean;
  /** Lot G-ENT2 : besoins d'entraide ouverts près de chez la personne, triés par correspondance puis distance. */
  needs: FirstStepNeedCard[];
  competences: string[]; helpsWith: string; availableForHelp: boolean; role: string | null;
}

/** Besoins ouverts autour d'un point (lecture autorisée aux membres connectés : statut open). */
export async function loadNearbyNeeds(userId: string, me: { lat: number; lng: number } | null, competences: string[]): Promise<FirstStepNeedCard[]> {
  if (!me) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from("small_missions")
    .select("id, slug, title, description, city, category, latitude, longitude, date_needed, accepting_applications, mission_type, moderation_hidden_at, user_id")
    .eq("status", "open").neq("user_id", userId).is("moderation_hidden_at", null)
    .order("created_at", { ascending: false }).limit(200);
  if (error || !data) return [];
  const cards = (data as any[])
    .filter((m) => (m.mission_type ?? "besoin") === "besoin" && m.category !== "projet" && m.accepting_applications !== false
      && (!m.date_needed || m.date_needed >= today) && m.latitude != null && m.longitude != null)
    .map((m) => ({
      id: m.id, path: `/petites-missions/${m.slug || m.id}`, title: m.title, city: m.city || "", category: m.category ?? null,
      description: m.description ?? null,
      distanceKm: Math.round(haversineDistance(me, { lat: Number(m.latitude), lng: Number(m.longitude) })),
    }));
  return pickNearbyNeeds(cards, deriveCategoriesFromCompetences(competences), FIRST_STEP_NEEDS_RADIUS_KM);
}

async function scoreCards(cards: FirstStepCard[], raws: Map<string, any>, sitter: any) {
  if (!sitter || cards.length === 0) return;
  const propIds = cards.map((c) => raws.get(c.id)?.property_id).filter(Boolean);
  const ownerIds = cards.map((c) => raws.get(c.id)?.user_id).filter(Boolean);
  const [pets, owners, props]: any[] = await Promise.all([
    // Lot Y2 (P3-10) : annonces publiées, animaux lus par la vue public_pets.
    (supabase.from("public_pets" as any) as any).select("property_id, species, special_needs, photo_url, breed").in("property_id", propIds),
    supabase.from("public_owner_profiles").select("user_id, preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected").in("user_id", ownerIds),
    supabase.from("properties").select("id, car_required").in("id", propIds),
  ]);
  for (const c of cards) {
    const raw = raws.get(c.id);
    const o = ((owners.data ?? []) as any[]).find((x) => x.user_id === raw?.user_id) ?? {};
    c.affinity = computeAffinityResultFull({
      preferred_sitter_types: o.preferred_sitter_types,
      home_ambiance: o.home_ambiance,
      languages: o.languages,
      interests: o.interests,
      life_pace: o.life_pace,
      presence_expected: o.presence_expected,
      pets: ((pets.data ?? []) as any[]).filter((p) => p.property_id === raw?.property_id),
      accepts_sitter_pets: raw?.accepts_sitter_pets ?? null,
      accepts_sitter_children: raw?.accepts_sitter_children ?? null,
      car_required: ((props.data ?? []) as any[]).find((p) => p.id === raw?.property_id)?.car_required ?? null,
      distance_km: c.distanceKm,
    } as any, sitter);
  }
}

export async function loadFirstStep(userId: string): Promise<FirstStepData> {
  const [{ data: profile }, { data: sitter }, shared, alertRes, gallery] = await Promise.all([
    fetchMyProfile(userId, { fresh: true }),
    fetchMySitterProfile(userId, { fresh: true }),
    fetchOpenPublishedSits(userId),
    supabase.from("alert_preferences").select("id").eq("user_id", userId).eq("active", true).contains("alert_types", ["gardes"]).limit(1).maybeSingle(),
    supabase.from("sitter_gallery").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const p = (profile ?? {}) as any;
  const me = typeof p.latitude === "number" && typeof p.longitude === "number" ? { lat: p.latitude, lng: p.longitude } : null;
  const rows = shared.rows.filter((r: any) => r.accepting_applications === true);
  const ownerIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean))) as string[];
  const { data: owners } = ownerIds.length ? await publicProfilesLoader.rows(ownerIds) : { data: [] as any[] };
  const ownerById = new Map<string, any>((owners ?? []).map((o: any) => [o.id, o]));
  const raws = new Map<string, any>();
  const cards: FirstStepCard[] = rows.map((r: any) => {
    raws.set(r.id, r);
    const o = ownerById.get(r.user_id);
    const d = me && typeof o?.latitude_approx === "number" && typeof o?.longitude_approx === "number"
      ? Math.round(haversineDistance(me, { lat: o.latitude_approx, lng: o.longitude_approx })) : null;
    return { id: r.id, title: r.title ?? null, city: r.city || o?.city || "", start_date: r.start_date ?? null, end_date: r.end_date ?? null,
      cover: r.cover_photo_url ?? null, distanceKm: d, affinity: null };
  });
  const pick = pickFirstSteps(cards);
  const competences = Array.isArray((sitter as any)?.competences) ? ((sitter as any).competences as string[]) : [];
  const needsPromise = loadNearbyNeeds(userId, me, competences).catch(() => [] as FirstStepNeedCard[]);
  const shown = Array.from(new Set([pick.best, ...pick.closest].filter(Boolean))) as FirstStepCard[];
  await scoreCards(shown, raws, sitter).catch(() => {});
  return {
    city: p.city || "", hasNear: pick.hasNear, best: pick.best, nearCount: pick.nearCount, total: pick.total, closest: pick.closest,
    ...(() => {
      // Même barème que le serveur (src/lib/profileCompletion.ts), comme le rail du tableau de bord.
      const sp = (sitter ?? {}) as any;
      const r = computeSitterCompletion({ role: "sitter", ...p, competences: sp.competences ?? null, lifestyle: sp.lifestyle ?? null,
        geographic_radius: sp.geographic_radius ?? null, interests: sp.interests ?? null, languages: sp.languages ?? null,
        life_pace: sp.life_pace ?? null, animal_types: sp.animal_types ?? null, sitter_gallery_count: (gallery as any)?.count ?? 0 });
      return { completion: r.score, missing: r.missing };
    })(),
    hasAvatar: !!p.avatar_url, hasSkills: Array.isArray((sitter as any)?.competences) && (sitter as any).competences.length > 0,
    alertActive: !!(alertRes as any)?.data,
    needs: await needsPromise,
    competences, helpsWith: (p.helps_with ?? "").trim(), availableForHelp: p.available_for_help === true, role: p.role ?? null,
  };
}

/** Compteur des membres aux savoir-faire à partager dans un rayon (une seule lecture). */
export async function helpersCounter(userId: string): Promise<{ count: (r: number) => Promise<number>; city: string; initials: (r: number) => string[] }> {
  const [{ data: me }, res] = await Promise.all([
    fetchMyProfile(userId),
    supabase.from("public_profiles").select("id, first_name, latitude_approx, longitude_approx").eq("available_for_help", true)
      .not("skill_categories", "eq", "{}").order("id", { ascending: true }).limit(1000),
  ]);
  const p = (me ?? {}) as any;
  const center = typeof p.latitude === "number" && typeof p.longitude === "number" ? { lat: p.latitude, lng: p.longitude } : null;
  const list = ((res as any).data ?? []) as any[];
  return {
    city: p.city || "",
    count: async (r: number) => !center ? 0 : list.filter((h) => h.id !== userId && h.latitude_approx != null && h.longitude_approx != null
      && haversineDistance(center, { lat: h.latitude_approx, lng: h.longitude_approx }) <= r).length,
    // Lot E1-v2 : initiales des trois plus proches (jamais de photo ni de nom complet).
    initials: (r: number) => !center ? [] : list
      .filter((h) => h.id !== userId && h.latitude_approx != null && h.longitude_approx != null && (h.first_name ?? "").trim())
      .map((h) => ({ h, d: haversineDistance(center, { lat: h.latitude_approx, lng: h.longitude_approx }) }))
      .filter((x) => x.d <= r).sort((a, b) => a.d - b.d).slice(0, 3)
      .map((x) => String(x.h.first_name).trim().charAt(0).toUpperCase()),
  };
}
