import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "@/i18n/react";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/myProfile";

import PageMeta from "@/components/PageMeta";

import { usePublicStats } from "@/hooks/usePublicStats";
import { communityTotals } from "../../supabase/functions/_shared/community-totals.js";
import LiveListingsStrip from "@/components/landing/LiveListingsStrip";
import { PRESS_ARTICLE_URL, PRESS_HIGHLIGHT_UNTIL, HOME_OG_IMAGE } from "@/data/siteConstants";
import { LE_PROGRES_LOGO } from "@/assets/pressLogos";

import { UsagesSection } from "@/components/landing/UsagesSection";
import { ServiceAfterServiceSection } from "@/components/landing/ServiceAfterServiceSection";
import { HomeProximitySearch, type HomeOrigin } from "@/components/landing/HomeProximitySearch";
import { LivedItSection } from "@/components/landing/LivedItSection";
import { LandingTocBar } from "@/components/landing/LandingTocBar";
import HomeJsonLd from "@/components/landing/HomeJsonLd";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ConfianceSection } from "@/components/landing/ConfianceSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

import PublicHeader from "@/components/layout/PublicHeader";
import { useShellMode } from "@/components/layout/useShellMode";
import { useAuth } from "@/contexts/AuthContext";


import PublicFooter from "@/components/layout/PublicFooter";
// Lot P2b : constante légère, siteRoutes (22 Ko) reste hors de la page d'accueil.
// Pricing pivot : plus d'Offer JSON-LD tant que PRICING_IS_ACTIVE = false.
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import { Button } from "@/components/ui/button";
















