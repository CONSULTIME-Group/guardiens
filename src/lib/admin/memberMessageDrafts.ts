/**
 * Lot VE-2 (15/11/2026) : messages prêts pour les lignes « Écrire à… » de la
 * vue d'ensemble. Module pur : trois versions par sujet, bâties sur ce que le
 * signal sait (prénom, phrase du membre, sujet du blocage, annonce), toutes
 * modifiables avant l'envoi.
 *
 * Le même texte part par la messagerie Guardiens ou par l'email signé
 * (admin-personal-message) : salutation et formule de fin sont dans le corps.
 * Règles de contenu : ton chaleureux, phrases affirmatives, aucune promesse de
 * chercher un gardien, ponctuation sans tiret cadratin ni demi-cadratin.
 */
export interface MemberDraft {
  subject: string;
  body: string;
}

export type MemberDraftTopic = "alma_help" | "alma_churn" | "no_applications" | "dormant_sitter" | "account_welcome";

export interface MemberDraftContext {
  /** Prénom du destinataire ; vide quand il est inconnu. */
  name?: string | null;
  /** Phrase écrite par le membre à Alma. */
  quote?: string | null;
  /** Sujet du blocage repéré par Alma (« bouton suppression annonce »). */
  subjectHint?: string | null;
  city?: string | null;
  /** « dans 8 jours », « demain » ; null sans date de départ. */
  startsWhen?: string | null;
  /** Gardiens à proximité de l'annonce. */
  sittersNearby?: number | null;
  daysPublished?: number | null;
  /** Jours depuis la dernière candidature d'un gardien. */
  daysQuiet?: number | null;
}

