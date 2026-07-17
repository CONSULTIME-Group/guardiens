/**
 * NBA nouvelle génération pour le gardien débutant :
 * « 3 annonces qui vous correspondent » avec badge d'affinité.
 *
 * Gabarit aligné sur SearchListingCard (photo 4:3, corps compact sous l'image,
 * badges ton-sur-ton). Objectif : une carte annonce unifiée sur dashboard
 * gardien, /annonces et /recherche.
 */
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { PawPrint } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
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

const SPECIES_LABEL: Record<string, string> = {
  dog: "Chien",
  cat: "Chat",
  horse: "Cheval",
  bird: "Oiseau",
  rodent: "Rongeur",
  fish: "Poisson",
  reptile: "Reptile",
  farm_animal: "Ferme",
  nac: "NAC",
};

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
          {sits.length === 1
            ? "1 annonce qui vous correspond"
            : `${sits.length} annonces qui vous correspondent`}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Score d'affinité calculé à partir de vos préférences. Complétez votre profil pour affiner vos correspondances.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {sits.map((sit, i) => {
          const speciesLabels = (sit.pet_species || [])
            .slice(0, 3)
            .map((s) => SPECIES_LABEL[s] || s);
          return (
            <Link
              key={sit.id}
              to={`/annonces/${sit.id}`}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
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
              <article className="flex h-full flex-col">
                {/* Photo 4:3, gabarit unifié avec SearchListingCard */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted border border-black/[0.06] shadow-[0_1px_3px_rgba(11,31,26,0.05),0_4px_16px_-4px_rgba(11,31,26,0.06)] transition-all duration-500 ease-out group-hover:shadow-[0_4px_12px_rgba(11,31,26,0.08),0_16px_40px_-8px_rgba(11,31,26,0.10)]">
                  {sit.cover_photo_url ? (
                    <img
                      src={getOptimizedImageUrl(sit.cover_photo_url, 640, 82)}
                      alt=""
                      loading="lazy"
                      width={640}
                      height={480}
                      className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
                      <PawPrint className="h-10 w-10" aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* Corps sous l'image */}
                <div className="mt-3 px-0.5 flex flex-col flex-1">
                  <p className="text-[11px] uppercase tracking-[0.16em] font-medium text-primary/70 truncate">
                    {sit.city || "France"}
                  </p>
                  <h3 className="mt-1.5 font-sans text-[15px] sm:text-[16px] font-medium leading-snug text-foreground line-clamp-2">
                    {sit.title || "Annonce"}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                    {speciesLabels.length > 0 && (
                      <span className="truncate">{speciesLabels.join(", ")}</span>
                    )}
                    {sit.start_date && sit.end_date && (
                      <>
                        {speciesLabels.length > 0 && (
                          <span aria-hidden className="opacity-40">·</span>
                        )}
                        <span>
                          {fmt(sit.start_date)} → {fmt(sit.end_date)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <AffinityBadge
                      result={sit.affinity}
                      size="sm"
                      variant="numeric"
                      trackingContext="sitter_first_nba"
                      trackingId={sit.id}
                    />
                    {sit.owner_first_name && (
                      <span className="text-[11px] text-muted-foreground">
                        Chez {sit.owner_first_name}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 text-center">
        <Link
          to="/search"
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
