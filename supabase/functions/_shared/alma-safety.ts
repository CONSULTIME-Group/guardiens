/**
 * Lot A4 (audit Alma en arène du 14/10/2026, décisions de Jérémie du
 * 14/10/2026) : sûreté déterministe d'Alma.
 *
 * detectSafety lit le message replié (minuscules, sans accents) et range un
 * cas grave dans une famille. alma-chat l'appelle avant toute détection
 * d'intention : la réponse est un gabarit verrouillé, sans appel au modèle,
 * sans action calculée, sans réécriture de mots (rewriteForbiddenWords ne le
 * touche jamais), et un signal alma_safety part par email immédiat.
 *
 * Numéros cités : 112, 15, 17, 18, 119, 3977 (CGU v9, 6.5 et 7.8) et 3114
 * (numéro national de prévention du suicide, décision du 14/10/2026).
 * Outils du site cités : bouton « Besoin d'aide » du bandeau « Garde en
 * cours » de la conversation (HelpButton.tsx, help-during-sit) et bouton
 * « Signaler » (ReportButton.tsx, menu de la conversation).
 *
 * Module pur, sans dépendance Deno : testé par vitest (src/__tests__/a4/).
 */
import { isAnimalEmergency } from "./alma-next-action.ts";
import { foldText } from "./alma-site-knowledge.ts";

export type SafetyKind =
  | "detresse"
  | "maltraitance_personne"
  | "maltraitance_animal"
  | "personne_danger"
  | "conflit_garde"
  | "animal_perdu"
  | "animal_urgence";

/** Durée pendant laquelle les chuchotements se taisent après un gabarit de sûreté. */
export const SAFETY_QUIET_MINUTES = 120;

/** Gabarits verrouillés : textes courts, calmes, affirmatifs. Première phrase : vétérinaire ou numéro. */
export const SAFETY_TEMPLATES: Record<SafetyKind, string> = {
  animal_urgence:
    "Appelez votre vétérinaire maintenant, ou le vétérinaire de garde si le cabinet est fermé. Gardez l'animal au calme et notez l'heure des premiers signes. Pendant une garde en cours, le bouton « Besoin d'aide » de votre conversation affiche le vétérinaire du guide de la maison et prévient le propriétaire. Si une personne est en danger, appelez le 112.",
  animal_perdu:
    "Prévenez votre vétérinaire, la mairie et la fourrière de la commune : ce sont eux qui reçoivent les animaux trouvés et lisent leur puce. Déclarez aussi la perte auprès de l'I-CAD si l'animal est identifié. Pendant une garde en cours, le bouton « Besoin d'aide » de votre conversation prévient le propriétaire.",
  personne_danger:
    "Appelez le 112 maintenant, ou le 15 pour une urgence médicale, le 17 pour la police, le 18 pour les pompiers. Restez joignable et suivez les consignes des secours. Guardiens met des membres en relation : ce sont les secours qui interviennent.",
  detresse:
    "Appelez le 3114, le numéro national de prévention du suicide : une personne vous répond, jour et nuit. En danger immédiat, appelez le 15 ou le 112. Ce que vous vivez compte, et Jérémie et Elisa lisent aussi vos messages : le lien pour leur écrire est juste en dessous.",
  maltraitance_personne:
    "Appelez le 119 si un enfant est en danger, le 3977 pour une personne âgée ou en situation de handicap, le 17 ou le 112 en cas de danger immédiat. Sur Guardiens, le bouton « Signaler » d'un profil ou d'une conversation prévient l'équipe, qui examine chaque signalement.",
  maltraitance_animal:
    "Appelez le 17 si un animal est en danger immédiat, et un vétérinaire s'il est blessé. Sur Guardiens, le bouton « Signaler » d'un profil, d'une annonce ou d'une conversation prévient l'équipe, qui examine chaque signalement.",
  conflit_garde:
    "Si une personne ou un animal est en danger, appelez le 112, ou votre vétérinaire pour un animal. Pendant une garde en cours, le bouton « Besoin d'aide » de votre conversation prévient l'autre membre et l'équipe de Guardiens. Gardez vos échanges dans la messagerie, ils gardent la trace de ce qui a été dit. Le bouton « Signaler » d'un profil ou d'une conversation ouvre l'examen par l'équipe, et Jérémie et Elisa lisent vos messages par le lien juste en dessous.",
};

/** Familles où le lien « Écrire à Jérémie et Elisa » s'affiche sous le gabarit. */
const HUMAN_CONTACT: Record<SafetyKind, boolean> = {
  animal_urgence: false,
  animal_perdu: false,
  personne_danger: true,
  detresse: true,
  maltraitance_personne: true,
  maltraitance_animal: true,
  conflit_garde: true,
};

