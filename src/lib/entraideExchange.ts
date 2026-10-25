/**
 * Ce qui est proposé en retour d'un coup de main.
 *
 * Lot E18 (25/10/2026, décision de Jérémie « ok go ça me va », qui remplace
 * « aucun champ de contrepartie » du modèle A du 21/09) : au dépôt, une ligne
 * facultative « En retour, je propose » (suggestions à toucher et texte libre),
 * stockée dans small_missions.exchange_offer. À l'affichage, dans l'ordre :
 *  1. la ligne de l'auteur du besoin ;
 *  2. sinon sa ligne « ce que je propose volontiers » (helps_with) ;
 *  3. sinon la phrase fixe ci-dessous, une seule fois sur la fiche, en corps
 *     normal, sans guillemets. Ni les cartes liées ni l'email ne la portent.
 * La phrase fixe enregistrée sur les besoins publiés avant ce lot (21 sur 22)
 * compte comme une ligne vide.
 */
export const FIXED_EXCHANGE_OFFER =
  "En retour : un merci, un café, ou un coup de main quand ce sera votre tour. Vous voyez ça ensemble.";

/** Suggestions à toucher du formulaire (lot E18). */
export const EXCHANGE_SUGGESTIONS = [
  "Un café",
  "Un repas",
  "Des légumes du jardin",
  "Un coup de main en retour",
  "Un trajet",
] as const;

export const EXCHANGE_OFFER_MAX = 200;

const clean = (value: string | null | undefined) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Ligne saisie par l'auteur, phrase fixe des besoins anciens comptée comme vide. */
export function authorExchangeOffer(exchangeOffer: string | null | undefined): string | null {
  const value = clean(exchangeOffer);
  if (!value) return null;
  if (fold(value) === fold(FIXED_EXCHANGE_OFFER)) return null;
  return value;
}

/**
 * Ligne enregistrée à partir des suggestions touchées et du texte libre :
 * « Un café, des légumes du jardin et une part de tarte ». Vide si rien.
 */
export function composeExchangeOffer(chips: readonly string[], free: string | null | undefined): string {
  const freeText = clean(free).replace(/^(et|ou)\s+/i, "");
  const parts = [...chips.map(clean).filter(Boolean), freeText].filter(Boolean);
  if (parts.length === 0) return "";
  const lowered = parts.map((p, i) => (i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p.charAt(0).toLowerCase() + p.slice(1)));
  const text = lowered.length === 1 ? lowered[0] : `${lowered.slice(0, -1).join(", ")} et ${lowered[lowered.length - 1]}`;
  return text.slice(0, EXCHANGE_OFFER_MAX);
}

export type ExchangeLine =
  | { kind: "author"; label: string; text: string }
  | { kind: "helps_with"; label: string; text: string }
  | { kind: "fixed"; label: null; text: string };

/** Ce que la fiche affiche, une seule fois. */
export function resolveExchangeLine({ exchangeOffer, helpsWith, firstName }: {
  exchangeOffer: string | null | undefined;
  helpsWith?: string | null;
  firstName?: string | null;
}): ExchangeLine {
  const name = clean(firstName);
  const own = authorExchangeOffer(exchangeOffer);
  if (own) return { kind: "author", label: name ? `En retour, ${name} propose` : "En retour", text: own };
  const hw = clean(helpsWith);
  if (hw) return { kind: "helps_with", label: name ? `En retour, ${name} propose volontiers` : "En retour, proposé volontiers", text: hw };
  return { kind: "fixed", label: null, text: FIXED_EXCHANGE_OFFER };
}
