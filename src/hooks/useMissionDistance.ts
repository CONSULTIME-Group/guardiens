import { useCallback, useEffect, useMemo, useState } from "react";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import { supabase } from "@/integrations/supabase/client";

/**
 * Filtre proximité pour EntraideHub.
 * - Persistance code postal + rayon dans localStorage.
 * - Pré-remplit depuis `profiles.postal_code` si l'utilisateur est connecté.
 * - Géocode le CP origine et le CP (ou ville) de chaque mission via le
 *   cache mémoire de `geocodeCity`. Aucun round-trip inutile.
 */

const LS_POSTAL = "entraide.postal";
const LS_RADIUS = "entraide.radius";

export const RADIUS_OPTIONS = [15, 30, 50, 100] as const;
export type RadiusKm = (typeof RADIUS_OPTIONS)[number];
export const DEFAULT_RADIUS: RadiusKm = 30;

export interface MissionLike {
  id: string;
  postal_code: string | null;
  city: string | null;
}

const isValidFrPostal = (v: string) => /^\d{5}$/.test(v.trim());

const readLS = (key: string) => {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const writeLS = (key: string, value: string | null) => {
  try {
    if (typeof window === "undefined") return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
};

export function useMissionDistance(missions: MissionLike[]) {
  const [postal, setPostalState] = useState<string>(() => readLS(LS_POSTAL) || "");
  const [radius, setRadiusState] = useState<RadiusKm>(() => {
    const raw = readLS(LS_RADIUS);
    const n = raw ? Number(raw) : NaN;
    return (RADIUS_OPTIONS as readonly number[]).includes(n) ? (n as RadiusKm) : DEFAULT_RADIUS;
  });
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceMap, setDistanceMap] = useState<Map<string, number>>(new Map());
  const [resolving, setResolving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const setPostal = useCallback((v: string) => {
    const clean = v.trim();
    setPostalState(clean);
    writeLS(LS_POSTAL, clean || null);
  }, []);

  const setRadius = useCallback((v: RadiusKm) => {
    setRadiusState(v);
    writeLS(LS_RADIUS, String(v));
  }, []);

  /* Pré-remplissage depuis le profil connecté (une seule fois) */
  useEffect(() => {
    if (prefilled || postal) return;
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("postal_code")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (cancelled) return;
      const cp = (p?.postal_code || "").trim();
      if (isValidFrPostal(cp)) setPostal(cp);
      setPrefilled(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [prefilled, postal, setPostal]);

  /* Géocode du CP origine */
  useEffect(() => {
    let cancelled = false;
    if (!isValidFrPostal(postal)) {
      setOrigin(null);
      return;
    }
    setResolving(true);
    (async () => {
      const res = await geocodeCity(postal, "France");
      if (cancelled) return;
      setOrigin(res ? { lat: res.lat, lng: res.lng } : null);
      setResolving(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [postal]);

  /* Recalcul distances quand origine ou missions changent */
  useEffect(() => {
    let cancelled = false;
    if (!origin) {
      setDistanceMap(new Map());
      return;
    }
    (async () => {
      const results = await Promise.all(
        missions.map(async (m) => {
          const key = (m.postal_code && isValidFrPostal(m.postal_code) ? m.postal_code : m.city) || "";
          if (!key) return [m.id, Number.POSITIVE_INFINITY] as const;
          const g = await geocodeCity(key, "France");
          if (!g) return [m.id, Number.POSITIVE_INFINITY] as const;
          return [m.id, haversineDistance(origin.lat, origin.lng, g.lat, g.lng)] as const;
        }),
      );
      if (cancelled) return;
      setDistanceMap(new Map(results));
    })();
    return () => {
      cancelled = true;
    };
  }, [origin, missions]);

  /* Géoloc navigateur → reverse via edge geocode (fallback : on lit le CP) */
  const useMyLocation = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { data } = await supabase.functions.invoke("reverse-geocode", {
              body: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            });
            const cp = data?.postal_code;
            if (typeof cp === "string" && isValidFrPostal(cp)) {
              setPostal(cp);
              resolve(true);
              return;
            }
          } catch {
            /* noop */
          }
          // Fallback : pose l'origine directement, sans CP
          setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          resolve(true);
        },
        () => resolve(false),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
      );
    });
  }, [setPostal]);

  const active = Boolean(origin);

  const getDistance = useCallback(
    (id: string): number | null => {
      const d = distanceMap.get(id);
      return typeof d === "number" && isFinite(d) ? d : null;
    },
    [distanceMap],
  );

  return useMemo(
    () => ({
      postal,
      setPostal,
      radius,
      setRadius,
      origin,
      active,
      resolving,
      getDistance,
      useMyLocation,
      isValidPostal: isValidFrPostal(postal),
    }),
    [postal, setPostal, radius, setRadius, origin, active, resolving, getDistance, useMyLocation],
  );
}
