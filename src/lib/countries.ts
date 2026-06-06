/**
 * Liste normalisée de pays utilisée pour les profils internationaux.
 *
 * - `code` : ISO 3166-1 alpha-2 (stocké en base, ex: "MA")
 * - `name` : libellé français affiché à l'utilisateur
 *
 * On stocke le code ISO en base (`profiles.country`) plutôt qu'un nom libre
 * pour éviter les doublons ("Maroc" / "MAROC" / "Morocco") et permettre des
 * filtres fiables côté SQL/edge functions.
 *
 * Liste volontairement courte et orientée francophonie + Europe + Maghreb +
 * destinations historiques de nos premiers utilisateurs. Étendre si besoin.
 */
export interface Country {
  code: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  // Europe — UE & proches
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "CH", name: "Suisse" },
  { code: "LU", name: "Luxembourg" },
  { code: "MC", name: "Monaco" },
  { code: "AD", name: "Andorre" },
  { code: "DE", name: "Allemagne" },
  { code: "ES", name: "Espagne" },
  { code: "IT", name: "Italie" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Pays-Bas" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "IE", name: "Irlande" },
  { code: "AT", name: "Autriche" },
  { code: "DK", name: "Danemark" },
  { code: "SE", name: "Suède" },
  { code: "NO", name: "Norvège" },
  { code: "FI", name: "Finlande" },
  { code: "PL", name: "Pologne" },
  { code: "CZ", name: "République tchèque" },
  { code: "GR", name: "Grèce" },
  // Amériques
  { code: "CA", name: "Canada" },
  { code: "US", name: "États-Unis" },
  { code: "MX", name: "Mexique" },
  { code: "BR", name: "Brésil" },
  { code: "AR", name: "Argentine" },
  // Maghreb & Afrique francophone
  { code: "MA", name: "Maroc" },
  { code: "TN", name: "Tunisie" },
  { code: "DZ", name: "Algérie" },
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  // Océanie
  { code: "AU", name: "Australie" },
  { code: "NZ", name: "Nouvelle-Zélande" },
  // Asie
  { code: "JP", name: "Japon" },
  { code: "TH", name: "Thaïlande" },
  { code: "VN", name: "Viêt Nam" },
  { code: "AE", name: "Émirats arabes unis" },
];

const BY_CODE: Map<string, Country> = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountryName(code: string | null | undefined): string {
  if (!code) return "";
  return BY_CODE.get(code.toUpperCase())?.name ?? code;
}

export function isValidCountryCode(code: string | null | undefined): boolean {
  return !!code && BY_CODE.has(code.toUpperCase());
}
