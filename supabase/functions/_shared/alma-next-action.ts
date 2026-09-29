/**
 * Lot J2-A : moteur de prochaine action d'Alma.
 *
 * Fonction pure et déterministe. À partir des faits vérifiés et de
 * l'inventaire, elle calcule une action principale cliquable et jusqu'à trois
 * pastilles. Elle remplace la liste « L'ACTION SUIVANTE » du prompt, qui
 * plaçait le profil avant l'entraide.
 */
import type { VerifiedFacts } from "./alma-facts.ts";
import type { AlmaInventory } from "./alma-inventory.ts";
import { foldText } from "./alma-site-knowledge.ts";

export interface AlmaAction {
  label: string;
  path: string;
  reason: string;
}

export interface AlmaChip {
  label: string;
  path?: string;
  prompt?: string;
}

export type ActionPlacement = "end" | "after" | "none";

export interface NextActionInput {
  facts: VerifiedFacts;
  inventory: AlmaInventory;
  accountRole: "owner" | "sitter" | "both" | null;
  activeRole: "owner" | "sitter";
  question: string;
  register: "dossier" | "reassurance" | "sensible" | "perso";
  helpIntent?: boolean;
  frustration?: boolean;
  leaving?: boolean;
  largeAnimals?: boolean;
  /** Complétion du profil (0 à 100), null si inconnue. */
  completion: number | null;
  /** Le profil a déjà été proposé dans cette conversation. */
  profileAlreadySuggested?: boolean;
  /** Chemin de la page ouverte, par exemple /sits/abc. */
  pagePath?: string | null;
}

export interface NextActionResult {
  action: AlmaAction | null;
  chips: AlmaChip[];
  placement: ActionPlacement;
}

/** Seuil sous lequel un profil gardien n'apparaît pas dans la recherche. */
export const PROFILE_SEARCH_THRESHOLD = 40;

/** Lot J4 : vrai quand la question porte explicitement sur le profil. */
export function isProfileQuestion(question: string): boolean {
  return PROFILE_ASKED.test(foldText(question)) || /\bprofil\b/.test(foldText(question));
}

