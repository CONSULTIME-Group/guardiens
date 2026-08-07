/**
 * Décision unique de l'écran de mise en route du parcours de création d'annonce.
 * Fonction pure, isolée et testable, pour que le formulaire, le bouton Continuer
 * et les blocs affichés partagent la même source de vérité.
 */

export interface SetupMissingItem {
  id: "property" | "pets" | "photo";
  label: string;
  anchor: string;
}

export interface SetupStateInput {
  /** Données encore en cours de chargement, rien ne doit s'afficher. */
  loading: boolean;
  /** Le logement est enregistré. */
  hasProperty: boolean;
  /** Au moins un animal à faire garder est renseigné. */
  hasPets: boolean;
  /**
   * Au moins une photo existe, toutes sources confondues : galerie du profil,
   * photos du logement, photo de couverture du brouillon.
   */
  hasPhoto: boolean;
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
  /** Le bouton Continuer est actif seulement quand les trois prérequis sont là. */
  canContinue: boolean;
  /** Un retour au formulaire est proposé quand l'entrée était volontaire. */
  canGoBack: boolean;
  photoDone: boolean;
  housingDone: boolean;
  petsDone: boolean;
}

export const resolveSetupState = (input: SetupStateInput): SetupState => {
  const missing: SetupMissingItem[] = [];
  if (!input.hasProperty) {
    missing.push({ id: "property", label: "Votre logement", anchor: "housing" });
  }
  if (!input.hasPets) {
    missing.push({ id: "pets", label: "Au moins un animal à faire garder", anchor: "animals" });
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
    photoDone: input.hasPhoto,
    housingDone: input.hasProperty,
    petsDone: input.hasPets,
  };
};
