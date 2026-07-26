/**
 * Masque les contenus sensibles dans une bio publique avant affichage.
 *
 * Objectif : empêcher la fuite de coordonnées personnelles sur les surfaces
 * publiques et indexables (fiche profil, cartes de recherche, JSON-LD, OG)
 * et inciter les utilisateurs à passer par la messagerie interne.
 *
 * Règles appliquées :
 *  - Emails       → « [contact masqué] »
 *  - Téléphones FR et internationaux → « [contact masqué] »
 *  - URLs http(s) et domaines en clair → « [lien masqué] »
 *  - Handles @xxx (réseaux sociaux)   → « [contact masqué] »
 *  - Compactage des espaces résiduels.
 *
 * NON appliqué : on ne touche jamais à la DB, c'est purement présentationnel.
 *
 * Deux variantes :
 *  - sanitizeBioForCard   : masquage + suppression des emoji (cartes compactes)
 *  - sanitizeBioForPublic : masquage seul, les emoji sont conservés
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Téléphones : +33 6 12 34 56 78, 06.12.34.56.78, 0612345678, 06 12 34 56 78…
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){2,5}\d{2,4}/g;

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s]+/gi;

// Domaines en clair (ex: mon-site.fr, exemple.com).
// Deux garde-fous contre les faux positifs de phrases françaises sans espace
// après le point (« animaux.De plus… ») :
//   - le TLD doit être en minuscules (un point suivi d'une majuscule est une
//     fin de phrase, jamais un domaine),
//   - il doit être suivi d'une fin de chaîne, d'un espace, d'une ponctuation
//     de fin, d'un slash ou d'un début de chemin.
const BARE_DOMAIN_RE =
  /\b[a-zA-Z][a-zA-Z0-9-]{1,}\.(?:fr|com|net|org|io|co|app|eu|be|ch|ca|de|es|it|uk)(?=$|[\s,;:!?)"']|\/|\.(?:\s|$))/g;

const HANDLE_RE = /(?:^|\s)@[A-Za-z0-9_.]{2,}/g;

// Dates : 12 03 2026, 12.03.2026, 12/03/2026, 12-03-2026 (et années 19xx/20xx).
const DATE_RE =
  /\b(0?[1-9]|[12]\d|3[01])[\s./-](0?[1-9]|1[0-2])[\s./-](?:19|20)\d{2}\b/;

/** true si la séquence détectée est en réalité une date (ou une plage de dates). */
function looksLikeDate(match: string): boolean {
  return DATE_RE.test(match.trim());
}

function maskContacts(input: string): string {
  let out = input;

  // Ordre important : URL avant domaine nu, email avant téléphone (les @ et
  // chiffres d'email peuvent matcher PHONE_RE), handle après email.
  out = out.replace(EMAIL_RE, "[contact masqué]");
  out = out.replace(URL_RE, "[lien masqué]");
  out = out.replace(BARE_DOMAIN_RE, "[lien masqué]");
  out = out.replace(HANDLE_RE, " [contact masqué]");

  // Téléphone : on n'écrase que les séquences contenant >= 8 chiffres au total
  // (pour éviter « 2 chats, 1 chien ») et qui ne sont pas des dates.
  out = out.replace(PHONE_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 8) return match;
    if (looksLikeDate(match)) return match;
    return "[contact masqué]";
  });

  return out.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
}

/**
 * Masquage des coordonnées, emoji conservés.
 * À utiliser sur les surfaces publiques longues (fiche profil, JSON-LD, OG).
 */
export function sanitizeBioForPublic(input: string | null | undefined): string {
  if (!input) return "";
  return maskContacts(input);
}

/**
 * Masquage des coordonnées + suppression des emoji.
 * À réserver aux cartes compactes, où l'emoji casse la mise en page.
 */
export function sanitizeBioForCard(input: string | null | undefined): string {
  if (!input) return "";
  let out = maskContacts(input);

  // Emoji : on retire toute la classe Unicode des pictogrammes (incl. drapeaux,
  // symboles, ZWJ et sélecteurs de variation).
  out = out.replace(/\p{Extended_Pictographic}/gu, "");
  out = out.replace(/[\u200D\uFE0F\u20E3]/g, "");

  return out.replace(/\s+/g, " ").trim();
}
