// Lot J2-B : classification par le modèle, dans le même appel que la réponse.
// Le modèle termine sa réponse par une ligne CLASSEMENT: {json}. Le serveur la
// lit, la retire du texte et la croise avec les motifs de J1 (filet de sécurité).
// Module pur, sans dépendance, partagé par alma-chat, les tests et l'admin.
import type { AlmaIntent } from "./alma-intent.ts";

export const ALMA_INTENTS = [
  "aide_recherchee", "garde", "entraide", "projet", "dossier",
  "mode_emploi", "sensible", "perso", "depart", "autre",
] as const;
export type AlmaIntentKind = (typeof ALMA_INTENTS)[number];

export interface AlmaClassification {
  intent: AlmaIntentKind;
  frustration: 0 | 1 | 2 | 3;
  bug_suspected: boolean;
  bug_item: string | null;
  churn: boolean;
  unanswered: boolean;
  /** model : lu dans la réponse ; patterns : motifs seuls ; merged : les deux. */
  source: "model" | "patterns" | "merged";
}

export const CLASSIFICATION_DIRECTIVE = `CLASSEMENT, obligatoire, invisible pour la personne. Après ta réponse, ajoute une dernière ligne, seule, exactement de cette forme :
CLASSEMENT: {"intent":"…","frustration":0,"bug_suspected":false,"bug_item":"","churn":false,"unanswered":false}
intent parmi : aide_recherchee (elle cherche quelqu'un pour ses animaux ou sa maison), garde, entraide, projet, dossier (son profil, ses annonces, ses candidatures), mode_emploi (comment faire sur le site), sensible, perso (questions sur toi), depart, autre.
frustration de 0 (sereine) à 3 (très agacée : majuscules, points d'exclamation, reproche).
bug_suspected true si elle décrit un élément du site qui ne répond pas ; bug_item nomme cet élément en quelques mots.
churn true si elle veut supprimer son compte ou quitter le site.
unanswered true si tu ne sais pas répondre ou ne peux pas vérifier ce qu'elle affirme dans les faits reçus.
Même agacée, tu réponds d'abord à sa question, sans humour ni anecdote, puis tu proposes d'écrire à Jérémie et Elisa sur /contact.`;

// Lot J3 : la ligne est lue où qu'elle soit (le modèle place parfois BROUILLON
// après elle), avec ou sans gras Markdown ni bloc de code. Avant J3, seule une
// ligne finale était reconnue, et le repli effaçait tout ce qui suivait
// « CLASSEMENT », BROUILLON compris.
const LINE_RE = /^[ \t>*_`]*CLASSEMENT[ \t*_`]*:[ \t*_`]*(\{[^\n]*\})[ \t*_`]*$/im;
const BROKEN_LINE_RE = /^[ \t>*_`]*CLASSEMENT[ \t*_`]*:[^\n]*$/gim;

function asBool(v: unknown): boolean {
  return v === true || v === "true";
}

function stripLine(text: string, re: RegExp): string {
  const withBreak = new RegExp(`\\n?${re.source}`, re.flags.includes("g") ? re.flags : re.flags + "g");
  return text.replace(withBreak, "").replace(/```(?:json)?\s*```/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Lit et retire la ligne CLASSEMENT. Une ligne illisible est retirée quand même, seule. */
export function extractClassification(text: string): { answer: string; classification: AlmaClassification | null } {
  const m = text.match(LINE_RE);
  if (!m) {
    // Une ligne tronquée ne doit jamais s'afficher, le reste du texte est conservé.
    return { answer: stripLine(text, BROKEN_LINE_RE), classification: null };
  }
  const answer = stripLine(text, LINE_RE);
  try {
    const raw = JSON.parse(m[1]);
    const intent = (ALMA_INTENTS as readonly string[]).includes(raw?.intent) ? raw.intent : "autre";
    const f = Math.max(0, Math.min(3, Math.round(Number(raw?.frustration) || 0))) as 0 | 1 | 2 | 3;
    const item = typeof raw?.bug_item === "string" && raw.bug_item.trim() ? raw.bug_item.trim().slice(0, 120) : null;
    return {
      answer,
      classification: {
        intent,
        frustration: f,
        bug_suspected: asBool(raw?.bug_suspected),
        bug_item: item,
        churn: asBool(raw?.churn),
        unanswered: asBool(raw?.unanswered),
        source: "model",
      },
    };
  } catch {
    return { answer, classification: null };
  }
}

/** Classification déduite des seuls motifs, quand le modèle n'a rien renvoyé. */
export function classificationFromPatterns(intent: AlmaIntent): AlmaClassification {
  return {
    intent: intent.helpSeeking ? "aide_recherchee" : intent.churn || intent.leaving ? "depart" : "autre",
    // Motifs resserrés au lot J2-B : un motif reconnu est un vrai signal (niveau 2 au moins).
    frustration: (intent.frustration ? Math.max(2, Math.min(3, intent.frustrationLevel)) : 0) as 0 | 1 | 2 | 3,
    bug_suspected: intent.bugSuspected,
    bug_item: null,
    churn: intent.churn,
    unanswered: false,
    source: "patterns",
  };
}

/**
 * Croise modèle et motifs : un drapeau levé par l'un reste levé. Exception :
 * un départ poli (« au revoir », « tant pis ») ne lève jamais frustration ni churn.
 */
export function mergeClassification(model: AlmaClassification | null, intent: AlmaIntent): AlmaClassification {
  const net = classificationFromPatterns(intent);
  if (!model) return net;
  if (intent.politeGoodbye && !intent.frustration) {
    return { ...model, frustration: 0, churn: false, source: "merged" };
  }
  const changed = net.frustration > model.frustration || (net.bug_suspected && !model.bug_suspected) || (net.churn && !model.churn);
  return {
    intent: model.intent === "autre" && net.intent !== "autre" ? net.intent : model.intent,
    frustration: Math.max(model.frustration, net.frustration) as 0 | 1 | 2 | 3,
    bug_suspected: model.bug_suspected || net.bug_suspected,
    bug_item: model.bug_item,
    churn: model.churn || net.churn,
    unanswered: model.unanswered,
    source: changed ? "merged" : "model",
  };
}

/** Types de signaux à lever pour cette classification. */
export function signalsFor(c: AlmaClassification): string[] {
  const out: string[] = [];
  if (c.frustration >= 2) out.push("alma_frustration");
  if (c.bug_suspected) out.push("alma_bug_report");
  if (c.churn) out.push("alma_churn");
  if (c.unanswered) out.push("alma_unanswered");
  return out;
}

/** Le bouton « Écrire à Jérémie et Elisa » s'affiche sous la réponse. */
export function needsHumanContact(c: AlmaClassification): boolean {
  return c.frustration >= 2 || c.bug_suspected || c.unanswered || c.churn;
}
