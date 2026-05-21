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
}: Params) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [profileRes, spRes, eligRes, reviewsRes, myProfileRes] = await Promise.all([
        supabase.from("profiles").select("city, postal_code").eq("id", userId).single(),
        supabase.from("sitter_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("applications").select("id, sit:sits!inner(status)").eq("sitter_id", userId).eq("status", "accepted"),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", userId).eq("published", true),
        supabase.from("profiles").select("identity_verified").eq("id", userId).single(),
      ]);
      if (cancelled) return;
      const uc = profileRes.data?.city || "";
      setUserCity(uc);
      setUserPostalCode(profileRes.data?.postal_code || null);
      setSitterProfile(spRes.data);
      if (uc) {
        setCity(uc);
        setCityInput(uc);
        const coords = await geocodeCity(uc);
        if (!cancelled && coords) setUserCoords(coords);
      }
      const completedSits = (eligRes.data || []).filter((a: any) => a.sit?.status === "completed").length;
      setUserCompletedSits(completedSits);
      const reviews = reviewsRes.data || [];
      const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
      const verified = myProfileRes.data?.identity_verified || false;
      setSitterEligible(completedSits >= 3 && avgRating >= 4.7 && verified);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
