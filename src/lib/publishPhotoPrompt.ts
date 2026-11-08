/**
 * Recommandation de photos au moment de publier une annonce.
 *
 * Recommandation forte, jamais un blocage : le propriétaire peut toujours
 * publier en l'état. Mesure du 13/09/2026 : sur 125 logements, 66 n'ont aucune
 * photo, une obligation dure dépublierait la moitié des annonces en ligne.
 *
 * Les textes sont fixés au mot près, formulation affirmative, vouvoiement,
 * aucune promesse de résultat (aucune mesure ne permet de l'écrire).
 */

import { HOME_PHOTO_MIN_COUNT, type HomePhotoGap } from "../../supabase/functions/_shared/home-photo-insight.ts";

/** En dessous de trois photos, la confirmation s'affiche. */
export const PUBLISH_PHOTO_PROMPT_THRESHOLD = HOME_PHOTO_MIN_COUNT;

/**
 * Lot PHOTO1 (08/11/2026), texte de Jérémie : les gardiens se projettent dans
 * le logement, et le propriétaire reçoit des gardiens faits pour lui.
 */
export const PUBLISH_PHOTO_PROMPT_BODY =
  "Les gardiens ont besoin de voir où ils vivront pendant la garde : c'est ce qui leur permet de se projeter et de savoir si l'endroit leur convient. C'est aussi important pour vous que pour eux : vous recevez des gardiens faits pour votre environnement.";

export const PUBLISH_PHOTO_PROMPT_TIPS =
  "Trois photos suffisent : la maison vue de l'extérieur, la pièce de vie, la chambre du gardien. Prises en journée, nettes, pièces rangées.";

export const PUBLISH_PHOTO_PROMPT_ADD_LABEL = "Ajouter des photos";
export const PUBLISH_PHOTO_PROMPT_ANYWAY_LABEL = "Publier ainsi";

/** Chemin de l'étape photos du logement. */
export const PUBLISH_PHOTO_PROMPT_HREF = "/owner-profile?section=housing";

/** Adresses des photos du logement (properties.photos), chaînes non vides. */
export function propertyPhotoUrls(photos: unknown): string[] {
  if (!Array.isArray(photos)) return [];
  return photos.filter((p): p is string => typeof p === "string" && p.trim() !== "");
}

export function countPropertyPhotos(photos: unknown): number {
  return propertyPhotoUrls(photos).length;
}

export function shouldPromptPublishPhotos(photoCount: number): boolean {
  return photoCount < PUBLISH_PHOTO_PROMPT_THRESHOLD;
}

/** Titre de la confirmation : le nombre de photos, ou le logement à montrer. */
export function publishPhotoPromptTitle(photoCount: number, gap?: HomePhotoGap): string {
  if (gap === "no_home" && photoCount >= PUBLISH_PHOTO_PROMPT_THRESHOLD) return "Montrez où votre gardien va vivre";
  if (photoCount <= 0) return "Votre annonce part sans photo";
  if (photoCount === 1) return "Votre annonce part avec une seule photo";
  return "Votre annonce part avec deux photos";
}

/**
 * Photos du logement après un ajout depuis le formulaire : l'adresse rejoint
 * la fin de la liste, une seule fois (lot PUB2).
 */
export function withUploadedPhoto(photos: unknown, url: string): string[] {
  const list = Array.isArray(photos) ? photos.filter((p): p is string => typeof p === "string" && p.trim() !== "") : [];
  return [...list.filter((p) => p !== url), url];
}
