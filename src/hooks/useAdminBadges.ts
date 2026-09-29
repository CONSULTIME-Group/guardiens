import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminBadges {
  verifications: number;
  experiences: number;
  reports: number;
  contactMessages: number;
  skills: number;
  reviewDisputes: number;
  errors: number;
  guideRequests: number;
  reviewsModeration: number;
  adminMessageFailed: number;
  reportsSit: number;
  reportsMission: number;
  analysisRequests: number;
  sitsToStaff: number;
}

const EMPTY: AdminBadges = {
  verifications: 0,
  experiences: 0,
  reports: 0,
  contactMessages: 0,
  skills: 0,
  reviewDisputes: 0,
  errors: 0,
  guideRequests: 0,
  reviewsModeration: 0,
  adminMessageFailed: 0,
  reportsSit: 0,
  reportsMission: 0,
  analysisRequests: 0,
  sitsToStaff: 0,
};

/** Clé partagée : la barre latérale et le menu mobile lisent le même cache,
 *  la lecture ne s'exécute qu'une fois par rafraîchissement. */
export const ADMIN_BADGES_QUERY_KEY = ["admin-badges"] as const;

export async function fetchAdminBadges(): Promise<AdminBadges> {
  {
    const results = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).or("identity_verification_status.eq.pending,and(identity_verification_status.eq.not_submitted,identity_document_url.not.is.null),and(identity_verification_status.eq.not_submitted,identity_selfie_url.not.is.null)"),
      supabase.from("external_experiences").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase.from("skills_library").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("review_disputes").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("error_logs").select("id", { count: "exact", head: true }).is("resolved_at", null).neq("severity", "ignored_third_party"),
      supabase.from("guide_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("reviews").select("id", { count: "exact", head: true }).eq("moderation_status", "en_attente"),
      supabase.from("admin_message_logs").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "new").eq("target_type", "sit"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "new").eq("target_type", "small_mission"),
      (supabase.from("analysis_requests" as any) as any).select("id", { count: "exact", head: true }).eq("status", "new"),
    ]);

    let pendingProfileSkills = 0;
    try {
      const [{ data: validatedComps }, { data: sitterComps }, { data: ownerComps }] = await Promise.all([
        supabase.from("competences_validees").select("label"),
        supabase.from("sitter_profiles").select("competences").not("competences", "is", null),
        supabase.from("owner_profiles").select("competences").not("competences", "is", null),
      ]);
      const validatedSet = new Set((validatedComps || []).map((c: any) => c.label));
      const seen = new Set<string>();
      [...(sitterComps || []), ...(ownerComps || [])].forEach((row: any) => {
        (row.competences || []).forEach((c: string) => {
          if (c && !validatedSet.has(c)) seen.add(c);
        });
      });
      pendingProfileSkills = seen.size;
    } catch {
      pendingProfileSkills = 0;
    }

    // « À staffer » : sits publiés, à venir (end_date null ou >= aujourd'hui),
    // sans aucune candidature. Même définition que le filtre AdminListings.
    let sitsToStaff = 0;
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const { data: openSits } = await supabase
        .from("sits")
        .select("id, end_date")
        .eq("status", "published");
      const upcoming = (openSits || []).filter(
        (s: { id: string; end_date: string | null }) => !s.end_date || s.end_date >= todayISO,
      );
      const ids = upcoming.map((s) => s.id);
      if (ids.length > 0) {
        // L'admin ne lit pas `applications` en direct (RLS) : le comptage passe
        // par la fonction SECURITY DEFINER réservée aux admins. Même règle que
        // AdminListings : candidatures non rejetées ni annulées.
        const withApps = new Set<string>();
        for (let i = 0; i < ids.length; i += 500) {
          const { data: counts, error } = await supabase.rpc(
            "admin_get_listings_application_counts" as any,
            { p_sit_ids: ids.slice(i, i + 500) },
          );
          if (error) throw error;
          ((counts as { sit_id: string; app_count: number }[] | null) || []).forEach((r) => {
            if ((r.app_count || 0) > 0) withApps.add(r.sit_id);
          });
        }
        sitsToStaff = ids.filter((id) => !withApps.has(id)).length;
      }
    } catch {
      sitsToStaff = 0;
    }

    return {
      verifications: results[0].count || 0,
      experiences: results[1].count || 0,
      reports: results[2].count || 0,
      contactMessages: results[3].count || 0,
      skills: (results[4].count || 0) + pendingProfileSkills,
      reviewDisputes: results[5].count || 0,
      errors: results[6].count || 0,
      guideRequests: results[7].count || 0,
      reviewsModeration: results[8].count || 0,
      adminMessageFailed: results[9].count || 0,
      reportsSit: results[10].count || 0,
      reportsMission: results[11].count || 0,
      analysisRequests: results[12].count || 0,
      sitsToStaff,
    };
  }
}

export function useAdminBadges(): AdminBadges {
  const queryClient = useQueryClient();
  // Même fréquence qu'avant : une lecture au montage du layout, puis à chaque
  // événement « admin-badges-refresh ». Pas de relecture au focus ni au remontage.
  const { data } = useQuery({
    queryKey: ADMIN_BADGES_QUERY_KEY,
    queryFn: fetchAdminBadges,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_BADGES_QUERY_KEY });
    };
    window.addEventListener("admin-badges-refresh", handler);
    return () => window.removeEventListener("admin-badges-refresh", handler);
  }, [queryClient]);

  return data ?? EMPTY;
}
