/**
 * Lot L1 : Alma sur une fiche d'annonce (surface sit_detail).
 *
 * Module pur, partagé par alma-chat et les tests.
 *  - détecte une question adressée au propriétaire de l'annonce consultée
 *    (deuxième personne portant sur le logement, la commune, les animaux, les
 *    dates, les horaires, les consignes) ;
 *  - compose la réponse : d'abord ce que la fiche contient réellement, puis
 *    l'orientation vers la candidature (le formulaire comporte un message libre,
 *    transmis au propriétaire dans la conversation de la candidature) ;
 *  - calcule l'action principale : postuler sur CETTE annonce, ouvrir la
 *    conversation de sa candidature, ou passer en espace gardien.
 */
import { foldText } from "./alma-site-knowledge.ts";

export const OWNER_QUESTION_SENTENCE =
  "Cette question s'adresse au propriétaire. Pour la lui poser, envoyez votre candidature avec votre message : c'est lui qui vous répondra.";
export const OWNER_QUESTION_SENTENCE_APPLIED =
  "Cette question s'adresse au propriétaire. Vous avez déjà postulé : posez-la-lui dans la conversation de votre candidature, c'est lui qui vous répondra.";
export const OWNER_QUESTION_SENTENCE_OWNER_SPACE =
  "Cette question s'adresse au propriétaire. Pour la lui poser, passez en espace gardien puis envoyez votre candidature avec votre message : c'est lui qui vous répondra.";

const TOPICS =
  "(village|ville|commune|coin|quartier|region|adresse|localisation|maison|logement|appartement|jardin|terrain|piscine|chambre|lit|chien|chiens|chienne|chat|chats|chatte|animal|animaux|bete|betes|cheval|chevaux|poules?|lapins?|dates?|horaires?|consignes?|habitudes?|absence|depart|retour|voyage|vacances|annonce|garde|voiture|wifi|internet|acces|cles?)";

const SECOND_PERSON_TOPIC = new RegExp(`\\b(votre|vos)\\s+(\\w+\\s+){0,2}${TOPICS}\\b`);
const ASK_PRECISE = /\b(pouvez|pourriez)[- ]vous\s+(me\s+|nous\s+)?(preciser|dire|indiquer|donner|confirmer|envoyer)\b/;
const HOUSE_HAS = /\b(la maison|le logement|l'appartement|le jardin|le chien|le chat|la propriete)\s+(a|est|dispose|possede)[- ]t[- ](elle|il)\b/;
const HAVE_YOU = /\b(avez|aurez|etes|serez|partez|rentrez|habitez|vivez)[- ]vous\b/;
const HAVE_YOU_TOPIC = new RegExp(`\\b(avez|aurez)[- ]vous\\s+(un|une|des|d'|deja)\\s*(\\w+\\s+){0,2}${TOPICS}?`);
const WHERE_IS = /\b(ou se (situe|trouve)|ou est situe|c'est ou|ou habitez)\b/;

/** Questions sur le site ou sur Alma : jamais adressées au propriétaire. */
const SITE_OR_ALMA = /\b(alma|postuler|candidat\w*|mon compte|supprimer|abonnement|tarif|prix|paiement|mon profil|inscri\w*|mot de passe|connexion|comment (ca marche|fonctionne))\b/;

/** Vrai quand le message s'adresse au propriétaire de l'annonce consultée. */
export function detectAddressedToOwner(message: string): boolean {
  const q = foldText(message || "");
  if (!q.trim()) return false;
  if (SITE_OR_ALMA.test(q)) return false;
  if (SECOND_PERSON_TOPIC.test(q)) return true;
  if (ASK_PRECISE.test(q)) return true;
  if (HOUSE_HAS.test(q)) return true;
  if (WHERE_IS.test(q)) return true;
  if (HAVE_YOU.test(q) && HAVE_YOU_TOPIC.test(q)) return true;
  if (/\b(habitez|vivez|partez|rentrez)[- ]vous\b/.test(q)) return true;
  return false;
}

/** Vrai quand la personne interroge Alma sur elle-même, par son nom ou explicitement. */
export function asksAboutAlma(message: string): boolean {
  const q = foldText(message || "");
  return /\balma\b/.test(q) || /\b(toi|tu|ton|ta|tes)\b/.test(q);
}

export interface ViewedSitFacts {
  id: string;
  title: string | null;
  open: boolean;
  locationLabel: string;
  /** La localisation vient du code postal faute de commune. */
  communeMissing: boolean;
  startDate: string | null;
  endDate: string | null;
  /** Comptes par libellé français, par exemple { chien: 1 }. */
  pets: Record<string, number>;
}

export type ViewerState = "can_apply" | "applied" | "owner_space";

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function frDate(iso: string | null, withYear: boolean): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d === 1 ? "1er" : d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

const plural = (label: string, n: number) => (n > 1 && !/[sx]$/.test(label) ? `${label}s` : label);

export function buildOwnerQuestionAnswer(sit: ViewedSitFacts, viewer: ViewerState): string {
  const lines: string[] = ["Voici ce que l'annonce indique."];
  lines.push(
    `Localisation : ${sit.locationLabel}${sit.communeMissing ? " (la commune exacte n'est pas encore précisée)" : ""}.`,
  );
  if (sit.startDate && sit.endDate) {
    lines.push(`Dates : du ${frDate(sit.startDate, false)} au ${frDate(sit.endDate, true)}.`);
  }
  const pets = Object.entries(sit.pets).filter(([, n]) => n > 0);
  lines.push(
    pets.length
      ? `Animaux : ${pets.map(([k, n]) => `${n} ${plural(k, n)}`).join(", ")}.`
      : "Animaux : aucun animal déclaré sur l'annonce.",
  );
  const closing = viewer === "applied"
    ? OWNER_QUESTION_SENTENCE_APPLIED
    : viewer === "owner_space"
      ? OWNER_QUESTION_SENTENCE_OWNER_SPACE
      : OWNER_QUESTION_SENTENCE;
  return `${lines.join("\n")}\n\n${closing}`;
}

export interface SitDetailAction {
  label: string;
  path: string;
  reason: string;
}

export function sitDetailAction(
  sitId: string,
  viewer: ViewerState,
  conversationId: string | null,
): SitDetailAction {
  if (viewer === "owner_space") {
    return { label: "Passer en espace gardien pour postuler", path: `/sits/${sitId}?espace=gardien&postuler=1`, reason: "sit_detail_espace_gardien" };
  }
  if (viewer === "applied") {
    return conversationId
      ? { label: "Ouvrir la conversation de ma candidature", path: `/messages/${conversationId}`, reason: "sit_detail_conversation" }
      : { label: "Voir ma candidature", path: "/sits", reason: "sit_detail_candidature" };
  }
  return { label: "Postuler à cette annonce", path: `/sits/${sitId}?postuler=1`, reason: "sit_detail_postuler" };
}
