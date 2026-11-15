/**
 * Images publiques d'une association (lot SEO1 du 19/10/2026, règle rétablie
 * par le lot ASSO-1 du 15/11/2026, décision de Jérémie : retour au 10/09).
 *
 * Photos et logo s'affichent tant que l'association n'a pas refusé. Un refus
 * (consent_status « refused ») vide les deux dans la vue publique
 * public_animal_associations, côté base : ce module affiche ce que la vue sert.
 * photos_authorized (accord reçu, consent_status « granted ») ne gouverne plus
 * l'affichage : il sert au badge « Fiche validée », au crédit des photos et à
 * l'image de partage. Les images se chargent avec la politique de référent par
 * défaut du navigateur : le site d'origine voit que la page Guardiens les affiche.
 */
import { normalizePhotos, type AssociationPhoto } from "@/components/associations/types";

export interface AssociationMediaInput {
  photos?: unknown;
  logo_url?: string | null;
  photos_authorized?: boolean | null;
}

export interface AssociationMedia {
  /** Photos affichables, vides après un refus (la vue les vide). */
  photos: AssociationPhoto[];
  /** Logo affichable, null après un refus (la vue le vide) ou sans logo connu. */
  logoUrl: string | null;
}

export function associationMedia(a: AssociationMediaInput | null | undefined): AssociationMedia {
  if (!a) return { photos: [], logoUrl: null };
  return { photos: normalizePhotos(a.photos), logoUrl: a.logo_url || null };
}
