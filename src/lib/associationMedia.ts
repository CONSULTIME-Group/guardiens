/**
 * Images publiques d'une association (lot SEO1, 19/10/2026).
 *
 * Photos et logo s'affichent seulement quand l'association a donné son accord
 * (photos_authorized, vrai quand animal_associations.consent_status vaut
 * « granted »). Sinon la page montre les initiales. Les images se chargent
 * avec la politique de référent par défaut du navigateur : le site d'origine
 * voit que la page Guardiens les affiche.
 */
import { normalizePhotos, type AssociationPhoto } from "@/components/associations/types";

export interface AssociationMediaInput {
  photos?: unknown;
  logo_url?: string | null;
  photos_authorized?: boolean | null;
}

export interface AssociationMedia {
  /** Photos affichables, vides tant que l'accord manque. */
  photos: AssociationPhoto[];
  /** Logo affichable, null tant que l'accord manque. */
  logoUrl: string | null;
}

export function associationMedia(a: AssociationMediaInput | null | undefined): AssociationMedia {
  if (!a || a.photos_authorized !== true) return { photos: [], logoUrl: null };
  return { photos: normalizePhotos(a.photos), logoUrl: a.logo_url || null };
}
