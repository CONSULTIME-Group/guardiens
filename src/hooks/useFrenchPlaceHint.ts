import { useEffect, useState } from "react";
import {
  departmentPrefix,
  isFrenchPostalShape,
  matchFrenchPlace,
  placeKey,
  type FrenchCommune,
  type FrenchPlaceMatch,
} from "@/lib/frenchPlaceHint";

const API = "https://geo.api.gouv.fr/communes";

async function communes(params: Record<string, string>, signal: AbortSignal): Promise<FrenchCommune[]> {
  const res = await fetch(`${API}?${new URLSearchParams({ ...params, fields: "nom,codesPostaux" })}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as FrenchCommune[];
  return Array.isArray(data) ? data : [];
}

/**
 * Lot PAYS1 : en mode « hors de France », dit si la ville et le code postal
 * saisis désignent une commune française. Lecture après 400 ms de pause,
 * la précédente annulée ; en échec, rien n'est proposé.
 */
export function useFrenchPlaceHint(active: boolean, city: string, postalCode: string): FrenchPlaceMatch | null {
  const [match, setMatch] = useState<FrenchPlaceMatch | null>(null);
  const code = postalCode.trim();
  const key = placeKey(city);
  useEffect(() => {
    setMatch(null);
    if (!active || key.length < 2 || !isFrenchPostalShape(code)) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const byPostal = await communes({ codePostal: code }, ctrl.signal);
        let found = matchFrenchPlace(city, code, byPostal);
        const dep = departmentPrefix(code);
        if (!found && dep) found = matchFrenchPlace(city, code, [], await communes({ nom: city.trim(), codeDepartement: dep }, ctrl.signal));
        if (!ctrl.signal.aborted) setMatch(found);
      } catch {
        /* lecture en échec : rien n'est proposé */
      }
    }, 400);
    return () => { clearTimeout(timer); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key, code]);
  return match;
}
