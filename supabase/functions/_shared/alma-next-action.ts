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
import { isStaleDraft, STALE_DRAFT_LABEL, staleDraftPath } from "./alma-truth.ts";
import { isChildCareRequest } from "./mission-child-care.ts";

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
  /**
   * Lot L1 : annonce consultée, publiée et ouverte aux candidatures. Son
   * action passe en tête et aucune autre annonce n'est proposée.
   */
  viewedSit?: { id: string; action: AlmaAction } | null;
  /** Lot L3 : intention de gardien exprimée, aucune action propriétaire. */
  sitterIntent?: boolean;
  /** Lot L3 : au moins une annonce publiée hors de France existe. */
  foreignOpen?: boolean;
  /** Lot L3 : date du jour (ISO court) pour juger un brouillon périmé. */
  today?: string;
}

/**
 * Lot A1 (audit Alma du 14/10/2026) : urgence pour un animal. Aucun bouton de
 * publication ni d'entraide sous un empoisonnement ou une blessure : la
 * réponse renvoie vers le vétérinaire, sans action calculée. Texte replié.
 */
export const ANIMAL_EMERGENCY =
  /\b(avale|a mange du chocolat|chocolat|xylitol|raisins? secs?|empoisonn\w*|intoxi\w*|poison|saigne\w*|saignement|convuls\w*|crise d.epilepsie|ne respire plus|respire mal|etouffe\w*|vomi\w*|diarrhee de sang|renverse par|percute|accident|morsure|mordu|fugue\w*|s.est echappe\w*|perdu mon (chien|chat)|a disparu|coup de chaleur|ne bouge plus|inconscient)\b/;

export function isAnimalEmergency(question: string): boolean {
  return ANIMAL_EMERGENCY.test(foldText(question));
}

export interface NextActionResult {
  action: AlmaAction | null;
  chips: AlmaChip[];
  placement: ActionPlacement;
}

/** Seuil sous lequel un profil gardien n'apparaît pas dans la recherche. */
export const PROFILE_SEARCH_THRESHOLD = 40;

/** Texte déjà replié (sans accents, minuscules). */
export const ROLE_SWITCH_INTENT = /\binvers|\bbascul|changer d.espace|changer de (role|compte)|passer (en|cote|du cote) (espace )?(gardien|guardien|proprietaire)/;

/** Lot J4 : vrai quand la question porte explicitement sur le profil. */
export function isProfileQuestion(question: string): boolean {
  return PROFILE_ASKED.test(foldText(question)) || /\bprofil\b/.test(foldText(question));
}

