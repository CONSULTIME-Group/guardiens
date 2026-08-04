import { useAuth } from "@/contexts/AuthContext";

export type ShellMode = "app" | "public" | "pending";

/**
 * Source de vérité unique pour choisir la coquille d'une page de contenu.
 *
 * "public"  : visiteur (aucun token détecté) ou vérification terminée sans
 *             session exploitable (token périmé, profil introuvable). Rendu
 *             visiteur strictement inchangé, dès le premier paint.
 * "app"     : session vérifiée et profil chargé, la coquille authentifiée peut
 *             être montée sans nom vide ni rôle neutre.
 * "pending" : un token persistant a été détecté (initialisation paresseuse),
 *             la vérification est en cours. On ne monte ni l'une ni l'autre,
 *             donc aucune permutation de coquille visible.
 */
export const useShellMode = (): ShellMode => {
  const { hasSession, authChecked, loading, user, authTimeout } = useAuth();

  if (authTimeout) return "pending";
  if (!hasSession && !authChecked) return "public";
  if (authChecked && !hasSession) return "public";
  if (hasSession && user) return "app";
  // Session annoncée mais profil absent une fois le chargement terminé :
  // repli explicite sur la page publique plutôt qu'une coquille vide.
  if (authChecked && !loading && !user) return "public";
  return "pending";
};
