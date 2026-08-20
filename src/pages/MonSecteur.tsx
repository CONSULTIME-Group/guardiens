/**
 * Page /mon-secteur
 *
 * Atterrissage dédié des relances "code postal manquant". Elle ne demande que
 * deux choses : le code postal (avec autocomplétion de commune) et le rayon de
 * déplacement. Rien d'autre à l'écran, un seul bouton d'enregistrement.
 *
 * Après enregistrement, on ne renvoie pas la personne vers son profil : on lui
 * montre immédiatement les gardes ouvertes dans son rayon, ou un message clair
 * s'il n'y en a aucune, avec la proposition de créer une alerte sur sa zone.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import PostalCodeCityFields from "@/components/profile/PostalCodeCityFields";
import { Slider } from "@/components/ui/slider";
import { declarableRadius, effectiveSearchRadius } from "@/lib/searchRadius";
import { snapToAllowedRadius } from "@/lib/alertRadius";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { haversineDistance } from "@/lib/geocode";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

interface NearbySit {
  id: string;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  distance_km: number;
}

const formatDate = (iso: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  } catch {
    return "";
  }
};

/** Géocodage commune via geo.api.gouv.fr, cohérent avec le reste du produit. */
const geocodeCommune = async (
  postalCode: string,
  city: string,
): Promise<{ lat: number; lng: number } | null> => {
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom,centre&limit=20`,
    );
    if (!res.ok) return null;
    const arr: { nom: string; centre?: { coordinates: [number, number] } }[] = await res.json();
    const match = arr.find((c) => c.nom.toLowerCase() === city.toLowerCase()) || arr[0];
    if (!match?.centre?.coordinates) return null;
    const [lng, lat] = match.centre.coordinates;
    return { lat, lng };
  } catch {
    return null;
  }
};

const MonSecteur = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [radius, setRadius] = useState(30);

  const [saved, setSaved] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<NearbySit[] | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [alertCreated, setAlertCreated] = useState(false);
  const [creatingAlert, setCreatingAlert] = useState(false);

  // Suivi d'abandon : la page a été ouverte, modifiée, mais jamais enregistrée.
  const touchedRef = useRef(false);
  const savedRef = useRef(false);

  useEffect(() => {
    void trackEvent("secteur_page_opened");
  }, []);

  useEffect(() => {
    return () => {
      if (touchedRef.current && !savedRef.current) {
        void trackEvent("secteur_abandoned");
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: sitter }] = await Promise.all([
        supabase.from("profiles").select("city, postal_code").eq("id", user.id).maybeSingle(),
        supabase
          .from("sitter_profiles")
          .select("geographic_radius")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setCity(profile?.city ?? "");
      setPostalCode(profile?.postal_code ?? "");
      // 30 est le marqueur de silence : on affiche le rayon réellement appliqué.
      setRadius(effectiveSearchRadius(sitter?.geographic_radius));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const searchNearby = useCallback(
    async (lat: number, lng: number, radiusKm: number) => {
      setSearching(true);
      setResultsError(null);
      try {
        const todayIso = new Date().toISOString().slice(0, 10);
        const { data: sits, error: sitsError } = await supabase
          .from("sits")
          .select("id, title, start_date, end_date, user_id")
          .eq("status", "published")
          .neq("user_id", user?.id ?? "")
          .gte("end_date", todayIso)
          .order("created_at", { ascending: false })
          .limit(500);
        if (sitsError) throw sitsError;

        const ownerIds = Array.from(new Set((sits ?? []).map((s) => s.user_id)));
        if (ownerIds.length === 0) {
          setResults([]);
          void trackEvent("secteur_sits_found", { metadata: { count: 0, radius_km: radiusKm } });
          return;
        }

        const { data: owners, error: ownersError } = await supabase
          .from("public_profiles")
          .select("id, latitude_approx, longitude_approx")
          .in("id", ownerIds);
        if (ownersError) throw ownersError;

        const ownerById = new Map((owners ?? []).map((o: any) => [o.id, o]));
        const found: NearbySit[] = [];
        for (const s of sits ?? []) {
          const owner = ownerById.get(s.user_id);
          if (!owner?.latitude_approx || !owner?.longitude_approx) continue;
          const distance = haversineDistance(lat, lng, owner.latitude_approx, owner.longitude_approx);
          if (distance <= radiusKm) {
            found.push({
              id: s.id,
              title: s.title,
              start_date: s.start_date,
              end_date: s.end_date,
              distance_km: Math.round(distance),
            });
          }
        }
        found.sort((a, b) => a.distance_km - b.distance_km);
        setResults(found);
        void trackEvent("secteur_sits_found", {
          metadata: { count: found.length, radius_km: radiusKm, postal_code: postalCode },
        });
      } catch {
        setResults(null);
        setResultsError("Impossible de charger les gardes ouvertes pour le moment.");
      } finally {
        setSearching(false);
      }
    },
    [postalCode, user?.id],
  );

  const handleSave = async () => {
    if (!user) return;
    if (!/^\d{5}$/.test(postalCode)) {
      toast.error("Veuillez saisir un code postal à cinq chiffres.");
      return;
    }
    if (!city.trim()) {
      toast.error("Veuillez choisir votre commune.");
      return;
    }
    setSaving(true);
    try {
      const coords = await geocodeCommune(postalCode, city);
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          city: city.trim(),
          postal_code: postalCode,
          country: "FR",
          ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: sitterError } = await supabase
        .from("sitter_profiles")
        .upsert({ user_id: user.id, geographic_radius: declarableRadius(radius) /* 30 = silence, jamais réécrit */ }, { onConflict: "user_id" });
      if (sitterError) throw sitterError;

      savedRef.current = true;
      setSaved(true);
      void trackEvent("secteur_saved", {
        metadata: { postal_code: postalCode, city: city.trim(), radius_km: radius },
      });
      toast.success("Votre secteur est enregistré.");

      if (coords) {
        void searchNearby(coords.lat, coords.lng, radius);
      } else {
        setResults([]);
      }
    } catch {
      toast.error("L'enregistrement a échoué. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAlert = async () => {
    setCreatingAlert(true);
    const { error } = await supabase.rpc("create_alert_preference", {
      p_label: city.trim() || postalCode,
      p_zone_type: "rayon",
      p_city: city.trim(),
      p_postal_code: postalCode,
      p_radius_km: snapToAllowedRadius(radius),
      p_departement: null,
      p_region_code: null,
      p_alert_types: ["gardes", "missions"],
      p_heure_envoi: "08:00",
      p_frequence: "quotidien",
    });
    setCreatingAlert(false);
    if (error) {
      if (error.message?.includes("Maximum 3 zones")) {
        toast.error("Vous avez déjà trois zones d'alerte actives.");
      } else {
        toast.error("La création de l'alerte a échoué. Veuillez réessayer.");
      }
      return;
    }
    setAlertCreated(true);
    toast.success("Votre alerte est active sur cette zone.");
  };

  return (
    <>
      <PageMeta
        title="Mon secteur"
        description="Indiquez votre code postal et votre rayon de déplacement pour être prévenu des gardes qui s'ouvrent près de chez vous."
        noindex
      />
      <div className="max-w-xl mx-auto px-4 pt-6 pb-16 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Mon secteur</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sans secteur renseigné, nous ne pouvons pas vous prévenir quand une garde s'ouvre près
            de chez vous, et les propriétaires du coin ne vous voient pas dans leurs recherches.
          </p>
        </header>

        {loading ? (
          <div className="space-y-4">
            <div className="h-12 rounded-lg bg-muted animate-pulse" />
            <div className="h-12 rounded-lg bg-muted animate-pulse" />
            <div className="h-12 w-40 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : (
          <Card className="p-5 space-y-6">
            <PostalCodeCityFields
              city={city}
              postalCode={postalCode}
              showAbroadToggle={false}
              onChange={(partial) => {
                touchedRef.current = true;
                if (partial.city !== undefined) setCity(partial.city);
                if (partial.postal_code !== undefined) setPostalCode(partial.postal_code);
              }}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="secteur-radius">Rayon de déplacement</Label>
                <span className="text-sm font-semibold text-primary">{radius} km</span>
              </div>
              <Slider
                id="secteur-radius"
                value={[radius]}
                onValueChange={(v) => {
                  touchedRef.current = true;
                  setRadius(v[0]);
                }}
                min={5}
                max={200}
                step={5}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full h-12">
              {saving ? "Enregistrement en cours" : "Enregistrer mon secteur"}
            </Button>
          </Card>
        )}

        {saved && (
          <section className="space-y-4" aria-live="polite">
            <h2 className="text-lg font-semibold text-foreground">
              Les gardes ouvertes dans votre rayon
            </h2>

            {searching && <p className="text-sm text-muted-foreground">Recherche en cours.</p>}

            {!searching && resultsError && (
              <p className="text-sm text-destructive">{resultsError}</p>
            )}

            {!searching && !resultsError && results && results.length > 0 && (
              <ul className="space-y-3">
                {results.slice(0, 10).map((sit) => (
                  <li key={sit.id}>
                    <Link
                      to={`/annonces/${sit.id}`}
                      className="block rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium text-foreground">{sit.title || "Garde à pourvoir"}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(sit.start_date)} au {formatDate(sit.end_date)}, à environ{" "}
                        {sit.distance_km} km
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {!searching && !resultsError && results && results.length === 0 && (
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Aucune garde n'est ouverte dans votre rayon pour l'instant. Cela bouge vite : créez
                  une alerte sur votre zone, nous vous prévenons dès qu'une garde s'ouvre, sans
                  engagement.
                </p>
                {alertCreated ? (
                  <p className="text-sm font-medium text-primary">
                    Votre alerte est active sur cette zone.
                  </p>
                ) : (
                  <Button variant="outline" onClick={handleCreateAlert} disabled={creatingAlert}>
                    {creatingAlert ? "Création en cours" : "Créer une alerte sur ma zone"}
                  </Button>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
};

export default MonSecteur;
