import { fetchMyProfile, fetchMySitterProfile } from "@/lib/myProfile";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCity } from "@/lib/geocode";

interface Params {
  userId: string | undefined;
  setUserCity: (v: string) => void;
  setUserPostalCode: (v: string | null) => void;
  setSitterProfile: (v: any) => void;
  setUserCoords: (v: { lat: number; lng: number } | null) => void;
  setUserCompletedSits: (n: number) => void;
  setSitterEligible: (b: boolean) => void;
  setCity: (v: string) => void;
  setCityInput: (v: string) => void;
  /**
   * Garde anti écrasement : la promesse de chargement du profil se résout
   * souvent après que l'utilisateur a commencé à saisir un lieu. On ne
   * pré-remplit la ville que si le champ n'a pas encore été touché.
   */
  canPrefillCity?: () => boolean;
}


/** Point du profil (latitude, longitude), null s'il manque ou vaut 0, 0. */
export function profilePoint(p: { latitude?: unknown; longitude?: unknown } | null | undefined): { lat: number; lng: number } | null {
  const lat = typeof p?.latitude === "number" ? p.latitude : Number(p?.latitude);
  const lng = typeof p?.longitude === "number" ? p.longitude : Number(p?.longitude);
  if (p?.latitude == null || p?.longitude == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/**
 * Charge le profil utilisateur + sitter_profile pour pré-remplir
 * la ville, les coordonnées et calculer l'éligibilité sitter.
 */
export function useSearchUserProfile({
  userId,
  setUserCity,
  setUserPostalCode,
  setSitterProfile,
  setUserCoords,
  setUserCompletedSits,
  setSitterEligible,
  setCity,
  setCityInput,
  canPrefillCity,
}: Params) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      // Lot perf 5 : la ville et le point du membre partent dès la lecture de
      // son profil, sans attendre les lectures d'éligibilité, et le point vient
      // des coordonnées du profil (centre de sa commune, tenues par
      // trg_profiles_geocode) ; le géocodage ne sert qu'à défaut.
      const profileP = fetchMyProfile(userId!);
      const restP = Promise.all([
        fetchMySitterProfile(userId!),
        supabase.from("applications").select("id, sit:sits!inner(status)").eq("sitter_id", userId).eq("status", "accepted"),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", userId).eq("published", true),
      ]);
      const profileRes = await profileP;
      if (cancelled) return;
      const uc = profileRes.data?.city || "";
      setUserCity(uc);
      setUserPostalCode(profileRes.data?.postal_code || null);
      if (uc) {
        const mayPrefill = canPrefillCity ? canPrefillCity() : true;
        if (mayPrefill) {
          setCity(uc);
          setCityInput(uc);
        }
        const own = profilePoint(profileRes.data);
        const coords = own ?? (await geocodeCity(uc));
        if (!cancelled && coords) setUserCoords(coords);
      }

      const [spRes, eligRes, reviewsRes] = await restP;
      if (cancelled) return;
      setSitterProfile(spRes.data);
      const completedSits = (eligRes.data || []).filter((a: any) => a.sit?.status === "completed").length;
      setUserCompletedSits(completedSits);
      const reviews = reviewsRes.data || [];
      const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
      const verified = profileRes.data?.identity_verified || false;
      setSitterEligible(completedSits >= 3 && avgRating >= 4.7 && verified);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
