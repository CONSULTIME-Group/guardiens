import { Link } from "react-router-dom";
import { Compass, Share2, Star, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyOwnerSitters } from "@/hooks/useNearbyOwnerSitters";
import TrustHaloAvatar from "@/components/sitters/TrustHaloAvatar";

interface Props {
  /** Cache le header quand le parent rend déjà un eyebrow. */
  hideHeader?: boolean;
}

/**
 * « Gardiens près de chez vous », jumeau de NearbyAnnoncesCard pour le
 * dashboard propriétaire. Empty-state compact, fallback hors rayon avec
 * affichage des gardiens les plus proches, mise en avant des savoir-faire
 * secondaires (custom_skills) pour donner à choisir au-delà des animaux.
 */
const NearbyOwnerSittersCard = ({ hideHeader = false }: Props) => {
  const { user } = useAuth();
  const { data, isLoading } = useNearbyOwnerSitters(user?.id);
  const sitters = data?.sitters ?? [];
  const radiusUsed = data?.radiusUsed ?? null;
  const hasBeyond = sitters.length > 0 && sitters.every((s) => s.is_beyond);

  return (
    <section
      aria-labelledby={hideHeader ? undefined : "nearby-sitters-heading"}
      className="space-y-5"
    >
      {!hideHeader && (
        <div className="flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1.5">
            Garde
          </p>
          <div className="flex items-end justify-between gap-3">
            <h3
              id="nearby-sitters-heading"
              className="font-heading text-2xl sm:text-3xl font-semibold text-foreground leading-tight"
            >
              Gardiens près de chez vous
            </h3>
            {sitters.length > 0 && (
              <Link
                to="/search?role=sitter"
                className="text-xs text-primary font-semibold hover:underline shrink-0"
              >
                Voir tout →
              </Link>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="bg-card border border-border rounded-2xl p-5 h-32 animate-pulse" />
      ) : sitters.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading font-semibold text-foreground leading-snug">
                Aucun gardien dans votre secteur
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Personne n'est encore inscrit comme gardien près de chez vous. Publiez votre annonce&nbsp;: elle attire les nouveaux profils.
              </p>
            </div>
            <Link
              to="/search?role=sitter"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-background text-[11px] font-semibold text-foreground hover:bg-muted/60 hover:border-foreground/30 transition-colors"
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Élargir
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              Invitez un proche de confiance à devenir gardien.
            </p>
            <Link
              to="/mon-abonnement#parrainage"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <Share2 className="h-3 w-3" aria-hidden="true" />
              Partager mon lien
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 min-w-0">
          {hasBeyond ? (
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              Aucun gardien à moins de 100 km, voici les plus proches disponibles
            </p>
          ) : radiusUsed ? (
            <p className="text-[11px] text-muted-foreground mb-3 px-1">
              Gardiens dans un rayon de {radiusUsed} km.
            </p>
          ) : null}

          <ul className="divide-y divide-border/60">
            {sitters.map((s) => {
              const distance =
                typeof s.distance_km === "number" ? Math.round(s.distance_km) : null;
              // Jusqu'à 4 savoir-faire secondaires, critère de choix clé.
              const skills = s.custom_skills.slice(0, 4);
              return (
                <Link
                  key={s.id}
                  to={`/gardiens/${s.id}`}
                  className="group flex items-start gap-3 py-3 first:pt-1 last:pb-1 -mx-2 px-2 rounded-lg transition-all duration-200 ease-out hover:bg-muted/40 hover:translate-x-0.5"
                >
                  <TrustHaloAvatar
                    verified={s.identity_verified}
                    avgRating={s.avg_rating}
                    sitsCount={s.completed_sits_count}
                  >
                    {s.avatar_url ? (
                      <img
                        src={s.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {s.first_name?.charAt(0) || "?"}
                      </div>
                    )}
                  </TrustHaloAvatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate transition-colors group-hover:text-primary">
                        {s.first_name || "Gardien"}
                      </p>
                      {s.identity_verified && (
                        <ShieldCheck
                          className="h-3.5 w-3.5 text-primary shrink-0"
                          aria-label="Identité vérifiée"
                        />
                      )}
                      {s.avg_rating !== null && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground tabular-nums">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" aria-hidden="true" />
                          {s.avg_rating}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {s.city || "Localisation discrète"}
                      {s.completed_sits_count > 0 && (
                        <> · {s.completed_sits_count} garde{s.completed_sits_count > 1 ? "s" : ""}</>
                      )}
                    </p>
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 min-w-0">
                        {skills.map((skill) => (
                          <span
                            key={skill}
                            title={skill}
                            className="inline-flex items-center rounded-full bg-accent/30 text-accent-foreground px-2 py-0.5 text-[10px] font-medium max-w-full truncate"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {distance !== null && (
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full text-[11px] font-bold tabular-nums px-2.5 py-0.5 ${
                        s.is_beyond
                          ? "bg-muted text-muted-foreground ring-1 ring-border"
                          : "bg-primary/10 text-primary"
                      }`}
                      aria-label={`À environ ${distance} kilomètres de chez vous`}
                    >
                      {s.is_beyond ? "Plus loin · " : ""}{distance}&nbsp;km
                    </span>
                  )}
                </Link>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-border/60">
            <Link
              to="/search?role=sitter"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              {hasBeyond ? "Voir tous les gardiens plus loin" : "Voir tous les gardiens"}
            </Link>
            <Link
              to="/mon-abonnement#parrainage"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              <Share2 className="h-3 w-3" aria-hidden="true" />
              Inviter un proche
            </Link>
          </div>
        </div>
      )}
    </section>
  );
};

export default NearbyOwnerSittersCard;
