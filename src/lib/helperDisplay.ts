/**
 * Lot E3 (11/10/2026) : personnes lisibles sur la page Entraide.
 *
 * Logique pure, sans lecture : savoir-faire montrés sur la carte, signal
 * d'activité, ordre de la liste et premier message prérempli.
 * Règle de tri : on trie, on n'élimine jamais. Les personnes qui disent pour
 * quoi elles peuvent aider (savoir-faire ou phrase) passent d'abord, les
 * autres restent visibles en fin de liste.
 * Décision du 11/10 : aide aux devoirs et garde d'enfants acceptées tant que
 * l'échange reste gratuit (le contrôle d'argent des besoins s'applique).
 */

export const HELPER_SKILLS_SHOWN = 4;

export interface HelperLike {
  id: string;
  helps_with?: string | null;
  competences?: string[] | null;
  last_active_on?: string | null;
}

/** Savoir-faire à montrer : nettoyés, sans doublon (casse et accents), 4 au plus. */
export function helperSkills(competences: readonly (string | null | undefined)[] | null | undefined, max = HELPER_SKILLS_SHOWN): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of competences ?? []) {
    const label = (raw ?? "").replace(/\s+/g, " ").trim();
    if (!label) continue;
    const key = label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= max) break;
  }
  return out;
}

/** La personne dit pour quoi elle peut aider. */
export function helperSaysHow(helper: HelperLike): boolean {
  return helperSkills(helper.competences).length > 0 || !!helper.helps_with?.trim();
}

const DAY_MS = 86_400_000;

function daysSince(day: string | null | undefined, today: Date): number | null {
  if (!day) return null;
  const parsed = Date.parse(`${day.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed)) return null;
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((todayUtc - parsed) / DAY_MS));
}

/** Signal d'activité affiché sous le prénom, seulement quand il est récent. */
export function helperActivityLabel(lastActiveOn: string | null | undefined, today: Date = new Date()): string | null {
  const days = daysSince(lastActiveOn, today);
  if (days === null) return null;
  if (days <= 7) return "Actif cette semaine";
  if (days <= 30) return "Actif ce mois-ci";
  return null;
}

/**
 * Ordre de la liste : d'abord les personnes qui disent pour quoi elles
 * peuvent aider, puis la distance quand un lieu est connu, sinon l'activité
 * la plus récente. Tri stable, aucune personne retirée.
 */
export function sortHelpers<T extends HelperLike>(helpers: readonly T[], distanceOf?: ((helper: T) => number | null) | null): T[] {
  const rank = helpers.map((helper, index) => ({
    helper,
    index,
    tier: helperSaysHow(helper) ? 0 : 1,
    distance: distanceOf ? distanceOf(helper) : null,
    active: helper.last_active_on ? Date.parse(`${helper.last_active_on.slice(0, 10)}T00:00:00Z`) || 0 : 0,
  }));
  rank.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (distanceOf) {
      if (a.distance !== null && b.distance !== null && a.distance !== b.distance) return a.distance - b.distance;
      if (a.distance !== null && b.distance === null) return -1;
      if (a.distance === null && b.distance !== null) return 1;
    }
    if (a.active !== b.active) return b.active - a.active;
    return a.index - b.index;
  });
  return rank.map((entry) => entry.helper);
}

function joinFr(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

/** Premier message prérempli, modifiable avant envoi. */
export function helperFirstMessage(firstName: string, skills: string[]): string {
  const greet = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const named = skills.slice(0, 2).map((skill) => skill.toLowerCase());
  const what = named.length > 0
    ? `J'ai vu que vous pouvez aider pour ${joinFr(named)}.`
    : "J'ai vu que vous êtes disponible pour donner un coup de main.";
  return `${greet}\n\n${what} J'aurais peut-être besoin d'un coup de main bientôt, pourrait-on en parler ?\n\nMerci !`;
}
