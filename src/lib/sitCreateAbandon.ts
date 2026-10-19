/**
 * Lot P2 (arène du 19/10/2026) : mesure de l'abandon à l'étape 0
 * « L'essentiel » de la création d'annonce.
 *
 * L'événement existant `sits_create_abandoned` porte, quand l'abandon a lieu
 * à l'étape 0, le nom du dernier champ touché et l'atteinte de
 * l'enregistrement du brouillon. Seul un nom de champ issu de la liste
 * fermée STEP0_FIELDS entre dans les métadonnées : la valeur saisie reste
 * dans le formulaire.
 */

/** Champs de l'étape 0, dans l'ordre d'affichage. */
export const STEP0_FIELDS = [
  "sit_location",
  "sit_city",
  "title",
  "start_date",
  "end_date",
  "description",
  "absence_reason",
  "sitter_expectations",
  "daily_routine",
  "owner_message",
] as const;

export type Step0Field = (typeof STEP0_FIELDS)[number];

/**
 * Identifiant DOM vers nom de champ. L'identifiant le plus proche de
 * l'élément touché l'emporte (les dates avant leur bloc, les deux questions
 * de description avant le bloc description).
 */
export const STEP0_FIELD_BY_DOM_ID: Record<string, Step0Field> = {
  "start-date": "start_date",
  "end-date": "end_date",
  "sit-location-field": "sit_location",
  "sit-city-field": "sit_city",
  "title-field": "title",
  "absence-reason-field": "absence_reason",
  "expectations-field": "sitter_expectations",
  "description-field": "description",
  "daily-routine-field": "daily_routine",
  "owner-message-field": "owner_message",
};

const FIELD_SET = new Set<string>(STEP0_FIELDS);

/** Nom de champ de la liste fermée, ou null. */
export function sanitizeStep0Field(value: unknown): Step0Field | null {
  return typeof value === "string" && FIELD_SET.has(value) ? (value as Step0Field) : null;
}

/** Remonte depuis l'élément touché jusqu'au premier identifiant connu. */
export function resolveStep0Field(target: unknown): Step0Field | null {
  let el = target as { id?: unknown; parentElement?: unknown } | null;
  let guard = 0;
  while (el && guard < 40) {
    const id = typeof el.id === "string" ? el.id : "";
    if (id && STEP0_FIELD_BY_DOM_ID[id]) return STEP0_FIELD_BY_DOM_ID[id];
    el = (el.parentElement ?? null) as typeof el;
    guard += 1;
  }
  return null;
}

export type AbandonExit = "route_change" | "page_close";

export interface AbandonInput {
  step: number;
  hasDraftParam: boolean;
  exit: AbandonExit;
  /** Formulaire réellement affiché (au moins une étape commencée). */
  formShown: boolean;
  lastField: unknown;
  draftSaved: boolean;
}

/**
 * Métadonnées de `sits_create_abandoned`. Les clés d'étape 0 n'apparaissent
 * qu'à l'étape 0. Aucune valeur saisie : seulement des booléens, l'étape,
 * le mode de sortie et un nom de champ de la liste fermée.
 */
export function buildAbandonMetadata(input: AbandonInput): Record<string, string | number | boolean | null> {
  const base: Record<string, string | number | boolean | null> = {
    step: input.step,
    has_draft: input.hasDraftParam,
    exit: input.exit,
  };
  if (input.step !== 0) return base;
  return {
    ...base,
    step0_form_shown: input.formShown,
    step0_last_field: sanitizeStep0Field(input.lastField),
    step0_draft_saved: input.draftSaved,
  };
}

/* ------------------------------------------------------------------ */
/* Lecture admin : abandons à l'étape 0 par dernier champ touché.      */
/* ------------------------------------------------------------------ */

export const STEP0_FIELD_LABELS: Record<Step0Field, string> = {
  sit_location: "Lieu de la garde (domicile ou autre)",
  sit_city: "Commune du logement",
  title: "Titre",
  start_date: "Date de début",
  end_date: "Date de fin",
  description: "Description (bouton d'aide)",
  absence_reason: "Raison de l'absence",
  sitter_expectations: "Attentes envers le gardien",
  daily_routine: "Journée type",
  owner_message: "Un mot de vous",
};

export type Step0Bucket = Step0Field | "none" | "setup_only" | "before_measure";

export const STEP0_BUCKET_LABELS: Record<Step0Bucket, string> = {
  ...STEP0_FIELD_LABELS,
  none: "Formulaire affiché, aucun champ touché",
  setup_only: "Écran de prérequis seul, formulaire jamais affiché",
  before_measure: "Relevé antérieur à la mesure du lot P2",
};

export interface Step0AbandonRow {
  bucket: Step0Bucket;
  label: string;
  count: number;
  draftSaved: number;
}

/** Agrège des métadonnées d'abandon (étape 0) par dernier champ touché. */
export function aggregateStep0Abandons(metadatas: Array<Record<string, unknown> | null | undefined>): Step0AbandonRow[] {
  const counts = new Map<Step0Bucket, { count: number; draftSaved: number }>();
  for (const m of metadatas) {
    if (!m || Number(m.step) !== 0) continue;
    let bucket: Step0Bucket;
    if (!("step0_last_field" in m)) bucket = "before_measure";
    else if (m.step0_form_shown === false) bucket = "setup_only";
    else bucket = sanitizeStep0Field(m.step0_last_field) ?? "none";
    const cur = counts.get(bucket) ?? { count: 0, draftSaved: 0 };
    cur.count += 1;
    if (m.step0_draft_saved === true) cur.draftSaved += 1;
    counts.set(bucket, cur);
  }
  return Array.from(counts.entries())
    .map(([bucket, v]) => ({ bucket, label: STEP0_BUCKET_LABELS[bucket], count: v.count, draftSaved: v.draftSaved }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
}
