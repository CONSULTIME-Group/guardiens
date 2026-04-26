/**
 * Détecte si la valeur texte du champ `medication` indique une médication réelle.
 * Le champ étant en texte libre (placeholder "Aucune, ou détaillez..."),
 * de nombreux utilisateurs y inscrivent "Aucune", "non", "rien", etc.
 * Cette fonction normalise et retourne false dans ce cas.
 */
import { normalize } from "@/lib/normalize";

export const hasMedication = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const v = normalize(value);
  if (v.length === 0) return false;
  const negativePatterns = [
    "aucun",
    "aucune",
    "non",
    "rien",
    "pas de",
    "pas besoin",
    "sans",
    "n/a",
    "na",
    "nope",
    "0",
    "néant",
    "neant",
    "ras",
    "-",
  ];
  return !negativePatterns.includes(v);
};
