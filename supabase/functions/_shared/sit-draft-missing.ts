// Même validation que le formulaire. Les animaux et la vérification d'identité
// restent facultatifs. Une lecture manquante est une erreur, jamais « complet ».
import { getSitPublishBlockers, getBlockingBlockers } from "./sit-publish-rules.ts";
export { MIN_SUB_DESCRIPTION } from "./sit-publish-rules.ts";

export interface DraftFieldsInput {
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  city?: string | null;
  absence_reason?: string | null;
  sitter_expectations?: string | null;
  cover_photo_url?: string | null;
  hasPhoto?: boolean;
  hasProperty?: boolean;
  hasPets?: boolean;
}
export interface MissingDraftItem {
  id: string;
  label: string;
  inProfile?: boolean;
}
export function missingDraftItems(input: DraftFieldsInput, today?: string): MissingDraftItem[] {
  const blockers = getBlockingBlockers(getSitPublishBlockers({
    descriptionMode: "two-fields",
    title: input.title,
    startDate: input.start_date,
    endDate: input.end_date,
    locationCity: input.city,
    absenceReason: input.absence_reason,
    sitterExpectations: input.sitter_expectations,
    hasProperty: input.hasProperty,
    propertyPhotoCount: input.hasPhoto ? 1 : 0,
    hasCoverPhoto: Boolean(input.cover_photo_url?.trim()),
    petCount: input.hasPets ? 1 : 0,
  }, { today }));
  // Le logement est résolu sur place dans le formulaire avant la publication.
  if (input.hasProperty === false) blockers.unshift({ id: "property", label: "Votre logement" });
  const labels: Record<string, string> = {
    title: "Le titre de votre annonce",
    dates: "Les dates de début et de fin",
    "desc-reason": "La raison de votre besoin de garde (15 caractères minimum)",
    "desc-expectations": "Ce que vous attendez du gardien (15 caractères minimum)",
    photo: "Une photo de votre logement ou de votre galerie",
    city: "La commune de votre logement",
  };
  return blockers.map(b => ({ id: b.id, label: labels[b.id] ?? b.label }));
}

export async function loadMissingDraftItems(supabase: any, draft: Record<string, any>): Promise<MissingDraftItem[]> {
  const [propertyResult, galleryResult, profileResult] = await Promise.all([
    supabase.from("properties").select("id, photos, cover_photo_url").eq("user_id", draft.user_id).maybeSingle(),
    supabase.from("owner_gallery").select("id", { count: "exact", head: true }).eq("user_id", draft.user_id),
    supabase.from("profiles").select("city").eq("id", draft.user_id).maybeSingle(),
  ]);
  for (const result of [propertyResult, galleryResult, profileResult]) {
    if (result.error) throw new Error(`draft_context_unavailable: ${result.error.message}`);
  }
  const property = propertyResult.data;
  const photos = Array.isArray(property?.photos) ? property.photos : [];
  return missingDraftItems({
    ...draft,
    city: draft.city?.trim() || profileResult.data?.city,
    hasProperty: Boolean(property?.id),
    hasPhoto: photos.length > 0 || Boolean(property?.cover_photo_url) || (galleryResult.count ?? 0) > 0,
  });
}

/** Un seul bouton, qui reprend le brouillon sans navigation vers le profil. */
export function draftReminderUrl(sitId: string, missing: MissingDraftItem[]): string {
  const url = new URL("https://guardiens.fr/sits/create");
  url.searchParams.set("resume", sitId);
  if (missing[0]) url.searchParams.set("focus", missing[0].id);
  return url.toString();
}
