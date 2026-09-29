/**
 * Lot J2-A : préremplissage des formulaires de publication depuis l'adresse.
 * Paramètres `titre`, `description`, `categorie`. Nettoyage : balises et
 * caractères de contrôle retirés, espaces compactés, longueur plafonnée.
 * La personne relit et publie elle même.
 */
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";

export interface FormPrefillLimits {
  titleMax: number;
  descriptionMax: number;
  /** Valeurs admises pour `categorie`, absente si le formulaire n'en a pas. */
  categories?: readonly string[];
}

export interface FormPrefill {
  title: string;
  description: string;
  category: string | null;
}

function clean(raw: string | null, max: number, multiline: boolean): string {
  if (!raw) return "";
  let s = raw
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ")
    .replace(/[\u2014\u2013]/g, ",");
  s = multiline ? s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() : s.replace(/\s+/g, " ").trim();
  return s.slice(0, max).trim();
}

export function readFormPrefill(params: URLSearchParams, limits: FormPrefillLimits): FormPrefill {
  const title = sanitizeUserTitle(clean(params.get("titre"), limits.titleMax, false)).slice(0, limits.titleMax);
  const description = clean(params.get("description"), limits.descriptionMax, true);
  const cat = (params.get("categorie") || "").trim();
  const category = limits.categories && limits.categories.includes(cat) ? cat : null;
  return { title, description, category };
}
