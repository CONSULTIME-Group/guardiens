import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { Share2, CheckCircle2, ShieldCheck, Eye, Users, Dog, Flower2, Home as HomeIcon, Sparkles } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import ApproximateLocationMap from "@/components/shared/ApproximateLocationMap";
import RelatedMissionCard from "@/components/missions/RelatedMissionCard";
import Head from "@/components/seo/Head";
import { avatarImageUrl } from "@/lib/storageImage";

// (Pas de bannière de fallback : une annonce sans photo ne doit PAS
// afficher une image générique qui rendrait toutes les annonces
// identiques ou pire, trompeuse au partage social.)

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
  date_needed?: string | null;
  end_date?: string | null;
  pet_species?: string | null;
  pet_size?: string | null;
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
  const { t } = useTranslation();
  const heroImage = mission.photos?.[0] || null;
  // Pas d'image OG générique : évite qu'une annonce sans photo affiche
  // « alpinistes coucher de soleil » sur les partages.
  const ogImage = mission.photos?.[0] || undefined;
  const cityLabel = titlecaseCity(mission.city) || "France";
  const redirect = `/petites-missions/${(mission as any).slug || mission.id}`;
  // Rétro-sanitize : les annonces créées avant la sanitize à la source
  // conservent des titres en minuscules ou avec fautes ("chez soit").
  const displayTitle = sanitizeUserTitle(mission.title) || mission.title;
  const CategoryIcon = CATEGORY_ICON[mission.category] || Sparkles;
  const authorFirstName = author?.first_name
    ? author.first_name.charAt(0).toUpperCase() + author.first_name.slice(1).toLowerCase()
    : null;

  // Meta description contextuelle : on privilégie la vraie description,
  // sinon on fabrique une phrase spécifique (ville + catégorie + contrepartie)
  // pour éviter la meta boilerplate de la landing.
  const metaDescription = (() => {
    const raw = mission.description?.trim();
    if (raw && raw.length >= 60) return raw.slice(0, 155);
    const parts = [
      `${catMeta.label} à ${cityLabel}`,
      mission.exchange_offer ? t("mission_detail.meta_exchange", { offer: mission.exchange_offer }) : null,
      t("mission_detail.meta_fallback"),
    ].filter(Boolean);
    return parts.join(". ").slice(0, 155);
  })();

  // Titre court (< 20 mots dans la description) → typo hero plus mesurée
  // pour éviter l'effet « cathédrale sur un tabouret ».
  const descLen = (mission.description || "").trim().split(/\s+/).filter(Boolean).length;
  const isShortMission = descLen < 20;
  const h1Class = isShortMission
    ? "font-heading text-3xl md:text-4xl font-bold leading-[1.15] mb-6 text-foreground"
    : "font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 text-foreground";

  return (
    <>
    <div className="min-h-screen bg-background text-foreground animate-fade-in">
      <PageMeta
        title={t("mission_detail.meta_title", { title: displayTitle, city: cityLabel })}
        description={metaDescription}
        image={ogImage}
      />
      <Head>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: displayTitle,
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
      </Head>

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumb (avec maillon ville pour le SEO local) */}
        <div className="mb-8">
          <PageBreadcrumb
            items={[
              { label: t("mission_detail.breadcrumb"), href: "/petites-missions" },
              ...(mission.city
                ? [{ label: cityLabel, href: `/petites-missions?city=${encodeURIComponent(mission.city)}` }]
                : []),
              { label: displayTitle },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* ── COLONNE PRINCIPALE ── */}
          <article className="lg:col-span-8 min-w-0">
            <header className="mb-10">
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold tracking-widest uppercase">
                  <CategoryIcon className="h-3 w-3" />
                  {catMeta.label}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShare}
                  className="gap-1.5 rounded-full ml-auto"
                  aria-label={t("mission_detail.share_aria")}
                >
                  <Share2 className="h-3.5 w-3.5" /> {t("mission_detail.share")}
                </Button>
              </div>
              <h1 className={h1Class}>{displayTitle}</h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
                  <span>{cityLabel}{mission.postal_code ? ` (${mission.postal_code.slice(0, 2)})` : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
                  <span>{t("mission_detail.published_ago", { ago: timeAgoFr(mission.created_at) })}</span>
                </div>
                {durationLabel && (
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
                    <span>{durationLabel}</span>
                  </div>
                )}
              </div>
              {/* Preuve sociale légère */}
              {(viewCount > 0 || responsesCount > 0) && (
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {viewCount > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      {t("mission_detail.views", { count: viewCount })}
                    </span>
                  )}
                  {responsesCount > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {t("mission_detail.offers", { count: responsesCount })}
                    </span>
                  )}
                </div>
              )}
            </header>

            {/* Image principale : uniquement si photo réelle fournie.
                Sinon on ne montre AUCUNE image (pas de fallback trompeur
                type « alpinistes coucher de soleil » ou bannière générique
                qui rendait toutes les annonces identiques). */}
            {heroImage && (
              <div className="mb-12 rounded-[2rem] overflow-hidden shadow-2xl shadow-foreground/10 bg-muted">
                <img
                  src={heroImage}
                  alt={t("mission_detail.photo_alt", { title: displayTitle })}
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
                          src={avatarImageUrl(author.avatar_url, 64)}
                          alt={authorFirstName || t("mission_detail.author_alt")}
                          className="w-16 h-16 rounded-full object-cover border-2 border-background shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center font-heading text-xl font-bold text-foreground">
                          {authorFirstName?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-foreground flex items-center gap-2 flex-wrap">
                        {t("mission_detail.proposed_by", { name: authorFirstName || t("mission_detail.a_member") })}
                        {author.identity_verified && (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success-soft px-2 py-0.5 rounded-full"
                            title={t("mission_detail.identity_verified_title")}
                          >
                            <ShieldCheck className="h-3 w-3" />
                            {t("mission_detail.identity_verified")}
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
                          {t("mission_detail.see_profile")}
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
                  {t("mission_detail.mission_h2")}
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
                    {t("mission_detail.exchange_h3")}
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
                    {t("mission_detail.status")}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-success">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    {mission.status === "open" ? t("mission_detail.status_open") : t("mission_detail.status_closed")}
                  </span>
                </div>
                {durationLabel && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      {t("mission_detail.availability")}
                    </p>
                    <p className="text-base font-semibold text-foreground">{durationLabel}</p>
                  </div>
                )}
                {(mission.date_needed || mission.end_date) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      {t("mission_detail.period")}
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {mission.date_needed
                        ? new Date(mission.date_needed).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
                        : t("mission_detail.asap")}
                      {mission.end_date
                        ? ` → ${new Date(mission.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`
                        : ""}
                    </p>
                  </div>
                )}
                {mission.category === "animals" && (mission.pet_species || mission.pet_size) && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      {t("mission_detail.animal")}
                    </p>
                    <p className="text-base font-semibold text-foreground capitalize">
                      {[mission.pet_species, mission.pet_size].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                )}
                {/* Pas de rubrique coût : l'entraide n'a pas de prix, on met
                    en valeur ce qui est proposé en retour. */}
                {mission.exchange_offer && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      {t("mission_detail.exchange_h3")}
                    </p>
                    <p className="text-base font-semibold text-foreground">{mission.exchange_offer}</p>
                  </div>
                )}
              </div>

              <Link to={`/inscription?redirect=${encodeURIComponent(redirect)}`} className="block">
                <Button className="w-full py-6 rounded-full font-bold text-base shadow-lg shadow-primary/20">
                  {t("mission_detail.cta_help")}
                </Button>
              </Link>

              <p className="mt-5 text-xs text-center text-muted-foreground px-2 leading-relaxed">
                {t("mission_detail.signup_2min")}
              </p>

              <div className="mt-6 pt-6 border-t border-border space-y-2">
                <p className="text-xs text-center text-muted-foreground">{t("mission_detail.already_member")}</p>
                <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="block">
                  <Button variant="outline" className="w-full rounded-full">
                    {t("mission_detail.login")}
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
                className="h-40"
              />
              <div className="p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("mission_detail.location_note")}
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
                <h2 className="font-heading text-3xl md:text-4xl font-bold mb-2">{t("mission_detail.related_title")}</h2>
                <p className="text-muted-foreground text-lg">
                  {t("mission_detail.related_sub", { city: cityLabel })}
                </p>
              </div>
              <Link
                to="/petites-missions"
                className="font-bold text-sm border-b-2 border-foreground pb-1 hover:opacity-70 transition-opacity self-start md:self-auto"
              >
                {t("mission_detail.browse_all")}
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {relatedMissions.slice(0, 3).map((rm: any) => (
                <RelatedMissionCard
                  key={rm.id}
                  to={`/petites-missions/${rm.slug || rm.id}`}
                  photo={Array.isArray(rm.photos) ? rm.photos[0] : null}
                  category={rm.category}
                  title={sanitizeUserTitle(rm.title) || rm.title}
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
              {t("mission_detail.cta_title")}
            </h2>
            <p className="text-lg opacity-90 leading-relaxed">
              {t("mission_detail.cta_body")}
            </p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link to={`/inscription?redirect=${encodeURIComponent(redirect)}`}>
                <Button size="lg" variant="secondary" className="rounded-full font-bold">
                  {t("mission_detail.cta_signup")}
                </Button>
              </Link>
              <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full font-bold bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  {t("mission_detail.login")}
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 pt-4 text-sm opacity-80">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {t("mission_detail.no_card")}
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {t("mission_detail.no_commitment")}
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {t("mission_detail.two_minutes")}
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="lg:hidden h-20" aria-hidden />
    </div>
      {/* CTA sticky mobile : facilite la conversion sur téléphone où la
          sidebar n'est plus visible en scrollant. Caché en lg+. */}
      <div className="lg:hidden fixed bottom-[var(--bottom-nav-h,0px)] inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 shadow-[0_-8px_20px_-12px_hsl(var(--foreground)/0.15)]">
        <Link to={`/inscription?redirect=${encodeURIComponent(redirect)}`} className="block">
          <Button className="w-full py-5 rounded-full font-bold text-sm shadow-lg shadow-primary/20">
            {t("mission_detail.sticky_cta")}
          </Button>
        </Link>
      </div>
      {/* Réserve d'espace pour éviter que la sticky masque le footer sur mobile. */}
    </>
  );
};

export default PublicMissionView;
