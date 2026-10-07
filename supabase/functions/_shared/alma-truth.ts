// Lot L3 : Alma dit vrai sur l'espace actif, le périmètre réel et les
// brouillons. Module pur, testé ; les lectures en base restent dans alma-chat.

export const fold = (s: string): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2019\u2018]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// ---------------------------------------------------------------------------
// 1. Intention exprimée : garder chez les autres, ou faire garder chez soi.
// ---------------------------------------------------------------------------

const OWNER_INTENT = /(faire garder|garder (mes|ma|mon|nos)\b|garde (pour|de) (mes|mon|ma|nos)\b|une garde pour (mes|mon|ma|nos)\b|trouver un gardien|cherche (un|une) gardien|je pars\b|partir en vacances|pendant mon absence|publier (une|mon) annonce)/;
const SITTER_INTENT = /(je (re)?cherche (une |des )?gardes?\b|cherche a garder|(je )?(voudrais|veux|souhaite|aimerais) garder|garder (un|une|des) (chien|chat|animal|animaux|maison|chevaux)|devenir gardien|ou sont les annonces|voir les annonces|annonces des autres|gardes (disponibles|proposees)|ne trouve que (la mienne|mon annonce|mes annonces)|que la mienne|postuler a une garde)/;
const FOLLOW_UP = /^(ou (est|se trouve) (cette|la) page|ou ca|c'est ou|ou (est|sont)[- ]?(elle|elles|ils|il)|laquelle|quelle page)\b/;

export type ExpressedIntent = "sitter" | "owner" | null;

function intentOf(text: string): ExpressedIntent {
  const q = fold(text);
  if (OWNER_INTENT.test(q)) return "owner";
  if (SITTER_INTENT.test(q)) return "sitter";
  return null;
}

/**
 * Intention du message courant ; une relance courte (« Où est cette page ? »)
 * reprend l'intention du message précédent de la personne.
 */
export function expressedIntent(message: string, previousUserMessages: string[] = []): ExpressedIntent {
  const now = intentOf(message);
  if (now) return now;
  const q = fold(message).replace(/[?!.]+$/, "");
  if (q.length <= 60 && FOLLOW_UP.test(q)) {
    for (let i = previousUserMessages.length - 1; i >= 0; i--) {
      const prev = intentOf(previousUserMessages[i]);
      if (prev) return prev;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Espace actif.
// ---------------------------------------------------------------------------

export interface TruthAction {
  label: string;
  path: string;
  reason: string;
}

export const SPACE_OWNER_TO_SITTER =
  "Vous êtes dans votre espace propriétaire : la page Annonces y montre vos propres annonces. Les gardes proposées par les propriétaires se trouvent dans votre espace gardien.";
export const SPACE_SITTER_TO_OWNER =
  "Vous êtes dans votre espace gardien : il montre les gardes proposées par les propriétaires. Pour faire garder chez vous, votre annonce se prépare dans votre espace propriétaire.";
export const SPACE_ACTIVATE_SITTER =
  "Votre compte a seulement l'espace propriétaire. Pour garder chez les autres, vous pouvez activer l'espace gardien dans vos réglages, rubrique Mes espaces.";
export const SPACE_ACTIVATE_OWNER =
  "Votre compte a seulement l'espace gardien. Pour faire garder chez vous, vous pouvez activer l'espace propriétaire dans vos réglages, rubrique Mes espaces.";

export const SITTER_SEARCH_PATH = "/annonces?espace=gardien";
export const OWNER_CREATE_PATH = "/sits/create?espace=proprietaire";
export const SETTINGS_SPACES_PATH = "/settings?section=spaces";

export interface SpaceGuidance {
  sentence: string;
  action: TruthAction;
  /** Le membre a l'espace demandé, il suffit d'y passer. */
  switchable: boolean;
}

export function spaceGuidance(input: {
  accountRole: "owner" | "sitter" | "both" | null;
  activeRole: "owner" | "sitter";
  intent: ExpressedIntent;
}): SpaceGuidance | null {
  const { accountRole, activeRole, intent } = input;
  if (!intent || !accountRole) return null;
  if (intent === "sitter") {
    if (accountRole === "both" && activeRole === "owner") {
      return { sentence: SPACE_OWNER_TO_SITTER, switchable: true, action: { label: "Passer en espace gardien et voir les annonces", path: SITTER_SEARCH_PATH, reason: "espace_gardien" } };
    }
    if (accountRole === "owner") {
      return { sentence: SPACE_ACTIVATE_SITTER, switchable: false, action: { label: "Ouvrir mes espaces", path: SETTINGS_SPACES_PATH, reason: "activer_gardien" } };
    }
    return null;
  }
  if (accountRole === "both" && activeRole === "sitter") {
    return { sentence: SPACE_SITTER_TO_OWNER, switchable: true, action: { label: "Passer en espace propriétaire et créer mon annonce", path: OWNER_CREATE_PATH, reason: "espace_proprietaire" } };
  }
  if (accountRole === "sitter") {
    return { sentence: SPACE_ACTIVATE_OWNER, switchable: false, action: { label: "Ouvrir mes espaces", path: SETTINGS_SPACES_PATH, reason: "activer_proprietaire" } };
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. Périmètre réel : lieux cités.
// ---------------------------------------------------------------------------

interface ForeignPlace { iso: string; inCountry: string }
const IT = { iso: "IT", inCountry: "en Italie" };
const ES = { iso: "ES", inCountry: "en Espagne" };
const PT = { iso: "PT", inCountry: "au Portugal" };
const BE = { iso: "BE", inCountry: "en Belgique" };
const CH = { iso: "CH", inCountry: "en Suisse" };
const DE = { iso: "DE", inCountry: "en Allemagne" };
const GB = { iso: "GB", inCountry: "au Royaume-Uni" };
const GR = { iso: "GR", inCountry: "en Grèce" };
const CA = { iso: "CA", inCountry: "au Canada" };
const US = { iso: "US", inCountry: "aux États-Unis" };
const MA = { iso: "MA", inCountry: "au Maroc" };
const LU = { iso: "LU", inCountry: "au Luxembourg" };
const NL = { iso: "NL", inCountry: "aux Pays-Bas" };
const IE = { iso: "IE", inCountry: "en Irlande" };
const AT = { iso: "AT", inCountry: "en Autriche" };
const HR = { iso: "HR", inCountry: "en Croatie" };

const FOREIGN: Array<[RegExp, ForeignPlace]> = [
  [/\b(italie|toscane|sicile|sardaigne|ombrie|pouilles|piemont|lombardie|rome|florence|venise|milan|naples|sienne)\b/, IT],
  [/\b(espagne|andalousie|catalogne|baleares|majorque|barcelone|madrid|seville|valence en espagne)\b/, ES],
  [/\b(portugal|algarve|lisbonne)\b/, PT],
  [/\b(belgique|bruxelles|wallonie|flandre)\b/, BE],
  [/\b(suisse|geneve|lausanne|zurich)\b/, CH],
  [/\b(allemagne|berlin|baviere|munich)\b/, DE],
  [/\b(angleterre|royaume-uni|ecosse|londres)\b/, GB],
  [/\b(grece|crete|athenes)\b/, GR],
  [/\b(canada|quebec|montreal)\b/, CA],
  [/\b(etats-unis|usa|amerique)\b/, US],
  [/\b(maroc|marrakech)\b/, MA],
  [/\b(luxembourg)\b/, LU],
  [/\b(pays-bas|hollande|amsterdam)\b/, NL],
  [/\b(irlande|dublin)\b/, IE],
  [/\b(autriche|vienne en autriche)\b/, AT],
  [/\b(croatie)\b/, HR],
];

/** Pays étranger cité dans la question, ou null. La Polynésie française est en France. */
export function foreignPlaceIn(message: string): ForeignPlace | null {
  const q = fold(message);
  for (const [re, place] of FOREIGN) if (re.test(q)) return place;
  return null;
}

/** Codes pays servis par Guardiens comme France (métropole et outre-mer). */
export const FRANCE_CODES = new Set(["FR", "PF", "GP", "MQ", "GF", "RE", "YT", "NC", "PM", "WF", "BL", "MF"]);

export interface PublishedSitRow {
  country?: string | null;
  city?: string | null;
  departement_code?: string | null;
}

export function hasForeignSits(rows: PublishedSitRow[]): boolean {
  return rows.some((r) => !FRANCE_CODES.has(((r.country || "FR") + "").toUpperCase()));
}

export const FRANCE_SCOPE_SENTENCE = "Guardiens propose des gardes en France, Polynésie française comprise.";
export const foreignNoneSentence = (inCountry: string) =>
  `${FRANCE_SCOPE_SENTENCE} Il n'y a aucune garde ${inCountry} aujourd'hui.`;

export interface DepartementRow { code: string; nom: string; nom_region?: string | null }

export interface FrenchPlaceMatch {
  label: string;
  /** Nombre d'annonces publiées vérifiées en base pour ce lieu. */
  count: number;
}

const PLACE_AFTER = /\b(?:en|a|au|aux|dans le|dans la|dans les|dans l'|sur|vers|pres de|autour de|du cote de)\s+([a-z' -]{3,40})/g;

/**
 * Lieu français cité (département, région ou commune ayant une annonce),
 * vérifié contre les lignes lues en base. Null si aucun lieu reconnu.
 */
export function frenchPlaceIn(message: string, deps: DepartementRow[], sits: PublishedSitRow[]): FrenchPlaceMatch | null {
  const q = fold(message).replace(/[?!.,;:]/g, " ");
  const tokens: string[] = [];
  for (const m of q.matchAll(PLACE_AFTER)) {
    const words = m[1].trim().split(" ");
    for (let n = Math.min(4, words.length); n >= 1; n--) tokens.push(words.slice(0, n).join(" "));
  }
  if (tokens.length === 0) return null;
  const french = sits.filter((s) => FRANCE_CODES.has(((s.country || "FR") + "").toUpperCase()));
  for (const t of tokens) {
    const dep = deps.find((d) => fold(d.nom) === t);
    if (dep) return { label: dep.nom, count: french.filter((s) => (s.departement_code || "").toUpperCase() === dep.code.toUpperCase()).length };
    const regionDeps = deps.filter((d) => d.nom_region && fold(d.nom_region) === t);
    if (regionDeps.length) {
      const codes = new Set(regionDeps.map((d) => d.code.toUpperCase()));
      return { label: regionDeps[0].nom_region!, count: french.filter((s) => codes.has((s.departement_code || "").toUpperCase())).length };
    }
    const city = french.filter((s) => s.city && fold(s.city) === t);
    if (city.length) return { label: city[0].city!, count: city.length };
  }
  return null;
}

export const frenchNoneSentence = (label: string) =>
  `Il n'y a aucune garde publiée à ${label} sur Guardiens aujourd'hui. Une alerte de secteur vous prévient dès qu'une annonce y paraît.`;

/** La question porte sur des gardes ou des annonces (pas sur un trajet, une ville d'origine). */
export function asksAboutListings(message: string): boolean {
  return /\b(gardes?|garder|annonces?|gardiennage|house.?sitting)\b/.test(fold(message));
}

export const ALERT_ACTION: TruthAction = { label: "Régler mon alerte de secteur", path: "/mon-secteur", reason: "alerte_secteur" };

// ---------------------------------------------------------------------------
// 3. Brouillons périmés.
// ---------------------------------------------------------------------------

export function isStaleDraft(draft: { debut?: string | null }, todayIso: string): boolean {
  return Boolean(draft.debut) && String(draft.debut).slice(0, 10) < todayIso;
}

export const STALE_DRAFT_LABEL = "Reprendre ce brouillon avec de nouvelles dates";
export const staleDraftPath = (sitId: string) => `/sits/create?draftId=${sitId}&etape=dates`;

// ---------------------------------------------------------------------------
// 4. Messagerie : seulement pour un message envoyé, lu ou reçu.
// ---------------------------------------------------------------------------

const MESSAGE_WORD = /\b(message|messages|messagerie|mp|mail)\b/;
const MESSAGE_STATE = /\b(envoy\w*|lu|lus|lue|lues|lire|lecture|recu\w*|vu|vue|arriv\w*|parti|repon\w*|repondu)\b/;
const MESSAGE_DIRECT = /\b(a-t-(il|elle) (lu|recu|vu)|ont-ils (lu|recu|vu)|pas de reponse a mon message|mon message (est|a))\b/;

export function isMessagingQuestion(message: string): boolean {
  const q = fold(message);
  if (MESSAGE_DIRECT.test(q)) return true;
  return MESSAGE_WORD.test(q) && MESSAGE_STATE.test(q);
}

// ---------------------------------------------------------------------------
// Filet de sortie : formulations interdites.
// ---------------------------------------------------------------------------

const MESSAGING_DISCLAIMER = /[^.!?\n]*je ne peux pas consulter votre messagerie[^.!?\n]*[.!?]?\s*/gi;

function dropSentences(text: string, re: RegExp): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.split(/(?<=[.!?])\s+/).filter((s) => !re.test(s)).join(" "))
    .filter((p) => p.trim())
    .join("\n\n");
}

export function scrubTruth(text: string, opts: { messaging: boolean; foreignOpen: boolean }): string {
  let out = text || "";
  if (!opts.messaging) out = out.replace(MESSAGING_DISCLAIMER, "");
  out = out
    .replace(/\bdans votre dossier\b/gi, "sur Guardiens")
    .replace(/\bvotre dossier\b/gi, "votre profil")
    .replace(/\bVotre dossier\b/g, "Votre profil");
  if (!opts.foreignOpen) out = dropSentences(out, /international/i);
  return out.trim();
}

/** Consigne messagerie, envoyée au modèle seulement sur une question de message. */
export const MESSAGING_DIRECTIVE = `MESSAGERIE, LIMITES DE LECTURE
Tu n'as pas accès aux messages privés ni à leur historique. Tu reçois des candidatures, pas la messagerie.
Tu ne peux vérifier ni l'existence d'un message, ni son contenu, ni son envoi, sa réception ou sa lecture. Aucune présence, absence ou statut de candidature ne permet de conclure sur un message.
Dis clairement : "Je ne peux pas consulter votre messagerie ni vérifier l'envoi ou la lecture de ce message." Propose d'ouvrir /messages pour consulter l'échange, sans affirmer ce qu'elle y trouvera.
Si une réponse précédente prétendait avoir vérifié ses messages, rectifie cette affirmation. Tu peux aider à rédiger un message à partir du texte fourni par la personne, sans prétendre le lire dans son compte ni l'envoyer.
Ces limites priment sur les consignes de prochaine action : reste sur cette question.`;

/** Consigne de périmètre, envoyée à chaque tour. */
export const SCOPE_DIRECTIVE = `PÉRIMÈTRE RÉEL
Guardiens propose des gardes en France, Polynésie française comprise. Tu n'affirmes jamais qu'il existe des annonces dans un lieu, un pays ou une région que l'inventaire ou les faits de ce tour ne nomment pas. Sans annonce vérifiée, tu dis qu'il n'y en a pas aujourd'hui et tu proposes l'alerte de secteur.
Tu ne dis jamais « dossier » à la personne : tu dis « vos annonces », « votre profil », « sur Guardiens ».`;
