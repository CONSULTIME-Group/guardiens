import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

/**
 * CTA contextuel affiché quand le score d'affinité n'a pas pu être calculé
 * (moins de 3 critères communs renseignés).
 *
 * Affiché uniquement côté gardien sur son propre parcours, jamais à l'autre
 * partie. Liste les champs manquants pour orienter vers l'édition du profil.
 */

export interface AffinityMissingCTAProps {
  /** Profil gardien courant (vue depuis SES yeux). */
  sitterProfile: {
    animal_types?: string[] | null;
    life_pace?: string | null;
    languages?: string[] | null;
    interests?: string[] | null;
  } | null;
  /** Surface (sit_detail | search | favorites | public_profile). Tracking. */
  context: string;
  /** Lien d'édition du profil. */
  editHref?: string;
  className?: string;
}

const FIELD_LABELS: Record<string, string> = {
  animal_types: "vos animaux",
  life_pace: "votre rythme de vie",
  languages: "vos langues",
  interests: "vos centres d'intérêt",
};

const AffinityMissingCTA = ({
  sitterProfile,
  context,
  editHref = "/profil",
  className,
}: AffinityMissingCTAProps) => {
  const missing = useMemo(() => {
    const out: string[] = [];
    if (!sitterProfile?.animal_types?.length) out.push("animal_types");
    if (!sitterProfile?.life_pace) out.push("life_pace");
    if (!sitterProfile?.languages?.length) out.push("languages");
    if (!sitterProfile?.interests?.length) out.push("interests");
    return out;
  }, [sitterProfile]);

  useEffect(() => {
    if (missing.length === 0) return;
    void trackEvent("affinity_badge_seen", {
      metadata: { context: `${context}_missing`, score: null, total: 0, missing },
    });
  }, [missing, context]);

  if (missing.length === 0) return null;

  const labels = missing.map((m) => FIELD_LABELS[m]).filter(Boolean);
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;

  return (
    <aside
      className={`rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 flex items-start gap-3 ${className ?? ""}`}
      aria-label="Compléter votre profil pour voir l'affinité"
    >
      <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Activez votre score d'affinité
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Renseignez {list} pour voir votre compatibilité avec ce profil.
        </p>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link to={editHref}>Compléter</Link>
      </Button>
    </aside>
  );
};

export default AffinityMissingCTA;
