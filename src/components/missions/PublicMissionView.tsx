import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Share2, CheckCircle2, ShieldCheck, Eye, Users, Dog, Flower2, Home as HomeIcon, Sparkles } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import ApproximateLocationMap from "@/components/shared/ApproximateLocationMap";
import RelatedMissionCard from "@/components/missions/RelatedMissionCard";
import { Helmet } from "react-helmet-async";

// Bannière générique "entraide" : conservée uniquement en dernier recours OG image,
// jamais rendue en hero visible (elle rendait toutes les annonces sans photo identiques).
const entraideHeader =
  "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/misc/entraide-header.webp";

interface CatMeta {
  label: string;
}

interface MissionLike {
  id: string;
  title: string;
  description?: string | null;
  city?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category: string;
  status: string;
  created_at: string;
  exchange_offer?: string | null;
  photos?: string[] | null;
  duration_estimate?: string | null;
}

interface AuthorLike {
  user_id?: string | null;
  first_name?: string | null;
  avatar_url?: string | null;
  city?: string | null;
  created_at?: string | null;
  identity_verified?: boolean | null;
}

interface RelatedMissionLike {
  id: string;
  title: string;
  description?: string | null;
  city?: string | null;
  category: string;
  created_at: string;
}

interface Props {
  mission: MissionLike;
  author: AuthorLike | null;
  catMeta: CatMeta;
  durationLabel?: string | null;
  relatedMissions: RelatedMissionLike[];
  titlecaseCity: (s?: string | null) => string;
  timeAgoFr: (iso: string) => string;
  memberSinceLong: (iso?: string | null) => string | null;
  onShare: () => void;
  viewCount?: number;
  responsesCount?: number;
}

const CATEGORY_ICON: Record<string, typeof Dog> = {
  animals: Dog,
  garden: Flower2,
  house: HomeIcon,
  skills: Sparkles,
};

