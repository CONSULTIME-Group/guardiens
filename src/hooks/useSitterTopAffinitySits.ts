/**
 * Charge les 3 annonces les plus pertinentes pour un gardien. La préférence
 * déclarée dans alert_preferences prime, puis la distance depuis le profil,
 * puis l'affinité nationale quand aucune coordonnée n'est disponible.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeAffinityResultFull, type AffinityResult } from "@/lib/affinityScore";
import { getDeptCode } from "@/lib/departments";
import {
  rankSitterListings,
  type ListingAlertPreference,
  type ListingRankingSource,
} from "@/lib/sitterListingRank";

export interface AffinitySitCard {
  id: string;
  title: string | null;
  city: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_photo_url: string | null;
  /** Photo d'un animal de l'annonce, prioritaire sur la couverture pour la
   * carte rencontre : quand une seule annonce occupe l'écran, la photo de
   * l'animal gardé est plus pertinente qu'une photo de lieu générique. */
  pet_photo_url: string | null;
  owner_first_name: string | null;
  pet_species: string[];
  affinity: AffinityResult | null;
  distance_km: number | null;
  environments: string[];
}

export type { ListingRankingSource } from "@/lib/sitterListingRank";

interface Result {
  topSits: AffinitySitCard[];
  fallbackSits: AffinitySitCard[];
  /**
   * Vague 9 : une annonce "altérité" hors topSits, choisie pour la
   * découverte (espèce absente de l'expérience du gardien ou ville
   * différente). Jamais scorée à l'affichage. `null` si le pool ne
   * fournit pas de candidat honnête.
   */
  discoverySit: AffinitySitCard | null;
  hasMinimumPool: boolean;
  hasPostalCode: boolean;
  profileIncomplete: boolean;
  rankingSource: ListingRankingSource;
  totalPublished: number;
  isLoading: boolean;
}

interface MatchingQueryResult {
  topSits: AffinitySitCard[];
  fallbackSits: AffinitySitCard[];
  discoverySit: AffinitySitCard | null;
  totalPublished: number;
  hasPostalCode: boolean;
  profileIncomplete: boolean;
  rankingSource: ListingRankingSource;
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

