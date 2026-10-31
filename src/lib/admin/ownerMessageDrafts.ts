/**
 * Lot ADM11 : « Écrire au propriétaire » s'ouvre avec un objet et un texte
 * prêts, choisis selon le sujet de l'annonce (même priorité que le verbe
 * d'action de la carte). Module pur : tout reste modifiable avant l'envoi.
 *
 * L'email part signé « Jérémie, Guardiens » par admin-personal-message, le
 * texte est donc écrit à la première personne, avec la salutation et la
 * formule de fin que le gabarit serveur attend dans le corps.
 * Règles de contenu : aucune promesse de chercher un gardien, rencontre
 * facultative, ponctuation sans tiret cadratin ni demi-cadratin.
 */
import {
  daysUntilStart,
  SIT_ACTION_PRIORITY,
} from "../../../supabase/functions/_shared/admin-signal-config.ts";

export interface OwnerDraftContext {
  /** Prénom du propriétaire, ou « le propriétaire » quand il est inconnu. */
  ownerName: string;
  city?: string | null;
  startDate?: string | null;
  /** Nombre de candidatures sans réponse de l'annonce. */
  applications?: number;
  now?: number;
}

export interface OwnerDraft {
  subject: string;
  body: string;
}

const FALLBACK_NAME = "le propriétaire";

/** « aujourd'hui », « demain », « dans 4 jours » ; null sans date lisible. */
export function departureWhen(startDate: string | null | undefined, now: number = Date.now()): string | null {
  const d = daysUntilStart(startDate, now);
  if (d === null || d < 0) return null;
  if (d === 0) return "aujourd'hui";
  if (d === 1) return "demain";
  return `dans ${d} jours`;
}

const greeting = (name: string) => (name && name !== FALLBACK_NAME ? `Bonjour ${name},` : "Bonjour,");
const CLOSING = "Belle journée à vous,";

const inCity = (city?: string | null) => (city?.trim() ? ` à ${city.trim()}` : "");

/** Type principal d'un groupe de signaux, selon SIT_ACTION_PRIORITY. */
export function mainSitType(types: string[]): string | null {
  return SIT_ACTION_PRIORITY.find((t) => types.includes(t)) ?? null;
}

/**
 * Les trois textes posent la même question au propriétaire : où en est votre
 * garde ? Il cherche toujours (il répond aux gardiens) ou son projet a changé
 * (il dépublie en déclinant les candidatures : « Décliner ces candidatures et
 * dépublier » prévient chaque gardien par message et par email, OwnerSitView).
 */
const OPEN_ISSUE =
  "Si votre projet a changé ou si vous avez trouvé une solution de votre côté, dépubliez votre annonce en déclinant les candidatures : chaque gardien est prévenu par message et par email et peut se tourner vers une autre garde.";
const REPLY_LINE = "Le lien ci-dessous ouvre votre annonce. Une réponse à ce message me suffit pour vous aider, je vous lis.";

const startsLine = (c: OwnerDraftContext, when: string | null) =>
  when ? `Votre garde${inCity(c.city)} démarre ${when}` : `Votre garde${inCity(c.city)} attend une suite`;

const DRAFTS: Record<string, (c: OwnerDraftContext, when: string | null) => OwnerDraft> = {
  pending_application: (c, when) => {
    const n = c.applications ?? 0;
    const counted = n > 1 ? `${n} gardiens attendent` : n === 1 ? "1 gardien attend" : "des gardiens attendent";
    const waiting = n > 1 ? `${n} gardiens attendent` : n === 1 ? "un gardien attend" : "des gardiens attendent";
    return {
      subject: `Votre garde${inCity(c.city)} : ${counted} une réponse`,
      body: [
        greeting(c.ownerName),
        `${startsLine(c, when)}${when ? " et " : " : "}${waiting} une réponse de votre part. Je vous écris pour savoir où vous en êtes.`,
        "Si vous cherchez toujours un gardien, écrivez à celui ou celle qui vous inspire confiance depuis votre messagerie : vous réglez ensemble les derniers détails, et un échange en visio ou une rencontre avant la garde reste possible si vous le souhaitez (facultatif).",
        OPEN_ISSUE,
        REPLY_LINE,
        CLOSING,
      ].join("\n\n"),
    };
  },
  owner_sit_unconfirmed: (c, when) => ({
    subject: `Où en est votre garde${inCity(c.city)} ?`,
    body: [
      greeting(c.ownerName),
      `${startsLine(c, when)} et le gardien reste à confirmer. Je vous écris pour savoir où vous en êtes.`,
      "Si vous cherchez toujours un gardien, choisissez le profil qui vous convient et confirmez-le depuis votre messagerie, puis transmettez-lui vos consignes (animaux, maison, habitudes du quotidien). Vous partez l'esprit tranquille dès que c'est fait.",
      OPEN_ISSUE,
      REPLY_LINE,
      CLOSING,
    ].join("\n\n"),
  }),
  stalled_discussion: (c, when) => ({
    subject: `Votre échange avec un gardien${inCity(c.city)} : une suite ?`,
    body: [
      greeting(c.ownerName),
      `${when ? `${startsLine(c, when)} et votre échange avec un gardien est en pause` : `Votre échange avec un gardien pour votre garde${inCity(c.city)} est en pause`}. Je vous écris pour savoir où vous en êtes.`,
      "Si vous cherchez toujours un gardien, un message de votre part relance la conversation : confirmer votre intérêt, poser une dernière question, proposer un échange en visio ou un moment pour faire connaissance (facultatif, selon ce qui vous convient).",
      OPEN_ISSUE,
      REPLY_LINE,
      CLOSING,
    ].join("\n\n"),
  }),
};

/** Objet et texte prêts pour le groupe de signaux d'une annonce ; null si aucun gabarit. */
export function ownerMessageDraft(types: string[], ctx: OwnerDraftContext): OwnerDraft | null {
  const main = mainSitType(types);
  const build = main ? DRAFTS[main] : undefined;
  if (!build) return null;
  return build(ctx, departureWhen(ctx.startDate, ctx.now));
}
