/**
 * Masque les contenus sensibles dans une bio publique avant affichage.
 *
 * Objectif : empêcher la fuite massive de coordonnées personnelles quand la
 * bio est rendue hors-contexte (ex : 50 cartes missions affichées en grille)
 * et inciter les utilisateurs à passer par la messagerie interne plutôt que
 * de contacter directement par email/téléphone.
 *
 * Règles appliquées :
 *  - Emails       → « [contact masqué] »
 *  - Téléphones FR (10 chiffres, +33, espaces/points/tirets) → « [contact masqué] »
 *  - URLs http(s) et domaines en clair → « [lien masqué] »
 *  - Handles @xxx (réseaux sociaux)   → « [contact masqué] »
 *  - Compactage des espaces résiduels.
 *
 * NON appliqué : on ne touche pas à la DB, c'est purement présentationnel.
 * La bio brute reste accessible sur la fiche profil publique (où le contexte
 * est clair) — seul l'affichage hors-contexte est filtré.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Téléphones : +33 6 12 34 56 78, 06.12.34.56.78, 0612345678, 06 12 34 56 78…
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){2,5}\d{2,4}/g;

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s]+/gi;

// Domaines en clair (ex: monsite.fr, exemple.com) — on évite les faux positifs
// type « 06.12.34.56.78 » en exigeant des lettres avant le point.
const BARE_DOMAIN_RE = /\b[a-zA-Z][a-zA-Z0-9-]{1,}\.(?:fr|com|net|org|io|co|app|eu|be|ch|ca|de|es|it|uk)\b/gi;

const HANDLE_RE = /(?:^|\s)@[A-Za-z0-9_.]{2,}/g;

export function sanitizeBioForCard(input: string | null | undefined): string {
  if (!input) return "";
  let out = input;

  // Ordre important : URL avant domaine nu, email avant téléphone (les @ et chiffres
  // d'email peuvent matcher PHONE_RE), handle après email (le @ y est requis).
  out = out.replace(EMAIL_RE, "[contact masqué]");
  out = out.replace(URL_RE, "[lien masqué]");
  out = out.replace(BARE_DOMAIN_RE, "[lien masqué]");
  out = out.replace(HANDLE_RE, " [contact masqué]");

  // Téléphone : on n'écrase que les séquences contenant >=8 chiffres au total
  // pour éviter de masquer « 2 chats, 1 chien ».
  out = out.replace(PHONE_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    return digits.length >= 8 ? "[contact masqué]" : match;
  // Emojis : règle Core « No emoji in content ». On retire toute la classe
  // Unicode des pictogrammes (incl. drapeaux, symboles, ZWJ et sélecteurs de
  // variation), pour ne pas laisser passer 👋 / ❤️ / 🐶 dans les cartes.
  out = out.replace(/\p{Extended_Pictographic}/gu, "");
  out = out.replace(/[\u200D\uFE0F\u20E3]/g, "");

  return out.replace(/\s+/g, " ").trim();
}
