/**
 * NBA nouvelle génération pour le gardien débutant :
 * « 3 annonces qui vous correspondent » avec badge d'affinité.
 *
 * Gabarit aligné sur SearchListingCard (photo 4:3, corps compact sous l'image,
 * badges ton-sur-ton). Objectif : une carte annonce unifiée sur dashboard
 * gardien, /annonces et /recherche.
 */
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { PawPrint } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import AffinityRing from "@/components/affinity/AffinityRing";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import type { AffinitySitCard } from "@/hooks/useSitterTopAffinitySits";

interface Props {
  sits: AffinitySitCard[];
  /**
   * "affinity" : score d'affinité calculé, badges affichés.
   * "fallback" : aucune annonce scorable, on présente les annonces
   *   ouvertes de la zone triées par date (pas de badge d'affinité).
   */
  mode?: "affinity" | "fallback";
  /** Contexte géographique retenu, pour la mention neutre en mode fallback. */
  scopeLabel?: string | null;
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

const SitterFirstNBA = ({ sits, mode = "affinity", scopeLabel }: Props) => {
  const { isAuthenticated } = useAuth();
  const seenRef = useRef(false);
  useEffect(() => {
    if (seenRef.current || sits.length === 0) return;
    seenRef.current = true;
    const scores = sits
      .map((x) => x.affinity?.score)
      .filter((s): s is number => typeof s === "number");
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    void trackEvent("sitter_first_nba_seen", {
      source: "dashboard",
      metadata: {
        sits_count: sits.length,
        avg_affinity_score: avg,
        mode,
      },
    });
  }, [sits, mode]);

  const eyebrow =
    mode === "fallback" ? "Annonces ouvertes près de chez vous" : "UNE MAISON VOUS ATTEND";
  const heading =
    mode === "fallback"
      ? sits.length === 1
        ? "1 annonce ouverte à proximité"
        : `${sits.length} annonces ouvertes à proximité`
      : sits.length === 1
        ? "1 rencontre faite pour vous"
        : `${sits.length} rencontres faites pour vous`;
  const sub =
    mode === "fallback"
      ? `En attendant d'affiner vos correspondances, voici les annonces ouvertes${scopeLabel ? ` ${scopeLabel}` : ""}. Complétez votre profil pour obtenir un score d'affinité.`
      : "Assez de points communs pour vous confier une maison en confiance. Complétez votre profil pour affiner.";

  return (
    <section
      aria-labelledby="sitter-first-nba-heading"
      className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8"
    >
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold mb-1">
          {eyebrow}
        </p>
        <h2
          id="sitter-first-nba-heading"
          className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-tight"
        >
          {heading}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{sub}</p>
      </div>

      <div className={`grid grid-cols-1 gap-4 md:gap-5 ${sits.length === 1 ? "sm:max-w-md sm:mx-auto" : sits.length === 2 ? "sm:grid-cols-2 lg:max-w-3xl lg:mx-auto" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {sits.map((sit, i) => {
          const speciesLabels = (sit.pet_species || [])
            .slice(0, 3)
            .map((s) => SPECIES_LABEL[s] || s);
          return (
            <Link
              key={sit.id}
              to={isAuthenticated ? `/sits/${sit.id}` : `/annonces/${sit.id}`}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
              onClick={() =>
                void trackEvent("sitter_first_nba_card_clicked", {
                  source: "dashboard",
                  metadata: {
                    sit_id: sit.id,
                    affinity_score: sit.affinity?.score ?? null,
                    position: i + 1,
                  },
                })
              }
            >
              {/* Page de carnet : panneau papier + bord droit déchiré.
                  Le padding-right supplémentaire évite que le contenu ne soit
                  rogné par le clip-path (~2% à droite). */}
              <article className="notebook-card relative flex h-full flex-col p-3 pr-6 sm:pr-7 transition-transform duration-500 ease-out">
                <div className="notebook-card-paper absolute inset-0" aria-hidden="true" />
                <div className="relative flex h-full flex-col">
                  {/* Photo 4:3 encadrée dans la page. */}
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
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
                      <div
                        className="illustration-blend animate-painted-reveal w-full h-full flex items-center justify-center"
                        style={{
                          backgroundImage: [
                            "radial-gradient(ellipse at 28% 30%, hsl(var(--primary) / 0.30), transparent 62%)",
                            "radial-gradient(ellipse at 72% 62%, hsl(var(--secondary) / 0.34), transparent 66%)",
                            "radial-gradient(ellipse at 50% 82%, hsl(var(--founder) / 0.24), transparent 70%)",
                            "radial-gradient(circle at center, hsl(var(--hero-paper)) 0%, hsl(var(--hero-paper)) 100%)",
                          ].join(", "),
                        }}
                        aria-hidden="true"
                      >
                        <PawPrint className="h-10 w-10 text-foreground/45" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* Corps sous l'image */}
                  <div className="mt-3 flex flex-col flex-1">
                    <p className="text-[11px] uppercase tracking-[0.16em] font-medium text-primary truncate">
                      {sit.city || "France"}
                    </p>
                    <h3 className="mt-1.5 font-heading text-[16px] sm:text-[17px] font-semibold leading-snug text-foreground line-clamp-2">
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
                    {sit.affinity && typeof sit.affinity.score === "number" ? (
                      <div className="mt-3 flex items-center gap-3">
                        <AffinityRing score={sit.affinity.score} size={72} />
                        <div className="flex-1 min-w-0">
                          {sit.affinity.matched && sit.affinity.matched.length > 0 ? (
                            <p className="text-[12px] leading-snug text-muted-foreground line-clamp-2">
                              Vous êtes faits pour vous entendre : {sit.affinity.matched.slice(0, 3).join(", ")}.
                            </p>
                          ) : (
                            <p className="text-[12px] leading-snug text-muted-foreground">
                              Assez en commun pour se faire confiance (animaux, présence).
                            </p>
                          )}
                          {sit.owner_first_name && (
                            <p className="mt-1 text-[11px] text-muted-foreground/80">
                              Chez {sit.owner_first_name}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      sit.owner_first_name && (
                        <div className="mt-3">
                          <span className="text-[11px] text-muted-foreground">
                            Chez {sit.owner_first_name}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="notebook-card-edge" aria-hidden="true" />
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
