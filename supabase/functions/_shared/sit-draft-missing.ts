// Champs manquants d'un brouillon d'annonce, nommés mot pour mot comme dans
// le formulaire de création, pour que la personne les retrouve à l'écran.
//
// Règle : on ne liste que ce qui empêche réellement la publication. Les champs
// facultatifs (une journée type, un mot de vous) ne sont jamais réclamés.

export const MIN_SUB_DESCRIPTION = 30;

export interface DraftFieldsInput {
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  absence_reason?: string | null;
  sitter_expectations?: string | null;
  cover_photo_url?: string | null;
  /** Au moins une photo côté logement ou galerie. */
  hasPhoto?: boolean;
  /** Un logement décrit sur le profil. */
  hasProperty?: boolean;
  /** Au moins un animal déclaré sur le logement. */
  hasPets?: boolean;
}

export interface MissingDraftItem {
  id: string;
  label: string;
  /** Le champ vit dans le profil, pas dans le formulaire d'annonce. */
  inProfile?: boolean;
}

const len = (v?: string | null) => (typeof v === "string" ? v.trim().length : 0);

export function missingDraftItems(input: DraftFieldsInput): MissingDraftItem[] {
  const items: MissingDraftItem[] = [];

  if (input.hasProperty === false) {
    items.push({
      id: "property",
      label: "Votre logement, à décrire sur votre profil propriétaire",
      inProfile: true,
    });
  }
  if (!len(input.title)) {
    items.push({ id: "title", label: "Titre de l'annonce" });
  }
  if (!len(input.start_date) || !len(input.end_date)) {
    items.push({ id: "dates", label: "Date de début et date de fin de la garde" });
  }
  if (len(input.absence_reason) < MIN_SUB_DESCRIPTION) {
    items.push({
      id: "desc-reason",
      label: "Pourquoi avez-vous besoin d'un gardien pour cette période ?",
    });
  }
  if (len(input.sitter_expectations) < MIN_SUB_DESCRIPTION) {
    items.push({
      id: "desc-expectations",
      label: "Qu'attendez-vous du gardien pendant votre absence ?",
    });
  }
  if (input.hasPhoto === false && !len(input.cover_photo_url)) {
    items.push({
      id: "photo",
      label: "Au moins une photo de votre logement ou de votre galerie",
    });
  }
  if (input.hasPets === false) {
    items.push({
      id: "pets",
      label: "Au moins un animal déclaré sur votre logement",
      inProfile: true,
    });
  }

  return items;
}

/**
 * Charge le contexte hors annonce (logement, photos, animaux) puis renvoie la
 * liste nommée de ce qui manque. Ne doit jamais faire échouer un envoi : en cas
 * d'erreur de lecture, les prérequis de profil sont considérés satisfaits.
 */
export async function loadMissingDraftItems(
  supabase: any,
  draft: Record<string, any>,
): Promise<MissingDraftItem[]> {
  let hasProperty = true;
  let hasPhoto = true;
  let hasPets = true;
  try {
    const { data: property } = await supabase
      .from("properties")
      .select("id, photos, cover_photo_url")
      .eq("user_id", draft.user_id)
      .maybeSingle();
    hasProperty = Boolean(property?.id);
    if (property?.id) {
      const photos = Array.isArray(property.photos) ? property.photos : [];
      hasPhoto = photos.length > 0 || Boolean(property.cover_photo_url) || Boolean(draft.cover_photo_url);
      const { count } = await supabase
        .from("pets")
        .select("id", { count: "exact", head: true })
        .eq("property_id", property.id);
      hasPets = (count ?? 0) > 0;
    } else {
      hasPhoto = Boolean(draft.cover_photo_url);
      hasPets = true;
    }
  } catch (_e) {
    hasProperty = true;
    hasPhoto = true;
    hasPets = true;
  }

  return missingDraftItems({
    title: draft.title,
    start_date: draft.start_date,
    end_date: draft.end_date,
    absence_reason: draft.absence_reason,
    sitter_expectations: draft.sitter_expectations,
    cover_photo_url: draft.cover_photo_url,
    hasProperty,
    hasPhoto,
    hasPets,
  });
}
