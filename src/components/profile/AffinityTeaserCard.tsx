/**
 * Rail droit — teaser d'affinité pour visiteur NON connecté.
 * Ring flouté (dégradé primary → founder/or), copie invitant à s'inscrire,
 * lien /inscription avec redirect encodé. Pour visiteurs connectés, on n'utilise
 * PAS ce composant : on rend directement OwnerToSitterAffinity / AffinitySection.
 */
import { Link } from "react-router-dom";

interface AffinityTeaserCardProps {
  sitterFirstName: string;
  /** Chemin de retour (sera encodé). Ex: /gardiens/abc?tab=gardien */
  redirectTo: string;
}

const AffinityTeaserCard = ({ sitterFirstName, redirectTo }: AffinityTeaserCardProps) => {
  const href = `/inscription?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <aside
      className="bg-card rounded-2xl border border-border shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_8px_24px_hsl(var(--foreground)/0.05)] p-[22px]"
      aria-label={`Votre affinité avec ${sitterFirstName}`}
    >
      <div className="flex items-center gap-4">
        <div
          className="shrink-0 rounded-full flex items-center justify-center"
          style={{
            width: 68,
            height: 68,
            background:
              "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--founder)), hsl(var(--primary)))",
            padding: 3,
          }}
          aria-hidden="true"
        >
          <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
            <span
              className="font-heading text-[22px] font-semibold text-foreground/70"
              style={{ filter: "blur(5px)" }}
            >
              ••
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
            Affinité
          </p>
          <p className="font-heading text-[16px] font-semibold text-foreground mt-1 leading-tight">
            Votre score avec {sitterFirstName}
          </p>
        </div>
      </div>
      <p className="text-[13.5px] text-muted-foreground mt-4 leading-relaxed">
        Votre affinité avec {sitterFirstName} se calcule sur vos animaux, votre
        secteur et vos habitudes.
      </p>
      <Link
        to={href}
        className="inline-flex items-center gap-1 mt-3 text-primary text-[13px] font-bold hover:underline underline-offset-4"
      >
        Créer mon compte pour la découvrir
        <span aria-hidden="true">→</span>
      </Link>
    </aside>
  );
};

export default AffinityTeaserCard;
