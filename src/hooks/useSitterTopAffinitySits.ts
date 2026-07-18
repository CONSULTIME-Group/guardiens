/**
 * Charge les 3 meilleures annonces pour un gardien selon le score d'affinité,
 * avec garde-fous "cul-de-sac" (audit 2026-07) :
 *
 *  - le pool candidat est restreint à une zone géographique COHÉRENTE
 *    autour du gardien (département puis région, puis France entière en
 *    dernier recours) ; on ne "recommande" plus des annonces à l'autre
 *    bout du pays.
 *  - si le score d'affinité ne retient AUCUNE annonce affichable, on
 *    expose un `fallbackSits` (annonces ouvertes de la zone, triées par
 *    date) pour éviter l'écran vide.
 *  - on expose `profileIncomplete` pour permettre à l'UI d'afficher un
 *    empty state honnête (profil vs distance) plutôt qu'un message
 *    trompeur "aucune annonce dans un rayon de X km".
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeAffinityScore, type AffinityResult } from "@/lib/affinityScore";
import { getDeptCode } from "@/lib/departments";
import { getRegionCode, getDeptsInRegion } from "@/lib/regions";

export interface AffinitySitCard {
  id: string;
  title: string | null;
  city: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_photo_url: string | null;
  owner_first_name: string | null;
  pet_species: string[];
  affinity: AffinityResult | null;
}

export type PoolScope = "dept" | "region" | "country" | "none";

interface Result {
  topSits: AffinitySitCard[];
  fallbackSits: AffinitySitCard[];
  hasMinimumPool: boolean;
  hasPostalCode: boolean;
  profileIncomplete: boolean;
  scopeUsed: PoolScope;
  totalPublished: number;
  isLoading: boolean;
}

/**
 * Un profil est considéré "assez complet pour scorer" dès que le gardien
 * a renseigné au moins 3 des 7 champs d'affinité. Sous ce seuil, le score
 * ne peut structurellement pas atteindre le seuil de crédibilité et le
 * cul-de-sac est causé par le profil, pas par la distance.
 */
function countAffinityFields(s: any | null | undefined): number {
  if (!s) return 0;
  const filled = (v: any) =>
    Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== "";
  let n = 0;
  if (filled(s.animal_types)) n++;
  if (filled(s.life_pace)) n++;
  if (filled(s.languages)) n++;
  if (filled(s.interests)) n++;
  if (filled(s.work_during_sit)) n++;
  if (filled(s.sensitivities)) n++;
  if (filled(s.special_animal_skills)) n++;
  return n;
}

