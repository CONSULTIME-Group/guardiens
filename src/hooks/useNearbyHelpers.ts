import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { haversineDistance } from "@/utils/geo";
import { qk } from "@/lib/queryKeys";

/**
 * Helpers du coin (gens disponibles « pour un coup de main »).
 *
 * Pourquoi un hook dédié plutôt que de réutiliser `useAvailableHelpers` :
 * - on a besoin de la distance par rapport à l'utilisateur courant pour trier
 *   et appliquer un rayon (fallback 30 → 50 → 100 km).
 * - on limite le payload (8 profils max) — c'est un carrousel, pas une liste.
 *
 * Aucune réponse vide : si le rayon de 30 km est sec, on élargit silencieusement.
 * Le composant affiche le rayon réellement utilisé pour rester transparent.
 */

export type NearbyHelper = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  skill_categories: string[];
  custom_skills: string[];
  bio: string | null;
  identity_verified: boolean;
  completed_sits_count: number;
  distance_km: number | null;
};

export type NearbyHelpersResult = {
  helpers: NearbyHelper[];
  radiusUsed: number; // km
  hasGeo: boolean;
};

export const RADIUS_STEPS = [30, 50, 100];
const MAX_RESULTS = 8;

/**
 * Renvoie le prochain palier de rayon strictement plus grand, ou null s'il
 * n'y en a plus. Utilisé par l'UI pour proposer « Élargir le rayon » sans
 * réinitialiser le filtre compétence.
 */
export function nextRadiusStep(current: number): number | null {
  return RADIUS_STEPS.find((r) => r > current) ?? null;
}

export type NearbyHelpersOptions = {
  /** Force un rayon spécifique (sinon fallback automatique 30→50→100). */
  forcedRadius?: number | null;
};

export function useNearbyHelpers(
  currentUserId: string | undefined,
  options: NearbyHelpersOptions = {},
) {
  const { forcedRadius = null } = options;
  return useQuery<NearbyHelpersResult>({
    queryKey: qk.nearbyHelpers(currentUserId, forcedRadius),
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. Coords de l'utilisateur courant
      const { data: me } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", currentUserId!)
        .maybeSingle();

      const hasGeo = !!(me?.latitude && me?.longitude);

      // 2. Pool de helpers (limité — filtre distance fait côté client,
      //    on garde large pour avoir matière même en zone rurale)
      const { data: pool } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, skill_categories, custom_skills, bio, identity_verified, completed_sits_count, latitude, longitude")
        .eq("available_for_help", true)
        .neq("id", currentUserId!)
        .limit(500);

      if (!pool || pool.length === 0) {
        return { helpers: [], radiusUsed: RADIUS_STEPS[0], hasGeo };
      }

      const normalizeCustom = (raw: any): string[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) {
          return raw
            .map((item) => {
              if (typeof item === "string") return item.trim();
              if (item && typeof item === "object") {
                const status = typeof item.status === "string" ? item.status : "approved";
                const label = typeof item.label === "string" ? item.label : "";
                return status === "approved" ? label.trim() : "";
              }
              return "";
            })
            .filter((s) => s.length > 0);
        }
        if (typeof raw === "string" && raw.trim().length > 0) return [raw];
        return [];
      };

      // 3. Tri par distance si géoloc connue, sinon ordre arbitraire
      const enriched: NearbyHelper[] = pool.map((p: any) => {
        const distance_km =
          hasGeo && p.latitude && p.longitude
            ? haversineDistance(
                { lat: me!.latitude as number, lng: me!.longitude as number },
                { lat: p.latitude, lng: p.longitude },
              )
            : null;
        return {
          id: p.id,
          first_name: p.first_name,
          avatar_url: p.avatar_url,
          city: p.city,
          skill_categories: p.skill_categories || [],
          custom_skills: normalizeCustom(p.custom_skills),
          bio: typeof p.bio === "string" && p.bio.trim().length > 0 ? p.bio : null,
          identity_verified: !!p.identity_verified,
          completed_sits_count: p.completed_sits_count || 0,
          distance_km,
        };
      }).filter((h) => h.skill_categories.length > 0 || h.custom_skills.length > 0);

      // Tri : 1) savoir-faire perso renseigné (signal fort de profil engagé
      // et différenciant), 2) distance croissante, 3) identité vérifiée.
      // Choix produit : on remonte d'abord les profils qui ont pris le temps
      // de décrire leurs compétences — ils convertissent mieux que de purs
      // « proches mais vides ». La distance reste le second critère.
      const prioritize = (list: NearbyHelper[]) =>
        [...list].sort((a, b) => {
          const aHasSkills = a.custom_skills.length > 0 ? 1 : 0;
          const bHasSkills = b.custom_skills.length > 0 ? 1 : 0;
          if (aHasSkills !== bHasSkills) return bHasSkills - aHasSkills;
          const da = a.distance_km ?? Infinity;
          const db = b.distance_km ?? Infinity;
          if (da !== db) return da - db;
          const aVer = a.identity_verified ? 1 : 0;
          const bVer = b.identity_verified ? 1 : 0;
          return bVer - aVer;
        });

      // Pas de géoloc → on retourne 8 profils (priorité custom_skills puis identité vérifiée)
      if (!hasGeo) {
        return { helpers: prioritize(enriched).slice(0, MAX_RESULTS), radiusUsed: 0, hasGeo: false };
      }

      // 4. Rayon forcé par l'UI (« Élargir le rayon ») — court-circuit fallback
      const withDistance = enriched.filter((h) => h.distance_km !== null);

      if (forcedRadius && forcedRadius > 0) {
        const inRange = withDistance.filter((h) => h.distance_km! <= forcedRadius);
        return {
          helpers: prioritize(inRange).slice(0, MAX_RESULTS),
          radiusUsed: forcedRadius,
          hasGeo: true,
        };
      }

      // 5. Fallback progressif du rayon
      for (const radius of RADIUS_STEPS) {
        const inRange = withDistance.filter((h) => h.distance_km! <= radius);
        if (inRange.length >= 3) {
          return { helpers: prioritize(inRange).slice(0, MAX_RESULTS), radiusUsed: radius, hasGeo: true };
        }
      }

      // Aucun fallback n'a donné 3+ résultats → on retourne ce qu'on a
      return {
        helpers: prioritize(withDistance).slice(0, MAX_RESULTS),
        radiusUsed: RADIUS_STEPS[RADIUS_STEPS.length - 1],
        hasGeo: true,
      };
    },
  });
}
