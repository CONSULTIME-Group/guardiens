import { useEffect } from "react";
import AlmaTipsTeaser from "@/components/landing/AlmaTipsTeaser";

import franceLocalNational from "@/assets/illustrations/france-local-national.webp";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

import PageMeta from "@/components/PageMeta";

import InventoryStrip from "@/components/landing/InventoryStrip";
import InternationalStrip from "@/components/landing/InternationalStrip";
import AffinityScoreShowcase from "@/components/landing/AffinityScoreShowcase";
import ProsShowcase from "@/components/landing/ProsShowcase";
import { useInventaireCounts } from "@/hooks/useInventaireCounts";
import { usePublicStats } from "@/hooks/usePublicStats";
import LiveListingsStrip from "@/components/landing/LiveListingsStrip";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import { UsagesSection } from "@/components/landing/UsagesSection";
import { RencontreSection } from "@/components/landing/RencontreSection";
import { EntraideSection } from "@/components/landing/EntraideSection";
import HomeJsonLd from "@/components/landing/HomeJsonLd";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ConfianceSection } from "@/components/landing/ConfianceSection";
import { ComparatifSection } from "@/components/landing/ComparatifSection";
import { NotreHistoireSection } from "@/components/landing/NotreHistoireSection";
import { GuidesVillesSection } from "@/components/landing/GuidesVillesSection";

import PublicHeader from "@/components/layout/PublicHeader";

import RecentSitsItemListJsonLd from "@/components/seo/RecentSitsItemListJsonLd";

import PublicFooter from "@/components/layout/PublicFooter";
import { staticRoutes, DEFAULT_OG_IMAGE } from "@/data/siteRoutes";
// Pricing pivot : plus d'Offer JSON-LD tant que PRICING_IS_ACTIVE = false.
import { RevealSection } from "@/components/ui/RevealSection";




const HOME_ROUTE = staticRoutes.find((route) => route.path === "/");
const HOME_OG_IMAGE = HOME_ROUTE?.ogImage ?? DEFAULT_OG_IMAGE;












