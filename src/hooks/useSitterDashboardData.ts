import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, differenceInHours } from "date-fns";

export interface GroupedBadge {
  badge_id: string;
  created_at: string;
  count: number;
}

export interface ReputationData {
  completed_sits: number;
  active_badges: number;
  note_moyenne: number;
  is_manual_super: boolean;
  statut_gardien: "novice" | "confirme" | "super_gardien";
}

export interface SitterDashboardData {
  loading: boolean;
  profileCompletion: number;
  identityVerified: boolean;
  identityStatus: string;
  completedSits: number;
  avgRating: number;
  badgeCount: number;
  totalApps: number;
  cancellations: number;
  pendingAppsCount: number;
  unreadCount: number;
  isAvailable: boolean;
  isFounder: boolean;
  postalCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  hasAnimalExperience: boolean;
  hasEmergencyProfile: boolean;
  hasAcceptedRecent: boolean;
  nextGuard: any | null;
  nearbyListings: any[];
  articles: any[];
  badges: any[];
  onboardingCompleted: boolean;
  onboardingDismissed: boolean;
  minimalCompleted: boolean;
  reputation: ReputationData | null;
  groupedBadges: GroupedBadge[];
}

const INITIAL_STATE: SitterDashboardData = {
  loading: true,
  profileCompletion: 0,
  identityVerified: false,
  identityStatus: "not_submitted",
  completedSits: 0,
  avgRating: 0,
  badgeCount: 0,
  totalApps: 0,
  cancellations: 0,
  pendingAppsCount: 0,
  unreadCount: 0,
  isAvailable: false,
  isFounder: false,
  postalCode: null,
  avatarUrl: null,
  bio: null,
  hasAnimalExperience: false,
  hasEmergencyProfile: false,
  hasAcceptedRecent: false,
  nextGuard: null,
  nearbyListings: [],
  articles: [],
  badges: [],
  onboardingCompleted: false,
  onboardingDismissed: false,
  minimalCompleted: false,
};

export function useSitterDashboardData(userId: string | undefined) {
  const [data, setData] = useState<SitterDashboardData>(INITIAL_STATE);

  const setPartial = useCallback(
    (partial: Partial<SitterDashboardData>) =>
      setData((prev) => ({ ...prev, ...partial })),
    []
  );

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      const [
        appsRes, sitterRes, profileRes, reviewsRes, listingsRes,
        badgesRes, articlesRes, unreadRes, badgeDetailsRes, emProfileRes,
      ] = await Promise.all([
        supabase.from("applications")
          .select("*, sit:sits(id, title, start_date, end_date, status, user_id, property_id, properties:property_id(photos))")
          .eq("sitter_id", userId).order("created_at", { ascending: false }),
        supabase.from("sitter_profiles")
          .select("is_available, experience_years, animal_types")
          .eq("user_id", userId).single(),
        supabase.from("profiles")
          .select("identity_verification_status, profile_completion, identity_verified, cancellation_count, is_founder, postal_code, avatar_url, bio, onboarding_completed, onboarding_dismissed_at, onboarding_minimal_completed")
          .eq("id", userId).single(),
        supabase.from("reviews")
          .select("overall_rating").eq("reviewee_id", userId).eq("published", true),
        supabase.from("sits")
          .select("id, title, start_date, end_date, user_id, property_id, status, created_at, is_urgent, properties:property_id(photos, type, environment)")
          .eq("status", "published").order("created_at", { ascending: false }).limit(6),
        supabase.from("badge_attributions").select("id").eq("user_id", userId),
        supabase.from("articles")
          .select("id, title, slug, cover_image_url, excerpt, category")
          .eq("published", true).eq("category", "conseil_gardien")
          .order("published_at", { ascending: false }).limit(3),
        supabase.from("messages")
          .select("id", { count: "exact", head: true })
          .neq("sender_id", userId).is("read_at", null),
        supabase.from("badge_attributions")
          .select("id, badge_id, created_at").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(6),
        supabase.from("emergency_sitter_profiles")
          .select("id").eq("user_id", userId).maybeSingle(),
      ]);

      const profile = profileRes.data;
      const sitter = sitterRes.data;
      const apps = appsRes.data || [];
      const acceptedApps = apps.filter((a: any) => a.status === "accepted");
      const completed = acceptedApps.filter((a: any) => a.sit?.status === "completed").length;
      const reviews = reviewsRes.data || [];
      const avg = reviews.length > 0
        ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length
        : 0;

      const recentAccepted = acceptedApps.some((a: any) => {
        const created = new Date(a.created_at);
        return differenceInDays(new Date(), created) <= 7;
      });

      // Next guard — inline (no waterfall: batch the 2 queries)
      let nextGuard: any = null;
      const now = new Date();
      const futureGuards = acceptedApps
        .filter((a: any) => a.sit?.start_date && new Date(a.sit.start_date) > now)
        .sort((a: any, b: any) => new Date(a.sit.start_date).getTime() - new Date(b.sit.start_date).getTime());

      if (futureGuards.length > 0) {
        const g = futureGuards[0];
        const [ownerRes, petsRes] = await Promise.all([
          supabase.from("profiles").select("first_name").eq("id", g.sit.user_id).single(),
          supabase.from("pets").select("species").eq("property_id", g.sit.property_id),
        ]);
        nextGuard = {
          ...g.sit,
          ownerName: ownerRes.data?.first_name || "",
          daysUntil: differenceInDays(new Date(g.sit.start_date), now),
          pets: petsRes.data || [],
        };
      }

      setData({
        loading: false,
        profileCompletion: profile?.profile_completion || 0,
        identityVerified: profile?.identity_verified || false,
        identityStatus: profile?.identity_verification_status || "not_submitted",
        completedSits: completed,
        avgRating: Math.round(avg * 10) / 10,
        badgeCount: badgesRes.data?.length || 0,
        totalApps: apps.length,
        cancellations: profile?.cancellation_count || 0,
        pendingAppsCount: apps.filter((a: any) => ["pending", "viewed", "discussing"].includes(a.status)).length,
        unreadCount: unreadRes.count || 0,
        isAvailable: sitter?.is_available || false,
        isFounder: profile?.is_founder || false,
        postalCode: profile?.postal_code || null,
        avatarUrl: profile?.avatar_url || null,
        bio: profile?.bio || null,
        hasAnimalExperience: !!(sitter?.experience_years && (sitter?.animal_types as any)?.length > 0),
        hasEmergencyProfile: !!emProfileRes.data,
        hasAcceptedRecent: recentAccepted,
        nextGuard,
        nearbyListings: (listingsRes.data || []).filter((s: any) => s.user_id !== userId).slice(0, 4),
        articles: articlesRes.data || [],
        badges: badgeDetailsRes.data || [],
        onboardingCompleted: (profile as any)?.onboarding_completed || false,
        onboardingDismissed: !!(profile as any)?.onboarding_dismissed_at,
        minimalCompleted: (profile as any)?.onboarding_minimal_completed ?? false,
      });
    };

    load();
  }, [userId]);

  // Realtime sync for availability
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("sitter-availability")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "sitter_profiles",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (typeof payload.new?.is_available === "boolean") {
          setPartial({ isAvailable: payload.new.is_available });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, setPartial]);

  const toggleAvailability = useCallback(async () => {
    if (!userId) return;
    const newVal = !data.isAvailable;
    setPartial({ isAvailable: newVal });
    await supabase.from("sitter_profiles").update({ is_available: newVal }).eq("user_id", userId);
  }, [userId, data.isAvailable, setPartial]);

  return { ...data, setPartial, toggleAvailability };
}
