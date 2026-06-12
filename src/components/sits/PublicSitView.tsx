// Vue publique éditoriale (Modern Minimal), annonces de garde.
// Cible : visiteurs anonymes ET connectés (hors propriétaire de l'annonce).
// Objectif : conversion + clarté. Pattern aligné avec PublicMissionView.
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Share2, CheckCircle2, Star } from "lucide-react";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import ApproximateLocationMap from "@/components/shared/ApproximateLocationMap";
import SitHero from "@/components/sits/views/tabs/SitHero";

interface SitLike {
  id: string;
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  daily_routine?: string | null;
  open_to?: string[] | null;
  user_id: string;
  latitude?: number | null;
  longitude?: number | null;
  accepting_applications?: boolean | null;
  specific_expectations?: string | null;
  owner_message?: string | null;
}

interface OwnerLike {
  first_name?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  postal_code?: string | null;
  bio?: string | null;
  identity_verified?: boolean | null;
  is_founder?: boolean | null;
  completed_sits_count?: number | null;
}

interface PropertyLike {
  type?: string | null;
  environment?: string | null;
  description?: string | null;
  photos?: string[] | null;
  equipments?: string[] | null;
  rooms_count?: number | null;
  bedrooms_count?: number | null;
  accessible?: boolean | null;
  car_required?: boolean | null;
}

interface PetLike {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  photo_url?: string | null;
  age?: number | null;
  character?: string | null;
  alone_duration?: string | null;
  walk_duration?: string | null;
  medication?: string | null;
  food?: string | null;
  special_needs?: string | null;
  activity_level?: string | null;
  owner_breed_note?: string | null;
}

interface ReviewLike {
  overall_rating: number;
  comment: string;
  created_at: string;
}

interface Props {
  sit: SitLike;
  owner: OwnerLike | null;
  property: PropertyLike | null;
  pets: PetLike[];
  avgRating: string | null;
  reviewCount: number;
  latestReviews: ReviewLike[];
  naturalDateLabel: string;
  urgencyLabel: string | null;
  petsPitchSummary: string;
  typeLabel: string | null;
  envLabel: string | null;
  speciesLabel: Record<string, string>;
  onShare: () => void;
  /** Contexte viewer pour adapter le CTA. */
  isAuthenticated?: boolean;
  hasAccess?: boolean;
  hasApplied?: boolean;
  onApply?: () => void;
}

