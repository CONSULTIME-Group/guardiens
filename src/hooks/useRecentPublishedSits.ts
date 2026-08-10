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
      return (data ?? []) as RecentPublishedSit[];
    },
  });
}
