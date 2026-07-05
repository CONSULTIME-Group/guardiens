/**
 * NBA nouvelle génération pour le gardien débutant :
 * « 3 annonces qui vous correspondent » avec badge d'affinité.
 *
 * Précepte 2026 : une seule surface dominante above the fold, pas de KPI
 * vides ni de checklist en premier. Le score d'affinité vient de
 * `computeAffinityScore` (déjà utilisé sur la recherche et les fiches).
 */
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { Button } from "@/components/ui/button";
import AffinityBadge from "@/components/matching/AffinityBadge";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import type { AffinitySitCard } from "@/hooks/useSitterTopAffinitySits";

interface Props {
  sits: AffinitySitCard[];
}

function fmt(d: string | null): string {
  if (!d) return "";
  try {
    return format(parseISO(d), "d MMM", { locale: fr });
  } catch {
    return d;
  }
}

const SitterFirstNBA = ({ sits }: Props) => {
  const seenRef = useRef(false);
  useEffect(() => {
    if (seenRef.current || sits.length === 0) return;
    seenRef.current = true;
    const avg = Math.round(
      sits.reduce((s, x) => s + x.affinity.score, 0) / sits.length,
    );
    void trackEvent("sitter_first_nba_seen", {
      source: "dashboard",
      metadata: { sits_count: sits.length, avg_affinity_score: avg },
    });
  }, [sits]);

  return (
    <section
      aria-labelledby="sitter-first-nba-heading"
      className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8"
    >
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold mb-1">
          Recommandé pour vous
        </p>
        <h2
          id="sitter-first-nba-heading"
          className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-tight"
        >
          3 annonces qui vous correspondent
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Score d'affinité calculé à partir de vos préférences. Complétez votre profil pour améliorer vos correspondances.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sits.map((sit, i) => (
          <article
            key={sit.id}
            className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out"
          >
            <Link
              to={`/annonces/${sit.id}`}
              className="block"
              onClick={() =>
                void trackEvent("sitter_first_nba_card_clicked", {
                  source: "dashboard",
                  metadata: {
                    sit_id: sit.id,
                    affinity_score: sit.affinity.score,
                    position: i + 1,
                  },
                })
              }
            >
              {sit.cover_photo_url ? (
                <div className="w-full aspect-[16/10] overflow-hidden bg-muted">
                  <img
                    src={getOptimizedImageUrl(sit.cover_photo_url, 480, 78)}
                    alt={sit.title ?? "Annonce"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={480}
                    height={300}
                  />
                </div>
              ) : (
                <div className="w-full aspect-[16/10] bg-primary/10" aria-hidden="true" />
              )}
            </Link>
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {sit.city ?? sit.title ?? "Annonce"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Du {fmt(sit.start_date)} au {fmt(sit.end_date)}
                  </p>
                </div>
                <AffinityBadge
                  result={sit.affinity}
                  size="sm"
                  variant="numeric"
                  trackingContext="sitter_first_nba"
                  trackingId={sit.id}
                />
              </div>
              {sit.owner_first_name && (
                <p className="text-xs text-muted-foreground">
                  Chez {sit.owner_first_name}
                  {sit.pet_species.length > 0 && (
                    <> · {sit.pet_species.slice(0, 3).join(", ")}</>
                  )}
                </p>
              )}
              <div className="mt-auto pt-2">
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link
                    to={`/annonces/${sit.id}`}
                    onClick={() =>
                      void trackEvent("sitter_first_nba_card_clicked", {
                        source: "dashboard_cta",
                        metadata: {
                          sit_id: sit.id,
                          affinity_score: sit.affinity.score,
                          position: i + 1,
                        },
                      })
                    }
                  >
                    Voir l'annonce
                  </Link>
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 text-center">
        <Link
          to="/annonces"
          className="text-sm text-primary underline-offset-4 hover:underline"
          onClick={() =>
            void trackEvent("see_all_sits_clicked", { source: "sitter_first_nba" })
          }
        >
          Voir toutes les annonces
        </Link>
      </div>
    </section>
  );
};

export default SitterFirstNBA;