// Tous les motifs portent sur le texte replié (foldText).
const ANIMAL_WORD =
  /\b(chiens?|chienne|chiot|chats?|chatte|chaton|minou|toutou|animal|animaux|lapin|cheval|chevaux|jument|poney|ane|oiseau|perroquet|perruche|furet|hamster|cochon d'inde|poules?|tortue|nac|lapins?|bete|betes|matou)\b/;

const PERSON_WORD =
  /\b(je|j'|moi|mon (fils|mari|pere|frere|bebe|enfant|compagnon|conjoint|grand-pere|papi)|ma (fille|femme|mere|soeur|compagne|conjointe|grand-mere|mamie)|mes enfants|un enfant|une enfant|le bebe|quelqu'un|une personne|la dame|le monsieur|le gardien|la gardienne|le proprietaire|la proprietaire)\b/;

const DETRESSE =
  /\b(suicid\w*|me tuer|me foutre en l'air|envie de mourir|je veux mourir|je voudrais mourir|veux en finir|envie d'en finir|en finir avec (la vie|tout|ma vie)|mettre fin a (mes jours|ma vie)|plus envie de vivre|plus la force de vivre|me faire du mal|je me fais du mal|me scarifi\w*|au bout du rouleau|plus aucun espoir)\b/;
// « Je n'en peux plus », sauf quand la suite vise le site, une appli ou des emails.
const N_EN_PEUX_PLUS = /\bje n'?en peux plus\b(?!\s+(de|du|des|avec)\s+(ce|cette|ces|vos|votre|guardiens|site|l'appli|appli|application|mails|emails|bug|bugs|notifications?)\b)/;

const MINOR_OR_VULNERABLE =
  /\b(enfants?|mineure?s?|gamins?|petite? fille|petit garcon|bebe|ado|adolescente?|personnes? agees?|vieille dame|vieux monsieur|grand-mere|grand-pere|mamie|papi|personnes? handicapees?|personnes? en situation de handicap|personnes? vulnerables?)\b/;
const ABUSE_VERB = /\b(maltrait\w*|battu\w*|frapp\w*|abus\w*|violente?s?|brutalis\w*|enferm\w*|affame\w*|attouchement\w*|negligee?s?|delaissee?s?)\b/;
const SEXUAL_VIOLENCE = /\b(agression sexuelle|abus sexuels?|attouchements?|\bviol\b|violee?)\b/;

const ANIMAL_ABUSE =
  /\b(maltraitance animale|maltrait\w* (le |les |la |son |sa |ses |un |une |des |mon |ma |mes )?(chiens?|chienne|chiot|chats?|chatte|chaton|animal|animaux|cheval|chevaux|poney|lapins?)|(chiens?|chienne|chiot|chats?|chaton|animal|animaux|cheval|chevaux|poney|lapins?) (est |sont |a ete |ont ete )?(maltraite\w*|battu\w*|frappe\w*|affame\w*|abandonne\w*|enferme\w* (sans|dans le noir)|attache\w* (au soleil|sans eau|jour et nuit))|frapp\w* (le |son |sa |un |mon |les |ses )?(chiens?|chienne|chiot|chats?|chaton|animal|animaux|cheval)|laiss\w* (le |les |son |ses |sa )?(chiens?|chats?|animaux|animal|cheval|chevaux) sans (eau|manger|nourriture|soins)|(chiens?|chats?|animaux|animal|cheval|chevaux|poneys?) (est |sont |reste\w* )?laisse\w* sans (eau|manger|nourriture|soins))/;

const PERSON_DANGER_STRONG =
  /\b((il|elle|on|ils|elles) me menace\w*|me (frappe\w*|bat|battent|tape dessus|etrangl\w*)|m'a (frappe\w*|battue?|etrangle\w*|giflee?)|on m'a (agresse\w*|frappe\w*|menace\w*)|je me suis fait (agresser|frapper|tabasser)|violences? (conjugales?|physiques?|domestiques?)|je suis en danger|danger de mort|menaces? de mort|au secours|il y a le feu|au feu\b(?! de)|incendie|fuite de gaz|odeur de gaz|quelqu'un est entre chez|cambriol\w* en cours|un cambrioleur|crise cardiaque|arret cardiaque|\bavc\b|fait un malaise|a fait un malaise|est tombee? (par terre|dans l'escalier|et ne)|ne se releve pas|j'ai eu un accident|accident de (voiture|la route|moto|velo)|je suis blessee?|gravement blessee?)\b/;

