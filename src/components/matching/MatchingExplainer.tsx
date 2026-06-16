/**
 * Bloc pédagogique : explique le score d'affinité réciproque.
 * Affiché dans l'onboarding (les deux rôles) et sur les pages profil
 * à côté des champs alimentant le matching.
 * Aucune icône Lucide ni emoji dans le contenu.
 */
interface MatchingExplainerProps {
  role: "owner" | "sitter";
  variant?: "card" | "inline";
  className?: string;
}

const COPY = {
  owner: {
    title: "Vos réponses alimentent un score d'affinité",
    body:
      "Rythme de vie, langues, intérêts, ambiance du foyer, profil idéal recherché, animaux : ces champs calculent automatiquement un pourcentage d'affinité visible des deux côtés (vous et le gardien). Plus votre profil est complet, plus le score est fiable et plus les bons gardiens vous repèrent.",
  },
  sitter: {
    title: "Vos réponses alimentent un score d'affinité",
    body:
      "Rythme de vie, langues, intérêts, animaux gardés, compétences spéciales, disponibilité pendant la garde : ces champs calculent automatiquement un pourcentage d'affinité visible des deux côtés (vous et le propriétaire). Plus votre profil est complet, plus le score est fiable et plus les propriétaires compatibles vous contactent.",
  },
} as const;

const MatchingExplainer = ({ role, variant = "card", className = "" }: MatchingExplainerProps) => {
  const copy = COPY[role];
  if (variant === "inline") {
    return (
      <p className={`text-xs text-muted-foreground leading-relaxed ${className}`}>
        <span className="font-medium text-foreground">{copy.title}.</span> {copy.body}
      </p>
    );
  }
  return (
    <div
      className={`rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5 ${className}`}
      role="note"
      aria-label="Explication du score d'affinité"
    >
      <p className="text-sm font-semibold text-foreground">{copy.title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{copy.body}</p>
    </div>
  );
};

export default MatchingExplainer;