const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: inventaire } = useInventaireCounts();
  const { data: publicStats } = usePublicStats();
  const hasPros = (inventaire?.pros_total ?? 0) > 0;

  

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

  // KPIs : valeurs réelles depuis public_stats + socle historique équipe.
  // - Maisons : 37 maisons gardées en 5 ans par Jérémie & Elisa (cité dans le récit d'origine).
  // - Animaux : 234 animaux accompagnés sur la même période (cité dans le récit d'origine,
  // src/data/cityContent.ts). On part donc de 234 et on ajoute les nouveaux comptés en base.
  const FOUNDERS_HOUSES_OFFSET = 37;
  const FOUNDERS_ANIMALS_OFFSET = 234;

  const kpiMaisons = (publicStats?.maisons_gardees ?? 0) + FOUNDERS_HOUSES_OFFSET;
  const kpiAnimaux = (publicStats?.animaux_accompagnes ?? 0) + FOUNDERS_ANIMALS_OFFSET;
  const kpiInscrits = publicStats?.total_inscrits ?? 0;
  const kpiMissions = publicStats?.missions_entraide ?? 0;


 /* ── Idle preload of the France illustration (low priority, post-LCP) ── */
 useEffect(() => {
 if (typeof document === "undefined") return;
 // Already preloaded? skip.
 if (document.querySelector('link[data-preload="france-local-national"]')) return;

 const schedule: (cb: () => void) => number =
 (window as any).requestIdleCallback
 ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 2500 })
 : (cb) => window.setTimeout(cb, 1500);

 const handle = schedule(() => {
 const link = document.createElement("link");
 link.rel = "preload";
 link.as = "image";
 link.href = franceLocalNational;
 link.type = "image/webp";
 // Low priority so it never competes with the hero / LCP resources.
 link.setAttribute("fetchpriority", "low");
 link.dataset.preload = "france-local-national";
 document.head.appendChild(link);
 });

 return () => {
 if ((window as any).cancelIdleCallback && (window as any).requestIdleCallback) {
 (window as any).cancelIdleCallback(handle);
 } else {
 window.clearTimeout(handle);
 }
 };
 }, []);


 return (
 <div className="min-h-screen bg-background text-foreground">
   <PageMeta
        title="Garde d'animaux à domicile et house-sitting entre particuliers | Guardiens"
        description="Trouvez un gardien du coin pour votre maison et vos animaux. House-sitting et entraide entre particuliers, vérifiés et notés. Partout en France."
 path="/"
 image={HOME_OG_IMAGE}
 />
      <HomeJsonLd />

      {/* ItemList Schema.org des annonces récentes (Helmet, séparé du @graph). */}
      <RecentSitsItemListJsonLd limit={8} />

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <PublicHeader authedVariant />

      {/* ═══════════════ MAIN LANDMARK (englobe tout le contenu) ═══════════════ */}
      <main id="main-content">
      {/* ═══════════════ SECTION 1, HERO (épuré, 5 blocs) ═══════════════ */}
      <section className="relative w-full min-h-screen flex items-center overflow-hidden">
        <picture>
          <source
            type="image/avif"
            srcSet="/hero-landing-640.avif 640w, /hero-landing-960.avif 960w, /hero-landing-1280.avif 1280w, /hero-landing-1920.avif 1920w"
            sizes="100vw"
          />
          <source
            type="image/webp"
            srcSet="/hero-landing-640.webp 640w, /hero-landing-960.webp 960w, /hero-landing-1280.webp 1280w, /hero-landing-1920.webp 1920w"
            sizes="100vw"
          />
          <img
            src="/hero-landing.webp"
            alt="Golden retriever assis dans l'herbe d'un jardin ensoleillé, gueule ouverte."
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            {...({ fetchpriority: "high" } as any)}
            width={1920}
            height={1080}
            sizes="100vw"
            decoding="async"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/55" />
        <div className="absolute inset-0 bg-foreground/20" aria-hidden />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-12 md:py-24">
          <div className="max-w-2xl lg:max-w-3xl">

            <p className="font-body text-xs text-white/85 tracking-[0.2em] uppercase mb-6">
              {t("landing.hero.eyebrow")}
            </p>

            <p className="font-heading text-2xl md:text-3xl italic text-white/90 mb-3 animate-hero-fade-up animation-delay-400">
              {t("landing.hero.brand_tagline")}
            </p>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6 max-w-3xl">
              {t("landing.hero.title_main")} <span className="text-white/80">{t("landing.hero.title_accent")}</span>
            </h1>


            <p className="font-body text-lg md:text-xl text-white max-w-xl mb-4 leading-relaxed animate-hero-fade-up animation-delay-700">
              {t("landing.hero.lede")}
            </p>
            <p className="font-body text-base md:text-lg text-white/95 max-w-xl mb-10 leading-relaxed italic animate-hero-fade-up animation-delay-700">
              {t("landing.hero.lede_italic")}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 animate-hero-fade-up animation-delay-900">
              <button
                onClick={() => {
                  trackEvent("cta_proprio_clicked", { metadata: { location: "hero" } });
                  navigate("/inscription?role=owner");
                }}
                className="font-body text-base font-semibold tracking-wide rounded-full px-12 py-4 bg-primary text-primary-foreground hover:brightness-95 hover:scale-[1.03] transition-all duration-200 shadow-xl shadow-primary/40 ring-2 ring-primary-foreground/10"
              >
                {t("landing.hero.cta_owner")}
              </button>
              <button
                onClick={() => {
                  trackEvent("cta_sitter_clicked", { metadata: { location: "hero" } });
                  navigate("/inscription?role=sitter");
                }}
                className="font-body text-sm font-medium tracking-wide rounded-full px-7 py-3 bg-transparent text-white border border-white/60 hover:bg-white/10 transition-all duration-200"
              >
                {t("landing.hero.cta_sitter")}
              </button>
            </div>

            <p className="font-body text-sm text-white/85 mt-4 animate-hero-fade-up animation-delay-1000">
              {t("landing.hero.reassurance")}
            </p>

            {(kpiMaisons > 0 || kpiAnimaux > 0 || kpiInscrits > 0 || kpiMissions > 0) && (
              <div className="flex flex-row flex-wrap justify-start gap-x-6 gap-y-3 mt-8 md:gap-x-12 md:gap-y-6 md:mt-14 animate-hero-fade-up animation-delay-1100">
                {kpiMaisons > 0 && (
                  <div className="border-r border-white/20 pr-6 md:pr-12 last:border-r-0 last:pr-0">
                    <span className="block text-3xl font-heading font-bold text-white tabular-nums">{kpiMaisons}</span>
                    <span className="text-xs font-body text-white/80 tracking-wide uppercase mt-1 block">{t("landing.hero.kpi_houses")}</span>
                  </div>
                )}
                {kpiAnimaux > 0 && (
                  <div className="border-r border-white/20 pr-6 md:pr-12 last:border-r-0 last:pr-0">
                    <span className="block text-3xl font-heading font-bold text-white tabular-nums">{kpiAnimaux}</span>
                    <span className="text-xs font-body text-white/80 tracking-wide uppercase mt-1 block">{t("landing.hero.kpi_animals")}</span>
                  </div>
                )}
                {kpiInscrits > 0 && (
                  <div className="border-r border-white/20 pr-6 md:pr-12 last:border-r-0 last:pr-0">
                    <span className="block text-3xl font-heading font-bold text-white tabular-nums">{kpiInscrits}</span>
                    <span className="text-xs font-body text-white/80 tracking-wide uppercase mt-1 block">{t("landing.hero.kpi_members")}</span>
                  </div>
                )}
                {kpiMissions >= 5 && (
                  <div>
                    <span className="block text-3xl font-heading font-bold text-white tabular-nums">{kpiMissions}</span>
                    <span className="text-xs font-body text-white/80 tracking-wide uppercase mt-1 block">{t("landing.hero.kpi_missions")}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════ APERÇU LIVE ANNONCES (sous Hero) ═══════════════ */}
      <LiveListingsStrip />






      {/* ═══════════════ SOMMAIRE DE PAGE, maillage interne ═══════════════ */}
      <nav
        aria-label={t("landing.toc.aria")}
        className="border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="max-w-6xl mx-auto px-6">
          <ul className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2.5 -mx-2 px-2">
            {(() => {
              const items = [
                { href: "#usages", label: t("landing.toc.care_aid"), mobile: true },
                { href: "#international", label: t("landing.toc.international"), mobile: false },
                { href: "#comment-ca-marche", label: t("landing.toc.how"), mobile: false },
                { href: "#entraide", label: t("landing.toc.aid"), mobile: false },
                { href: "#chiffres", label: t("landing.toc.numbers"), mobile: true },
                { href: "#confiance", label: t("landing.toc.trust"), mobile: true },
                { href: "#comparatif", label: t("landing.toc.compare", { defaultValue: "Comparatif" }), mobile: false },
                { href: "#matching", label: t("landing.toc.matching"), mobile: true },
                { href: "#temoignages", label: t("landing.toc.testimonials"), mobile: true },
                { href: "#notre-histoire", label: t("landing.toc.story"), mobile: false },
                { href: "#pros", label: t("landing.toc.pros"), mobile: false, hidden: !hasPros },
                { href: "#guides-villes", label: t("landing.toc.cities"), mobile: false },
                { href: "#faq", label: t("landing.toc.faq"), mobile: true },
              ];
              return items.filter((item) => !("hidden" in item) || !item.hidden).map((item) => (
                <li key={item.href} className={item.mobile ? "shrink-0" : "shrink-0 hidden md:list-item"}>
                <a
                  href={item.href}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] tracking-[0.14em] uppercase font-body text-foreground/55 hover:text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"
                >
                  {item.label}
                </a>
              </li>
              ));
            })()}
          </ul>
        </div>
      </nav>


      {/* ═══════════════ SECTION 2, CE QU'ON FAIT ENSEMBLE ═══════════════ */}
      <UsagesSection />

      {/* ═══════════════ SECTION 2.5, INTERNATIONAL (InternationalStrip) ═══════════════ */}
      <RevealSection>
        <InternationalStrip />
      </RevealSection>

      {/* ═══════════════ SECTION 2bis, CE QUI ARRIVE EN PLUS ═══════════════ */}
      <RencontreSection />

      {/* ═══════════════ SECTION 3, COMMENT ÇA MARCHE ═══════════════ */}
      <HowItWorksSection />


      {/* ═══════════════ SECTION 4, OSEZ L'ENTRAIDE ═══════════════ */}
      <EntraideSection />

      {/* ═══════════════ SECTION 5.5, CHIFFRES DU RÉSEAU (InventoryStrip) ═══════════════ */}
      <RevealSection>
        <InventoryStrip />
      </RevealSection>

      {/* ═══════════════ SECTION 6, CONFIANCE & PÉRIMÈTRE ═══════════════ */}
      <ConfianceSection />


      {/* ═══════════════ SECTION COMPARATIF (extractible, GEO) ═══════════════ */}
      <ComparatifSection />


      {/* ═══════════════ SECTION 6.5, SCORE D'AFFINITÉ (AffinityScoreShowcase) ═══════════════ */}
      <RevealSection>
        <AffinityScoreShowcase />
      </RevealSection>

      {/* ═══════════════ SECTION 7, TÉMOIGNAGES ═══════════════ */}
      <TestimonialsSection />


      {/* ═══════════════ SECTION 8, NOTRE HISTOIRE ═══════════════ */}
      <NotreHistoireSection />

      {/* ═══════════════ SECTION 8.5, PROS ANIMALIERS (ProsShowcase) ═══════════════ */}
      <RevealSection>
        <ProsShowcase />
      </RevealSection>

      {/* ═══════════════ SECTION 9, GUIDES + VILLES (fusion SEO) ═══════════════ */}
      <section id="guides-villes" className="py-10 md:py-20 bg-background scroll-mt-24">
        <div className="max-w-6xl mx-auto px-6">
          <RevealSection className="text-center mb-14">
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block">
              {t("landing.cities.eyebrow")}
            </span>
            <h2 id="house-sitting-pres-de-chez-vous" className="font-heading text-4xl md:text-5xl font-semibold text-foreground leading-snug mb-4 scroll-mt-24">
              {t("landing.cities.title")}
            </h2>
            <p className="text-lg font-body text-foreground/70 max-w-2xl mx-auto">
              {t("landing.cities.lede")}
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Colonne Guides */}
            <RevealSection delay={0.1}>
              <div className="rounded-2xl bg-card border border-border p-8 h-full">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-2">{t("landing.cities.guides_tag")}</p>
                <h3 className="font-heading text-2xl font-semibold text-foreground mb-6">
                  {t("landing.cities.guides_title")}
                </h3>
                <ul className="space-y-3">
                  {guideLinks.map((e) => (
                    <li key={e.to}>
                      <Link
                        to={e.to}
                        className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                      >
                        <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                        <span className="text-sm leading-relaxed">{t(e.labelKey)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row gap-3">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/actualites">{t("landing.cities.all_articles")}</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/guides">{t("landing.cities.all_guides")}</Link>
                  </Button>
                </div>
              </div>
            </RevealSection>

            {/* Colonne Villes */}
            <RevealSection delay={0.2}>
              <div className="rounded-2xl bg-card border border-border p-8 h-full">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-2">{t("landing.cities.cities_tag")}</p>
                <h3 className="font-heading text-2xl font-semibold text-foreground mb-6">
                  {t("landing.cities.cities_title")}
                </h3>
                <ul className="space-y-3">
                  {cityLinks.map((e) => (
                    <li key={e.to}>
                      <Link
                        to={e.to}
                        className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                      >
                        <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                        <span className="text-sm leading-relaxed">
                          <strong>{t(e.labelKey)}</strong>. {t(e.descKey)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 items-start">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/annonces">{t("landing.guides_cities.all_listings")}</Link>
                  </Button>
                  <p className="text-xs text-foreground/60 leading-relaxed flex-1">
                    {t("landing.cities.cities_footer")}
                  </p>
                </div>
              </div>
            </RevealSection>
          </div>

        </div>
      </section>

      {/* ═══════════════ SECTION 9bis, FAQ (section dédiée, miroir du JSON-LD FAQPage) ═══════════════ */}
      <section id="faq" className="py-10 md:py-20 bg-background scroll-mt-24" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-[5%] md:px-[8%]">
          <RevealSection>
            <h2 id="faq-heading" className="font-heading text-3xl md:text-4xl font-semibold text-foreground text-center mb-10 scroll-mt-24">
              {t("landing.faq.title")}
            </h2>
            <div className="space-y-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <article key={n} className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                    {t(`landing.faq.q${n}`)}
                  </h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {t(`landing.faq.a${n}`)}
                  </p>
                </article>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      <AlmaTipsTeaser />

      {/* ═══════════════ SECTION 10, CTA FINAL (fusion Fondateur + double CTA) ═══════════════ */}
      <section id="commencer" className="py-10 md:py-20 bg-primary scroll-mt-24">
        <RevealSection className="max-w-2xl mx-auto px-6 text-center">
          {/* Chips "Programme Fondateur" retirés (signal de deadline implicite). */}
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
            {t("landing.final.title")}
          </h2>
          <p className="font-body text-lg text-white/85 leading-relaxed max-w-lg mx-auto mb-10">
            {t("landing.final.lede")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button
              onClick={() => {
                trackEvent("cta_proprio_clicked", { metadata: { location: "final_cta" } });
                navigate("/inscription?role=owner");
              }}
              className="font-body text-sm font-bold tracking-wide rounded-full px-10 py-4 bg-white text-primary hover:bg-background hover:scale-[1.02] transition-all duration-200"
            >
              {t("landing.final.cta_owner")}
            </button>
            <button
              onClick={() => {
                trackEvent("cta_sitter_clicked", { metadata: { location: "final_cta" } });
                navigate("/inscription?role=sitter");
              }}
              className="font-body text-xs font-medium tracking-wide rounded-full px-6 py-2.5 bg-transparent text-white/85 border border-white/30 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              {t("landing.final.cta_sitter")}
            </button>
          </div>
          <p className="text-xs text-white/70 font-body">
            {t("landing.final.footnote")}
          </p>
        </RevealSection>
      </section>
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
        .animation-delay-1000 { animation-delay: 0.38s; }
        .animation-delay-1100 { animation-delay: 0.48s; }
        @media (prefers-reduced-motion: reduce) {
          .animate-hero-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
 </div>
 );
};

export default Landing;
