/**
 * Décision unique de l'écran de mise en route du parcours de création d'annonce.
 * Fonction pure, isolée et testable, pour que le formulaire, le bouton Continuer
 * et les blocs affichés partagent la même source de vérité.
 *
 * Les animaux sont recommandés, jamais exigés : depuis la décision produit du
 * 12/08/2026 (src/lib/sitPublishRules.ts), une annonce sans animal (maison,
 * jardin, plantes à garder) est légitime et publiable. Ils ne figurent donc
 * pas dans les prérequis bloquants de cet écran.
 *
 * Depuis le 16/08/2026 (tunnel post-inscription propriétaire, lot 1), le
 * prénom et le code postal du profil sont un prérequis bloquant : ils
 * portent la géolocalisation de l'annonce et son en-tête public, et
 * n'étaient demandés nulle part avant ce parcours.
 */

export interface SetupMissingItem {
  id: "identity" | "property" | "photo";
  label: string;
  anchor: string;
}

export interface SetupStateInput {
  /** Données encore en cours de chargement, rien ne doit s'afficher. */
  loading: boolean;
  /** Le logement est enregistré. */
  hasProperty: boolean;
  /**
   * Au moins un animal à faire garder est renseigné. Recommandé pour la
   * qualité des candidatures, jamais bloquant pour la suite du parcours.
   */
  hasPets: boolean;
  /**
   * Au moins une photo existe, toutes sources confondues : galerie du profil,
   * photos du logement, photo de couverture du brouillon.
   */
  hasPhoto: boolean;
  /** Prénom et code postal présents sur le profil (voir isIdentityComplete). */
  hasIdentity: boolean;
  /** L'écran a été ouvert, par le préflight d'arrivée ou volontairement. */
  entered: boolean;
  /** L'écran a été quitté, par Continuer ou par le retour volontaire. */
  dismissed: boolean;
  /** L'ouverture vient d'un clic depuis le formulaire, pas du préflight. */
  voluntary: boolean;
}

export interface SetupState {
  showSetup: boolean;
  missing: SetupMissingItem[];
  missingIds: string[];
  missingLabels: string[];
  /**
   * Le bouton Continuer est actif dès que l'identité, le logement et la
   * photo sont là. Les animaux, recommandés, ne conditionnent jamais la suite.
   */
  canContinue: boolean;
  /** Un retour au formulaire est proposé quand l'entrée était volontaire. */
  canGoBack: boolean;
  identityDone: boolean;
  photoDone: boolean;
  housingDone: boolean;
  petsDone: boolean;
}

/**
 * Identité minimale exigée pour localiser une annonce : prénom exploitable
 * (2 caractères minimum après trim) et code postal français à 5 chiffres.
 * Le parcours de création est réservé aux annonces en France, le contrôle
 * peut donc rester strict.
 */
export const isIdentityComplete = (
  firstName: string | null | undefined,
  postalCode: string | null | undefined,
): boolean =>
  (firstName ?? "").trim().length >= 2 && /^\d{5}$/.test((postalCode ?? "").trim());

export const resolveSetupState = (input: SetupStateInput): SetupState => {
  const missing: SetupMissingItem[] = [];
  if (!input.hasIdentity) {
    missing.push({ id: "identity", label: "Votre prénom et votre code postal", anchor: "setup-identity" });
  }
  if (!input.hasProperty) {
    missing.push({ id: "property", label: "Votre logement", anchor: "housing" });
  }
  if (!input.hasPhoto) {
    missing.push({ id: "photo", label: "Au moins une photo de votre logement", anchor: "gallery" });
  }

  return {
    showSetup: !input.loading && input.entered && !input.dismissed,
    missing,
    missingIds: missing.map((m) => m.id),
    missingLabels: missing.map((m) => m.label),
    canContinue: missing.length === 0,
    canGoBack: input.voluntary,
    identityDone: input.hasIdentity,
    photoDone: input.hasPhoto,
    housingDone: input.hasProperty,
    petsDone: input.hasPets,
  };
};
