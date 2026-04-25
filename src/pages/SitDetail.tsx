/**
 * Orchestrateur de la fiche annonce `/sits/:id`.
 *
 * Responsabilités :
 * 1. Charger les données (sit, owner, property, pets, ownerProfile, reviews, applications, sitter context).
 * 2. Détecter le rôle visiteur (owner vs sitter).
 * 3. Déléguer le rendu à `OwnerSitView` ou `SitterSitView`.
 *
 * Le détail des comportements vit dans les sous-vues.
 */
import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { geocodeCity } from "@/lib/geocode";
import SitDetailSkeleton from "@/components/skeletons/SitDetailSkeleton";
import OwnerSitView from "@/components/sits/views/OwnerSitView";
import SitterSitView from "@/components/sits/views/SitterSitView";
import type { SitData } from "@/components/sits/views/types";

const SitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, activeRole } = useAuth();

  const [sit, setSit] = useState<SitData | null>(null);
  const [owner, setOwner] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [appCount, setAppCount] = useState(0);
  const [pendingAppCount, setPendingAppCount] = useState(0);
  const [hasApplied, setHasApplied] = useState(false);
  const [hasReviewedThisSit, setHasReviewedThisSit] = useState(false);
  const [initialLogementOverride, setInitialLogementOverride] = useState("");
  const [initialAnimauxOverride, setInitialAnimauxOverride] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: sitRows } = await supabase.from("sits").select("*").eq("id", id).limit(1);
      const sitData = sitRows?.[0];
      if (!sitData) {
        setLoading(false);
        return;
      }
      setSit(sitData as SitData);
      setInitialLogementOverride((sitData as any).logement_override || "");
      setInitialAnimauxOverride((sitData as any).animaux_override || "");

      const [ownerRes, propRes, ownerProfRes, reviewsRes] = await Promise.all([
        supabase.from("public_profiles").select("*").eq("id", sitData.user_id).limit(1),
        supabase.from("properties").select("*").eq("id", sitData.property_id).limit(1),
        supabase.from("owner_profiles").select("*").eq("user_id", sitData.user_id).limit(1),
        supabase
          .from("reviews")
          .select(
            "*, reviewer:profiles!reviews_reviewer_id_fkey(first_name, avatar_url)",
          )
          .eq("reviewee_id", sitData.user_id)
          .eq("published", true),
      ]);

      const ownerData = ownerRes.data?.[0] ?? null;
      const propertyData = propRes.data?.[0] ?? null;
      const ownerProfileData = ownerProfRes.data?.[0] ?? null;

      setOwner(ownerData);
      setProperty(propertyData);
      setOwnerProfile(ownerProfileData);
      setReviews(reviewsRes.data || []);

      if (ownerData?.city) {
        geocodeCity(ownerData.city).then((result) => {
          if (result) setCoords({ lat: result.lat, lng: result.lng });
        });
      }

      if (propertyData) {
        const { data: petsData } = await supabase
          .from("pets")
          .select("*")
          .eq("property_id", propertyData.id);
        setPets(petsData || []);
      }

      const [allAppsRes, pendingAppsRes] = await Promise.all([
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("sit_id", id!)
          .not("status", "in", "(rejected,cancelled)"),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("sit_id", id!)
          .in("status", ["pending", "viewed", "discussing"]),
      ]);
      setAppCount(allAppsRes.count || 0);
      setPendingAppCount(pendingAppsRes.count || 0);

      if (user) {
        const [spRes, appRes, reviewRes] = await Promise.all([
          supabase.from("sitter_profiles").select("*").eq("user_id", user.id).limit(1),
          supabase
            .from("applications")
            .select("id")
            .eq("sit_id", id!)
            .eq("sitter_id", user.id)
            .limit(1),
          supabase
            .from("reviews")
            .select("id")
            .eq("sit_id", id!)
            .eq("reviewer_id", user.id)
            .limit(1),
        ]);
        setSitterProfile(spRes.data?.[0] ?? null);
        if (appRes.data?.[0]) setHasApplied(true);
        setHasReviewedThisSit(!!reviewRes.data?.[0]);
      }

      setLoading(false);
    };
    load();
  }, [id, user]);

  if (loading) return <SitDetailSkeleton />;
  if (!sit)
    return (
      <div className="p-6 md:p-10">
        <p>Annonce introuvable.</p>
      </div>
    );
  if (id?.startsWith("demo-")) return <Navigate to="/search" replace />;

  const isOwner = sit.user_id === user?.id;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in pb-44 md:pb-40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {isOwner ? (
        <OwnerSitView
          sit={sit}
          setSit={setSit}
          owner={owner}
          property={property}
          pets={pets}
          ownerProfile={ownerProfile}
          reviews={reviews}
          coords={coords}
          appCount={appCount}
          pendingAppCount={pendingAppCount}
          hasReviewedThisSit={hasReviewedThisSit}
          initialLogementOverride={initialLogementOverride}
          initialAnimauxOverride={initialAnimauxOverride}
          currentUserId={user!.id}
        />
      ) : (
        <SitterSitView
          sit={sit}
          setSit={setSit}
          owner={owner}
          property={property}
          pets={pets}
          ownerProfile={ownerProfile}
          reviews={reviews}
          coords={coords}
          appCount={appCount}
          setAppCount={setAppCount}
          hasApplied={hasApplied}
          setHasApplied={setHasApplied}
          hasReviewedThisSit={hasReviewedThisSit}
          sitterProfile={sitterProfile}
          currentUserId={user?.id || ""}
          activeRole={activeRole}
          userRole={(user as any)?.role}
          userFirstName={(user as any)?.firstName}
        />
      )}
    </div>
  );
};

export default SitDetail;
