/**
 * Lot E3 (11/10/2026) : personnes lisibles sur la page Entraide.
 *
 * Logique pure, sans lecture : savoir-faire montrés sur la carte, signal
 * d'activité, ordre de la liste et premier message prérempli.
 * Règle de tri : on trie, on n'élimine jamais. Les personnes qui disent pour
 * quoi elles peuvent aider (savoir-faire ou phrase) passent d'abord, les
 * autres restent visibles en fin de liste.
 * Aide aux devoirs acceptée tant que l'échange reste gratuit (le contrôle
 * d'argent des besoins s'applique) ; garde d'enfants exclue (lot E12,
 * décision du 14/10/2026, src/lib/missionChildCare.ts).
 */

export const HELPER_SKILLS_SHOWN = 4;

export interface HelperLike {
  id: string;
  helps_with?: string | null;
  competences?: string[] | null;
  last_active_on?: string | null;
}

/** Libellés surtout utiles pendant une garde : gardés, mais montrés après les autres. */
const SIT_SPECIFIC = /m[ée]dicament|premiers secours|piscine/i;
export const HELPER_SKILL_MAX_CHARS = 40;

function shorten(label: string): string {
  if (label.length <= HELPER_SKILL_MAX_CHARS) return label;
  const cut = label.slice(0, HELPER_SKILL_MAX_CHARS - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 20 ? cut.slice(0, space) : cut).replace(/[\s,;:]+$/, "")}…`;
}

/**
 * Savoir-faire à montrer : nettoyés, sans doublon (casse et accents),
 * libellés propres à la garde en dernier, 40 caractères et 4 au plus.
 */
export function helperSkills(competences: readonly (string | null | undefined)[] | null | undefined, max = HELPER_SKILLS_SHOWN): string[] {
  const seen = new Set<string>();
  const all: string[] = [];
  for (const raw of competences ?? []) {
    const label = (raw ?? "").replace(/\s+/g, " ").trim();
    if (!label) continue;
    const key = label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(label);
  }
  const ordered = [...all.filter((l) => !SIT_SPECIFIC.test(l)), ...all.filter((l) => SIT_SPECIFIC.test(l))];
  return ordered.slice(0, max).map(shorten);
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
  if (days <= 7) return "En ligne cette semaine";
  if (days <= 30) return "En ligne ce mois-ci";
  return null;
}

/** Rayon dans lequel ce qu'une personne propose compte avant la distance. */
export const HELPER_NEAR_KM = 30;

/**
 * Ordre de la liste. Lieu connu : dans un rayon de 30 km, les personnes qui
 * disent pour quoi elles peuvent aider d'abord, puis les autres, chacun par
 * distance ; au-delà, la distance seule. Lieu inconnu : celles qui disent
 * pour quoi elles peuvent aider d'abord, puis l'activité la plus récente.
 * Tri stable, aucune personne retirée.
 */
export function sortHelpers<T extends HelperLike>(helpers: readonly T[], distanceOf?: ((helper: T) => number | null) | null): T[] {
  const rank = helpers.map((helper, index) => {
    const distance = distanceOf ? distanceOf(helper) : null;
    const says = helperSaysHow(helper);
    const tier = !distanceOf
      ? (says ? 0 : 1)
      : distance !== null && distance <= HELPER_NEAR_KM ? (says ? 0 : 1) : 2;
    return {
      helper,
      index,
      tier,
      distance,
      active: helper.last_active_on ? Date.parse(`${helper.last_active_on.slice(0, 10)}T00:00:00Z`) || 0 : 0,
    };
  });
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

/** Premier message prérempli, modifiable avant envoi. */
export function helperFirstMessage(firstName: string, skills: string[]): string {
  const greet = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const named = skills.slice(0, 2);
  const what = named.length > 0
    ? `J'ai vu que vous proposez votre aide pour : ${named.join(", ")}.`
    : "J'ai vu que vous êtes disponible pour donner un coup de main.";
  return `${greet}\n\n${what} J'aurais peut-être besoin d'un coup de main bientôt, pourrait-on en parler ?\n\nMerci !`;
}