const PROFILE_ASKED = /(mon profil|ma completion|mon score|completer mon profil|qu'est-ce qui manque|ce qui manque a mon profil|visible)/;
const SIT_INTENT = /(je pars|partir|depart|vacances|faire garder|garder (mes|ma|mon|nos)|garde de (mes|ma|maison)|absence|trouver un gardien|chevaux|poneys|troupeau|chevres|moutons|poules)/;
const HOWTO_SIT = /comment se passe une garde/;

/** Titre prêt pour une demande d'entraide, déduit des mots de la question. */
export function suggestMissionTitle(question: string): string {
  const q = foldText(question);
  if (/echec/.test(q)) return "Une partie d'échecs entre gens du coin";
  if (/scrabble/.test(q)) return "Une partie de Scrabble entre gens du coin";
  if (/belote|cartes/.test(q)) return "Une belote entre gens du coin";
  if (/legume|potager/.test(q)) return "Légumes du potager à partager";
  if (/jardin|tondre|haie|tailler/.test(q)) return "Un coup de main au jardin";
  if (/course|marche\b|marché/.test(q)) return "Courses au marché ensemble";
  if (/trajet|voiture|covoitur|conduire/.test(q)) return "Un trajet en voiture";
  if (/cheva|poney|equid/.test(q)) return "Un coup de main pour mes chevaux et poneys";
  if (/chat|chien|animal|animaux/.test(q)) return "Passer nourrir mes animaux";
  return "Une partie de Scrabble entre gens du coin";
}

/** Titre prêt pour une annonce de garde. */
export function suggestSitTitle(question: string): string {
  const q = foldText(question);
  if (/cheva|poney|equid/.test(q)) return "Garde de mes chevaux et poneys";
  if (/chevre|mouton|poule|ferme|troupeau/.test(q)) return "Garde de mes animaux de ferme";
  if (/chat/.test(q)) return "Garde de mes chats à la maison";
  if (/chien/.test(q)) return "Garde de mon chien à la maison";
  return "Garde de ma maison et de mes animaux";
}

/** Lot J3 : un départ ou une absence déclarés, pas seulement des animaux. */
const DEPARTURE_INTENT = /(je pars|partir|depart|vacances|faire garder|garde de|garder (mes|ma|mon|nos)|absence|absente?|trouver un gardien|week-end|weekend)/;

const withTitle = (path: string, title: string) => `${path}?titre=${encodeURIComponent(title)}`;

function sitIdFromPath(path?: string | null): string | null {
  const m = (path || "").match(/^\/(?:sits|annonces)\/([^/?#]+)$/);
  if (!m || m[1] === "create" || m[1] === "international") return null;
  return m[1];
}

export function computeNextAction(input: NextActionInput): NextActionResult {
  const q = foldText(input.question);
  const { facts, inventory } = input;
  const role = input.accountRole ?? input.activeRole;
  const ownerSide = role === "owner" || role === "both" || input.activeRole === "owner";
  const sitterSide = role === "sitter" || (role === "both" && (input.activeRole === "sitter" || Object.keys(facts.candidatures_envoyees).length > 0));
  const candidates: AlmaAction[] = [];

  const placement: ActionPlacement =
    input.register === "perso" ? "none"
      : input.frustration || input.leaving ? "after"
      : input.register === "sensible" ? "after"
      : "end";

  const sitIntent = SIT_INTENT.test(q) || Boolean(input.largeAnimals);

  // Qui cherche de l'aide : publier passe devant tout. Lot J3 : l'annonce de
  // garde passe devant seulement si la personne parle d'un départ ; des
  // animaux seuls (« de l'aide pour mes chevaux ») relèvent d'abord de l'entraide.
  // Lot J4 : des chevaux ou un troupeau ne sont pas un départ. Avant J4,
  // largeAnimals suffisait à placer la garde devant (test du 29/09, 17:25).
  if (input.helpIntent) {
    if (DEPARTURE_INTENT.test(q)) {
      candidates.push({ label: "Publier mon annonce de garde", path: withTitle("/sits/create", suggestSitTitle(input.question)), reason: "aide_garde" });
      candidates.push({ label: "Demander un coup de main", path: withTitle("/petites-missions/creer", suggestMissionTitle(input.question)), reason: "aide_entraide" });
    } else {
      candidates.push({ label: "Demander un coup de main", path: withTitle("/petites-missions/creer", suggestMissionTitle(input.question)), reason: "aide_entraide" });
      candidates.push({ label: "Publier une annonce de garde", path: withTitle("/sits/create", suggestSitTitle(input.question)), reason: "aide_garde" });
    }
  }

  // 1. Propriétaire.
  if (ownerSide) {
    const draft = facts.brouillons[0];
    if (draft) candidates.push({ label: `Publier le brouillon${draft.titre ? ` « ${draft.titre} »` : ""}`, path: `/sits/create?draftId=${draft.sit_id}`, reason: "brouillon" });
    if (facts.candidatures_recues_non_ouvertes > 0) candidates.push({ label: "Lire les candidatures reçues", path: "/sits", reason: "candidatures_non_ouvertes" });
    if (!facts.annonces_publiees.length && sitIntent && !input.helpIntent) {
      candidates.push({ label: "Publier mon annonce de garde", path: withTitle("/sits/create", suggestSitTitle(input.question)), reason: "intention_garde" });
    }
  }

  // 2. Gardien.
  if (sitterSide) {
    const nearby = inventory.gardes[0];
    const waiting = (facts.candidature_sans_reponse_jours ?? 0) > 7;
    if (nearby) {
      candidates.push({ label: `Postuler : ${nearby.titre}`, path: `/sits/${nearby.id}?postuler=1`, reason: waiting ? "candidature_sans_reponse" : "annonce_proche" });
    } else if (!input.helpIntent) {
      candidates.push({ label: "Régler mon alerte de secteur", path: "/mon-secteur", reason: "rien_de_proche" });
    }
  }

  // 3. Tous : l'entraide.
  const besoin = inventory.demandes_entraide[0];
  if (besoin) candidates.push({ label: `Répondre à « ${besoin.titre} »`, path: besoin.lien, reason: "entraide_proche" });
  else candidates.push({ label: "Demander un coup de main", path: withTitle("/petites-missions/creer", suggestMissionTitle(input.question)), reason: "entraide_premiere" });
  if (!inventory.projets.length) candidates.push({ label: "Lancer un projet à plusieurs", path: withTitle("/projets/publier", "Planter une haie à plusieurs"), reason: "projet_premier" });
  else candidates.push({ label: `Voir « ${inventory.projets[0].titre} »`, path: inventory.projets[0].lien, reason: "projet_proche" });
  const question = inventory.questions_sans_reponse[0];
  if (question) candidates.push({ label: `Répondre à la question « ${question.titre} »`, path: question.lien, reason: "question_sans_reponse" });
  if (inventory.hors_france || /etranger|international|hors de france/.test(q)) {
    candidates.unshift({ label: "Voir les gardes à l'international", path: "/annonces/international", reason: "international" });
  }

  // 4. Profil : seulement sur demande, ou sous le seuil de visibilité, une fois.
  const asked = PROFILE_ASKED.test(q);
  const invisible = input.completion !== null && input.completion < PROFILE_SEARCH_THRESHOLD && !input.profileAlreadySuggested && !input.helpIntent;
  const profilePath = input.activeRole === "owner" ? "/owner-profile" : "/profile";
  if (asked) candidates.unshift({ label: "Compléter mon profil", path: profilePath, reason: "profil_demande" });
  else if (invisible) candidates.push({ label: "Compléter mon profil", path: profilePath, reason: "profil_invisible" });

  // Dédoublonnage par chemin.
  const seen = new Set<string>();
  const unique = candidates.filter((c) => (seen.has(c.path) ? false : (seen.add(c.path), true)));

  const action = placement === "none" ? null : unique[0] ?? null;

  // Pastilles : écran courant, puis actions suivantes, puis une question utile.
  const chips: AlmaChip[] = [];
  const sitId = sitIdFromPath(input.pagePath);
  if (sitId && input.activeRole === "sitter") chips.push({ label: "Je postule", path: `/sits/${sitId}?postuler=1` });
  for (const c of unique.slice(action ? 1 : 0)) {
    if (chips.length >= 2) break;
    if (!chips.some((x) => x.path === c.path)) chips.push({ label: c.label, path: c.path });
  }
  if (!HOWTO_SIT.test(q)) {
    chips.push({
      label: "Comment se passe une garde ?",
      prompt: input.activeRole === "owner"
        ? "Comment se passe une garde, côté propriétaire ?"
        : "Comment se passe une garde, côté gardien ?",
    });
  }
  return { action, chips: chips.slice(0, 3), placement };
}

/** Consigne transmise au modèle avec l'action calculée. */
export function formatActionDirective(r: NextActionResult): string {
  if (!r.action || r.placement === "none") {
    return "PROCHAINE ACTION : aucune pour ce tour. Réponds, puis rends la main.";
  }
  const when = r.placement === "after"
    ? "Réponds d'abord pleinement ; l'action vient ensuite, en une phrase, ou pas du tout si elle détonne."
    : "Termine ta réponse par cette action, en une phrase qui la nomme par le nom de sa page, sans écrire le chemin.";
  return [
    `PROCHAINE ACTION CALCULÉE : « ${r.action.label} », chemin ${r.action.path.split("?")[0]} (motif : ${r.action.reason}).`,
    when,
    "Un bouton cliquable portant cette action s'affiche sous ta réponse : tu n'as pas à recopier les paramètres du lien.",
    "Tu ne proposes aucune autre action que celle ci.",
  ].join("\n");
}

/** Chemins de formulaire qui acceptent un préremplissage. */
export const PREFILL_FORMS = ["/petites-missions/creer", "/sits/create", "/projets/publier"] as const;

/** Titre proposé dans le texte : « Je vous propose le titre : "…" ». */
const QUOTED_TITLE_RE = /titre\s*(?:suivant)?\s*:?\s*[«"“]\s*([^»"”\n]{3,100}?)\s*[»"”]/i;
const DRAFT_LINE_RE = /^[ \t*_]*BROUILLON[ \t*_]*:[ \t]*([^\n|]{3,140})(?:\|([^\n]*))?[ \t]*$/im;

function stripPrefillTitle(path: string): string {
  const base = path.split("?")[0];
  if (!(PREFILL_FORMS as readonly string[]).includes(base)) return path;
  const params = new URLSearchParams(path.split("?")[1] ?? "");
  params.delete("titre");
  params.delete("description");
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

/**
 * Lot J3 : le titre du lien prérempli est exactement celui écrit par Alma
 * (ligne BROUILLON, sinon le titre cité dans la réponse), jamais un titre
 * inventé par le moteur. Sans titre d'Alma, le formulaire s'ouvre vide.
 * La ligne BROUILLON est lue où qu'elle soit (avant ou après CLASSEMENT).
 */
export function applyDraftToAction(
  answer: string,
  action: AlmaAction | null,
  chips: AlmaChip[] = [],
): { answer: string; action: AlmaAction | null; chips: AlmaChip[]; title: string | null } {
  const m = answer.match(DRAFT_LINE_RE);
  const cleaned = m ? answer.replace(DRAFT_LINE_RE, "").replace(/\n{3,}/g, "\n\n").trim() : answer;
  const quoted = cleaned.match(QUOTED_TITLE_RE);
  const title = (m ? m[1] : quoted ? quoted[1] : "").trim().replace(/^["«“]\s*|\s*["»”]$/g, "").slice(0, 100) || null;
  const desc = m ? (m[2] || "").trim().slice(0, 1000) : "";
  const outChips = chips.map((c) => (c.path ? { ...c, path: stripPrefillTitle(c.path) } : c));
  if (!action) return { answer: cleaned, action, chips: outChips, title };
  const base = action.path.split("?")[0];
  if (!(PREFILL_FORMS as readonly string[]).includes(base)) return { answer: cleaned, action, chips: outChips, title };
  const params = new URLSearchParams(stripPrefillTitle(action.path).split("?")[1] ?? "");
  if (title) params.set("titre", title);
  if (desc) params.set("description", desc);
  const q = params.toString();
  return { answer: cleaned, action: { ...action, path: q ? `${base}?${q}` : base }, chips: outChips, title };
}
