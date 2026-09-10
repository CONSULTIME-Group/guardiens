/**
 * Humeurs d'Alma (lot 2), logique pure.
 *
 * Alma assume d'être une chienne : son registre vit dans les marges, la
 * ligne de statut du dock et sa phrase d'ouverture quand la personne ouvre
 * le dock elle-même. JAMAIS dans une réponse à une question : la
 * conversation ne lit rien de ce module.
 *
 * Les six humeurs se réduisent aux trois moods déjà acceptés par
 * <AlmaAvatarAnimated /> : aucun nouvel état visuel.
 */

export type AlmaMoodKey =
  | "petillante"
  | "pelotonnee"
  | "reveuse"
  | "chiffonnee"
  | "attentive"
  | "endormie";

export type AlmaMoodAvatar = "idle" | "attentive" | "sleepy";

export const ALMA_MOOD_KEYS: AlmaMoodKey[] = [
  "petillante",
  "pelotonnee",
  "reveuse",
  "chiffonnee",
  "attentive",
  "endormie",
];

export const MOOD_AVATAR: Record<AlmaMoodKey, AlmaMoodAvatar> = {
  petillante: "idle",
  pelotonnee: "idle",
  reveuse: "idle",
  chiffonnee: "idle",
  attentive: "attentive",
  endormie: "sleepy",
};

export const MOOD_STATUS_LABEL: Record<AlmaMoodKey, string> = {
  petillante: "pétillante",
  pelotonnee: "pelotonnée",
  reveuse: "rêveuse",
  chiffonnee: "chiffonnée",
  attentive: "attentive",
  endormie: "endormie",
};

export type AlmaSeason = "printemps" | "ete" | "automne" | "hiver";
export type AlmaTimeOfDay = "matin" | "apres_midi" | "soir" | "nuit";

/** Saison météorologique, suffisante pour un registre d'ambiance. */
export function seasonFromDate(date: Date = new Date()): AlmaSeason {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "printemps";
  if (m >= 6 && m <= 8) return "ete";
  if (m >= 9 && m <= 11) return "automne";
  return "hiver";
}

export function timeOfDayFromDate(date: Date = new Date()): AlmaTimeOfDay {
  const h = date.getHours();
  if (h >= 6 && h < 12) return "matin";
  if (h >= 12 && h < 18) return "apres_midi";
  if (h >= 18 && h < 22) return "soir";
  return "nuit";
}

export interface AlmaMoodContext {
  /** Mode silencieux. */
  silent: boolean;
  /** Une conversation est ouverte dans le dock. */
  conversationOpen: boolean;
  /** Une garde est en cours. */
  sitInProgress: boolean;
  /** Une garde commence sous peu. */
  sitImminent: boolean;
  /** Une candidature attend une réponse. */
  pendingApplication: boolean;
  timeOfDay: AlmaTimeOfDay;
}

export interface AlmaMoodPlan {
  /** Alma peut exprimer une humeur (ligne de statut, phrase d'ouverture). */
  express: boolean;
  /** Humeur imposée par le contexte, sinon tirage libre côté base. */
  forced: AlmaMoodKey | null;
  /** Avatar à utiliser tout de suite, avant même le tirage. */
  avatar: AlmaMoodAvatar;
}

/**
 * Décide si Alma s'exprime, et sous quelle humeur.
 * Elle se tait sur une garde en cours, sur une conversation ouverte et en
 * mode silencieux. Sur une garde imminente ou une candidature à traiter,
 * elle reste attentive, sans fantaisie.
 */
export function resolveMoodPlan(ctx: AlmaMoodContext): AlmaMoodPlan {
  if (ctx.silent) return { express: false, forced: "endormie", avatar: "sleepy" };
  if (ctx.sitInProgress) return { express: false, forced: "attentive", avatar: "attentive" };
  if (ctx.conversationOpen) return { express: false, forced: "attentive", avatar: "attentive" };
  if (ctx.sitImminent || ctx.pendingApplication) {
    return { express: true, forced: "attentive", avatar: "attentive" };
  }
  if (ctx.timeOfDay === "nuit") return { express: true, forced: "endormie", avatar: "sleepy" };
  return { express: true, forced: null, avatar: "idle" };
}

export interface AlmaMoodRow {
  id: string;
  mood: AlmaMoodKey;
  content: string;
}

/** Ligne de statut affichée sous le nom d'Alma dans le dock. */
export function moodStatusLine(mood: AlmaMoodKey | null, fallback: string): string {
  if (!mood) return fallback;
  return MOOD_STATUS_LABEL[mood];
}
