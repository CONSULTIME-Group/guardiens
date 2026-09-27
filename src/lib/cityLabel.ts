/**
 * Mise en forme d'un nom de commune saisi librement :
 * « poleymieux au mont'dor » => « Poleymieux-au-Mont-d'Or ».
 * Mots liés par des tirets dès qu'une particule française (au, sur, de...)
 * ou « Saint » est présente ; particules en minuscules sauf en tête.
 * Sans particule, les mots gardent leurs espaces (« New York »).
 */
const PARTICLES = new Set(["au", "aux", "en", "de", "des", "du", "la", "le", "les", "sur", "sous", "lès", "lez", "et"]);

const cap = (w: string) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w);

function formatWord(w: string, first: boolean): string {
  const elided = /^([dl])['’](.+)$/.exec(w);
  if (elided) return `${first ? elided[1].toUpperCase() : elided[1]}'${cap(elided[2])}`;
  if (!first && PARTICLES.has(w)) return w;
  return cap(w);
}

export function formatCityLabel(raw: string | null | undefined): string {
  const clean = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  let tokens = clean.toLowerCase().split(/[\s-]+/).filter(Boolean);
  // « mont'dor » (apostrophe mal placée) : « mont » + « d'or ».
  tokens = tokens.flatMap((t) => {
    const m = /^(\p{L}{3,})['’]([dl])(\p{L}+)$/u.exec(t);
    return m ? [m[1], `${m[2]}'${m[3]}`] : [t];
  });
  const hyphenate =
    tokens.length > 1 &&
    (tokens.slice(1).some((t) => PARTICLES.has(t) || /^[dl]['’]/.test(t)) || /^saint/.test(tokens[0]));
  const words = tokens.map((t, i) => formatWord(t, i === 0));
  return words.join(hyphenate ? "-" : " ");
}
