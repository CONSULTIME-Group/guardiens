/**
 * Lot SRC4 (16/11/2026) : réponse déclarée à « Comment avez-vous connu Guardiens ? ».
 *
 * Complète la source mesurée du lot SRC1 (UTM, référent) : la réponse du membre
 * capte ce que la mesure perd (partage privé, bouche à oreille, nom tapé après
 * une vidéo, réponse d'un assistant IA). Question facultative, une seule réponse,
 * posée à l'étape d'accueil après l'inscription.
 *
 * Les valeurs sont figées : la base les contrôle (contrainte CHECK de
 * public.profile_declared_sources, migration 0176). Toute modification de cette
 * liste passe par une migration.
 */

export const DECLARED_SOURCE_VALUES = [
  "tiktok",
  "instagram",
  "facebook",
  "groupe_facebook",
  "youtube",
  "linkedin",
  "google",
  "assistant_ia",
  "bouche_a_oreille",
  "association",
  "presse",
  "autre",
] as const;

export type DeclaredSource = (typeof DECLARED_SOURCE_VALUES)[number];

export const DECLARED_SOURCE_LABELS: Record<DeclaredSource, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Page Facebook",
  groupe_facebook: "Groupe Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  google: "Recherche Google",
  assistant_ia: "Un assistant IA (ChatGPT, Gemini…)",
  bouche_a_oreille: "Un proche ou un voisin",
  association: "Une association",
  presse: "Article ou média",
  autre: "Autre",
};

export const DECLARED_SOURCE_CONTEXTS = ["accueil", "annonce"] as const;
export type DeclaredSourceContext = (typeof DECLARED_SOURCE_CONTEXTS)[number];

export function isDeclaredSource(value: unknown): value is DeclaredSource {
  return typeof value === "string" && (DECLARED_SOURCE_VALUES as readonly string[]).includes(value);
}

export function declaredSourceLabel(value: string | null | undefined): string {
  if (!value) return "Sans réponse";
  return isDeclaredSource(value) ? DECLARED_SOURCE_LABELS[value] : value;
}

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * Enregistre la réponse une seule fois (la base ignore une seconde réponse).
 * Ne lève jamais : une mesure n'empêche pas un membre d'avancer.
 */
export async function recordDeclaredSource(
  client: RpcClient,
  answer: DeclaredSource | null,
  context: DeclaredSourceContext,
): Promise<boolean> {
  if (!answer || !isDeclaredSource(answer)) return false;
  try {
    const { data, error } = await client.rpc("record_declared_source", { p_answer: answer, p_context: context });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

export type DeclaredSourceRow = {
  answer: string;
  members: number;
  with_published_sit: number;
};

export function normalizeDeclaredSourceRows(rows: unknown): DeclaredSourceRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r: any) => ({
      answer: String(r?.answer ?? "sans_reponse"),
      members: Number(r?.members ?? 0) || 0,
      with_published_sit: Number(r?.with_published_sit ?? 0) || 0,
    }))
    .sort((a, b) => b.members - a.members);
}
