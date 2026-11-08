/**
 * Lot L2 élargi (08/11/2026, arène tableau de bord v2) : Alma ne reprend que
 * des faits déclarés. Filet de sortie des textes rédigés par le modèle :
 * une phrase qui cite un jour de la semaine ou une heure absents du contexte
 * est retirée (simulation du 08/11 : « libre jeudi dès 18 h », « je passe à
 * Annecy le samedi 12 », jamais dits par le membre).
 */

const WEEKDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const HOUR = /\b([01]?\d|2[0-3])\s?h(?:\s?[0-5]\d)?\b/gi;

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Jours et heures cités par un texte, en minuscules sans accents. */
export function citedSlots(text: string): string[] {
  const t = norm(text);
  const out = new Set<string>();
  for (const d of WEEKDAYS) if (new RegExp(`\\b${d}\\b`).test(t)) out.add(d);
  for (const m of t.matchAll(HOUR)) out.add(`${Number(m[1])}h`);
  return [...out];
}

/**
 * Retire les phrases qui citent un jour ou une heure absents du contexte.
 * Renvoie le texte nettoyé et le nombre de phrases retirées.
 */
export function stripUndeclaredSlots(draft: string, context: string): { text: string; removed: number } {
  const allowed = new Set(citedSlots(context));
  let removed = 0;
  const paragraphs = draft.split(/\n{2,}/).map((para) => {
    const sentences = para.split(/(?<=[.!?])\s+/);
    const kept = sentences.filter((s) => {
      const slots = citedSlots(s);
      const ok = slots.every((x) => allowed.has(x));
      if (!ok) removed += 1;
      return ok;
    });
    return kept.join(" ");
  });
  return { text: paragraphs.filter((p) => p.trim() !== "").join("\n\n"), removed };
}

/**
 * Accroche et clôture tirées par couple membre et annonce, pour que deux
 * lettres d'un même gardien ou pour une même annonce varient.
 */
export const LETTER_OPENINGS = [
  "Ouvre la lettre sur les animaux de l'annonce, par leur nom s'il est connu.",
  "Ouvre la lettre sur la commune ou le cadre de la garde.",
  "Ouvre la lettre sur les dates de la garde, sans affirmer de disponibilité.",
] as const;

export const LETTER_CLOSINGS = [
  "Termine en proposant un appel, sans fixer de jour ni d'heure.",
  "Termine par une question ouverte au propriétaire sur ses animaux ou sa maison.",
  "Termine en proposant d'échanger par message pour faire connaissance.",
] as const;

export function letterVariant(seed: string): { opening: string; closing: string } {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  return { opening: LETTER_OPENINGS[u % 3], closing: LETTER_CLOSINGS[Math.floor(u / 3) % 3] };
}

/** Règle des faits déclarés, ajoutée à toute consigne de rédaction d'Alma. */
export const DECLARED_FACTS_RULE =
  "FAITS DÉCLARÉS SEULEMENT : tu cites uniquement ce que contient le contexte. Aucun animal, proche, lieu, voyage, jour, heure ou créneau absent du contexte. Aucune expérience, qualité ou anecdote que les données ne disent pas. Aucun genre supposé.";
