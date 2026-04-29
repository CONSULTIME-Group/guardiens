import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type {
  Pet, SitRow, SitterInfo, AppRow, SmallMission,
  HighlightRow, OnboardingChecks,
} from "@/components/dashboard/owner/types";

export interface PendingReview {
  sitId: string;
  sitTitle: string;
  endDate: string | null;
  sitterId: string;
  sitterName: string | null;
  sitterAvatar: string | null;
}

export interface OwnerDashboardData {
  sits: SitRow[];
  pets: Pet[];
  recentApps: AppRow[];
  reviews: { overall_rating: number }[];
  highlights: HighlightRow[];
  smallMissions: SmallMission[];
  myMissions: SmallMission[];
  verificationStatus: string;
  missionMetrics: { total: number; completed: number };
  sitterBadges: Record<string, { badge_key: string; count: number }[]>;
  sitterProfiles: Record<string, SitterInfo>;
  trustedSitterCount: number;
  propertyType: string | null;
  propertyEnvironment: string | null;
  propertyCoverPhoto: string | null;
  onboardingChecks: OnboardingChecks;
  pendingReviews: PendingReview[];
  profile: {
    first_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    onboarding_minimal_completed: boolean;
  } | null;
}

const INITIAL: OwnerDashboardData = {
  sits: [],
  pets: [],
  recentApps: [],
  reviews: [],
  highlights: [],
  smallMissions: [],
  myMissions: [],
  verificationStatus: "not_submitted",
  missionMetrics: { total: 0, completed: 0 },
  sitterBadges: {},
  sitterProfiles: {},
  trustedSitterCount: 0,
  propertyType: null,
  propertyEnvironment: null,
  propertyCoverPhoto: null,
  onboardingChecks: {
    hasName: false, hasAvatar: false, hasBio: false,
    hasIdentity: false, hasProperty: false, hasPets: false, hasSit: false,
  },
  pendingReviews: [],
  profile: null,
};

