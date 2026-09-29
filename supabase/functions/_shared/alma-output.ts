/**
 * Lot J4 : filets de sortie d'Alma, purs et testés. Ils complètent la
 * consigne du modèle, qui reste la première barrière.
 *
 * 1. Le score du profil n'est transmis au modèle que sous 40 % ou sur une
 *    question explicite sur le profil.
 * 2. « gratuit » sous toutes ses formes est reformulé.
 * 3. Une anecdote (sieste, nuit, chats, forêt) en ouverture passe en fin de
 *    réponse, en une phrase, et disparaît en cas d'aide, de frustration ou de
 *    problème.
 */
import { isProfileQuestion, PROFILE_SEARCH_THRESHOLD } from "./alma-next-action.ts";

export function almaProfileVisibleToModel(completion: number | null, question: string): boolean {
  if (isProfileQuestion(question)) return true;
  return completion !== null && completion < PROFILE_SEARCH_THRESHOLD;
}

/** Reformule les mots proscrits dans la voix d'Alma. */
export function rewriteForbiddenWords(text: string): string {
  return (text || "")
    .replace(/\b(du|le|au|un|son|votre) logement gratuitement\b/gi, (_m, det: string) => `${det} logement sans rien payer`)
    .replace(/\bgratuitement\b/gi, "sans rien payer pour le logement")
    .replace(/\bgratuit[ée]s?\b/gi, (m) => (/^G/.test(m) ? "Sans frais" : "sans frais"))
    .replace(/\bla gratuit[ée]\b/gi, "l'absence de frais")
    .replace(/\bgratuits?\b/gi, "sans frais")
    .replace(/\bvoisinage\b/gi, "entourage")
    .replace(/\bvoisin(e|es|s)?\b/gi, "personne du coin");
}

const ANECDOTE = /(sieste|marche du milieu|escalier|j'ai (pass[ée] la nuit|dormi|r[êe]v[ée]|vu un)|mes pattes|vibrisse|chiffonn|[ée]cureuil|je poursui|courir apr[èe]s un chat|chats? qui m'a|for[êe]t (des|dans les) monts|monts (du )?lyonnais|j'y courr|mon humeur)/i;

function splitSentences(paragraph: string): string[] {
  return paragraph.split(/(?<=[.!?…])\s+/).filter(Boolean);
}

/**
 * L'information et l'action d'abord. Les phrases d'anecdote qui ouvrent la
 * réponse sont retirées ; la première revient en fin de réponse si le moment
 * s'y prête, jamais en cas d'aide recherchée, de frustration ou de problème.
 * Sur une question qui concerne Alma (perso), la réponse reste intacte.
 */
export function moveOpeningAnecdote(text: string, opts: { perso: boolean; quiet: boolean }): string {
  if (opts.perso || !text) return text;
  const paragraphs = text.split(/\n{2,}/);
  const moved: string[] = [];
  while (paragraphs.length > 0) {
    const sentences = splitSentences(paragraphs[0]);
    let i = 0;
    while (i < sentences.length && ANECDOTE.test(sentences[i])) moved.push(sentences[i++]);
    if (i === 0) break;
    if (i < sentences.length) {
      paragraphs[0] = sentences.slice(i).join(" ");
      break;
    }
    paragraphs.shift();
  }
  if (moved.length === 0) return text;
  if (paragraphs.length === 0) return text;
  const body = paragraphs.join("\n\n").trim();
  const tail = opts.quiet ? null : moved.find((s) => s.length <= 160) ?? null;
  return tail ? `${body}\n\n${tail}` : body;
}

export function polishAlmaAnswer(text: string, opts: { perso: boolean; quiet: boolean }): string {
  return moveOpeningAnecdote(rewriteForbiddenWords(text), opts).trim();
}