  const q = useQuery<MatchingQueryResult>({
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
            "animal_types, life_pace, lifestyle, availability_during, has_vehicle, has_license, languages, interests, work_during_sit, sensitivities, special_animal_skills, sitter_type, experience_years, travels_with_children, travels_with_own_animals, preferred_environments",
          )
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("postal_code, latitude, longitude")
          .eq("id", userId!)
          .maybeSingle(),
      ]);

      const postalCode = (profile?.postal_code as string | null) ?? null;
      const hasPostalCode = !!postalCode;
      const sitterCoords =
        typeof profile?.latitude === "number" && typeof profile?.longitude === "number"
          ? { lat: profile.latitude, lng: profile.longitude }
          : null;
      const filled = countAffinityFields(sitter);
      const profileIncomplete = filled < 3;

      // La dernière alerte active pour les gardes est la préférence déclarée
      // qui fait foi sur le tableau de bord, comme dans les emails.
      const { data: alertRow } = await supabase
        .from("alert_preferences")
        .select("zone_type, city, radius_km, departement, region_code")
        .eq("user_id", userId!)
        .eq("active", true)
        .contains("alert_types", ["gardes"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let alertCenter = sitterCoords;
      const alertCity = (alertRow as any)?.city as string | null | undefined;
      if (alertCity) {
        const normalized = alertCity
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9 -]/g, "")
          .replace(/\s+/g, " ");
        const candidates = [`city:${normalized}|france`, `${normalized}|france`, normalized, alertCity.trim().toLowerCase()];
        const { data: geo } = await supabase
          .from("geocode_cache")
          .select("lat, lng")
          .in("normalized_name", candidates)
          .limit(1)
          .maybeSingle();
        if (typeof geo?.lat === "number" && typeof geo?.lng === "number") {
          alertCenter = { lat: geo.lat, lng: geo.lng };
        }
      }
      const alert: ListingAlertPreference | null = alertRow
        ? {
            zoneType: (alertRow as any).zone_type,
            radiusKm: (alertRow as any).radius_km ?? null,
            department: getDeptCode((alertRow as any).departement ?? null),
            center: alertCenter,
          }
        : null;

      // 2. Volume réellement visible par CE gardien (lien de sortie vers la
      //    recherche + empty state honnête). Mêmes règles que le pool
      //    candidat : publiées, ouvertes aux candidatures, non terminées,
      //    hors annonces du gardien lui-même. Jamais le total brut.
      const todayIso = new Date().toISOString().slice(0, 10);
      const { count: totalPublished } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("accepting_applications", true)
        .gte("end_date", todayIso)
        .neq("user_id", userId!);

      // 3. Pool national candidat. Le classement complète toujours jusqu'à
      //    trois annonces si le catalogue en contient au moins trois.
      const sitsRes: any = await supabase
        .from("sits")
        .select(
          "id, title, city, start_date, end_date, cover_photo_url, user_id, property_id, accepts_sitter_pets, accepts_sitter_children, departement_code, environments",
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
          .select("id, first_name, postal_code, latitude_approx, longitude_approx")
          .in("id", sitOwnerIds);
        const ownerMap = new Map<string, any>();
        (ownerProfs ?? []).forEach((p: any) => ownerMap.set(p.id, p));
        sitsAll.forEach((s: any) => { s.owner = s.user_id ? ownerMap.get(s.user_id) ?? null : null; });
      }

      if (sitsAll.length === 0) {
        return {
          topSits: [] as AffinitySitCard[],
          fallbackSits: [] as AffinitySitCard[],
          discoverySit: null,
          totalPublished: totalPublished ?? 0,
          hasPostalCode,
          profileIncomplete,
          rankingSource: alert ? "alert" : sitterCoords ? "distance" : "affinity",
        };
      }

      // 5. Charger les animaux des propriétés du pool réduit (utile aux
      //    filtres animaux, à l'affichage des espèces et au score).
       const propertyIds = Array.from(
         new Set(sitsAll.map((s) => s.property_id).filter(Boolean)),
      ) as string[];
      const ownerIds = Array.from(
         new Set(sitsAll.map((s) => s.user_id).filter(Boolean)),
      ) as string[];

      const [petsRes, ownerProfilesRes, propertiesRes]: any[] = await Promise.all([
        propertyIds.length > 0
          ? supabase
              .from("pets")
              .select("property_id, species, special_needs, photo_url, breed")
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
        // Voiture requise (critère d'affinité) par propriété du pool.
        propertyIds.length > 0
          ? supabase
              .from("properties")
              .select("id, car_required")
              .in("id", propertyIds)
          : Promise.resolve({ data: [] }),
      ]);

      const carRequiredByProperty = new Map<string, boolean>(
        ((propertiesRes.data ?? []) as any[]).map((p) => [p.id, p.car_required === true]),
      );

      const petsByProperty = new Map<
        string,
        { species: string | null; special_needs: string | null; photo_url: string | null; breed: string | null }[]
      >();
      for (const p of (petsRes.data ?? []) as any[]) {
        const arr = petsByProperty.get(p.property_id) ?? [];
        arr.push({ species: p.species, special_needs: p.special_needs, photo_url: p.photo_url ?? null, breed: p.breed ?? null });
        petsByProperty.set(p.property_id, arr);
      }
      const ownerPrefsById = new Map<string, any>(
        (ownerProfilesRes.data ?? []).map((o: any) => [o.user_id, o]),
      );

      const scored: AffinitySitCard[] = [];
      const fallback: AffinitySitCard[] = [];
      for (const sit of sitsAll) {
        const pets = petsByProperty.get(sit.property_id) ?? [];
        const ownerFirstName: string | null = sit?.owner?.first_name ?? null;
        const card: AffinitySitCard = {
          id: sit.id,
          title: sit.title,
          city: sit.city,
          start_date: sit.start_date,
          end_date: sit.end_date,
          cover_photo_url: sit.cover_photo_url,
          // Priorité à une photo d'animal sur la carte rencontre (exception
          // assumée à coverPriority : ici la photo illustre la garde, pas le
          // lieu). Repli sur la couverture du lieu si aucun animal n'en a.
          pet_photo_url: pets.find((p) => p.photo_url)?.photo_url ?? null,
          owner_first_name: ownerFirstName,
          pet_species: pets.map((p) => p.species ?? "").filter(Boolean),
          affinity: null,
          distance_km: null,
          environments: Array.isArray(sit.environments) ? sit.environments : [],
        };
        fallback.push(card);

        if (!sitter) continue;
        const ownerPrefs = ownerPrefsById.get(sit.user_id) ?? {};
        // Doctrine : on trie par pertinence, on n'élimine jamais. Le score
        // est toujours calculé et joint à la carte ; l'affichage du chiffre
        // est décidé par AffinityBadge / AffinityRing via `scoreReliable`.
        const affinity = computeAffinityResultFull(
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
            car_required: carRequiredByProperty.get(sit.property_id) ?? null,
          },
          sitter as any,
        );
        scored.push({ ...card, affinity });
      }

      const affinityById = new Map(scored.map((card) => [card.id, card.affinity]));
      const ranked = rankSitterListings({
        listings: fallback.map((card) => {
          const raw = sitsAll.find((sit) => sit.id === card.id);
          const lat = raw?.owner?.latitude_approx;
          const lng = raw?.owner?.longitude_approx;
          const affinity = affinityById.get(card.id) ?? null;
          return {
            ...card,
            affinity,
            affinityScore: affinity?.score ?? null,
            department: getDeptCode(raw?.departement_code ?? raw?.owner?.postal_code ?? null),
            coords: typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null,
          };
        }),
        alert,
        sitterCoords,
        preferredEnvironments: Array.isArray((sitter as any)?.preferred_environments)
          ? (sitter as any).preferred_environments
          : [],
      });
      const topThree = ranked.listings.map(({ distanceKm, affinityScore: _affinityScore, department: _department, coords: _coords, ...card }) => ({
        ...card,
        distance_km: distanceKm,
      }));

      return {
        topSits: topThree,
        fallbackSits: topThree,
        discoverySit: null,
        totalPublished: totalPublished ?? 0,
        hasPostalCode,
        profileIncomplete,
        rankingSource: ranked.source,
      };
    },
  });

  const data = q.data;
  const topSits = data?.topSits ?? [];
  const fallbackSits = data?.fallbackSits ?? [];
  return {
    topSits,
    fallbackSits,
    discoverySit: data?.discoverySit ?? null,
    hasMinimumPool: topSits.length >= 1,
    hasPostalCode: data?.hasPostalCode ?? false,
    profileIncomplete: data?.profileIncomplete ?? false,
    rankingSource: (data?.rankingSource ?? "affinity") as ListingRankingSource,
    totalPublished: data?.totalPublished ?? 0,
    isLoading: q.isLoading,
  };
}
