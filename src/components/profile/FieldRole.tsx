import { cn } from "@/lib/utils";

/**
 * Étiquettes de rôle sous un champ du profil (lot SC1, 10/11/2026, design
 * pastel) : disent à quoi sert la réponse. Chaque étiquette est prouvée par
 * le code :
 *  - public : champ lu par la fiche publique (PublicSitterProfile) ;
 *  - match : champ lu par le calcul d'affinité (supabase/functions/_shared/affinity) ;
 *  - match_double : critère de poids 2 du calcul d'affinité.
 */
export type FieldRoleKind = "public" | "match" | "match_double";

/** Libellé court de l'étiquette. */
export const FIELD_ROLE_LABEL: Record<FieldRoleKind, string> = {
  public: "Sur votre fiche",
  match: "Pour vos affinités",
  match_double: "Compte double",
};

/** Phrase complète, lue par les lecteurs d'écran. */
export const FIELD_ROLE_TEXT: Record<FieldRoleKind, string> = {
  public: "Visible sur votre fiche.",
  match: "Sert à vos affinités avec les annonces.",
  match_double: "Compte double dans vos affinités.",
};

const TONE: Record<FieldRoleKind, string> = {
  public: "bg-pastel-peach text-pastel-peach-ink",
  match: "bg-pastel-sage text-pastel-sage-ink",
  match_double: "bg-pastel-sage text-pastel-sage-ink",
};

const FieldRole = ({ roles }: { roles: FieldRoleKind[] }) => (
  <p className="flex flex-wrap gap-1.5" data-testid="field-role">
    {roles.map((r) => (
      <span key={r} className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-medium leading-none", TONE[r])}>
        <span aria-hidden>{FIELD_ROLE_LABEL[r]}</span>
        <span className="sr-only">{FIELD_ROLE_TEXT[r]}</span>
      </span>
    ))}
  </p>
);

export default FieldRole;
