/**
 * Citation de la fiche gardien : première phrase à la première personne
 * (« J' », « J’ », « Je »), de 20 à 120 caractères, prise dans la bio puis
 * dans la motivation. Rendue verbatim.
 */
export function splitSentences(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n+|(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const FIRST_PERSON = /^(J['’]|Je\s)/;

export function pickProfileQuote(bio: string | null | undefined, motivation: string | null | undefined): string | null {
  for (const source of [bio, motivation]) {
    for (const s of splitSentences(source)) {
      if (s.length >= 20 && s.length <= 120 && FIRST_PERSON.test(s)) return s;
    }
  }
  return null;
}
