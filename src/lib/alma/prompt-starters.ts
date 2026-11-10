import { profileNudgeAllowed } from "@/lib/alma/profileNudge";
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
  /** Lot J2-A : le gardien reçoit la version gardien, le propriétaire la sienne. */
  activeRole?: "owner" | "sitter";
  /** Lot J3 : complétion du profil ; l'amorce profil seulement sous 40 %. */
  profileCompletion?: number | null;
}

/** « Comment se passe une garde ? », dans la version du rôle actif. */
export function howSitWorksStarter(role?: "owner" | "sitter"): string {
  if (role === "sitter") return "Comment se passe une garde, côté gardien ?";
  if (role === "owner") return "Comment se passe une garde, côté propriétaire ?";
  return "Comment se passe une garde ?";
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
      return profileNudgeAllowed(ctx.profileCompletion)
        ? ["Qu'est-ce qui manque à mon profil ?", "Un coup de main près de chez moi"]
        : ["Qu'est-ce qui se passe près de chez moi ?", "Un coup de main près de chez moi"];
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
      return ctx.activeRole === "sitter"
        ? [howSitWorksStarter("sitter"), "Un coup de main près de chez moi"]
        : [howSitWorksStarter(ctx.activeRole), "Qu'est-ce que je prépare avant de partir ?"];
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

/* ------------------------------------------------------------------------ */
/* Lot ALMA2b (10/11/2026, demande de Jérémie : « Alma ne peut pas écrire    */
/* tout le temps la même chose dans les réponses proposées ») : chaque        */
/* surface porte un vivier ; la première formulation de chaque vivier est     */
/* l'amorce historique (graine 0, aucune amorce récente = table d'origine).   */
/* ------------------------------------------------------------------------ */

export interface StarterPools {
  /** Première amorce, la plus liée à l'écran. */
  leads: string[];
  /** Seconde amorce. Vide : une seule amorce sur cette surface. */
  mores: string[];
}

export function starterPools(surface: AlmaPromptSurface, ctx: PromptStarterContext = {}): StarterPools {
  switch (surface) {
    case "dashboard":
      return profileNudgeAllowed(ctx.profileCompletion)
        ? {
            leads: ["Qu'est-ce qui manque à mon profil ?", "Quelle photo mettre sur mon profil ?", "Comment rendre mon profil rassurant ?"],
            mores: ["Un coup de main près de chez moi", "Comment marche l'entraide ?", "Qu'est-ce que je peux faire aujourd'hui ?"],
          }
        : {
            leads: ["Qu'est-ce qui se passe près de chez moi ?", "Qu'est-ce que je peux faire aujourd'hui ?", "Des gardes à venir près de chez moi ?"],
            mores: ["Un coup de main près de chez moi", "Comment marche l'entraide ?", "Qui propose son aide près de chez moi ?"],
          };
    case "my_sits":
      if (ctx.hasDraftSit) {
        return {
          leads: ["Relisez mon annonce", "Qu'est-ce qui manque à mon brouillon ?"],
          mores: ["Ce qui fait qu'une annonce reçoit des candidatures", "Quelles photos ajouter ?", "Comment présenter mes animaux ?"],
        };
      }
      if (ctx.hasPublishedSitWithoutApplication) {
        return {
          leads: ["Pourquoi mon annonce reste sans candidature", "Comment toucher plus de gardiens ?"],
          mores: ["Comment la rendre plus attirante", "Quelles photos ajouter ?", "Mes dates sont-elles bien choisies ?"],
        };
      }
      return listingPools();
    case "listings":
      return listingPools();
    case "public_sitter":
      return {
        leads: ["Ce gardien convient à mes animaux ?", "Que disent ses avis ?"],
        mores: ["Quelles questions poser avant de dire oui", "Comment proposer un appel avant la garde ?"],
      };
    case "own_profile":
      return {
        leads: ["Qu'est-ce qui manque à mon profil ?", "Ma présentation est-elle claire ?"],
        mores: ["Ce qui rassure un propriétaire en un regard", "Quelle photo choisir ?", "Quels savoir-faire ajouter ?"],
      };
    case "house_guide":
      return { leads: ["Qu'est-ce que j'oublie dans mon guide ?", "Comment décrire les habitudes de mes animaux ?", "Quoi noter pour les urgences ?"], mores: [] };
    case "messages":
      return { leads: ["Comment répondre à cette personne", "Comment proposer un appel ?", "Comment parler des dates ?"], mores: [] };
    case "settings":
      return { leads: ["Comment fonctionne la vérification d'identité", "Comment régler mes alertes ?"], mores: [] };
    default:
      return ctx.activeRole === "sitter"
        ? {
            leads: [howSitWorksStarter("sitter"), "Comment trouver une garde loin de chez moi ?", "Comment préparer ma première garde ?"],
            mores: ["Un coup de main près de chez moi", "Comment marche l'entraide ?"],
          }
        : {
            leads: [howSitWorksStarter(ctx.activeRole), "Comment choisir mon gardien ?", "Comment rencontrer un gardien avant de partir ?"],
            mores: ["Qu'est-ce que je prépare avant de partir ?", "Comment écrire mon guide de la maison ?"],
          };
  }
}

function listingPools(): StarterPools {
  return {
    leads: ["Cette garde me correspond ?", "Qu'est-ce qui compte pour ce propriétaire ?"],
    mores: ["Comment bien me présenter à un propriétaire", "Que dire dans ma candidature ?", "Quelles questions poser avant de candidater ?"],
  };
}

/** Variantes de l'amorce liée au whisper ; la première est l'amorce historique. */
export const WHISPER_STARTER_VARIANTS: Record<AlmaWhisperType, string[]> = {
  sitter_popular_sit_context: [WHISPER_STARTERS.sitter_popular_sit_context, "Qu'est-ce qui plaira à ce propriétaire ?"],
  sitter_reactive_owner_context: [WHISPER_STARTERS.sitter_reactive_owner_context, "Comment ouvrir la conversation ?"],
  owner_active_sitter_context: [WHISPER_STARTERS.owner_active_sitter_context, "Que regarder dans son profil ?"],
  owner_reciprocal_interest: [WHISPER_STARTERS.owner_reciprocal_interest, "Quoi lui écrire en premier ?"],
  owner_view_trend_up: [WHISPER_STARTERS.owner_view_trend_up, "Qu'est-ce qui attire ces visites ?"],
  owner_traffic_no_action: [WHISPER_STARTERS.owner_traffic_no_action, "Qu'est-ce que je change en premier ?"],
  owner_conversation_stagnant: [WHISPER_STARTERS.owner_conversation_stagnant, "Quoi écrire pour reprendre l'échange ?"],
  long_absence_return: [WHISPER_STARTERS.long_absence_return, "Qu'est-ce qui a changé ?"],
  cultural_fact: [WHISPER_STARTERS.cultural_fact, "Une autre !", "D'où ça vient ?"],
  usage_nudge: [WHISPER_STARTERS.usage_nudge, "Par quoi je commence ?", "Ça prend combien de temps ?"],
};

/** Première formulation du vivier tournée par la graine, hors amorces récentes. */
export function pickRotating(pool: string[], seed: number, recent: readonly string[], exclude: readonly string[] = []): string | null {
  const usable = pool.filter((s) => !exclude.includes(s));
  if (usable.length === 0) return null;
  const start = Math.abs(Math.trunc(seed)) % usable.length;
  const rotated = [...usable.slice(start), ...usable.slice(0, start)];
  return rotated.find((s) => !recent.includes(s)) ?? rotated[0];
}

/**
 * Amorces variées : graine (jour) et amorces montrées récemment. Sans graine
 * ni amorce récente, la table d'origine de resolvePromptStarters.
 */
export function resolveVariedStarters({
  surface,
  ctx,
  whisperType,
  seed = 0,
  recent = [],
}: {
  surface: AlmaPromptSurface;
  ctx?: PromptStarterContext;
  whisperType?: AlmaWhisperType | null;
  seed?: number;
  recent?: readonly string[];
}): string[] {
  const pools = starterPools(surface, ctx);
  const whisperPool = whisperType ? WHISPER_STARTER_VARIANTS[whisperType] : undefined;
  const first = whisperPool
    ? pickRotating(whisperPool, seed, recent)
    : pickRotating(pools.leads, seed, recent);
  const secondPool = whisperPool ? [...pools.leads, ...pools.mores] : pools.mores;
  const second = pickRotating(secondPool, seed, recent, first ? [first] : []);
  return [first, second].filter((s): s is string => !!s).slice(0, 2);
}

export const ALMA_STARTERS_RECENT_KEY = "alma_starters_recent";
const RECENT_MAX = 6;

/** Ajoute les amorces affichées en tête de la liste récente (6 au plus). */
export function rememberStarters(recent: readonly string[], shown: readonly string[]): string[] {
  return [...shown, ...recent.filter((s) => !shown.includes(s))].slice(0, RECENT_MAX);
}
