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

const DRAFTS: Record<string, (c: OwnerDraftContext, when: string | null) => OwnerDraft> = {
  pending_application: (c, when) => {
    const n = c.applications ?? 0;
    const subject =
      n > 1 ? `${n} gardiens attendent votre réponse pour votre garde${inCity(c.city)}`
      : n === 1 ? `Un gardien attend votre réponse pour votre garde${inCity(c.city)}`
      : `Des gardiens attendent votre réponse pour votre garde${inCity(c.city)}`;
    const who = n > 1 ? `${n} gardiens ont postulé` : n === 1 ? "Un gardien a postulé" : "Des gardiens ont postulé";
    const wait = n === 1 ? "attend" : "attendent";
    const depart = when
      ? `Votre départ est prévu ${when} : un premier message de votre part permet d'avancer dès maintenant.`
      : "Un premier message de votre part permet d'avancer dès maintenant.";
    return {
      subject,
      body: [
        greeting(c.ownerName),
        `${who} pour votre garde${inCity(c.city)} et ${wait} votre réponse. ${depart}`,
        "Vous consultez chaque profil depuis votre messagerie. Quand l'un d'eux vous inspire confiance, écrivez-lui : vous réglez ensemble les derniers détails, et un échange en visio ou une rencontre avant la garde reste possible si vous le souhaitez (facultatif).",
        "Le lien ci-dessous ouvre votre annonce. Un point précis à éclaircir ? Répondez à ce message, je vous lis.",
        CLOSING,
      ].join("\n\n"),
    };
  },
  owner_sit_unconfirmed: (c, when) => ({
    subject: "Une dernière étape pour confirmer votre gardien",
    body: [
      greeting(c.ownerName),
      `${when ? `Votre départ est prévu ${when}` : "Votre départ approche"} et votre garde${inCity(c.city)} attend encore sa confirmation. Les gardiens qui se sont proposés comptent sur votre choix pour s'organiser, et vous partez l'esprit tranquille dès qu'il est fait.`,
      "Pour finaliser : choisissez le profil qui vous convient, confirmez-le depuis votre messagerie, puis transmettez-lui vos consignes (animaux, maison, habitudes du quotidien).",
      "Le lien ci-dessous ouvre votre annonce. Une question sur la marche à suivre ? Répondez simplement à ce message, je vous lis.",
      CLOSING,
    ].join("\n\n"),
  }),
  stalled_discussion: (c, when) => ({
    subject: "Votre échange avec un gardien attend une suite",
    body: [
      greeting(c.ownerName),
      `Votre échange avec un gardien pour votre garde${inCity(c.city)} attend une suite${when ? `, et votre départ est prévu ${when}` : ""}. Un message de votre part relance la conversation.`,
      "Quelques idées pour reprendre : confirmer votre intérêt, poser une dernière question, proposer un échange en visio ou un moment pour faire connaissance (facultatif, selon ce qui vous convient).",
      "Le lien ci-dessous ouvre votre annonce, d'où vous retrouvez la discussion. Besoin d'un coup de main ? Répondez à ce message, je vous lis.",
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
