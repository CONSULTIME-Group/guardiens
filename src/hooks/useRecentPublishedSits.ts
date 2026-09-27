/**
 * Requête mutualisée des annonces publiées récentes.
 *
 * Objectif : une seule requête sur la table `sits` au montage de la landing,
 * partagée par la bande d'annonces et le JSON-LD ItemList.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecentPublishedSit {
  id: string;
  slug: string | null;
  title: string;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  daily_routine: string | null;
  created_at: string | null;
  user_id: string;
  property_id: string | null;
  cover_photo_url: string | null;
  is_urgent: boolean | null;
  owner: { latitude: number | null; longitude: number | null } | null;
}

export function useRecentPublishedSits() {
  return useQuery({
    queryKey: ["recent-published-sits"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RecentPublishedSit[]> => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("sits")
        .select(
          "id, slug, title, city, country, start_date, end_date, daily_routine, created_at, user_id, property_id, cover_photo_url, is_urgent"
        )
        .eq("status", "published")
        .eq("accepting_applications", true)
        .or(`end_date.is.null,end_date.gte.${todayIso}`)
        .order("created_at", { ascending: false })
        .limit(24);

      if (error) {
        console.error("useRecentPublishedSits error", error);
        return [];
      }
      const sits = (data ?? []) as Omit<RecentPublishedSit, "owner">[];
      // Coordonnées approchées via la vue publique (lisible par un visiteur),
      // uniquement pour le tri par distance. Un échec laisse la liste intacte.
      const coords = new Map<string, { latitude: number | null; longitude: number | null }>();
      const ids = [...new Set(sits.map((s) => s.user_id))];
      if (ids.length > 0) {
        try {
          const { data: owners, error: ownersError } = await supabase
            .from("public_profiles")
            .select("id, latitude_approx, longitude_approx")
            .in("id", ids);
          if (!ownersError) {
            for (const o of (owners ?? []) as Array<{ id: string; latitude_approx: number | null; longitude_approx: number | null }>) {
              coords.set(o.id, { latitude: o.latitude_approx, longitude: o.longitude_approx });
            }
          }
        } catch {
          /* tri par distance indisponible, annonces conservées */
        }
      }
      return sits.map((s) => ({ ...s, owner: coords.get(s.user_id) ?? null }));
    },
  });
}
