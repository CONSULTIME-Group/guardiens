import { useCallback, useState } from "react";

interface PostalCodeState {
  cities: string[];
  loading: boolean;
  error: string | null;
}

type CityCentreMap = Record<string, { latitude: number; longitude: number }>;

/**
 * Returns a handler that auto-fills city from a French postal code
 * using the geo.api.gouv.fr API.
 *
 * Importance : on récupère AUSSI `centre` (GeoJSON Point [lng, lat]) pour
 * propager latitude/longitude en même temps que la ville. Sans ça, le profil
 * n'a pas de coords GPS et le tri par distance ne fonctionne plus
 * (carrousel helpers, alertes, search radius).
 */
export function usePostalCodeCity(
  onChange: (partial: {
    city?: string;
    postal_code?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => void,
) {
  const [postalState, setPostalState] = useState<PostalCodeState>({
    cities: [],
    loading: false,
    error: null,
  });
  const [centreMap, setCentreMap] = useState<CityCentreMap>({});

  const handlePostalCodeChange = useCallback(
    async (value: string) => {
      onChange({ postal_code: value });
      setPostalState({ cities: [], loading: false, error: null });
      setCentreMap({});

      if (!/^\d{5}$/.test(value)) {
        if (value.length === 0) onChange({ city: "", latitude: null, longitude: null });
        return;
      }

      setPostalState({ cities: [], loading: true, error: null });

      try {
        const res = await fetch(
          `https://geo.api.gouv.fr/communes?codePostal=${value}&fields=nom,centre&limit=20`,
        );
        if (!res.ok) throw new Error("API error");

        const data: { nom: string; centre?: { coordinates: [number, number] } }[] =
          await res.json();

        if (!data || data.length === 0) {
          setPostalState({ cities: [], loading: false, error: "Code postal non reconnu" });
          return;
        }

        const map: CityCentreMap = {};
        data.forEach((d) => {
          if (d.centre?.coordinates) {
            const [lng, lat] = d.centre.coordinates;
            map[d.nom] = { latitude: lat, longitude: lng };
          }
        });
        setCentreMap(map);

        const names = data.map((d) => d.nom);

        if (names.length === 1) {
          const coords = map[names[0]];
          onChange({
            city: names[0],
            postal_code: value,
            latitude: coords?.latitude ?? null,
            longitude: coords?.longitude ?? null,
          });
          setPostalState({ cities: [], loading: false, error: null });
        } else {
          setPostalState({ cities: names, loading: false, error: null });
        }
      } catch {
        setPostalState({ cities: [], loading: false, error: "Erreur de recherche" });
      }
    },
    [onChange],
  );

  const selectCity = useCallback(
    (city: string) => {
      const coords = centreMap[city];
      onChange({
        city,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
      setPostalState((s) => ({ ...s, cities: [] }));
    },
    [onChange, centreMap],
  );

  return { handlePostalCodeChange, selectCity, ...postalState };
}
