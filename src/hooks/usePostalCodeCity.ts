import { useCallback, useState } from "react";

interface PostalCodeState {
  cities: string[];
  loading: boolean;
  error: string | null;
}

/**
 * Returns a handler that auto-fills city from a French postal code
 * using the geo.api.gouv.fr API.
 * If multiple cities match, exposes them so the UI can show a select.
 */
export function usePostalCodeCity(
  onChange: (partial: { city?: string; postal_code?: string }) => void,
) {
  const [postalState, setPostalState] = useState<PostalCodeState>({
    cities: [],
    loading: false,
    error: null,
  });

  const handlePostalCodeChange = useCallback(
    async (value: string) => {
      onChange({ postal_code: value });
      setPostalState({ cities: [], loading: false, error: null });

      // French postal codes are 5 digits
      if (!/^\d{5}$/.test(value)) return;

      setPostalState({ cities: [], loading: true, error: null });

      try {
        const res = await fetch(
          `https://geo.api.gouv.fr/communes?codePostal=${value}&fields=nom&limit=20`,
        );
        if (!res.ok) throw new Error("API error");

        const data: { nom: string }[] = await res.json();

        if (!data || data.length === 0) {
          setPostalState({ cities: [], loading: false, error: "Code postal non reconnu" });
          return;
        }

        const names = data.map((d) => d.nom);

        if (names.length === 1) {
          // Single match → auto-fill
          onChange({ city: names[0], postal_code: value });
          setPostalState({ cities: [], loading: false, error: null });
        } else {
          // Multiple matches → let user choose
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
      onChange({ city });
      setPostalState((s) => ({ ...s, cities: [] }));
    },
    [onChange],
  );

  return { handlePostalCodeChange, selectCity, ...postalState };
}