// Lot L3 : « visible » seul déclenchait sur « mon annonce est-elle visible ».
const PROFILE_ASKED = /(mon profil|ma completion|mon score|completer mon profil|qu'est-ce qui manque|ce qui manque a mon profil|profil (est-il |est )?visible|suis-je visible)/;
const SIT_INTENT = /(je pars|partir|depart|vacances|faire garder|garder (mes|ma|mon|nos)|garde de (mes|ma|maison)|absence|trouver un gardien|chevaux|poneys|troupeau|chevres|moutons|poules)/;
const HOWTO_SIT = /comment se passe une garde/;

/**
 * Lot A2 (audit Alma du 14/10/2026) : mots d'entraide dans la question. Le
 * repli « Demander un coup de main » (entraide_premiere) ne part que sur une
 * intention d'aide ou sur ces mots. Texte replié, mots entiers.
 */
export const ENTRAIDE_WORDS =
  /\b(entraide|coups? de main|petites? missions?|potager|jardin|jardinage|tondre|haie|courses|trajets?|covoiturage|jeux? de societe|scrabble|belote|echecs|partie de cartes|bricolage|legumes)\b/;

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
// Lot L3 : « garde de » seul déclenchait sur « je cherche une garde de chien ».
const DEPARTURE_INTENT = /(je pars|partir|depart|vacances|faire garder|garde de (mes|ma|mon|nos)|garder (mes|ma|mon|nos)|absence|absente?|trouver un gardien|week-end|weekend)/;

const withTitle = (path: string, title: string) => `${path}?titre=${encodeURIComponent(title)}`;

export function sitIdFromPath(path?: string | null): string | null {
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

  // Lot A1 : urgence animale, aucune action ni pastille.
  if (ANIMAL_EMERGENCY.test(q)) return { action: null, chips: [], placement: "none" };

  // Lot A1 : garde d'enfants (lot E12, CGU 7), jamais de formulaire de
  // publication, ni annonce de garde ni demande d'entraide.
  if (isChildCareRequest(input.question)) {
    return {
      action: { label: "Voir l'entraide près de chez moi", path: "/petites-missions", reason: "garde_enfants_hors_entraide" },
      chips: [],
      placement,
    };
  }

  const sitIntent = SIT_INTENT.test(q) || Boolean(input.largeAnimals);
  const entraideAsked = Boolean(input.helpIntent) || ENTRAIDE_WORDS.test(q);

  // Demande d'inverser ou de changer d'espace sur un compte aux deux facettes :
  // on oriente vers le changement d'espace réel, jamais vers l'entraide.
  const switchAsked = role === "both" && ROLE_SWITCH_INTENT.test(q);
  if (switchAsked) {
    // Destination nommée explicitement d'abord, sinon inversion de l'espace courant.
    const wantsSitter = /(espace|cote|passer en|en tant que|devenir) (gardien|guardien)/.test(q);
    const wantsOwner = /(espace|cote|passer en|en tant que|devenir) proprietaire/.test(q);
    const toSitter = wantsSitter !== wantsOwner ? wantsSitter : input.activeRole === "owner";
    return {
      action: toSitter
        ? { label: "Passer en espace gardien", path: "/dashboard?espace=gardien", reason: "changer_espace" }
        : { label: "Passer en espace propriétaire", path: "/dashboard?espace=proprietaire", reason: "changer_espace" },
      chips: [],
      placement,
    };
  }

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
  // Lot L3 : une intention de gardien n'appelle aucune action propriétaire.
  if (ownerSide && !input.sitterIntent) {
    const draft = facts.brouillons[0];
    const today = input.today ?? new Date().toISOString().slice(0, 10);
    if (draft && isStaleDraft(draft, today)) {
      candidates.push({ label: STALE_DRAFT_LABEL, path: staleDraftPath(draft.sit_id), reason: "brouillon_perime" });
    } else if (draft) candidates.push({ label: `Publier le brouillon${draft.titre ? ` « ${draft.titre} »` : ""}`, path: `/sits/create?draftId=${draft.sit_id}`, reason: "brouillon" });
    // Lot A2 : candidatures en attente au sens X3a (pending, viewed,
    // discussing sur annonce ouverte), lien vers l'annonce de la plus ancienne.
    const awaiting = facts.candidatures_en_attente;
    if (awaiting && awaiting.nombre > 0) {
      const path = awaiting.plus_ancienne_annonce ? `/sits/${awaiting.plus_ancienne_annonce}#candidatures` : "/sits";
      candidates.push({ label: "Lire les candidatures reçues", path, reason: "candidatures_en_attente" });
    }
    // Lot A2 : le propriétaire sans annonce publiée ni brouillon reçoit la
    // publication en tête, sans attendre qu'il parle de départ (priorité :
    // plus d'annonces publiées). Un double rôle en espace gardien la reçoit
    // seulement s'il parle d'un départ. Qui cherche de l'aide passe par le
    // bloc helpIntent ci-dessus, qui propose déjà l'annonce de garde.
    // Une garde déjà confirmée côté propriétaire n'appelle pas de nouvelle annonce d'office.
    const ownerFirst = (role === "owner" || input.activeRole === "owner")
      && !(facts.gardes_confirmees ?? []).some((g) => g.side === "proprietaire");
    if (!facts.annonces_publiees.length && !input.helpIntent && ((ownerFirst && !draft) || sitIntent)) {
      candidates.push({ label: "Publier mon annonce de garde", path: withTitle("/sits/create", suggestSitTitle(input.question)), reason: "intention_garde" });
    }
  }

  // 2. Gardien.
  if (sitterSide) {
    const nearby = inventory.gardes[0];
    const waiting = (facts.candidature_sans_reponse_jours ?? 0) > 7;
    if (input.viewedSit) {
      // Lot L1 : jamais une autre annonce tant que celle-ci est ouverte.
    } else if (nearby) {
      candidates.push({ label: `Postuler : ${nearby.titre}`, path: `/sits/${nearby.id}?postuler=1`, reason: waiting ? "candidature_sans_reponse" : "annonce_proche" });
    } else if (!input.helpIntent) {
      candidates.push({ label: "Régler mon alerte de secteur", path: "/mon-secteur", reason: "rien_de_proche" });
    }
  }

  // 3. Tous : l'entraide.
  const besoin = inventory.demandes_entraide[0];
  if (besoin) candidates.push({ label: `Répondre à « ${besoin.titre} »`, path: besoin.lien, reason: "entraide_proche" });
  // Lot A2 : le repli « Demander un coup de main » suit une intention d'aide
  // ou des mots d'entraide ; avant, il partait pour tous (6 propositions à
  // des propriétaires contre 0 annonce de garde, base du 14/10/2026).
  else if (entraideAsked) candidates.push({ label: "Demander un coup de main", path: withTitle("/petites-missions/creer", suggestMissionTitle(input.question)), reason: "entraide_premiere" });
  if (!inventory.projets.length) candidates.push({ label: "Lancer un projet à plusieurs", path: withTitle("/projets/publier", "Planter une haie à plusieurs"), reason: "projet_premier" });
  else candidates.push({ label: `Voir « ${inventory.projets[0].titre} »`, path: inventory.projets[0].lien, reason: "projet_proche" });
  const question = inventory.questions_sans_reponse[0];
  if (question) candidates.push({ label: `Répondre à la question « ${question.titre} »`, path: question.lien, reason: "question_sans_reponse" });
  // Lot L3 : la page internationale n'est proposée que si une annonce hors de France existe.
  // Lot A2 : réservée au côté gardien, un propriétaire cherche un gardien.
  if (sitterSide && input.foreignOpen !== false && (inventory.hors_france || /etranger|international|hors de france/.test(q))) {
    candidates.unshift({ label: "Voir les gardes à l'international", path: "/annonces/international", reason: "international" });
  }

  // 4. Profil : seulement sur demande, ou sous le seuil de visibilité, une fois.
  const asked = PROFILE_ASKED.test(q);
  const invisible = input.completion !== null && input.completion < PROFILE_SEARCH_THRESHOLD && !input.profileAlreadySuggested && !input.helpIntent;
  const profilePath = input.activeRole === "owner" ? "/owner-profile" : "/profile";
  if (asked) candidates.unshift({ label: "Compléter mon profil", path: profilePath, reason: "profil_demande" });
  else if (invisible) candidates.push({ label: "Compléter mon profil", path: profilePath, reason: "profil_invisible" });

  // Lot L1 : l'annonce consultée passe devant tout, les autres annonces sortent.
  if (input.viewedSit) {
    candidates.unshift(input.viewedSit.action);
  }
  const otherSit = (path: string): boolean => {
    if (!input.viewedSit) return false;
    // Lot A2 : les candidatures reçues sur une annonce du membre restent.
    if (path.endsWith("#candidatures")) return false;
    const m = path.match(/^\/(?:sits|annonces)\/([^/?#]+)/);
    return !!m && m[1] !== input.viewedSit.id && m[1] !== "create" && m[1] !== "international";
  };

  // Dédoublonnage par chemin.
  const seen = new Set<string>();
  const unique = candidates.filter((c) => !otherSit(c.path) && (seen.has(c.path) ? false : (seen.add(c.path), true)));

  const action = placement === "none" ? null : unique[0] ?? null;

  // Pastilles : écran courant, puis actions suivantes, puis une question utile.
  const chips: AlmaChip[] = [];
  const sitId = sitIdFromPath(input.pagePath);
  if (sitId && input.activeRole === "sitter" && !input.viewedSit) chips.push({ label: "Je postule", path: `/sits/${sitId}?postuler=1` });
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
    `PROCHAINE ACTION CALCULÉE : « ${r.action.label} », chemin ${r.action.path.split(/[?#]/)[0]} (motif : ${r.action.reason}).`,
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
