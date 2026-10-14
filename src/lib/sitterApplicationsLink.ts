/**
 * Lot Z2 (audit B-16 du 13/10/2026) : une seule adresse pour les candidatures
 * envoyées par le gardien.
 *
 * /mes-candidatures lit get_my_applications et explique l'état de chaque
 * annonce (expirée, close, retenue). /sits en espace gardien lit les
 * candidatures par jointure soumise à la RLS : une annonce non publiée y
 * devient une carte « indisponible ». La barre de navigation (navModel) mène
 * déjà à /mes-candidatures ; le tableau de bord gardien suit.
 */
export const SITTER_APPLICATIONS_PATH = "/mes-candidatures";
