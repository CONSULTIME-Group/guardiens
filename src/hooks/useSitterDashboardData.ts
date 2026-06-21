import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, differenceInHours } from "date-fns";
import { haversineDistance } from "@/utils/geo";

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
  reviewsCount: number;
  badgeCount: number;
  totalApps: number;
  cancellations: number;
  pendingAppsCount: number;
  unreadCount: number;
  unreadLoading: boolean;
  unreadError: string | null;
  isAvailable: boolean;
  competencesCount: number;
  interestsCount: number;
  isFounder: boolean;
  postalCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  hasAnimalExperience: boolean;
  hasEmergencyProfile: boolean;
  hasAcceptedRecent: boolean;
  nextGuard: any | null;
  nextGuardError: string | null;
  nearbyListings: any[];
  nearbyListingsRadius: number | null;
  nearbyError: string | null;
  articles: any[];
  badges: any[];
  onboardingCompleted: boolean;
  onboardingDismissed: boolean;
  minimalCompleted: boolean;
  reputation: ReputationData | null;
  groupedBadges: GroupedBadge[];
  nearbyMissions: any[];
  nearbyMissionsError: string | null;
  myMissions: any[];
  myMissionsError: string | null;
}

const INITIAL_STATE: SitterDashboardData = {
  loading: true,
  profileCompletion: 0,
  identityVerified: false,
  identityStatus: "not_submitted",
  completedSits: 0,
  avgRating: 0,
  reviewsCount: 0,
  badgeCount: 0,
  totalApps: 0,
  cancellations: 0,
  pendingAppsCount: 0,
  unreadCount: 0,
  unreadLoading: true,
  unreadError: null,
  isAvailable: false,
  competencesCount: 0,
  isFounder: false,
  postalCode: null,
  avatarUrl: null,
  bio: null,
  hasAnimalExperience: false,
  hasEmergencyProfile: false,
  hasAcceptedRecent: false,
  nextGuard: null,
  nextGuardError: null,
  nearbyListings: [],
  nearbyListingsRadius: null,
  nearbyError: null,
  articles: [],
  badges: [],
  onboardingCompleted: false,
  onboardingDismissed: false,
  minimalCompleted: false,
  reputation: null,
  groupedBadges: [],
  nearbyMissions: [],
  nearbyMissionsError: null,
  myMissions: [],
  myMissionsError: null,
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
    // Reset to initial state when userId changes — prevents the unread badge
    // (and other counters) from flickering with the previous user's values
    // while the new fetch is in flight.
    let cancelled = false;
    setData(INITIAL_STATE);

    const load = async () => {
      const [
        appsRes, sitterRes, profileRes, reviewsRes,
        badgesRes, articlesRes, unreadRes, allBadgesRes, emProfileRes, reputationRes,
      ] = await Promise.all([
        supabase.from("applications")
          .select("*, sit:sits(id, title, start_date, end_date, status, user_id, property_id, properties:property_id(photos))")
          .eq("sitter_id", userId).order("created_at", { ascending: false }),
        supabase.from("sitter_profiles")
          .select("is_available, experience_years, animal_types, competences, interests")
          .eq("user_id", userId).single(),
        supabase.from("profiles")
          .select("identity_verification_status, profile_completion, identity_verified, cancellation_count, is_founder, postal_code, avatar_url, bio, onboarding_completed, onboarding_dismissed_at, onboarding_minimal_completed, latitude, longitude")
          .eq("id", userId).single(),
        supabase.from("reviews")
          .select("overall_rating").eq("reviewee_id", userId).eq("published", true),
        supabase.from("badge_attributions").select("id").eq("user_id", userId),
        supabase.from("articles")
          .select("id, title, slug, cover_image_url, excerpt, category")
          .eq("published", true).eq("category", "conseil_gardien")
          .order("published_at", { ascending: false }).limit(3),
        (supabase as any).rpc("get_unread_messages_count", { _user_id: userId }),
        // Single badge query — replaces both badgeDetailsRes AND useUserBadges
        supabase.from("badge_attributions")
          .select("badge_id, created_at").eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("emergency_sitter_profiles")
          .select("id").eq("user_id", userId).maybeSingle(),
        // Reputation — replaces useProfileReputation
        (supabase as any).from("profile_reputation")
          .select("*").eq("user_id", userId).maybeSingle(),
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

      // Group badges (replaces useUserBadges)
      const allBadges = allBadgesRes.data || [];
      const grouped = allBadges.reduce((acc: Record<string, GroupedBadge>, b: any) => {
        if (!acc[b.badge_id]) acc[b.badge_id] = { badge_id: b.badge_id, created_at: b.created_at, count: 0 };
        acc[b.badge_id].count++;
        return acc;
      }, {} as Record<string, GroupedBadge>);
      const groupedBadges: GroupedBadge[] = Object.values(grouped);

      // Reputation (replaces useProfileReputation)
      const reputation: ReputationData | null = reputationRes.data ?? null;

      // Nearby listings — tri purement géodésique (haversine) sur la position
      // approximative du propriétaire. Plus de filtre département : la promesse
      // « près de chez vous » s'aligne sur la distance réelle, pas sur un
      // découpage administratif. Fallback de rayon 30 → 50 → 100 km (mêmes
      // paliers que useNearbyHelpers pour la cohérence UX). Sans géoloc côté
      // gardien, on retombe sur l'ordre chronologique récent (filet).
      // Fallback : si profiles.latitude est null, on retombe sur
      // public_profiles.latitude_approx pour calculer quand même les distances
      // (sinon les helpers Lyon comme Taoufik/Maria Elisa apparaissent sans km).
      let meLat = (profile as any)?.latitude as number | null | undefined;
      let meLng = (profile as any)?.longitude as number | null | undefined;
      if (meLat == null || meLng == null) {
        const { data: meApprox } = await supabase
          .from("public_profiles")
          .select("latitude_approx, longitude_approx")
          .eq("id", userId)
          .maybeSingle();
        if (meApprox?.latitude_approx && meApprox?.longitude_approx) {
          meLat = meApprox.latitude_approx as number;
          meLng = meApprox.longitude_approx as number;
        }
      }
      const hasMyCoords = typeof meLat === "number" && typeof meLng === "number";
      const NEARBY_LISTINGS_RADIUS_STEPS = [30, 50, 100];
      const NEARBY_LISTINGS_LIMIT = 4;

      let nearbyListings: any[] = [];
      let nearbyListingsRadius: number | null = null;
      let nearbyError: string | null = null;
      {
        // Annonces publiées ET non terminées (end_date >= aujourd'hui).
        // Évite d'afficher dans le dashboard des gardes dont la date de fin
        // est dépassée mais qui n'ont pas encore été archivées automatiquement.
        const todayIso = new Date().toISOString().slice(0, 10);
        const { data: allListings, error: listErr } = await supabase
          .from("sits")
          .select("id, title, start_date, end_date, user_id, property_id, status, created_at, is_urgent, cover_photo_url, properties:property_id(photos, type, environment, cover_photo_url)")
          .eq("status", "published")
          .neq("user_id", userId)
          .gte("end_date", todayIso)
          .order("created_at", { ascending: false })
          .limit(500);
        if (listErr) {
          nearbyError = "Impossible de charger les annonces près de chez vous.";
        } else {
          const candidateOwnerIds = Array.from(new Set((allListings || []).map((s: any) => s.user_id)));
          if (candidateOwnerIds.length > 0) {
            const { data: owners, error: ownersErr } = await supabase
              .from("public_profiles")
              .select("id, latitude_approx, longitude_approx")
              .in("id", candidateOwnerIds);
            if (ownersErr) {
              nearbyError = "Impossible de charger les annonces près de chez vous.";
            } else {
              const ownerById = new Map<string, any>((owners || []).map((o: any) => [o.id, o]));
              const enriched = (allListings || []).map((s: any) => {
                const owner = ownerById.get(s.user_id);
                const distance_km = hasMyCoords && owner?.latitude_approx && owner?.longitude_approx
                  ? haversineDistance(
                      { lat: meLat as number, lng: meLng as number },
                      { lat: owner.latitude_approx, lng: owner.longitude_approx },
                    )
                  : null;
                return { ...s, distance_km };
              });

              if (hasMyCoords) {
                // Fallback progressif : on cherche un palier qui rend >= 3
                // résultats, sinon on prend tout ce qui rentre dans 100 km.
                const withDistance = enriched.filter((s) => s.distance_km !== null);
                let selected: any[] = [];
                for (const radius of NEARBY_LISTINGS_RADIUS_STEPS) {
                  const inRange = withDistance.filter((s) => s.distance_km! <= radius);
                  if (inRange.length >= 3) {
                    selected = inRange;
                    nearbyListingsRadius = radius;
                    break;
                  }
                }
                if (selected.length === 0) {
                  selected = withDistance.filter(
                    (s) => s.distance_km! <= NEARBY_LISTINGS_RADIUS_STEPS[NEARBY_LISTINGS_RADIUS_STEPS.length - 1],
                  );
                  if (selected.length > 0) {
                    nearbyListingsRadius = NEARBY_LISTINGS_RADIUS_STEPS[NEARBY_LISTINGS_RADIUS_STEPS.length - 1];
                  }
                }
                // Filet ultime : aucune annonce dans 100 km → on met en avant
                // la/les plus proche(s) disponible(s), flaggée(s) is_beyond
                // pour que l'UI affiche un libellé « Plus loin ».
                if (selected.length === 0 && withDistance.length > 0) {
                  const sortedAll = [...withDistance].sort(
                    (a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity),
                  );
                  selected = sortedAll.slice(0, 2).map((s) => ({ ...s, is_beyond: true }));
                  nearbyListingsRadius = null; // signale « hors rayon standard »
                }
                selected.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
                nearbyListings = selected.slice(0, NEARBY_LISTINGS_LIMIT);
              } else {
                // Pas de géoloc côté gardien : on ne peut pas trier par
                // distance, on retombe sur l'ordre chronologique récent.
                nearbyListings = enriched.slice(0, NEARBY_LISTINGS_LIMIT);
              }
            }
          }
        }
      }

      // Fallback cover photo : si une annonce affichée n'a aucune photo
      // (ni sit.cover_photo_url, ni properties.cover_photo_url, ni
      // properties.photos), on récupère la 1re photo de la galerie
      // propriétaire (owner_gallery) pour éviter la vignette vide.
      // Cas d'usage : annonces récentes publiées sans photo de couverture
      // dédiée, mais dont le propriétaire a une galerie remplie (ex: Marrakech).
      try {
        const needCover = nearbyListings.filter((s: any) => {
          const hasCover = s?.cover_photo_url
            || s?.properties?.cover_photo_url
            || (Array.isArray(s?.properties?.photos) && s.properties.photos[0]);
          return !hasCover;
        });
        const ownerIds = Array.from(new Set(needCover.map((s: any) => s.user_id)));
        if (ownerIds.length > 0) {
          const { data: galleryRows } = await supabase
            .from("owner_gallery")
            .select("user_id, photo_url, position")
            .in("user_id", ownerIds)
            .order("position", { ascending: true });
          const firstByOwner = new Map<string, string>();
          (galleryRows || []).forEach((row: any) => {
            if (!firstByOwner.has(row.user_id)) firstByOwner.set(row.user_id, row.photo_url);
          });
          nearbyListings = nearbyListings.map((s: any) => {
            const hasCover = s?.cover_photo_url
              || s?.properties?.cover_photo_url
              || (Array.isArray(s?.properties?.photos) && s.properties.photos[0]);
            if (hasCover) return s;
            const fallback = firstByOwner.get(s.user_id);
            return fallback ? { ...s, cover_photo_url: fallback } : s;
          });
        }
      } catch {
        // silencieux : pas critique
      }

      // Nearby missions — conserve la logique département (entraide locale,
      // pas de trajets longs). À migrer séparément si besoin.
      const userDept = profile?.postal_code?.slice(0, 2);
      let nearbyMissions: any[] = [];
      let nearbyMissionsError: string | null = null;
      if (userDept) {
        const { data: missions, error: missionsErr } = await supabase
          .from("small_missions")
          .select("id, title, category, city, postal_code, date_needed, status, created_at, user_id")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(20);
        if (missionsErr) {
          nearbyMissionsError = "Impossible de charger les échanges autour de vous.";
        } else {
          const deptMissions = (missions || [])
            .filter((m: any) => m.user_id !== userId && m.postal_code?.startsWith(userDept));
          // Enrichissement coords auteur — un seul appel batch.
          const authorIds = Array.from(new Set(deptMissions.map((m: any) => m.user_id)));
          let authorCoords = new Map<string, { lat: number; lng: number }>();
          if (authorIds.length > 0 && hasMyCoords) {
            const { data: authors } = await supabase
              .from("public_profiles")
              .select("id, latitude_approx, longitude_approx")
              .in("id", authorIds);
            (authors || []).forEach((a: any) => {
              if (typeof a.latitude_approx === "number" && typeof a.longitude_approx === "number") {
                authorCoords.set(a.id, { lat: a.latitude_approx, lng: a.longitude_approx });
              }
            });
          }
          const enriched = deptMissions.map((m: any) => {
            const c = authorCoords.get(m.user_id);
            const distance_km = c && hasMyCoords
              ? haversineDistance({ lat: meLat as number, lng: meLng as number }, c)
              : null;
            return { ...m, distance_km };
          });
          if (hasMyCoords) {
            enriched.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
          }
          nearbyMissions = enriched.slice(0, 4);
        }
      }

      // My missions — published by the sitter (open + completed),
      // with response counts. Used by SitterMissionsSection.
      let myMissions: any[] = [];
      let myMissionsError: string | null = null;
      {
        const { data: mine, error: mineErr } = await supabase
          .from("small_missions")
          .select("id, title, category, city, date_needed, status, created_at, small_mission_responses(id, status)")
          .eq("user_id", userId)
          .in("status", ["open", "completed"])
          .order("created_at", { ascending: false })
          .limit(8);
        if (mineErr) {
          myMissionsError = "Impossible de charger vos missions publiées.";
        } else {
          myMissions = mine || [];
        }
      }

      // Next guard
      let nextGuard: any = null;
      let nextGuardError: string | null = appsRes.error
        ? "Impossible de charger votre prochaine garde."
        : null;
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
        if (ownerRes.error || petsRes.error) {
          nextGuardError = "Détails de la prochaine garde indisponibles.";
        }
        nextGuard = {
          ...g.sit,
          ownerName: ownerRes.data?.first_name || "",
          daysUntil: differenceInDays(new Date(g.sit.start_date), now),
          pets: petsRes.data || [],
        };
      }

      if (cancelled) return;
      setData({
        loading: false,
        profileCompletion: profile?.profile_completion || 0,
        identityVerified: profile?.identity_verified || false,
        identityStatus: profile?.identity_verification_status || "not_submitted",
        completedSits: completed,
        avgRating: Math.round(avg * 10) / 10,
        reviewsCount: reviews.length,
        badgeCount: badgesRes.data?.length || 0,
        totalApps: apps.length,
        cancellations: profile?.cancellation_count || 0,
        pendingAppsCount: apps.filter((a: any) => ["pending", "viewed", "discussing"].includes(a.status)).length,
        unreadCount: (unreadRes as any).error ? 0 : ((unreadRes as any).data ?? 0),
        unreadLoading: false,
        unreadError: (unreadRes as any).error
          ? "Impossible de charger vos messages non lus."
          : null,
        isAvailable: sitter?.is_available || false,
        competencesCount: Array.isArray((sitter as any)?.competences) ? (sitter as any).competences.length : 0,
        isFounder: profile?.is_founder || false,
        postalCode: profile?.postal_code || null,
        avatarUrl: profile?.avatar_url || null,
        bio: profile?.bio || null,
        hasAnimalExperience: !!(sitter?.experience_years && (sitter?.animal_types as any)?.length > 0),
        hasEmergencyProfile: !!emProfileRes.data,
        hasAcceptedRecent: recentAccepted,
        nextGuard,
        nextGuardError,
        nearbyListings,
        nearbyListingsRadius,
        nearbyError,
        articles: articlesRes.data || [],
        badges: allBadges,
        onboardingCompleted: (profile as any)?.onboarding_completed || false,
        onboardingDismissed: !!(profile as any)?.onboarding_dismissed_at,
        minimalCompleted: (profile as any)?.onboarding_minimal_completed ?? false,
        reputation,
        groupedBadges,
        nearbyMissions,
        nearbyMissionsError,
        myMissions,
        myMissionsError,
      });
    };

    load();
    return () => { cancelled = true; };
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

  // Manual refetch of the unread counter — exposed for retry on error.
  const refetchUnread = useCallback(async () => {
    if (!userId) return;
    setPartial({ unreadLoading: true, unreadError: null });
    const { data: count, error } = await (supabase as any).rpc(
      "get_unread_messages_count",
      { _user_id: userId }
    );
    if (error) {
      setPartial({
        unreadLoading: false,
        unreadError: "Impossible de charger vos messages non lus.",
      });
      return;
    }
    setPartial({
      unreadCount: (count as number) ?? 0,
      unreadLoading: false,
      unreadError: null,
    });
  }, [userId, setPartial]);

  // Realtime sync for unread messages count
  // Re-fetches the RPC whenever a message is inserted or its read_at is updated.
  // The RPC itself enforces: not sender, not archived, only my conversations.
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const { data: count, error } = await (supabase as any).rpc(
          "get_unread_messages_count",
          { _user_id: userId }
        );
        if (error) {
          setPartial({
            unreadError: "Impossible de rafraîchir vos messages non lus.",
          });
          return;
        }
        setPartial({
          unreadCount: (count as number) ?? 0,
          unreadError: null,
        });
      }, 250);
    };
    const channel = supabase
      .channel(`sitter-unread-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, refresh)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, setPartial]);

  const toggleAvailability = useCallback(async () => {
    if (!userId) return;
    const newVal = !data.isAvailable;
    setPartial({ isAvailable: newVal });
    await supabase.from("sitter_profiles").update({ is_available: newVal }).eq("user_id", userId);
  }, [userId, data.isAvailable, setPartial]);

  return { ...data, setPartial, toggleAvailability, refetchUnread };
}
