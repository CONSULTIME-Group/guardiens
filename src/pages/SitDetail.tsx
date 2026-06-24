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
import { useState, useEffect, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { geocodeCity } from "@/lib/geocode";
import SitDetailSkeleton from "@/components/skeletons/SitDetailSkeleton";
import OwnerSitView from "@/components/sits/views/OwnerSitView";
import SitterSitView from "@/components/sits/views/SitterSitView";
import { useSitRealtime } from "@/components/sits/views/useSitRealtime";
import { backfillOwnerGalleryDimensions } from "@/lib/backfillGalleryDimensions";
import fallbackMarrakech from "@/assets/fallback-marrakech.webp";
import type { SitData } from "@/components/sits/views/types";

/**
 * Photo d'ambiance par défaut quand la propriété n'a aucune photo en base.
 * Évite que la fiche détail soit visuellement vide (cohérent avec
 * LiveListingsStrip côté landing).
 */
const fallbackImageForGeo = (city: string | null, country: string | null): string | null => {
  const c = (city || "").toUpperCase();
  const co = (country || "").toUpperCase();
  if (c.includes("MARRAKECH") || c.includes("MARRAKESH") || co === "MAROC" || co === "MOROCCO") {
    return fallbackMarrakech;
  }
  return null;
};

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
  const [ownerGallery, setOwnerGallery] = useState<{ id: string; photo_url: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // Reset complet à chaque changement d'annonce pour éviter qu'un CTA
    // (candidater, déjà postulé, déjà reviewé…) ne fuite d'une fiche à l'autre.
    setLoading(true);
    setSit(null);
    setOwner(null);
    setProperty(null);
    setPets([]);
    setOwnerProfile(null);
    setReviews([]);
    setSitterProfile(null);
    setCoords(null);
    setAppCount(0);
    setPendingAppCount(0);
    setHasApplied(false);
    setHasReviewedThisSit(false);
    setInitialLogementOverride("");
    setInitialAnimauxOverride("");
    setOwnerGallery([]);
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

      const [ownerRes, propRes, ownerProfRes, reviewsRes, galleryRes] = await Promise.all([
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
        // Galerie propriétaire = source de vérité unique pour les photos.
        supabase
          .from("owner_gallery")
          .select("id, photo_url, position")
          .eq("user_id", sitData.user_id)
          .order("position", { ascending: true }),
      ]);

      const ownerData = ownerRes.data?.[0] ?? null;
      const propertyData = propRes.data?.[0] ?? null;
      const ownerProfileData = ownerProfRes.data?.[0] ?? null;

      // Injecter les photos owner_gallery dans property pour le hero.
      // Fallback géo : si aucune photo (owner_gallery + property.photos vides),
      // on injecte une photo d'ambiance par ville/pays (ex: Marrakech) pour
      // ne pas afficher une fiche détail vide. Symétrique au LiveListingsStrip.
      const galleryUrls = (galleryRes.data || []).map((g: any) => g.photo_url).filter(Boolean);
      const existingPhotos = (propertyData as any)?.photos || [];
      const mergedPhotos = galleryUrls.length > 0 ? galleryUrls : existingPhotos;
      const sitCityRaw = (sitData as any)?.city || null;
      const sitCountryRaw = (sitData as any)?.country || null;
      const fallbackPhoto = mergedPhotos.length === 0 && !propertyData?.cover_photo_url
        ? fallbackImageForGeo(sitCityRaw, sitCountryRaw)
        : null;
      const enrichedProperty = propertyData
        ? {
            ...propertyData,
            photos: mergedPhotos.length > 0 ? mergedPhotos : (fallbackPhoto ? [fallbackPhoto] : existingPhotos),
            cover_photo_url: propertyData.cover_photo_url || fallbackPhoto || null,
          }
        : propertyData;

      // Override : la ville/pays de l'annonce priment sur le profil (résidence secondaire, étranger).
      const sitCity = (sitData as any)?.city?.trim();
      const sitCountry = (sitData as any)?.country?.trim();
      const effectiveOwner = ownerData && (sitCity || (sitCountry && sitCountry !== "FR"))
        ? { ...ownerData, city: sitCity || ownerData.city, country: sitCountry || (ownerData as any).country || "FR" }
        : ownerData;

      setOwner(effectiveOwner);
      setProperty(enrichedProperty);
      setOwnerProfile(ownerProfileData);
      setReviews(reviewsRes.data || []);
      setOwnerGallery((galleryRes.data || []).map((g: any) => ({ id: g.id, photo_url: g.photo_url })));

      if (effectiveOwner?.city) {
        geocodeCity(effectiveOwner.city).then((result) => {
          if (result) setCoords({ lat: result.lat, lng: result.lng });
        });
      }

      if (propertyData) {
        // Try full pets first (owner / admin / accepted sitter); fall back to public_pets view for general viewers
        const { data: fullPets } = await supabase
          .from("pets")
          .select("*")
          .eq("property_id", propertyData.id);
        if (fullPets && fullPets.length > 0) {
          setPets(fullPets);
        } else {
          const { data: safePets } = await supabase
            .from("public_pets" as any)
            .select("*")
            .eq("property_id", propertyData.id);
          setPets((safePets as any) || []);
        }
      }

      const { data: countRows } = await supabase.rpc("get_sit_application_counts", {
        p_sit_id: id!,
      });
      const counts = countRows?.[0];
      setAppCount(counts?.app_count || 0);
      setPendingAppCount(counts?.pending_app_count || 0);

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

  // Realtime : applications + sit. Le hook met à jour les compteurs et patche
  // localement les champs susceptibles de changer (statut, accepting_applications…).
  const handleSitPatch = useCallback((patch: Partial<SitData>) => {
    setSit((prev) => (prev ? ({ ...prev, ...patch } as SitData) : prev));
  }, []);
  const handleApplicationsCounts = useCallback(
    ({ appCount, pendingAppCount }: { appCount: number; pendingAppCount: number }) => {
      setAppCount(appCount);
      setPendingAppCount(pendingAppCount);
    },
    [],
  );
  useSitRealtime({
    sitId: sit?.id,
    onSitChange: handleSitPatch,
    onApplicationsChange: handleApplicationsCounts,
  });

  // Revalidation silencieuse de l'indexation SEO : si le visiteur est l'owner,
  // on mesure et persiste les dimensions des photos historiques manquantes
  // pour réactiver le filtre `isIndexable` sur la page publique.
  useEffect(() => {
    if (!user || !sit || user.id !== (sit as any).user_id) return;
    backfillOwnerGalleryDimensions(user.id);
  }, [user, sit]);



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
    <div className="px-3 pt-4 pb-44 md:p-10 md:pb-40 max-w-4xl mx-auto animate-fade-in">
      <Helmet>
        <title>{sit.title ? `${sit.title} · Mon annonce` : "Mon annonce"}</title>
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
          ownerGallery={ownerGallery}
          setOwnerGallery={setOwnerGallery}
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
        />
      )}
    </div>
  );
};

export default SitDetail;
