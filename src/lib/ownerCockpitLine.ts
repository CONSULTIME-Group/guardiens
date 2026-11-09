/**
 * Lot D3 (09/11/2026) : ligne de l'accueil propriétaire sur ordinateur.
 *
 * La situation du propriétaire (garde en cours, prochaine garde,
 * candidatures, annonce en ligne, brouillon) passe toujours en premier.
 * Viennent ensuite le compte exact des gardiens à proximité, puis la ligne
 * « depuis votre dernière visite », puis la phrase d'accueil.
 * Pourquoi : avant le lot D3, la phrase de situation ne s'affichait que si
 * aucun gardien n'était à proximité, soit pour 3 propriétaires sur 66.
 */
export interface OwnerCockpitLineInput {
  situation: string | null;
  nearby: string | null;
  digest: string | null;
  fallback: string;
}

export function pickOwnerCockpitLine({ situation, nearby, digest, fallback }: OwnerCockpitLineInput): string {
  return situation || nearby || digest || fallback;
}