export function useOwnerDashboardData(userId: string | undefined) {
  const [data, setData] = useState<OwnerDashboardData>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // Anti-flicker reset
    setData(INITIAL);
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const [sitsRes, propsRes, reviewsRes, profileRes, highlightsRes, missionsRes] = await Promise.all([
          supabase.from("sits").select("*, applications(id, status, sitter_id)").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("properties").select("id, type, environment, photos").eq("user_id", userId),
          supabase.from("reviews").select("overall_rating").eq("reviewee_id", userId).eq("published", true),
          supabase.from("profiles").select("first_name, avatar_url, bio, identity_verification_status, onboarding_completed, onboarding_dismissed_at, onboarding_minimal_completed").eq("id", userId).single(),
          supabase.from("owner_highlights").select("*, sitter:profiles!owner_highlights_sitter_id_fkey(first_name, avatar_url)").eq("owner_id", userId).eq("hidden", false).order("created_at", { ascending: false }).limit(5),
          supabase.from("small_missions").select("id, title, category, city, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(2),
        ]);

        if (cancelled) return;

        const sitsData = (sitsRes.data || []) as SitRow[];
        const p = profileRes.data;
        const verStatus = p?.identity_verification_status || "not_submitted";
        const propsData = (propsRes.data || []) as Array<{
          id: string;
          type?: string | null;
          environment?: string | null;
          photos?: string[] | null;
        }>;

        const firstProp = propsData[0];
        const propertyType = firstProp?.type ?? null;
        const propertyEnvironment = firstProp?.environment ?? null;
        const photos = firstProp?.photos ?? null;
        const propertyCoverPhoto = Array.isArray(photos) && photos.length > 0 ? photos[0] : null;

        const onboardingChecks: OnboardingChecks = {
          hasName: !!p?.first_name,
          hasAvatar: !!p?.avatar_url,
          hasBio: !!(p?.bio && p.bio.length > 10),
          hasIdentity: verStatus === "verified" || verStatus === "pending",
          hasProperty: propsData.length > 0,
          hasPets: false,
          hasSit: sitsData.length > 0,
        };

        // Pets
        const propIds = propsData.map((pr: { id: string }) => pr.id);
        let petsData: Pet[] = [];
        if (propIds.length > 0) {
          const { data: pd } = await supabase.from("pets").select("*").in("property_id", propIds);
          if (cancelled) return;
          petsData = (pd || []) as Pet[];
          onboardingChecks.hasPets = petsData.length > 0;
        }

        // Applications + sitter details
        const sitIds = sitsData.map(s => s.id);
        let recentApps: AppRow[] = [];
        const sitterProfiles: Record<string, SitterInfo> = {};
        const sitterBadges: Record<string, { badge_key: string; count: number }[]> = {};

        if (sitIds.length > 0) {
          const { data: apps } = await supabase
            .from("applications")
            .select("*, sitter:profiles!applications_sitter_id_fkey(id, first_name, avatar_url, identity_verified, completed_sits_count), sit:sits(title, start_date, end_date)")
            .in("sit_id", sitIds)
            .order("created_at", { ascending: false })
            .limit(20);

          if (cancelled) return;
          recentApps = (apps || []) as AppRow[];

          recentApps.forEach((a) => {
            if (a.sitter?.id) sitterProfiles[a.sitter.id] = a.sitter;
          });

          const sitterIds = [...new Set(recentApps.map(a => a.sitter?.id).filter(Boolean))] as string[];
          if (sitterIds.length > 0) {
            const [{ data: badgeData }, { data: sitterReviews }] = await Promise.all([
              supabase.from("badge_attributions").select("user_id, badge_id").in("user_id", sitterIds),
              supabase.from("reviews").select("reviewee_id, overall_rating").in("reviewee_id", sitterIds).eq("published", true),
            ]);

            if (cancelled) return;

            const grouped: Record<string, Record<string, number>> = {};
            (badgeData || []).forEach((b: { user_id: string; badge_id: string }) => {
              if (!grouped[b.user_id]) grouped[b.user_id] = {};
              grouped[b.user_id][b.badge_id] = (grouped[b.user_id][b.badge_id] || 0) + 1;
            });
            Object.entries(grouped).forEach(([uid, badges]) => {
              sitterBadges[uid] = Object.entries(badges).map(([k, c]) => ({ badge_key: k, count: c }));
            });

            const ratingMap: Record<string, number[]> = {};
            (sitterReviews || []).forEach((r: { reviewee_id: string; overall_rating: number }) => {
              if (!ratingMap[r.reviewee_id]) ratingMap[r.reviewee_id] = [];
              ratingMap[r.reviewee_id].push(r.overall_rating);
            });
            Object.entries(ratingMap).forEach(([id, ratings]) => {
              if (sitterProfiles[id]) {
                sitterProfiles[id] = {
                  ...sitterProfiles[id],
                  avgNote: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
                };
              }
            });
          }
        }

        // Trusted sitter count
        const completedSitsData = sitsData.filter(s => s.status === "completed");
        const sitterSitCounts: Record<string, number> = {};
        completedSitsData.forEach(s => {
          (s.applications || [])
            .filter(a => a.status === "accepted")
            .forEach(a => { sitterSitCounts[a.sitter_id] = (sitterSitCounts[a.sitter_id] || 0) + 1; });
        });
        const trustedSitterCount = Object.values(sitterSitCounts).filter(c => c >= 2).length;

        // Pending reviews : gardes terminées récentes (< 14j) avec sitter accepté,
        // sans avis encore laissé par le propriétaire.
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const recentCompleted = completedSitsData.filter(s => {
          if (!s.end_date) return false;
          return new Date(s.end_date) >= fourteenDaysAgo;
        });
        const recentSitIds = recentCompleted.map(s => s.id);

        // My missions + reviews déjà laissés par le propriétaire
        const [myMissionsDataRes, allMyMissionsCountRes, ownerReviewsRes] = await Promise.all([
          supabase.from("small_missions").select("id, title, category, status, created_at, small_mission_responses(id, status)").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
          supabase.from("small_missions").select("id, status").eq("user_id", userId),
          recentSitIds.length > 0
            ? supabase.from("reviews").select("sit_id").eq("reviewer_id", userId).in("sit_id", recentSitIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (cancelled) return;

        const reviewedSitIds = new Set((ownerReviewsRes.data || []).map((r: { sit_id: string }) => r.sit_id));
        const pendingReviews: PendingReview[] = recentCompleted
          .filter(s => !reviewedSitIds.has(s.id))
          .map(s => {
            const accepted = (s.applications || []).find(a => a.status === "accepted");
            if (!accepted) return null;
            const sitterInfo = sitterProfiles[accepted.sitter_id];
            return {
              sitId: s.id,
              sitTitle: s.title,
              endDate: s.end_date,
              sitterId: accepted.sitter_id,
              sitterName: sitterInfo?.first_name ?? null,
              sitterAvatar: sitterInfo?.avatar_url ?? null,
            };
          })
          .filter((x): x is PendingReview => x !== null);

        const allMyMissions = allMyMissionsCountRes.data || [];

        setData({
          sits: sitsData,
          pets: petsData,
          recentApps,
          reviews: reviewsRes.data || [],
          highlights: (highlightsRes.data || []) as HighlightRow[],
          smallMissions: (missionsRes.data || []) as SmallMission[],
          myMissions: (myMissionsDataRes.data || []) as SmallMission[],
          verificationStatus: verStatus,
          missionMetrics: {
            total: allMyMissions.length,
            completed: allMyMissions.filter((m: { status: string }) => m.status === "completed").length,
          },
          sitterBadges,
          sitterProfiles,
          trustedSitterCount,
          propertyType,
          propertyEnvironment,
          propertyCoverPhoto,
          onboardingChecks,
          pendingReviews,
          profile: p ? {
            first_name: p.first_name,
            avatar_url: p.avatar_url,
            bio: p.bio,
            onboarding_minimal_completed: (p as any).onboarding_minimal_completed ?? false,
          } : null,
        });
        setLoading(false);
      } catch (err) {
        logger.error("[useOwnerDashboardData] load error", { err: String(err) });
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  return { data, loading, error };
}
