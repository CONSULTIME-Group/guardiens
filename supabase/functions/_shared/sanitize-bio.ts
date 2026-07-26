/**
 * Masquage présentationnel des coordonnées dans une bio, côté edge functions.
 * Miroir de src/lib/sanitizeBio.ts (variante « public », emoji conservés).
 * Aucune écriture en base : uniquement du rendu (OG image, JSON-LD serveur).
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){2,5}\d{2,4}/g;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s]+/gi;
const BARE_DOMAIN_RE =
  /\b[a-zA-Z][a-zA-Z0-9-]{1,}\.(?:fr|com|net|org|io|co|app|eu|be|ch|ca|de|es|it|uk)(?=$|[\s,;:!?)"']|\/|\.(?:\s|$))/g;
const HANDLE_RE = /(?:^|\s)@[A-Za-z0-9_.]{2,}/g;
const DATE_RE =
  /\b(0?[1-9]|[12]\d|3[01])[\s./-](0?[1-9]|1[0-2])[\s./-](?:19|20)\d{2}\b/;

export function sanitizeBioForPublic(input: string | null | undefined): string {
  if (!input) return "";
  let out = input;
  out = out.replace(EMAIL_RE, "[contact masqué]");
  out = out.replace(URL_RE, "[lien masqué]");
  out = out.replace(BARE_DOMAIN_RE, "[lien masqué]");
  out = out.replace(HANDLE_RE, " [contact masqué]");
  out = out.replace(PHONE_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 8) return match;
    if (DATE_RE.test(match.trim())) return match;
    return "[contact masqué]";
  });
  return out.replace(/[ \t]+/g, " ").trim();
}