const PublicSitView = ({
  sit,
  owner,
  property,
  pets,
  avgRating,
  reviewCount,
  latestReviews,
  naturalDateLabel,
  urgencyLabel,
  typeLabel,
  envLabel,
  speciesLabel,
  onShare,
  isAuthenticated = false,
  hasAccess = false,
  hasApplied = false,
  onApply,
}: Props) => {
  const photos: string[] = (property?.photos || []).filter(Boolean);
  const petPhotos = pets
    .filter((p) => !!p.photo_url)
    .map((p) => ({ url: p.photo_url as string, name: p.name, species: speciesLabel[p.species] || p.species }));
  const cityLabel = owner?.city || "France";
  const redirect = `/annonces/${sit.id}`;
  const title = sit.title ? sanitizeUserTitle(sit.title) : `Une mission de garde à ${cityLabel}`;
  const description = property?.description || "";
  const accepting = sit.accepting_applications !== false;

  return (
    <div className="min-h-screen bg-background text-foreground animate-fade-in">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <PageBreadcrumb
            items={[
              { label: "Annonces", href: "/search" },
              { label: title },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* ── COLONNE PRINCIPALE ── */}
          <article className="lg:col-span-8 min-w-0">
            <header className="mb-10">
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest uppercase">
                  Garde · Hébergement inclus
                </span>
                {urgencyLabel && (
                  <span className="inline-block px-4 py-1.5 bg-secondary/20 text-secondary-foreground border border-secondary/30 rounded-full text-[10px] font-bold tracking-widest uppercase">
                    {urgencyLabel}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShare}
                  className="gap-1.5 rounded-full ml-auto"
                  aria-label="Partager cette annonce"
                >
                  <Share2 className="h-3.5 w-3.5" /> Partager
                </Button>
              </div>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 text-foreground">
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
                  <span>{cityLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
                  <span>{naturalDateLabel}</span>
                </div>
                {typeLabel && (
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
                    <span>{typeLabel}</span>
                  </div>
                )}
              </div>
            </header>

            {/* Galerie photos, logement + animaux, lightbox plein écran */}
            {(photos.length > 0 || petPhotos.length > 0) && (
              <div className="mb-12">
                <SitHero
                  photos={photos}
                  petPhotos={petPhotos}
                  cityName={owner?.city || undefined}
                />
              </div>
            )}

            <div className="max-w-2xl space-y-12">
              {/* Hôte */}
              {owner && (
                <div className="flex items-start gap-5 pb-10 border-b border-border">
                  <div className="shrink-0">
                    {owner.avatar_url ? (
                      <img
                        src={owner.avatar_url}
                        alt={owner.first_name || "Hôte"}
                        className="w-16 h-16 rounded-full object-cover border-2 border-background shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center font-heading text-xl font-bold text-foreground">
                        {owner.first_name?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
                      Proposé par {owner.first_name || "un membre"}
                      {owner.identity_verified && <VerifiedBadge />}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[
                        owner.city,
                        typeof owner.completed_sits_count === "number" && owner.completed_sits_count > 0
                          ? `${owner.completed_sits_count} garde${owner.completed_sits_count > 1 ? "s" : ""} accomplie${owner.completed_sits_count > 1 ? "s" : ""}`
                          : null,
                        avgRating ? `★ ${avgRating} (${reviewCount} avis)` : null,
                      ].filter(Boolean).join(" · ")}
                    </p>
                    {owner.bio && (
                      <p className="text-sm text-foreground/80 mt-3 leading-relaxed line-clamp-3">
                        {owner.bio}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Le mot du propriétaire (présentation libre de la garde) */}
              {(sit.specific_expectations || sit.owner_message) && (
                <section>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold mb-5 text-foreground">
                    Le mot de {owner?.first_name || "l'hôte"}
                  </h2>
                  <div className="space-y-5 text-lg leading-relaxed text-foreground/85 whitespace-pre-line">
                    {sit.specific_expectations || sit.owner_message}
                  </div>
                </section>
              )}

              {/* Le logement */}
              {property && (
                <section>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold mb-5 text-foreground">
                    Le logement
                  </h2>
                  <p className="text-sm font-medium text-foreground mb-4">
                    {typeLabel}
                    {envLabel && <span className="text-muted-foreground font-normal"> · {envLabel}</span>}
                    {typeof property.rooms_count === "number" && property.rooms_count > 0 && (
                      <span className="text-muted-foreground font-normal"> · {property.rooms_count} pièce{property.rooms_count > 1 ? "s" : ""}</span>
                    )}
                    {typeof property.bedrooms_count === "number" && property.bedrooms_count > 0 && (
                      <span className="text-muted-foreground font-normal"> · {property.bedrooms_count} chambre{property.bedrooms_count > 1 ? "s" : ""}</span>
                    )}
                  </p>
                  {property.description && (
                    <div className="space-y-5 text-lg leading-relaxed text-foreground/85 whitespace-pre-line mb-6">
                      {property.description}
                    </div>
                  )}
                  {Array.isArray(property.equipments) && property.equipments.length > 0 && (
                    <div className="mt-2">
                      <h3 className="text-xs font-bold tracking-[0.2em] uppercase mb-3 text-muted-foreground">
                        Équipements
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {property.equipments.map((eq) => (
                          <span
                            key={eq}
                            className="px-3 py-1.5 rounded-full bg-muted text-foreground border border-border text-sm"
                          >
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(property.accessible || property.car_required) && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {property.accessible && (
                        <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">Accès PMR</span>
                      )}
                      {property.car_required && (
                        <span className="px-3 py-1.5 rounded-full bg-secondary/20 text-secondary-foreground text-sm">Voiture recommandée</span>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Animaux */}
              {pets.length > 0 && (
                <section>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold mb-5 text-foreground">
                    {pets.length === 1 ? "L'animal à garder" : `Les animaux à garder`}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pets.map((pet) => (
                      <div
                        key={pet.id}
                        className="flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-4"
                      >
                        {pet.photo_url ? (
                          <img
                            src={pet.photo_url}
                            alt={pet.name}
                            loading="lazy"
                            className="w-14 h-14 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <span className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center font-heading text-lg font-bold text-primary shrink-0">
                            {pet.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-base truncate">{pet.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {speciesLabel[pet.species] || pet.species}
                            {pet.breed ? ` · ${pet.breed}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Routine */}
              {sit.daily_routine && (
                <section>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold mb-5 text-foreground">
                    La routine quotidienne
                  </h2>
                  <div className="space-y-5 text-lg leading-relaxed text-foreground/85 whitespace-pre-line">
                    {sit.daily_routine}
                  </div>
                </section>
              )}

              {/* Le gardien idéal */}
              {sit.open_to && sit.open_to.length > 0 && !sit.open_to.every((t) => ["any", "no_preference", "Sans préférence"].includes(t)) && (
                <section className="bg-muted/60 p-8 md:p-10 rounded-[2rem] border border-border relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl" aria-hidden />
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase mb-4 text-muted-foreground">
                    Le gardien idéal
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {sit.open_to.map((t) => (
                      <span
                        key={t}
                        className="px-4 py-2 rounded-full bg-card text-foreground border border-border text-sm font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Avis */}
              {latestReviews.length > 0 && (
                <section>
                  <h2 className="font-heading text-2xl md:text-3xl font-bold mb-5 text-foreground">
                    Ce que disent les gardiens précédents
                  </h2>
                  <div className="space-y-4">
                    {latestReviews.map((r, i) => (
                      <article key={i} className="border-l-2 border-primary/40 pl-5 py-1">
                        <div className="flex items-center gap-1 mb-2">
                          {Array.from({ length: 5 }).map((_, k) => (
                            <Star
                              key={k}
                              className={`h-3.5 w-3.5 ${k < Math.round(r.overall_rating) ? "text-secondary fill-secondary" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                        <p className="font-heading text-lg italic leading-snug text-foreground/90">
                          « {r.comment} »
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </article>

          {/* ── SIDEBAR ── */}
          <aside className="lg:col-span-4 lg:sticky lg:top-8 space-y-6">
            {/* CTA conversion */}
            <div className="bg-card p-8 rounded-[2rem] shadow-xl shadow-foreground/5 border border-border">
              <div className="mb-8 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Statut
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-success">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Annonce ouverte
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Dates
                  </p>
                  <p className="text-base font-semibold text-foreground">{naturalDateLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Hébergement
                  </p>
                  <p className="text-base font-semibold text-foreground">Gratuit · logement inclus</p>
                </div>
              </div>

              {!accepting ? (
                <Button className="w-full py-6 rounded-full font-bold text-base" disabled>
                  Candidatures en cours d'analyse
                </Button>
              ) : !isAuthenticated ? (
                <>
                  <Link to={`/inscription?role=sitter&redirect=${encodeURIComponent(redirect)}`} className="block">
                    <Button className="w-full py-6 rounded-full font-bold text-base shadow-lg shadow-primary/20">
                      Postuler à cette garde
                    </Button>
                  </Link>
                  <p className="mt-5 text-xs text-center text-muted-foreground px-2 leading-relaxed">
                    Inscription gratuite, 2 minutes. Sans engagement.
                  </p>
                  <div className="mt-6 pt-6 border-t border-border space-y-2">
                    <p className="text-xs text-center text-muted-foreground">Déjà membre&nbsp;?</p>
                    <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="block">
                      <Button variant="outline" className="w-full rounded-full">
                        Se connecter
                      </Button>
                    </Link>
                  </div>
                </>
              ) : hasApplied ? (
                <Button className="w-full py-6 rounded-full font-bold text-base" disabled>
                  <CheckCircle2 className="h-5 w-5 mr-2" /> Candidature envoyée
                </Button>
              ) : !hasAccess ? (
                <Link to="/mon-abonnement" className="block">
                  <Button className="w-full py-6 rounded-full font-bold text-base shadow-lg shadow-primary/20">
                    S'abonner pour postuler
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={onApply}
                  className="w-full py-6 rounded-full font-bold text-base shadow-lg shadow-primary/20"
                >
                  Postuler à cette garde
                </Button>
              )}
            </div>

            {/* Localisation approximative */}
            <div className="bg-card rounded-[2rem] overflow-hidden shadow-sm border border-border">
              <ApproximateLocationMap
                city={owner?.city}
                postalCode={owner?.postal_code}
                country={(sit as any)?.country || (owner as any)?.country}
                lat={sit.latitude}
                lng={sit.longitude}
                className="h-64"
              />
              <div className="p-5">
                <p className="font-semibold text-sm text-foreground mb-1">Localisation approximative</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  L'adresse exacte est partagée uniquement après mise en relation, par respect de la vie privée.
                </p>
              </div>
            </div>

            {/* Réassurance compacte */}
            <div className="bg-card rounded-[2rem] p-6 border border-border space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Pourquoi Guardiens
              </p>
              {[
                "Profils vérifiés",
                "Avis croisés",
                "Gardien d'urgence en relais",
              ].map((t) => (
                <div key={t} className="flex items-center gap-3 text-sm text-foreground/85">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>

        {!isAuthenticated && (
          <section className="mt-24 md:mt-28 bg-primary text-primary-foreground rounded-[2.5rem] p-10 md:p-14 shadow-2xl shadow-primary/20">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                Partir l'esprit léger, c'est confier à quelqu'un de confiance.
              </h2>
              <p className="text-lg opacity-90 leading-relaxed">
                Rejoignez la communauté Guardiens : des gardiens vérifiés, un cadre clair, et la liberté de partir sans inquiétude.
              </p>
              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <Link to={`/inscription?role=sitter&redirect=${encodeURIComponent(redirect)}`}>
                  <Button size="lg" variant="secondary" className="rounded-full font-bold">
                    S'inscrire et postuler
                  </Button>
                </Link>
                <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full font-bold bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    Se connecter
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-5 pt-4 text-sm opacity-80">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Gratuit
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Sans engagement
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> 2 minutes
                </span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default PublicSitView;
