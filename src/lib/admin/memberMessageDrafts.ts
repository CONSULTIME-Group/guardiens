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

export type MemberDraftTopic = "alma_help" | "alma_churn" | "no_applications" | "dormant_sitter" | "account_welcome" | "owner_waiting" | "owner_started" | "candidate_started";

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
  /** Lot ANN-2 : candidatures qui attendent une réponse, et depuis combien de jours. */
  waitingCount?: number | null;
  waitingDays?: number | null;
  /** « le 1er novembre » : début d'une garde déjà commencée. */
  startedOn?: string | null;
  /** Prénom du propriétaire, pour écrire à un candidat. */
  ownerName?: string | null;
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

const waitingLine = (c: MemberDraftContext) => {
  const n = Math.max(1, Number(c.waitingCount) || 1);
  const who = n > 1 ? `${n} gardiens attendent` : "Un gardien attend";
  const since = c.waitingDays && c.waitingDays > 1 ? ` depuis ${c.waitingDays} jours` : "";
  return `${who} une réponse de votre part${since}`;
};
const ANSWER_HOW = "Depuis votre messagerie, ouvrez la candidature qui vous inspire confiance : vous échangez, vous posez vos questions, et vous acceptez quand vous êtes prêt. Un appel en visio ou une rencontre avant la garde reste possible si vous le souhaitez.";
const CLOSE_HOW = "Si vos plans ont changé, dépubliez votre annonce : chaque gardien est prévenu et se tourne vers une autre garde.";

const ownerWaiting = (c: MemberDraftContext): MemberDraft[] => {
  const starts = c.startsWhen ? ` Votre garde${inCity(c.city)} démarre ${c.startsWhen}.` : "";
  return [
    {
      subject: `Votre annonce${inCity(c.city)} : des gardiens attendent votre réponse`,
      body: join([
        hello(c.name),
        `${waitingLine(c)}.${starts} Je vous écris pour savoir où vous en êtes.`,
        ANSWER_HOW,
        CLOSE_HOW,
        READ_YOU,
        CLOSING,
      ]),
    },
    {
      subject: `Des candidatures pour votre annonce${inCity(c.city)}`,
      body: join([
        hello(c.name),
        `Bonne nouvelle : votre annonce${inCity(c.city)} a trouvé preneurs. ${waitingLine(c)}.${starts}`,
        "Les gardiens apprécient une réponse, même courte : un mot pour dire que vous réfléchissez suffit à les rassurer. Quand votre choix est fait, acceptez la candidature retenue depuis votre messagerie, les autres gardiens sont prévenus.",
        `${CLOSE_HOW} ${READ_YOU}`,
        CLOSING,
      ]),
    },
    {
      subject: "Un coup de main pour choisir votre gardien ?",
      body: join([
        hello(c.name),
        `Je suis Jérémie, l'un des deux fondateurs de Guardiens. ${waitingLine(c)} pour votre annonce${inCity(c.city)}.${starts}`,
        "Pour choisir sereinement, regardez leurs profils, leurs avis et leur présentation, puis échangez avec celles et ceux qui vous plaisent. Le score d'affinité vous aide à repérer les gardiens les plus proches de vos attentes.",
        `${CLOSE_HOW} ${READ_YOU}`,
        CLOSING,
      ]),
    },
  ];
};

const ownerStarted = (c: MemberDraftContext): MemberDraft[] => {
  const since = c.startedOn ? ` le ${c.startedOn}` : "";
  return [
    {
      subject: `Votre garde${inCity(c.city)} : où en êtes-vous ?`,
      body: join([
        hello(c.name),
        `Votre garde${inCity(c.city)} a commencé${since} et votre annonce est toujours en ligne. ${waitingLine(c)}.`,
        "Si un gardien est déjà chez vous, confirmez-le depuis votre messagerie : la garde apparaît alors dans votre tableau de bord et les autres candidats sont prévenus.",
        `${CLOSE_HOW} ${READ_YOU}`,
        CLOSING,
      ]),
    },
    {
      subject: "Un petit point sur votre annonce",
      body: join([
        hello(c.name),
        `Votre annonce${inCity(c.city)} est encore visible alors que la garde a démarré${since}. ${waitingLine(c)}, et je préfère vous l'écrire directement.`,
        "Deux gestes suffisent : accepter le gardien retenu, ou dépublier l'annonce si vous avez trouvé une autre solution. Dans les deux cas, chaque candidat reçoit une réponse.",
        `${READ_YOU}`,
        CLOSING,
      ]),
    },
    {
      subject: "Votre garde a commencé",
      body: join([
        hello(c.name),
        `J'espère que tout se passe bien depuis le début de votre garde${since}. ${waitingLine(c)} sur votre annonce${inCity(c.city)}.`,
        "Un mot de votre part les libère pour d'autres gardes : acceptez la personne retenue depuis votre messagerie, ou dépubliez l'annonce si vos plans ont changé.",
        READ_YOU,
        CLOSING,
      ]),
    },
  ];
};

const candidateStarted = (c: MemberDraftContext): MemberDraft[] => {
  const owner = c.ownerName?.trim() ? c.ownerName.trim() : "le propriétaire";
  const where = inCity(c.city);
  const when = c.startedOn ? `, qui devait commencer le ${c.startedOn}` : c.startsWhen ? ` (départ ${c.startsWhen})` : "";
  return [
    {
      subject: `Votre candidature${where}`,
      body: join([
        hello(c.name),
        `Vous avez proposé votre aide pour la garde${where}${when}. Merci pour cette belle candidature.`,
        `Nous avons relancé ${owner} de notre côté. La décision lui revient, et nous restons à vos côtés en attendant sa réponse.`,
        "D'autres gardes vous attendent sur Guardiens : jetez un œil aux annonces du moment, votre profil plaît aux propriétaires.",
        CLOSING,
      ]),
    },
    {
      subject: "Des nouvelles de votre candidature",
      body: join([
        hello(c.name),
        `Je suis Jérémie, l'un des deux fondateurs de Guardiens. Votre candidature pour la garde${where}${when} attend toujours la réponse de ${owner}.`,
        "Nous l'avons relancé de notre côté. Le choix lui appartient, et je préférais vous tenir informé plutôt que de vous laisser sans nouvelles.",
        "En attendant, de nouvelles annonces arrivent chaque semaine sur Guardiens.",
        CLOSING,
      ]),
    },
    {
      subject: "Merci pour votre patience",
      body: join([
        hello(c.name),
        `Merci pour votre candidature à la garde${where}${when}.`,
        `${cap1(owner)} prend le temps de répondre. Nous lui avons écrit pour l'y inviter, et la réponse lui revient entièrement.`,
        `Votre disponibilité est précieuse : d'autres propriétaires cherchent un gardien en ce moment. ${READ_YOU}`,
        CLOSING,
      ]),
    },
  ];
};
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const BUILDERS: Record<MemberDraftTopic, (c: MemberDraftContext) => MemberDraft[]> = {
  alma_help: almaHelp,
  alma_churn: almaChurn,
  no_applications: noApplications,
  dormant_sitter: dormantSitter,
  account_welcome: accountWelcome,
  owner_waiting: ownerWaiting,
  owner_started: ownerStarted,
  candidate_started: candidateStarted,
};

/** Les trois versions d'un sujet, la première proposée à l'ouverture. */
export function memberMessageDrafts(topic: MemberDraftTopic, ctx: MemberDraftContext): MemberDraft[] {
  return BUILDERS[topic](ctx);
}
