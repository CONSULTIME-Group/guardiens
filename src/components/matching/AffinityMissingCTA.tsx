import { Link } from "react-router-dom";
import { useCallback, useMemo, useRef } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";

/**
 * CTA contextuel affiché quand le score d'affinité n'a pas pu être calculé.
 * Liste les champs manquants côté visiteur pour orienter vers l'édition de son profil.
 *
 * Affiché uniquement sur le parcours du visiteur (jamais à l'autre partie).
 */

interface SitterProfileLike {
  animal_types?: string[] | null;
  life_pace?: string | null;
  languages?: string[] | null;
  interests?: string[] | null;
}

interface OwnerProfileLike {
  life_pace?: string | null;
  languages?: string[] | null;
  interests?: string[] | null;
  presence_expected?: string | null;
  home_ambiance?: string[] | null;
  preferred_sitter_types?: string[] | null;
}

type Props =
  | {
      side: "sitter";
      profile: SitterProfileLike | null;
      context: string;
      editHref?: string;
      className?: string;
      /** Adapte le wording : 'single' (profil/annonce) ou 'list' (page de liste). */
      scope?: "single" | "list";
    }
  | {
      side: "owner";
      profile: OwnerProfileLike | null;
      context: string;
      editHref?: string;
      className?: string;
      scope?: "single" | "list";
    };


const SITTER_LABELS: Record<string, string> = {
  animal_types: "vos animaux",
  life_pace: "votre rythme de vie",
  languages: "vos langues",
  interests: "vos centres d'intérêt",
};

const OWNER_LABELS: Record<string, string> = {
  life_pace: "votre rythme de vie",
  languages: "vos langues",
  interests: "vos centres d'intérêt",
  presence_expected: "votre présence attendue",
  home_ambiance: "l'ambiance du foyer",
  preferred_sitter_types: "votre gardien idéal",
};

const AffinityMissingCTA = (props: Props) => {
  const { side, profile, context, editHref, className, scope = "single" } = props;


  const missing = useMemo(() => {
    if (!profile) return [];
    const out: string[] = [];
    if (side === "sitter") {
      const p = profile as SitterProfileLike;
      if (!p.animal_types?.length) out.push("animal_types");
      if (!p.life_pace) out.push("life_pace");
      if (!p.languages?.length) out.push("languages");
      if (!p.interests?.length) out.push("interests");
    } else {
      const p = profile as OwnerProfileLike;
      if (!p.life_pace) out.push("life_pace");
      if (!p.languages?.length) out.push("languages");
      if (!p.interests?.length) out.push("interests");
      if (!p.presence_expected) out.push("presence_expected");
      if (!p.home_ambiance?.length) out.push("home_ambiance");
      if (!p.preferred_sitter_types?.length) out.push("preferred_sitter_types");
    }
    return out;
  }, [profile, side]);

  const wrapRef = useRef<HTMLElement>(null);
  const dedupeKey =
    missing.length > 0 ? `affinity:${context}_missing:${side}:${missing.join(",")}` : null;
  const onSeen = useCallback(() => {
    void trackEvent("affinity_badge_seen", {
      metadata: { context: `${context}_missing`, score: null, total: 0, missing, side },
    });
  }, [missing, context, side]);
  useImpressionOnce(wrapRef, dedupeKey, onSeen);

  if (missing.length === 0) return null;

  const labels = side === "sitter" ? SITTER_LABELS : OWNER_LABELS;
  const href = editHref ?? (side === "sitter" ? "/profile" : "/owner-profile");
  // On limite à 3 items pour ne pas surcharger le message.
  const shown = missing.slice(0, 3).map((m) => labels[m]).filter(Boolean);
  const list =
    shown.length === 1
      ? shown[0]
      : `${shown.slice(0, -1).join(", ")} et ${shown[shown.length - 1]}`;

  return (
    <aside
      ref={wrapRef as React.RefObject<HTMLElement>}
      className={`rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 flex items-start gap-3 ${className ?? ""}`}
      aria-label="Compléter votre profil pour voir l'affinité"
    >
      <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Activez votre score d'affinité
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Renseignez {list} pour voir votre compatibilité {scope === "list" ? "sur chaque annonce" : "avec ce profil"}.
        </p>

      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link to={href}>Compléter</Link>
      </Button>
    </aside>
  );
};

export default AffinityMissingCTA;
