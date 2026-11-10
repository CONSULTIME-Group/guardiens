/**
 * Phrase de rôle sous un champ du profil (lot SC1, 10/11/2026) : dit à quoi
 * sert la réponse, en mots. Chaque phrase est prouvée par le code :
 *  - public : champ lu par la fiche publique (PublicSitterProfile) ;
 *  - match : champ lu par le calcul d'affinité (supabase/functions/_shared/affinity) ;
 *  - match_double : critère de poids 2 du calcul d'affinité.
 */
export type FieldRoleKind = "public" | "match" | "match_double";

export const FIELD_ROLE_TEXT: Record<FieldRoleKind, string> = {
  public: "Visible sur votre fiche.",
  match: "Sert à vos affinités avec les annonces.",
  match_double: "Compte double dans vos affinités.",
};

const FieldRole = ({ roles }: { roles: FieldRoleKind[] }) => (
  <p className="text-xs text-muted-foreground" data-testid="field-role">
    {roles.map((r) => FIELD_ROLE_TEXT[r]).join(" ")}
  </p>
);

export default FieldRole;