const hello = (name?: string | null) => (name?.trim() ? `Bonjour ${name.trim()},` : "Bonjour,");
const CLOSING = "Belle journée à vous,";
const READ_YOU = "Une réponse à ce message me suffit, je vous lis.";
const clean = (s: string) => s.replace(/[\u2014\u2013]/g, ",").replace(/\s+/g, " ").trim();
const quoted = (q?: string | null) => (q?.trim() ? `« ${clean(q).slice(0, 200)} »` : "");
const about = (hint?: string | null) => (hint?.trim() ? ` à propos de « ${clean(hint)} »` : "");
const inCity = (city?: string | null) => (city?.trim() ? ` à ${city.trim()}` : "");
const join = (parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join("\n\n");

const almaHelp = (c: MemberDraftContext): MemberDraft[] => {
  const q = quoted(c.quote);
  return [
    {
      subject: "Je prends le relais d'Alma",
      body: join([
        hello(c.name),
        `J'ai lu votre échange avec Alma${about(c.subjectHint)}${q ? `, et votre message ${q} m'est bien parvenu` : ""}. Alma s'est trompée de chemin, je vous présente mes excuses pour ce moment agaçant.`,
        "Je prends le relais. Dites-moi en une phrase ce que vous cherchiez à faire, je m'en occupe avec vous.",
        READ_YOU,
        CLOSING,
      ]),
    },
    {
      subject: "Votre message à Alma m'est parvenu",
      body: join([
        hello(c.name),
        `Merci d'avoir insisté auprès d'Alma${about(c.subjectHint)}. ${q ? `Votre message ${q} est arrivé jusqu'à moi` : "Votre message est arrivé jusqu'à moi"}, et vous aviez raison : la réponse reçue était à côté.`,
        "Racontez-moi où vous en êtes, avec vos mots. Je regarde votre compte et je vous réponds personnellement.",
        CLOSING,
      ]),
    },
    {
      subject: "On règle ça ensemble",
      body: join([
        hello(c.name),
        `Je suis Jérémie, l'un des deux fondateurs de Guardiens. Alma m'a signalé votre échange${about(c.subjectHint)} et je préfère vous écrire directement.`,
        "Expliquez-moi ce que vous souhaitiez faire : je le fais avec vous, ou pour vous si vous préférez. Votre retour nous sert aussi à améliorer l'écran concerné pour tous les membres.",
        READ_YOU,
        CLOSING,
      ]),
    },
  ];
};

const almaChurn = (c: MemberDraftContext): MemberDraft[] => {
  const q = quoted(c.quote);
  return [
    {
      subject: "Votre avis compte pour nous",
      body: join([
        hello(c.name),
        `Alma m'a transmis votre message${q ? ` ${q}` : ""}. Merci de l'avoir écrit franchement.`,
        "J'aimerais comprendre ce qui vous a manqué sur Guardiens : votre retour nous aide à améliorer le site pour toute la communauté. Deux lignes en réponse me suffisent, je vous lis.",
        "Et si votre décision est prise, je m'occupe de votre demande avec le même soin.",
        CLOSING,
      ]),
    },
    {
      subject: "Un mot avant votre départ",
      body: join([
        hello(c.name),
        `Je suis Jérémie, l'un des deux fondateurs de Guardiens. J'ai lu votre message à Alma${q ? ` (${q})` : ""} et je tenais à vous répondre moi-même.`,
        "Dites-moi ce qui a coincé : une annonce restée sans suite, un écran confus, autre chose ? Chaque retour de ce genre devient une amélioration du site.",
        "Votre choix reste le vôtre, et je le respecte entièrement.",
        CLOSING,
      ]),
    },
    {
      subject: "Merci pour votre franchise",
      body: join([
        hello(c.name),
        `Votre message à Alma est arrivé jusqu'à moi${q ? ` : ${q}` : ""}. Je le prends au sérieux.`,
        "Guardiens grandit grâce aux membres qui nous disent ce qui leur convient moins. Si vous avez une minute, racontez-moi votre expérience : je vous lis et je vous réponds personnellement.",
        CLOSING,
      ]),
    },
  ];
};

const noApplications = (c: MemberDraftContext): MemberDraft[] => {
  const since = c.daysPublished && c.daysPublished > 1 ? `depuis ${c.daysPublished} jours` : "depuis peu";
  const nearby = c.sittersNearby && c.sittersNearby > 0
    ? ` ${c.sittersNearby > 1 ? `${c.sittersNearby} gardiens vivent` : "Un gardien vit"} à proximité.`
    : "";
  const starts = c.startsWhen ? ` Votre départ approche (${c.startsWhen}).` : "";
  const LINK = "Le lien ci-dessous ouvre votre annonce.";
  return [
    {
      subject: `Votre annonce${inCity(c.city)} : trois gestes qui aident`,
      body: join([
        hello(c.name),
        `Votre annonce${inCity(c.city)} est en ligne ${since} et attend sa première candidature.${nearby}${starts}`,
        "Trois gestes aident une annonce à trouver son gardien : des photos lumineuses de la maison et des pièces de vie, un mot sur le quotidien de vos animaux, et des dates précises.",
        `${LINK} Si vous souhaitez un regard sur votre texte, une réponse à ce message me suffit, je vous lis.`,
        CLOSING,
      ]),
    },
    {
      subject: `Un coup d'œil sur votre annonce${inCity(c.city)}`,
      body: join([
        hello(c.name),
        `Je suis Jérémie, l'un des deux fondateurs de Guardiens. Je suis passé voir votre annonce${inCity(c.city)}, en ligne ${since}.${nearby}`,
        "Les gardiens se décident quand ils se projettent : ils aiment voir où ils vivront (salon, chambre, jardin) et savoir à quoi ressemble une journée avec vos animaux. Quelques photos et deux lignes de plus changent souvent tout.",
        `${LINK} ${READ_YOU}`,
        CLOSING,
      ]),
    },
    {
      subject: `Votre annonce${inCity(c.city)} est bien visible`,
      body: join([
        hello(c.name),
        `Votre annonce${inCity(c.city)} est en ligne ${since} et visible par tous les gardiens.${nearby}${starts}`,
        "Pour donner envie de candidater, mettez en avant ce qui rend le séjour agréable : le cadre, les balades, le caractère de vos animaux. Un titre qui cite le lieu et les animaux attire aussi davantage de lectures.",
        `${LINK} Je reste à votre écoute, une réponse à ce message me suffit.`,
        CLOSING,
      ]),
    },
  ];
};

const dormantSitter = (c: MemberDraftContext): MemberDraft[] => {
  const quiet = c.daysQuiet && c.daysQuiet > 30 ? `Votre dernière candidature date d'il y a ${c.daysQuiet} jours` : "Votre dernière candidature date d'il y a quelque temps";
  const LINK = "Le lien ci-dessous ouvre les annonces du moment.";
  return [
    {
      subject: "De nouvelles gardes vous attendent",
      body: join([
        hello(c.name),
        `Je suis Jérémie, l'un des deux fondateurs de Guardiens. Les propriétaires ont beaucoup apprécié vos gardes, et je voulais vous le dire. ${quiet}, alors je prends de vos nouvelles.`,
        "De nouvelles annonces sont arrivées ces dernières semaines, en France et au-delà. Votre profil compte parmi ceux que les propriétaires aiment recevoir.",
        `${LINK} ${READ_YOU}`,
        CLOSING,
      ]),
    },
    {
      subject: "Un petit mot de Guardiens",
      body: join([
        hello(c.name),
        `${quiet}. Tout va bien de votre côté ?`,
        "Si vos disponibilités ont changé, mettez simplement à jour votre profil : les propriétaires voient ainsi quand vous êtes libre. Et si une région vous fait envie, dites-la-moi, je vous signale volontiers les annonces qui y paraissent.",
        `${LINK} ${READ_YOU}`,
        CLOSING,
      ]),
    },
    {
      subject: "Merci pour vos gardes",
      body: join([
        hello(c.name),
        "Vos gardes ont laissé d'excellents souvenirs aux propriétaires, merci pour le soin que vous y mettez.",
        `${quiet}. Si quelque chose vous a freiné sur le site, racontez-le-moi : votre retour nous aide à l'améliorer pour tous les gardiens.`,
        `${LINK} Je vous lis avec plaisir.`,
        CLOSING,
      ]),
    },
  ];
};

const accountWelcome = (c: MemberDraftContext): MemberDraft[] => [
  {
    subject: "Bienvenue sur Guardiens",
    body: join([
      hello(c.name),
      "Je suis Jérémie, l'un des deux fondateurs de Guardiens. Bienvenue parmi nous, et merci pour votre première candidature.",
      "Un profil complet met les propriétaires en confiance : une photo, quelques lignes sur vous et votre expérience avec les animaux, et la vérification d'identité. Ces trois éléments font souvent la différence.",
      READ_YOU,
      CLOSING,
    ]),
  },
  {
    subject: "Ravi de vous compter parmi nous",
    body: join([
      hello(c.name),
      "Bienvenue sur Guardiens. J'ai vu votre inscription et votre candidature, vous démarrez sur les chapeaux de roue.",
      "Pour mieux vous connaître, dites-moi en deux lignes ce qui vous amène : vos animaux préférés, les régions qui vous attirent, vos expériences de garde. Je vous lis avec plaisir.",
      CLOSING,
    ]),
  },
  {
    subject: "Un mot de bienvenue",
    body: join([
      hello(c.name),
      "Merci d'avoir rejoint Guardiens. Je suis Jérémie, je réponds personnellement aux nouveaux membres.",
      "Complétez votre profil quand vous avez un moment (photo, présentation, vérification d'identité) : les propriétaires répondent plus volontiers aux gardiens qu'ils peuvent découvrir. Une question sur le site ? Répondez simplement à ce message.",
      CLOSING,
    ]),
  },
];

const BUILDERS: Record<MemberDraftTopic, (c: MemberDraftContext) => MemberDraft[]> = {
  alma_help: almaHelp,
  alma_churn: almaChurn,
  no_applications: noApplications,
  dormant_sitter: dormantSitter,
  account_welcome: accountWelcome,
};

/** Les trois versions d'un sujet, la première proposée à l'ouverture. */
export function memberMessageDrafts(topic: MemberDraftTopic, ctx: MemberDraftContext): MemberDraft[] {
  return BUILDERS[topic](ctx);
}
