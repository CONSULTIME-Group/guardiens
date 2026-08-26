/**
 * Texte de remplacement des photos de galerie gardien.
 *
 * La légende étant facultative, l'attribut alt ne peut plus s'y appuyer seul :
 * une légende vide ferait disparaître la photo pour un lecteur d'écran. On
 * compose donc, dans l'ordre, à partir de ce que porte la ligne : type
 * d'animal, race, ville. Sans rien, on replie sur le prénom du gardien.
 *
 * Cette fonction est la seule source du alt de galerie, pas une suite de
 * doubles barres recopiée dans chaque composant.
 */

export interface GalleryPhotoAltInput {
  caption?: string | null;
  animal_type?: string | null;
  animal_breed?: string | null;
  city?: string | null;
}

const ANIMAL_TYPE_LABELS: Record<string, string> = {
  chien: "Chien",
  chat: "Chat",
  cheval: "Cheval",
  nac: "NAC",
  autre: "Animal",
};

const clean = (v?: string | null) => (typeof v === "string" ? v.trim() : "");

export function galleryPhotoAlt(photo: GalleryPhotoAltInput | null | undefined, firstName?: string | null): string {
  const caption = clean(photo?.caption);
  if (caption) return caption;

  const parts: string[] = [];
  const type = clean(photo?.animal_type);
  if (type) parts.push(ANIMAL_TYPE_LABELS[type.toLowerCase()] || type);
  const breed = clean(photo?.animal_breed);
  if (breed) parts.push(breed);
  const city = clean(photo?.city);
  if (city) parts.push(`à ${city}`);

  if (parts.length > 0) return parts.join(", ");

  const name = clean(firstName);
  return name ? `Photo de la galerie de ${name}` : "Photo de la galerie du gardien";
}
