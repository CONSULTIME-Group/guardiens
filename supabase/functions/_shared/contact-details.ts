/**
 * Détection de coordonnées personnelles dans un texte public.
 *
 * Une annonce d'entraide est une page publique indexable : y laisser un
 * numéro de téléphone ou une adresse email expose le membre et sort
 * l'échange de la plateforme. La détection est bloquante à la
 * publication, contrairement à la messagerie privée où l'échange de
 * coordonnées est légitime.
 *
 * La détection travaille sur deux formes : le texte brut, et une forme
 * normalisée où les contournements écrits en toutes lettres (arobase,
 * point, dot, chiffres en lettres) sont ramenés à leurs caractères.
 *
 * Module pur, sans dépendance Deno : source unique lue par le site
 * (src/lib/contactDetails.ts le ré-exporte), par moderate-content et par
 * mission-quick-action. Lot E19 : l'adresse postale est détectée seulement
 * pour le mot laissé après un coup de main (detectMeetupWordContacts).
 */

const PHONE_RE = /(?:(?:\+33|0033|0)\s?[1-9](?:[\s.\-]?\d{2}){4})/;
const EMAIL_RE = /[\w.+-]+\s?(?:@|\(at\)|\[at\]|\sarobase\s|\sat\s)\s?[\w-]+\.[\w.-]+/i;
const OBFUSCATED_PHONE_RE = /\b0\s?[1-9](?:[\s.\-]*\d){8}\b/;

/**
 * Lot E19 : adresse postale, un numéro suivi d'un type de voie (« 12 rue des
 * Lilas », « 3 bis, avenue Foch », « 7 allée du Parc »). Le numéro est isolé
 * (ni heure ni montant collé devant), le type de voie est au singulier et
 * suivi d'un mot. Une place de parking, une place libre ou disponible reste
 * un texte ordinaire.
 */
const STREET_TYPES = "rue|avenue|boulevard|bd|chemin|impasse|allee|place|route";
const POSTAL_ADDRESS_RE = new RegExp(
  `(?:^|[^\\w:,.])(?:n\\s?°\\s?)?\\d{1,4}\\s?(?:bis|ter|b)?\\s?,?\\s(?:${STREET_TYPES})\\b(?!\\s+(?:de\\s+parking|de\\s+stationnement|libre|libres|disponible|disponibles|assise|assises|pour)\\b)\\s+[a-z]`,
);

const DIGIT_WORDS: Record<string, string> = {
  zero: "0",
  un: "1",
  une: "1",
  deux: "2",
  trois: "3",
  quatre: "4",
  cinq: "5",
  six: "6",
  sept: "7",
  huit: "8",
  neuf: "9",
};

/** Supprime les accents pour traiter « zéro » comme « zero ». */
function deaccent(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Ramène les contournements écrits en toutes lettres à leurs caractères :
 * « arobase » vers @, « point » ou « dot » vers un point, et les chiffres
 * écrits en lettres vers leurs chiffres.
 */
export function normalizeObfuscatedContact(input: string): string {
  let out = deaccent(input).toLowerCase();

  // Arobase sous ses formes écrites.
  out = out.replace(/\s*(?:\(\s*at\s*\)|\[\s*at\s*\]|\{\s*at\s*\}|arobase|arrobase|arobas)\s*/g, "@");

  // Point écrit en toutes lettres, uniquement entre deux fragments de mot.
  out = out.replace(/(\w)\s*(?:\(\s*(?:point|dot)\s*\)|\[\s*(?:point|dot)\s*\]|point|dot)\s*(\w)/g, "$1.$2");

  // Chiffres en toutes lettres, appliqué de façon répétée pour couvrir les
  // suites contiguës du type « zero six douze » écrites mot à mot.
  const wordPattern = new RegExp(`\\b(${Object.keys(DIGIT_WORDS).join("|")})\\b`, "g");
  for (let pass = 0; pass < 2; pass++) {
    out = out.replace(wordPattern, (m) => DIGIT_WORDS[m] ?? m);
  }

  return out;
}

/** Lot E19 : vrai quand le texte contient une adresse postale (numéro et type de voie). */
export function detectPostalAddress(input: string | null | undefined): boolean {
  if (!input || !input.trim()) return false;
  const text = deaccent(input).toLowerCase().replace(/\s+/g, " ");
  return POSTAL_ADDRESS_RE.test(text);
}

export type ContactDetailKind = "phone" | "email" | "address";

export function detectContactDetails(input: string | null | undefined): ContactDetailKind[] {
  if (!input || !input.trim()) return [];
  const raw = input;
  const normalized = normalizeObfuscatedContact(input);
  // Variante compactée : « 0 6 1 2 ... » issu des chiffres en lettres.
  // Pas de lookbehind (Safari iOS avant 16.4 rejette « (?<= ») : le chiffre de
  // gauche est capturé puis réinjecté, comportement identique.
  const compacted = normalized.replace(/(\d)[\s.\-]+(?=\d)/g, "$1");

  const found: ContactDetailKind[] = [];
  const candidates = [raw, normalized, compacted];

  if (candidates.some((c) => PHONE_RE.test(c) || OBFUSCATED_PHONE_RE.test(c))) found.push("phone");
  if (candidates.some((c) => EMAIL_RE.test(c))) found.push("email");
  return found;
}

/**
 * Lot E19 : coordonnées dans le mot laissé après un coup de main, adresse
 * postale comprise. Réservé à ce mot : les annonces et les besoins gardent
 * detectContactDetails (téléphone et email), inchangé.
 */
export function detectMeetupWordContacts(input: string | null | undefined): ContactDetailKind[] {
  const found = detectContactDetails(input);
  if (detectPostalAddress(input)) found.push("address");
  return found;
}

const KIND_LABELS: Record<ContactDetailKind, string> = {
  phone: "un numéro de téléphone",
  email: "une adresse email",
  address: "une adresse postale",
};

export function contactDetailsMessage(kinds: ContactDetailKind[]): string {
  const labels = kinds.map((k) => KIND_LABELS[k]);
  const list =
    labels.length > 1 ? `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}` : labels[0];
  return `Votre annonce contient ${list}. Une annonce d'entraide est une page publique : retirez ces coordonnées, vos échanges se poursuivront dans la messagerie une fois la mise en relation faite.`;
}

/**
 * Lot E19 : message sous le mot laissé après un coup de main, quand il
 * contient des coordonnées. Le mot peut apparaître près de chez vous, la
 * conversation reste le lieu des coordonnées.
 */
export function meetupWordContactMessage(kinds: ContactDetailKind[]): string {
  const labels = kinds.map((k) => KIND_LABELS[k]);
  const list =
    labels.length > 1 ? `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}` : labels[0];
  return `Votre mot contient ${list}. Retirez ces coordonnées : elles s'échangent dans la conversation.`;
}