// Colonnes de la bande de chiffres : deux sur téléphone, autant que de
// compteurs affichés au-delà. Classes littérales pour que Tailwind les voie.
const KPI_BAND_COLS = [
  "grid-cols-2",
  "grid-cols-1 sm:grid-cols-1",
  "grid-cols-2 sm:grid-cols-2",
  "grid-cols-2 sm:grid-cols-3",
  "grid-cols-2 sm:grid-cols-4",
];

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const shellMode = useShellMode();
  const { isAuthenticated, user } = useAuth();
  // Session vérifiée et profil chargé : on ne propose plus de créer un compte
  // à quelqu'un qui en a déjà un, on propose son action principale.
  const isMember = shellMode === "app";
  const { data: publicStats } = usePublicStats();
  const [homeOrigin, setHomeOrigin] = useState<HomeOrigin | null>(null);
  const [profileOrigin, setProfileOrigin] = useState<HomeOrigin | null>(null);

  // Membre connecté : la ville du profil sert à afficher la distance des
  // annonces, sans changer l'ordre de la vitrine nationale. Seule une ville
  // saisie trie par proximité.
  useEffect(() => {
    if (!user?.id) { setProfileOrigin(null); return; }
    let active = true;
    // Lot P3 : fiche du membre déjà en cache partagé, aucune seconde lecture.
    void fetchMyProfile(user.id).then(({ data }) => {
      if (!active || !data || data.latitude === null || data.longitude === null) return;
      setProfileOrigin({ lat: Number(data.latitude), lng: Number(data.longitude), city: data.city });
    });
    return () => { active = false; };
  }, [user?.id]);

  

  // OAuth mobile fallback : si Google nous renvoie sur "/" alors qu'un flux
  // OAuth est actif (in-app browser, PWA, broker mobile), on récupère la
  // session puis on file sur /dashboard sans bloquer l'utilisateur sur la home.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const traceRaw = typeof window !== "undefined"
          ? window.sessionStorage.getItem("guardiens.oauth.trace")
          : null;
        if (!traceRaw) return;
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session?.user) {
          try { window.sessionStorage.removeItem("guardiens.oauth.trace"); } catch {}
          try { window.sessionStorage.removeItem("guardiens.oauth.start"); } catch {}
          navigate("/dashboard", { replace: true });
        }
      } catch {
        // silencieux : on ne casse pas la home pour autant
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  // Bande chiffres sous le hero : quatre compteurs dynamiques. "Maisons
  // gardées" (37) et "animaux accompagnés" (234) additionnent l'historique
  // personnel des fondateurs (raconté dans Notre histoire et la carte
  // piliers) et l'activité réelle de la plateforme. Décision produit
  // confirmée par Jérémie le 03/08/2026 : partir de ce socle vécu et cumuler
  // par-dessus au fur et à mesure que la plateforme grandit. "Inscrits" et
  // "missions d'entraide" restent des compteurs plateforme purs, sans offset.
  // Rétablissement des quatre compteurs le 06/09/2026.
  // Lot CPT1 : calcul unique partagé (supabase/functions/_shared/community-totals.js).
  const { houses: kpiMaisons, animals: kpiAnimaux } = communityTotals(publicStats);
  const kpiInscrits = publicStats?.total_inscrits ?? 0;
  const kpiMissions = publicStats?.missions_entraide ?? 0;
  // Les quatre compteurs de la bande, dans l'ordre d'origine, avec leurs
  // conditions d'affichage d'origine : ils remplissent une grille de colonnes
  // égales, et le nombre de colonnes suit le nombre de compteurs réellement
  // affichés pour que la bande reste symétrique.
  const kpiBand = [
    { key: "houses", value: kpiMaisons, label: t("landing.hero.kpi_houses"), shown: kpiMaisons > 0 },
    { key: "animals", value: kpiAnimaux, label: t("landing.hero.kpi_animals"), shown: kpiAnimaux >= 10 },
    { key: "members", value: kpiInscrits, label: t("landing.hero.kpi_members"), shown: kpiInscrits > 0 },
    { key: "missions", value: kpiMissions, label: t("landing.hero.kpi_missions"), shown: kpiMissions > 0 },
  ].filter((kpi) => kpi.shown);
  const isPressHighlighted = new Date() < PRESS_HIGHLIGHT_UNTIL;


  // Lot P5 : le vrai hero est rendu, on retire le fond statique d'index.html
  // (avant PageMeta, donc avant prerenderReady).
  useLayoutEffect(() => {
    document.getElementById("boot-hero")?.remove();
  }, []);

 return (
 <div className="min-h-screen bg-background text-foreground">
   <PageMeta
        title={t("landing.meta_title")}
        description={t("landing.meta_description")}
 path="/"
 image={HOME_OG_IMAGE}
 />
      <HomeJsonLd />

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <PublicHeader authedVariant />

      {/* ═══════════════ MAIN LANDMARK (englobe tout le contenu) ═══════════════ */}
      <main id="main-content" className="min-w-0">
      {/* ═══════════════ SECTION 1, HERO (épuré, 3 blocs) ═══════════════ */}
      <section className="relative flex min-h-[100svh] w-full items-start md:items-center overflow-hidden">
        {/* Lot HOME1 : une photo cadrée pour chaque format. Verticale sur
            téléphone (ciel pour le texte, mas et chien dessous), paysage au-delà. */}
        <picture>
          <source
            media="(max-width: 767px)"
            type="image/webp"
            srcSet="/hero-portrait-480.webp 480w, /hero-portrait-752.webp 752w"
            sizes="100vw"
          />
          <source
            type="image/webp"
            srcSet="/hero-paysage-640.webp 640w, /hero-paysage-960.webp 960w, /hero-paysage-1344.webp 1344w"
            sizes="100vw"
          />
          <img
            src="/hero-paysage-1344.webp"
            alt="Au coucher du soleil, un golden retriever et un chat veillent devant un mas en pierre et sa piscine."
            className="absolute inset-0 w-full h-full object-cover object-bottom md:object-center"
            loading="eager"
            {...({ fetchpriority: "high" } as any)}
            width={1344}
            height={752}
            sizes="100vw"
            decoding="async"
          />
        </picture>
        {/* Voile : sombre sous le texte, clair sur le mas et le chien. Du haut
            vers le bas sur téléphone, de gauche à droite au-delà. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 via-55% to-black/0 md:hidden" />
        <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-black/90 via-black/65 via-40% to-black/5" />

        <div className="relative z-10 lp-wide pb-8 pt-7 md:py-24">
          <div className="w-full max-w-full md:max-w-[600px] lg:max-w-[680px]">

            <h1 className="font-heading text-[clamp(26px,8.4vw,38px)] sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-2 md:mb-6 text-balance">
              <span className="block font-body text-xs md:text-sm font-semibold uppercase tracking-[0.14em] text-white/90 mb-2 md:mb-3">
                {t("landing.hero.title_eyebrow")}
              </span>
              <span className="block">{t("landing.hero.title_main")}</span>
            </h1>

            <p className="font-body text-sm md:text-base text-white/90 leading-relaxed mb-2 md:mb-6 animate-hero-fade-up animation-delay-400">
              {t("landing.hero.lede")}
            </p>

            <p className="font-heading italic text-lg md:text-2xl text-white/95 leading-snug mb-4 md:mb-6 animate-hero-fade-up animation-delay-700">
              {t("landing.hero.motto")}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-0 animate-hero-fade-up animation-delay-900">
              <Button
                onClick={() => {
                  void trackEvent("cta_proprio_clicked", { metadata: { location: "hero" } });
                  navigate(isMember ? "/sits/create" : `/inscription?redirect=${encodeURIComponent("/sits/create")}`);
                }}
                style={{ boxShadow: "0 6px 14px rgba(44,109,80,.24)" }}
                className="h-12 w-full sm:w-auto font-body text-base font-semibold tracking-wide rounded-full px-8 sm:px-12 bg-primary text-primary-foreground hover:brightness-95 hover:scale-[1.03] transition-all duration-200 ring-2 ring-primary-foreground/10"
              >
                {t("landing.hero.cta_owner")}
              </Button>
              <p className="flex min-h-[44px] w-full sm:w-auto items-center justify-center sm:justify-start font-body text-[13px] md:text-sm text-white/90">
                {t("landing.hero.free_line")}&nbsp;
                <Link
                  to="/tarifs"
                  onClick={() => { void trackEvent("home_pricing_link_clicked", { metadata: { location: "hero" } }); }}
                  className="inline-flex min-h-[44px] items-center text-white underline underline-offset-4"
                >
                  {t("landing.hero.free_link")}
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-3 md:mt-1 animate-hero-fade-up animation-delay-900">
              <Button
                variant="outline"
                onClick={() => {
                  void trackEvent("cta_aid_clicked", { metadata: { location: "hero" } });
                  navigate(isMember ? "/petites-missions/creer" : `/inscription?redirect=${encodeURIComponent("/petites-missions/creer")}`);
                }}
                className="h-12 flex-1 sm:flex-none font-body text-sm font-medium tracking-wide rounded-full px-5 sm:px-7 bg-transparent text-white border border-white/60 hover:bg-white/10 hover:text-white transition-all duration-200"
              >
                {t("landing.hero.cta_sitter")}
              </Button>
              <Link
                to="/sorties"
                onClick={() => { void trackEvent("home_outings_link_clicked", { metadata: { location: "hero" } }); }}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/60 px-5 sm:px-7 font-body text-sm font-medium tracking-wide text-white hover:bg-white/10 transition-all duration-200"
              >
                {t("landing.hero.cta_outings")}
              </Link>
            </div>
            <HomeProximitySearch onLocated={setHomeOrigin} />
            {isPressHighlighted && (
              <a
                href={PRESS_ARTICLE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-[14px] inline-flex min-h-[44px] items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 animate-hero-fade-up animation-delay-1100"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-x-3 -inset-y-0.5 rounded-full bg-black/40 blur-md"
                />
                <span className="relative font-body text-[11px] uppercase tracking-[0.16em] text-white">
                  Vu dans
                </span>
                <img
                  src={LE_PROGRES_LOGO}
                  alt="Le Progrès"
                  width={300}
                  height={40}
                  className="relative h-5 w-auto object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <span className="relative font-body text-xs text-white">
                  6 septembre 2026
                </span>
              </a>
            )}
            {!isAuthenticated && <Link to="/inscription?role=sitter" className="mt-1 inline-flex min-h-[44px] w-fit items-center text-sm text-primary-foreground/95 underline underline-offset-4">Vous voulez garder ? Créez votre profil.</Link>}
          </div>
        </div>
      </section>

       {/* ═══════════════ BANDE CHIFFRES + ENTRAIDE (hors hero, fond crème) ═══════════════
           Quatre compteurs dynamiques dans l'ordre d'origine : maisons
           gardées, animaux accompagnés (socle fondateurs inclus dans les
           deux), inscrits, missions d'entraide. Le lien entraide, sorti du
           hero, passe sous la bande, centré. */}
        {(kpiMaisons > 0 || kpiAnimaux >= 10 || kpiInscrits > 0 || kpiMissions > 0) && (
           <section className="relative overflow-hidden bg-accent border-b border-border/60">
             {/* Grain de papier à 4 % sur le grand aplat crème. */}
             <GrainOverlay />
             <div className="relative lp-wide py-4 md:py-5">
              <dl className={`grid gap-x-6 gap-y-4 text-center md:gap-x-8 ${KPI_BAND_COLS[kpiBand.length] ?? KPI_BAND_COLS[4]}`}>
                {kpiBand.map((kpi) => (
                  <div key={kpi.key} className="flex flex-col items-center">
                    <dd className="font-heading text-2xl md:text-3xl font-bold text-foreground lining-nums tabular-nums leading-none">{kpi.value}</dd>
                    <dt className="font-body text-[11px] uppercase tracking-[0.16em] text-muted-foreground mt-1">{kpi.label}</dt>
                  </div>
                ))}
              </dl>
              <div className="mt-4 md:mt-5 flex justify-center">
                <Link
                  to="/petites-missions"
                  onClick={() => {
                    trackEvent("cta_aid_clicked", { metadata: { location: "kpi_band" } });
                  }}
                  className="inline-flex items-center justify-center min-h-[44px] font-body text-sm font-medium text-muted-foreground underline underline-offset-4 decoration-border hover:text-foreground hover:decoration-foreground/50 transition-colors"
                >
                  {t("landing.hero.cta_aid")}
                </Link>
              </div>
            </div>
         </section>
       )}

      {/* ═══════════════ ANNONCES DISPONIBLES (preuve vivante, remontée en
          troisième position le 06/09/2026, agrandie à six annonces) ═══════════════ */}
       <LiveListingsStrip origin={homeOrigin} profileOrigin={profileOrigin} />

      {/* ═══════════════ SOMMAIRE DE PAGE, maillage interne ═══════════════ */}
      <LandingTocBar />


      <HowItWorksSection />

      <ServiceAfterServiceSection />

      {/* ═══════════════ CONFIANCE ET AFFINITÉ CONDENSÉE ═══════════════ */}
      <ConfianceSection />

      <LivedItSection />

      <UsagesSection />

      {/* ═══════════════ FAQ, MIROIR DU JSON-LD FAQPAGE ═══════════════ */}
      <FaqSection />

      {/* ═══════════════ APPEL FINAL À DEUX PORTES ═══════════════ */}
      <FinalCtaSection />

      </main>

      <PublicFooter />

      {/* Hero animation keyframes */}
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translate3d(0, 6px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .animate-hero-fade-up { animation: heroFadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .animation-delay-400 { animation-delay: 0.08s; }
        .animation-delay-700 { animation-delay: 0.18s; }
        .animation-delay-900 { animation-delay: 0.28s; }
        @media (prefers-reduced-motion: reduce) {
          .animate-hero-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
 </div>
 );
};

export default Landing;
