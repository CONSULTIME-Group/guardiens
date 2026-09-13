/**
 * Amorces contextuelles du composeur d'Alma, logique pure et testable.
 *
 * Un champ vide demande un effort, une amorce cliquable en demande aucun.
 * Le module vit à côté de `composerPlaceholder(surface)` et suit la même
 * doctrine : la surface courante et le dossier de la personne décident du
 * texte, et le texte est figé au mot près.
 *
 * `promptSurfaceFromPath` est volontairement distincte de `surfaceFromPath`
 * (scheduler de whispers) : elle couvre des écrans que le scheduler ne
 * distingue pas, comme la messagerie, les réglages ou le guide de la maison.
 */
import type { AlmaWhisperType } from "./whisper-types";

export const ALMA_PROMPT_SURFACES = [
  "dashboard",
  "my_sits",
  "listings",
  "public_sitter",
  "own_profile",
  "house_guide",
  "messages",
  "settings",
  "other",
] as const;

export type AlmaPromptSurface = (typeof ALMA_PROMPT_SURFACES)[number];

export interface PromptStarterContext {
  /** Un brouillon d'annonce est en cours. */
  hasDraftSit?: boolean;
  /** Une annonce est publiée et n'a reçu aucune candidature. */
  hasPublishedSitWithoutApplication?: boolean;
}

/** Surface d'amorces déduite du chemin courant. */
export function promptSurfaceFromPath(pathname: string): AlmaPromptSurface {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/house-guide")) return "house_guide";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/profile") || pathname.startsWith("/owner-profile")) {
    return "own_profile";
  }
  if (pathname.startsWith("/gardiens/")) return "public_sitter";
  if (pathname === "/sits" || pathname.startsWith("/sits/")) return "my_sits";
  if (pathname.startsWith("/annonces") || pathname.startsWith("/recherche")) {
    return "listings";
  }
  return "other";
}

/** Au maximum deux amorces, dérivées de la surface et du dossier. */
export function promptStarters(
  surface: AlmaPromptSurface,
  ctx: PromptStarterContext = {},
): string[] {
  switch (surface) {
    case "dashboard":
      return ["Par où je commence ?", "Qu'est-ce qui manque à mon profil ?"];
    case "my_sits":
      if (ctx.hasDraftSit) {
        return [
          "Relisez mon annonce",
          "Ce qui fait qu'une annonce reçoit des candidatures",
        ];
      }
      if (ctx.hasPublishedSitWithoutApplication) {
        return [
          "Pourquoi mon annonce reste sans candidature",
          "Comment la rendre plus attirante",
        ];
      }
      return ["Cette garde me correspond ?", "Comment bien me présenter à un propriétaire"];
    case "listings":
      return ["Cette garde me correspond ?", "Comment bien me présenter à un propriétaire"];
    case "public_sitter":
      return ["Ce gardien convient à mes animaux ?", "Quelles questions poser avant de dire oui"];
    case "own_profile":
      return [
        "Qu'est-ce qui manque à mon profil ?",
        "Ce qui rassure un propriétaire en un regard",
      ];
    case "house_guide":
      return ["Qu'est-ce que j'oublie dans mon guide ?"];
    case "messages":
      return ["Comment répondre à cette personne"];
    case "settings":
      return ["Comment fonctionne la vérification d'identité"];
    default:
      return ["Comment se passe une garde ?", "Qu'est-ce que je prépare avant de partir ?"];
  }
}

/**
 * Question liée au sujet du whisper affiché. Elle remplace la première
 * amorce pour que le message d'Alma ouvre une porte.
 */
export const WHISPER_STARTERS: Record<AlmaWhisperType, string> = {
  sitter_popular_sit_context: "Comment me démarquer sur cette annonce ?",
  sitter_reactive_owner_context: "Que dire à ce propriétaire en premier ?",
  owner_active_sitter_context: "Ce gardien convient à mes animaux ?",
  owner_reciprocal_interest: "Comment engager la conversation avec ce gardien ?",
  owner_view_trend_up: "Comment transformer ces visites en candidatures ?",
  owner_traffic_no_action: "Pourquoi mon annonce reste sans candidature",
  owner_conversation_stagnant: "Comment relancer cette conversation ?",
  long_absence_return: "Par où je reprends ?",
  cultural_fact: "Racontez m'en plus",
  usage_nudge: "Comment je m'y prends ?",
};

/** Amorces finales, whisper compris. Deux au maximum. */
export function resolvePromptStarters({
  surface,
  ctx,
  whisperType,
}: {
  surface: AlmaPromptSurface;
  ctx?: PromptStarterContext;
  whisperType?: AlmaWhisperType | null;
}): string[] {
  const base = promptStarters(surface, ctx);
  if (!whisperType) return base.slice(0, 2);
  const first = WHISPER_STARTERS[whisperType];
  if (!first) return base.slice(0, 2);
  return [first, ...base.filter((s) => s !== first)].slice(0, 2);
}

/** Phrase de présentation, affichée une seule fois par personne. */
export const ALMA_COMPOSER_INTRO =
  "Je lis votre dossier et je connais les guides du site. Posez moi votre question.";

export const ALMA_COMPOSER_INTRO_STORAGE_KEY = "alma_composer_intro_seen";

/** Vrai quand la phrase de présentation reste à montrer. */
export function shouldShowComposerIntro(stored: string | null): boolean {
  return stored !== "true";
}