export function useSitterTopAffinitySits(): Result {
  const { user } = useAuth();
  const userId = user?.id;

  const q = useQuery({
    queryKey: ["sitter-top-affinity-sits", userId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      // 1. Profil gardien (préférences pour le score + code postal)
      const [{ data: sitter }, { data: profile }] = await Promise.all([
        supabase
          .from("sitter_profiles")
          .select(
            "animal_types, life_pace, languages, interests, work_during_sit, sensitivities, special_animal_skills, sitter_type, experience_years, travels_with_children, travels_with_own_animals",
          )
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("postal_code")
          .eq("id", userId!)
          .maybeSingle(),
      ]);

      const postalCode = (profile?.postal_code as string | null) ?? null;
      const hasPostalCode = !!postalCode;
      const deptCode = getDeptCode(postalCode);
      const regionCode = getRegionCode(deptCode);
      const filled = countAffinityFields(sitter);
      const profileIncomplete = filled < 3;

      // 2. Volume total (pour l'empty state honnête)
      const { count: totalPublished } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("accepting_applications", true);

      // 3. Pool candidat, joint au code postal du propriétaire pour permettre
      //    le filtrage département/région côté client.
      const todayIso = new Date().toISOString().slice(0, 10);
      const sitsRes: any = await supabase
        .from("sits")
        .select(
          "id, title, city, start_date, end_date, cover_photo_url, user_id, property_id, accepts_sitter_pets, accepts_sitter_children",
        )
        .eq("status", "published")
        .eq("accepting_applications", true)
        .gte("end_date", todayIso)
        .neq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(80);
      const sitsAll: any[] = sitsRes.data ?? [];

      // Hydratation RLS-safe des propriétaires via la vue publique.
      const sitOwnerIds = Array.from(new Set(sitsAll.map((s) => s.user_id).filter(Boolean))) as string[];
      if (sitOwnerIds.length > 0) {
        const { data: ownerProfs } = await supabase
          .from("public_profiles")
          .select("id, first_name, postal_code")
          .in("id", sitOwnerIds);
        const ownerMap = new Map<string, any>();
        (ownerProfs ?? []).forEach((p: any) => ownerMap.set(p.id, { first_name: p.first_name, postal_code: p.postal_code }));
        sitsAll.forEach((s: any) => { s.owner = s.user_id ? ownerMap.get(s.user_id) ?? null : null; });
      }

      // 4. Réduction géographique progressive : département → région → pays.
      let scopeUsed: PoolScope = "none";
      let scoped: any[] = [];
      if (deptCode) {
        const sameDept = sitsAll.filter(
          (s) => getDeptCode(s?.owner?.postal_code ?? null) === deptCode,
        );
        if (sameDept.length > 0) {
          scoped = sameDept;
          scopeUsed = "dept";
        }
      }
      if (scoped.length === 0 && regionCode) {
        const regionDepts = new Set(getDeptsInRegion(regionCode));
        const sameRegion = sitsAll.filter((s) => {
          const d = getDeptCode(s?.owner?.postal_code ?? null);
          return d ? regionDepts.has(d) : false;
        });
        if (sameRegion.length > 0) {
          scoped = sameRegion;
          scopeUsed = "region";
        }
      }
      if (scoped.length === 0 && sitsAll.length > 0) {
        // Dernier recours : on ouvre au pays entier pour ne pas laisser le
        // dashboard vide, mais l'UI signalera la mention "hors de votre zone".
        scoped = sitsAll;
        scopeUsed = "country";
      }

      if (scoped.length === 0) {
        return {
          topSits: [] as AffinitySitCard[],
          fallbackSits: [] as AffinitySitCard[],
          totalPublished: totalPublished ?? 0,
          hasPostalCode,
          profileIncomplete,
          scopeUsed,
        };
      }

      // 5. Charger les animaux des propriétés du pool réduit (utile aux
      //    filtres animaux, à l'affichage des espèces et au score).
      const propertyIds = Array.from(
        new Set(scoped.map((s) => s.property_id).filter(Boolean)),
      ) as string[];
      const ownerIds = Array.from(
        new Set(scoped.map((s) => s.user_id).filter(Boolean)),
      ) as string[];

      const [petsRes, ownerProfilesRes]: any[] = await Promise.all([
        propertyIds.length > 0
          ? supabase
              .from("pets")
              .select("property_id, species, special_needs")
              .in("property_id", propertyIds)
          : Promise.resolve({ data: [] }),
        ownerIds.length > 0
          ? supabase
              .from("owner_profiles")
              .select(
                "user_id, preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected",
              )
              .in("user_id", ownerIds)
          : Promise.resolve({ data: [] }),
      ]);

      const petsByProperty = new Map<
        string,
        { species: string | null; special_needs: string | null }[]
      >();
      for (const p of (petsRes.data ?? []) as any[]) {
        const arr = petsByProperty.get(p.property_id) ?? [];
        arr.push({ species: p.species, special_needs: p.special_needs });
        petsByProperty.set(p.property_id, arr);
      }
      const ownerPrefsById = new Map<string, any>(
        (ownerProfilesRes.data ?? []).map((o: any) => [o.user_id, o]),
      );

      const scored: AffinitySitCard[] = [];
      const fallback: AffinitySitCard[] = [];
      for (const sit of scoped) {
        const pets = petsByProperty.get(sit.property_id) ?? [];
        const ownerFirstName: string | null = sit?.owner?.first_name ?? null;
        const card: AffinitySitCard = {
          id: sit.id,
          title: sit.title,
          city: sit.city,
          start_date: sit.start_date,
          end_date: sit.end_date,
          cover_photo_url: sit.cover_photo_url,
          owner_first_name: ownerFirstName,
          pet_species: pets.map((p) => p.species ?? "").filter(Boolean),
          affinity: null,
        };
        fallback.push(card);

        if (!sitter) continue;
        const ownerPrefs = ownerPrefsById.get(sit.user_id) ?? {};
        const affinity = computeAffinityScore(
          {
            preferred_sitter_types: ownerPrefs.preferred_sitter_types,
            home_ambiance: ownerPrefs.home_ambiance,
            languages: ownerPrefs.languages,
            interests: ownerPrefs.interests,
            life_pace: ownerPrefs.life_pace,
            presence_expected: ownerPrefs.presence_expected,
            pets,
            accepts_sitter_pets: sit.accepts_sitter_pets ?? null,
            accepts_sitter_children: sit.accepts_sitter_children ?? null,
          },
          sitter as any,
        );
        if (!affinity) continue;
        scored.push({ ...card, affinity });
      }

      scored.sort((a, b) => (b.affinity?.score ?? 0) - (a.affinity?.score ?? 0));

      return {
        topSits: scored.slice(0, 3),
        fallbackSits: fallback.slice(0, 3),
        totalPublished: totalPublished ?? 0,
        hasPostalCode,
        profileIncomplete,
        scopeUsed,
      };
    },
  });

  const data = q.data;
  const topSits = data?.topSits ?? [];
  const fallbackSits = data?.fallbackSits ?? [];
  return {
    topSits,
    fallbackSits,
    hasMinimumPool: topSits.length >= 1,
    hasPostalCode: data?.hasPostalCode ?? false,
    profileIncomplete: data?.profileIncomplete ?? false,
    scopeUsed: data?.scopeUsed ?? "none",
    totalPublished: data?.totalPublished ?? 0,
    isLoading: q.isLoading,
  };
}
