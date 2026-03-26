import { useCallback } from "react";

/**
 * Returns a handler that auto-fills city from a French postal code
 * using the geo.api.gouv.fr API.
 */
export function usePostalCodeCity(onChange: (partial: { city?: string; postal_code?: string }) => void) {
  const handlePostalCodeChange = useCallback(async (value: string) => {
    onChange({ postal_code: value });

    // French postal codes are 5 digits
    if (/^\d{5}$/.test(value)) {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${value}&fields=nom&limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data?.[0]?.nom) {
            onChange({ city: data[0].nom, postal_code: value });
          }
        }
      } catch {
        // silently ignore
      }
    }
  }, [onChange]);

  return { handlePostalCodeChange };
}