const PublicMissionView = ({
  mission,
  author,
  catMeta,
  durationLabel,
  relatedMissions,
  titlecaseCity,
  timeAgoFr,
  memberSinceLong,
  onShare,
  viewCount = 0,
  responsesCount = 0,
}: Props) => {
  const heroImage = mission.photos?.[0] || null;
  const ogImage = mission.photos?.[0] || entraideHeader;
  const cityLabel = titlecaseCity(mission.city) || "France";
  const redirect = `/petites-missions/${mission.id}`;

  // Meta description contextuelle : on privilégie la vraie description,
  // sinon on fabrique une phrase spécifique (ville + catégorie + contrepartie)
  // pour éviter la meta boilerplate de la landing.
  const metaDescription = (() => {
    const raw = mission.description?.trim();
    if (raw && raw.length >= 60) return raw.slice(0, 155);
    const parts = [
      `${catMeta.label} à ${cityLabel}`,
      mission.exchange_offer ? `En échange : ${mission.exchange_offer}` : null,
      "Coup de main entre particuliers, gratuit et sans engagement.",
    ].filter(Boolean);
    return parts.join(". ").slice(0, 155);
  })();

  return (
    <div className="min-h-screen bg-background text-foreground animate-fade-in">
      <PageMeta
        title={`${mission.title} · Coup de main à ${cityLabel}`}
        description={metaDescription}
        image={ogImage}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: mission.title,
          description: mission.description?.slice(0, 300) || metaDescription,
          areaServed: cityLabel,
          serviceType: catMeta.label,
          provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
            availability: mission.status === "open" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
          datePosted: mission.created_at,
        })}</script>
      </Helmet>

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumb */}
        <div className="mb-8">
          <PageBreadcrumb
            items={[
              { label: "Coups de main", href: "/petites-missions" },
              { label: mission.title },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* ── COLONNE PRINCIPALE ── */}
          <article className="lg:col-span-8 min-w-0">
            <header className="mb-10">
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest uppercase">
                  Entraide · {catMeta.label}
                </span>
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
                {mission.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
                  <span>{cityLabel}{mission.postal_code ? ` (${mission.postal_code.slice(0, 2)})` : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
                  <span>Publié {timeAgoFr(mission.created_at)}</span>
                </div>
                {durationLabel && (
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
                    <span>{durationLabel}</span>
                  </div>
                )}
              </div>
            </header>

            {/* Image principale — masquée si aucune photo pour éviter
                la bannière générique répétée d'une annonce à l'autre. */}
            {heroImage && (
              <div className="mb-12 rounded-[2rem] overflow-hidden shadow-2xl shadow-foreground/10 bg-muted">
                <img
                  src={heroImage}
                  alt={`Photo illustrant l'annonce : ${mission.title}`}
                  className="w-full aspect-video object-cover"
                  loading="eager"
                  {...({ fetchpriority: "high" } as any)}
                  width={1200}
                  height={675}
                />
              </div>
            )}

            <div className="max-w-2xl space-y-10">
              {/* Auteur */}
              {author && (() => {
                const AuthorInner = (
                  <>
                    <div className="shrink-0">
                      {author.avatar_url ? (
                        <img
                          src={author.avatar_url}
                          alt={author.first_name || "Auteur"}
                          className="w-16 h-16 rounded-full object-cover border-2 border-background shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center font-heading text-xl font-bold text-foreground">
                          {author.first_name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
                        Proposé par {author.first_name || "un membre"}
                        {author.identity_verified && (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success-soft px-2 py-0.5 rounded-full"
                            title="Identité vérifiée par nos équipes"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Identité vérifiée
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {[
                          memberSinceLong(author.created_at),
                          titlecaseCity(author.city) || null,
                        ].filter(Boolean).join(" · ")}
                      </p>
                      {author.user_id && (
                        <p className="text-xs text-primary font-medium mt-1 group-hover:underline">
                          Voir son profil →
                        </p>
                      )}
                    </div>
                  </>
                );
                return author.user_id ? (
                  <Link
                    to={`/gardiens/${author.user_id}`}
                    className="group flex items-center gap-5 pb-8 border-b border-border hover:opacity-90 transition-opacity"
                  >
                    {AuthorInner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-5 pb-8 border-b border-border">
                    {AuthorInner}
                  </div>
                );
              })()}

              {/* Description */}
              <section>
                <h2 className="font-heading text-2xl md:text-3xl font-bold mb-5 text-foreground">
                  La mission
                </h2>
                <div className="space-y-5 text-lg leading-relaxed text-foreground/85 whitespace-pre-wrap">
                  {mission.description}
                </div>
              </section>

              {/* En échange */}
              {mission.exchange_offer && (
                <section className="bg-muted/60 p-8 md:p-10 rounded-[2rem] border border-border relative overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl" aria-hidden />
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase mb-4 text-muted-foreground">
                    En échange de votre aide
                  </h3>
                  <blockquote className="font-heading text-xl md:text-2xl italic leading-snug text-foreground/90">
                    « {mission.exchange_offer} »
                  </blockquote>
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
                    {mission.status === "open" ? "Annonce ouverte" : "Annonce fermée"}
                  </span>
                </div>
                {durationLabel && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      Disponibilité
                    </p>
                    <p className="text-base font-semibold text-foreground">{durationLabel}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Coût
                  </p>
                  <p className="text-base font-semibold text-foreground">Gratuit · échange entre membres</p>
                </div>
              </div>

              <Link to={`/inscription?redirect=${encodeURIComponent(redirect)}`} className="block">
                <Button className="w-full py-6 rounded-full font-bold text-base shadow-lg shadow-primary/20">
                  Proposer mon aide
                </Button>
              </Link>

              <p className="mt-5 text-xs text-center text-muted-foreground px-2 leading-relaxed">
                Inscription gratuite, 2 minutes. Sans engagement.
              </p>

              <div className="mt-6 pt-6 border-t border-border space-y-2">
                <p className="text-xs text-center text-muted-foreground">Déjà membre ?</p>
                <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="block">
                  <Button variant="outline" className="w-full rounded-full">
                    Se connecter
                  </Button>
                </Link>
              </div>
            </div>

            {/* Localisation approximative */}
            <div className="bg-card rounded-[2rem] overflow-hidden shadow-sm border border-border">
              <ApproximateLocationMap
                city={mission.city}
                postalCode={mission.postal_code}
                lat={mission.latitude}
                lng={mission.longitude}
                className="h-64"
              />
              <div className="p-5">
                <p className="font-semibold text-sm text-foreground mb-1">Localisation approximative</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  L'adresse exacte est partagée uniquement après mise en relation, par respect de la vie privée.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Recommandations */}
        {relatedMissions.length > 0 && (
          <section className="mt-24 md:mt-32 pt-16 border-t border-border">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">Près de chez vous</h2>
                <p className="text-muted-foreground text-lg">
                  D'autres coups de main à {cityLabel} et alentours
                </p>
              </div>
              <Link
                to="/petites-missions"
                className="font-bold text-sm border-b-2 border-foreground pb-1 hover:opacity-70 transition-opacity self-start md:self-auto"
              >
                Tout parcourir
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {relatedMissions.slice(0, 3).map((rm: any) => (
                <RelatedMissionCard
                  key={rm.id}
                  to={`/petites-missions/${rm.id}`}
                  photo={Array.isArray(rm.photos) ? rm.photos[0] : null}
                  category={rm.category}
                  title={rm.title}
                  city={titlecaseCity(rm.city)}
                  timeAgo={timeAgoFr(rm.created_at)}
                  exchangeOffer={rm.exchange_offer}
                />
              ))}
            </div>
          </section>
        )}

        {/* Pourquoi rejoindre, réassurance bas de page */}
        <section className="mt-24 md:mt-28 bg-primary text-primary-foreground rounded-[2.5rem] p-10 md:p-14 shadow-2xl shadow-primary/20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="font-heading text-3xl md:text-4xl font-bold">
              Donner un coup de main, c'est ouvrir une porte.
            </h2>
            <p className="text-lg opacity-90 leading-relaxed">
              Une heure offerte aujourd'hui, et c'est parfois une rencontre, une amitié, une saison qui s'invente. Inscrivez-vous gratuitement pour entrer en contact.
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link to={`/inscription?redirect=${encodeURIComponent(redirect)}`}>
                <Button size="lg" variant="secondary" className="rounded-full font-bold">
                  Créer mon compte gratuit
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
      </div>
    </div>
  );
};

export default PublicMissionView;