const ROLE_WORD = /\b(gardien|gardienne|gardiens|proprietaire|proprio|proprietaires|house-sitter|la personne qui garde|le membre)\b/;
const CONFLICT_SEVERE =
  /\b((m'a |me |nous a |nous |l'a |les a )menac\w*|menaces|insult\w*|harcel\w*|(m'a |me |nous a |l'a )agress\w*|agression|refuse de (partir|quitter|rendre|me rendre|sortir)|ne veut pas (partir|quitter|rendre)|(a|m'a|nous a|ont) vole|vole (mes|des|ma|mon|nos)|a casse|a tout casse|degats?|degradation\w*|squatt?\w*|m'a mise? dehors|me met dehors|ivre|alcoolise\w*|drogu\w*|dispute grave)\b/;
/** Absence pendant une garde : compte seulement avec un mot de garde, jamais pour une candidature. */
const CONFLICT_ABSENCE =
  /\b(ne (me )?repond plus|ne repond pas depuis|injoignable|introuvable|a disparu|est parti\w* (avec|en laissant|sans)|a abandonne|n'est (jamais |pas )?(venue?|arrivee?|passee?))\b/;
const CONFLICT_DISPUTE = /\b(litige|conflit|desaccord)\b/;
const SIT_CONTEXT = /\b(pendant (la|ma|sa|notre) garde|garde en cours|en pleine garde|les animaux|mes animaux|chiens?|chats?|cles|seule?s? (a la maison|chez moi)|logement|maison|etat des lieux)\b/;

/** Question d'information (« en cas de litige », « qui paie les dégâts ») : la conversation reste ouverte. */
const HYPOTHETICAL = /\b(en cas (de|d')|comment (eviter|prevenir|ca se passe)|qui (paie|rembourse|prend en charge)|assurances?)\b/;

const LOST_ANIMAL =
  /\b(fugu\w*|s'est (echappe|enfui|sauve)\w*|perdu (mon|ma|le|la|notre) (chiens?|chienne|chiot|chats?|chatte|chaton|animal|lapin|cheval|perroquet)|(chiens?|chienne|chiot|chats?|chatte|chaton|lapin|cheval|perroquet) (a |est )?(disparu|perdu|introuvable|parti\w*|sorti\w* et pas revenu))\b/;

/** Trouble ancien ou habituel : la conversation reste ouverte, sauf terme net. */
const CHRONIC = /\b(parfois|souvent|de temps en temps|d'habitude|habituellement|regulierement|chaque (jour|matin|soir|semaine)|depuis des (mois|annees))\b/;

/** Termes d'urgence animale assez nets pour se passer d'un mot d'animal. */
const STRONG_ANIMAL =
  /\b(avale\w*|empoisonn\w*|intoxi\w*|poison|convuls\w*|crise d.epilepsie|ne respire plus|respire mal|etouffe\w*|diarrhee de sang|coup de chaleur|saigne\w*|saignement|inconscient\w*)\b/;

export interface SafetyMatch {
  kind: SafetyKind;
  answer: string;
  humanContact: boolean;
}

/** Famille de sûreté d'un message, ou null. */
export function detectSafety(message: string): SafetyKind | null {
  const t = foldText(message || "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (DETRESSE.test(t) || N_EN_PEUX_PLUS.test(t)) return "detresse";
  const animal = ANIMAL_WORD.test(t);
  if (ANIMAL_ABUSE.test(t)) return "maltraitance_animal";
  if (SEXUAL_VIOLENCE.test(t)) return "maltraitance_personne";
  if (MINOR_OR_VULNERABLE.test(t) && ABUSE_VERB.test(t)) return "maltraitance_personne";
  if (/\bmaltrait\w*/.test(t)) return animal ? "maltraitance_animal" : "maltraitance_personne";
  if (PERSON_DANGER_STRONG.test(t) && !HYPOTHETICAL.test(t)) return "personne_danger";
  if (ROLE_WORD.test(t) && !HYPOTHETICAL.test(t)) {
    const sitContext = SIT_CONTEXT.test(t) && !/\bcandidature/.test(t);
    if (CONFLICT_SEVERE.test(t)) return "conflit_garde";
    if (sitContext && (CONFLICT_ABSENCE.test(t) || CONFLICT_DISPUTE.test(t))) return "conflit_garde";
  }
  if (LOST_ANIMAL.test(t)) return "animal_perdu";
  // isAnimalEmergency (lot A1), élargi aux fautes courantes (« avaler » pour « avalé »).
  if (isAnimalEmergency(message) || STRONG_ANIMAL.test(t)) {
    if (CHRONIC.test(t) && !STRONG_ANIMAL.test(t)) return null;
    if (animal) return "animal_urgence";
    if (PERSON_WORD.test(t)) return STRONG_ANIMAL.test(t) ? "personne_danger" : null;
    // Sur un site de garde d'animaux, un terme net sans sujet vise l'animal.
    if (STRONG_ANIMAL.test(t)) return "animal_urgence";
  }
  return null;
}

/** Réponse verrouillée de sûreté, ou null quand le message n'en relève pas. */
export function safetyReply(message: string): SafetyMatch | null {
  const kind = detectSafety(message);
  if (!kind) return null;
  return { kind, answer: SAFETY_TEMPLATES[kind], humanContact: HUMAN_CONTACT[kind] };
}

/** Première phrase d'un texte (jusqu'au premier point final). */
export function firstSentence(text: string): string {
  const m = /^[\s\S]*?[.!?](\s|$)/.exec(text.trim());
  return (m ? m[0] : text).trim();
}

/** Vrai quand la phrase cite un vétérinaire ou un numéro d'urgence. */
export function namesVetOrNumber(sentence: string): boolean {
  return /v[ée]t[ée]rinaire|\b(112|15|17|18|119|3977|3114)\b/i.test(sentence);
}
