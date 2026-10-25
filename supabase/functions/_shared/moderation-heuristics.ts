// Heuristiques regex rapides de moderate-content (coordonnées, contenu de
// test, mot proscrit). Module pur, sans dépendance Deno : lu par
// moderate-content et par les tests (lot E19, extrait à l'identique).
import type { AutomatedRuleId } from "./moderation-rules.ts";
import { detectPostalAddress } from "./contact-details.ts";

// Regex sans flag /g : .test() sur une regex globale fait avancer lastIndex,
// ce qui rend la détection intermittente dans un isolate Deno réutilisé.
const PHONE_RE = /(?:(?:\+33|0033|0)\s?[1-9](?:[\s.\-]?\d{2}){4})/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const URL_RE = /\bhttps?:\/\/\S+/i;
const FORBIDDEN_WORDS = /\b(voisin|voisine|voisins|voisinage)\b/i;

// Contenu de test ou fictif : interdit sur une annonce, qui est une page
// publique indexée et qui déclenche une notification à des gardiens réels.
// Détection déterministe, indépendante du LLM, appliquée sur un texte
// désaccentué et à espaces normalisés (le titre passait au travers).
const TEST_CONTENT_PATTERNS: RegExp[] = [
  /\btest(s)?\s+(recette|interne|technique)\b/i,
  /\brecette\s+interne\b/i,
  /\bannonce\s+(de\s+)?test\b/i,
  /\b(ceci|cette annonce)\s+est\s+un\s+test\b/i,
  /\bne\s+pas\s+repondre\b/i,
  /\bdo\s+not\s+reply\b/i,
  /\bnepasrepondre\b/i,
  /\baucune\s+candidature\s+attendue\b/i,
  /\bmerci\s+d[e']\s?ignorer\s+cette\s+annonce\b/i,
  /\blorem\s+ipsum\b/i,
  /\bdummy\s+(content|text)\b/i,
];

function normalizeForTestDetection(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

function looksLikeTestContent(text: string): boolean {
  const normalized = normalizeForTestDetection(text);
  return TEST_CONTENT_PATTERNS.some((re) => re.test(normalized));
}

export interface HeuristicsOptions {
  /**
   * Lot E19 : adresse postale retenue, seulement pour le mot laissé après un
   * coup de main (appel interne de mission-quick-action). Les annonces de
   * garde et les autres textes « sit » gardent leur comportement d'avant.
   */
  checkPostalAddress?: boolean;
}

// Doctrine produit : l'échange de coordonnées est AUTORISÉ en messagerie privée
// (le propriétaire doit pouvoir joindre son gardien). Il reste interdit dans les
// annonces, qui sont des pages publiques indexées.
export function heuristics(
  text: string,
  contentType: string,
  options: HeuristicsOptions = {},
): { reasons: string[]; block: boolean; rule: AutomatedRuleId | null } {
  const reasons: string[] = [];
  let block = false;
  let rule: AutomatedRuleId | null = null;
  const isPublicListing = contentType === "sit";
  if (isPublicListing) {
    if (PHONE_RE.test(text)) { reasons.push("Numéro de téléphone détecté"); block = true; rule = "contact_details"; }
    if (EMAIL_RE.test(text)) { reasons.push("Adresse email détectée"); block = true; rule = "contact_details"; }
    if (options.checkPostalAddress && detectPostalAddress(text)) {
      reasons.push("Adresse postale détectée"); block = true; rule = "contact_details";
    }
    if (looksLikeTestContent(text)) {
      reasons.push("Annonce de test interne, ne doit pas être publiée");
      block = true;
      rule = rule ?? "test_content";
    }
  }
  if (URL_RE.test(text)) { reasons.push("Lien externe détecté"); }
  if (FORBIDDEN_WORDS.test(text)) { reasons.push("Vocabulaire à éviter : « voisin »"); }
  return { reasons, block, rule };
}
