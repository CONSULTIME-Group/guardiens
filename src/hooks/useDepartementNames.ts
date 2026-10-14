import { DEPT_NAMES } from "@/lib/departments";
import { OVERSEAS_NAMES } from "@/lib/homeListingPlace";

/**
 * Table de correspondance code de département vers nom lisible, DOM-TOM et
 * collectivités d'outre-mer inclus (« Polynésie française », jamais
 * « Outre-mer »).
 *
 * Lot perf 2 (14/10/2026) : table locale, aucune lecture. La lecture de la
 * table departements partait à l'affichage de la première carte de
 * /annonces et occupait le réseau au moment des photos.
 */
const NAMES: Map<string, string> = new Map([...Object.entries(DEPT_NAMES), ...Object.entries(OVERSEAS_NAMES)]);

export const useDepartementNames = (): Map<string, string> => NAMES;
