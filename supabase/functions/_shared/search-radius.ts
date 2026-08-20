// Rayon de déplacement gardien, règle de lecture unique (décision du 20/08/2026).
//
// Historique : la colonne sitter_profiles.geographic_radius a longtemps eu un
// DEFAULT 30, copié sur les profils sans que la question soit posée. Mesuré le
// 20/08/2026 : 907 profils sur 1029 à 30 km, dont la quasi-totalité jamais
// modifiés. Impossible de distinguer « je veux 30 km » de « je n'ai jamais
// répondu ». Conséquence actée : 30 km est un marqueur de silence, traité
// comme une absence de réponse, et ne restreint donc plus la distribution.
//
// Ce module est la source partagée client / fonctions edge. La règle de
// distribution elle-même vit en base : public.effective_search_radius().
// Toute divergence entre les deux est un bug.

export const LEGACY_UNANSWERED_RADIUS_KM = 30;
export const EFFECTIVE_DEFAULT_RADIUS_KM = 100;

/** Choix proposés dans le formulaire gardien. 30 n'y figure jamais : c'est le marqueur de silence. */
export const RADIUS_CHOICE_OPTIONS = [10, 15, 20, 25, 40, 50, 75, 100] as const;

/** Vrai uniquement si la valeur est une déclaration : non nulle et différente du marqueur de silence. */
export const isRadiusDeclared = (declared: number | null | undefined): declared is number =>
  typeof declared === "number" && Number.isFinite(declared) && declared > 0 && declared !== LEGACY_UNANSWERED_RADIUS_KM;

/** Rayon réellement appliqué à la distribution. Même logique que public.effective_search_radius(). */
export const effectiveSearchRadius = (declared: number | null | undefined): number =>
  isRadiusDeclared(declared) ? declared : EFFECTIVE_DEFAULT_RADIUS_KM;

/**
 * Une interface ne doit jamais écrire 30 : la valeur serait relue comme un
 * silence. Un curseur qui s'y arrête est ramené à 35, arbitrage documenté.
 */
export const declarableRadius = (value: number): number =>
  value === LEGACY_UNANSWERED_RADIUS_KM ? 35 : value;
