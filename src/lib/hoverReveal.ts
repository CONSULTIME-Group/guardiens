/**
 * Lot MOB1 (01/11/2026) : actions d'une vignette (supprimer, photo principale,
 * légende, déplacer) révélées au survol sur un écran à souris, visibles en
 * permanence sur un écran tactile. Avant MOB1, « opacity-0 group-hover » les
 * rendait invisibles au toucher : impossible de supprimer la photo de son
 * logement depuis un téléphone (82 % des membres connectés).
 * Le parent porte la classe `group`. Le focus clavier révèle aussi les actions.
 */
export const HOVER_REVEAL =
  "transition-opacity [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100";
