/**
 * Détection de coordonnées personnelles dans un texte public.
 *
 * Une annonce d'entraide est une page publique indexable : y laisser un
 * numéro de téléphone ou une adresse email expose le membre et sort
 * l'échange de la plateforme. La détection est bloquante à la publication,
 * contrairement à la messagerie privée où l'échange de coordonnées est
 * légitime.
 *
 * La détection travaille sur deux formes : le texte brut, et une forme
 * normalisée où les contournements écrits en toutes lettres (arobase,
 * point, dot, chiffres en lettres) sont ramenés à leurs caractères.
 */

const PHONE_RE = /(?:(?:\+33|0033|0)\s?[1-9](?:[\s.\-]?\d{2}){4})/;
const EMAIL_RE = /[\w.+-]+\s?(?:@|\(at\)|\[at\]|\sarobase\s)\s?[\w-]+\.[\w.-]+/i;
const OBFUSCATED_PHONE_RE = /\b0\s?[1-9](?:[\s.\-]*\d){8}\b/;

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
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

export type ContactDetailKind = "phone" | "email";

export function detectContactDetails(input: string | null | undefined): ContactDetailKind[] {
  if (!input || !input.trim()) return [];
  const raw = input;
  const normalized = normalizeObfuscatedContact(input);
  // Variante compactée : « 0 6 1 2 ... » issu des chiffres en lettres.
  const compacted = normalized.replace(/(?<=\d)[\s.\-]+(?=\d)/g, "");

  const found: ContactDetailKind[] = [];
  const candidates = [raw, normalized, compacted];

  if (candidates.some((c) => PHONE_RE.test(c) || OBFUSCATED_PHONE_RE.test(c))) found.push("phone");
  if (candidates.some((c) => EMAIL_RE.test(c))) found.push("email");
  return found;
}

export function contactDetailsMessage(kinds: ContactDetailKind[]): string {
  const labels = kinds.map((k) => (k === "phone" ? "un numéro de téléphone" : "une adresse email"));
  const list =
    labels.length > 1 ? `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}` : labels[0];
  return `Votre annonce contient ${list}. Une annonce d'entraide est une page publique : retirez ces coordonnées, vos échanges se poursuivront dans la messagerie une fois la mise en relation faite.`;
}
