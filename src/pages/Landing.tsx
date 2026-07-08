import React, { useState, useEffect, useRef } from "react";
import notreHistoirePanorama from "@/assets/story-photo.webp";
import franceLocalNational from "@/assets/illustrations/france-local-national.webp";
import howtoStep1 from "@/assets/illustrations/howto-step-1-annonce.png";
import howtoStep2 from "@/assets/illustrations/howto-step-2-rencontre.png";
import howtoStep3 from "@/assets/illustrations/howto-step-3-depart.png";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

import PageMeta from "@/components/PageMeta";
// DemoListingShowcase retiré (cards « Bientôt disponible » anti-vente).
// import DemoListingShowcase from "@/components/landing/DemoListingShowcase";
import LiveListingsSection from "@/components/landing/LiveListingsSection";
import InventoryStrip from "@/components/landing/InventoryStrip";
import InternationalStrip from "@/components/landing/InternationalStrip";
import AffinityScoreShowcase from "@/components/landing/AffinityScoreShowcase";
import ProsShowcase from "@/components/landing/ProsShowcase";
import { useInventaireCounts } from "@/hooks/useInventaireCounts";
import LiveListingsStrip from "@/components/landing/LiveListingsStrip";
import RealMembersStrip from "@/components/landing/RealMembersStrip";
import PublicHeader from "@/components/layout/PublicHeader";

import RecentSitsItemListJsonLd from "@/components/seo/RecentSitsItemListJsonLd";

import PublicFooter from "@/components/layout/PublicFooter";
import { staticRoutes, DEFAULT_OG_IMAGE } from "@/data/siteRoutes";
// Pricing pivot : plus d'Offer JSON-LD tant que PRICING_IS_ACTIVE = false.
import RevealOnScroll from "@/components/ui/RevealOnScroll";

const HOME_ROUTE = staticRoutes.find((route) => route.path === "/");
const HOME_OG_IMAGE = HOME_ROUTE?.ogImage ?? DEFAULT_OG_IMAGE;

/**
 * Bandeau saisonnier dynamique : titre + sous-titre adaptés au moment de l'année.
 * - Décembre : fêtes
 * - Janvier-Mars : hiver / vacances de février
 * - Avril-Juin : printemps / pré-été
 * - Juillet-Août : été
 * - Septembre-Novembre : automne / Toussaint
 */
function getSeasonalBanner(): { title: string; description: string } {
 const month = new Date().getMonth(); // 0 = janvier
 if (month === 11) {
 return {
 title: "Vous partez pour les fêtes ?",
 description: "Publiez votre annonce dès maintenant. Un gardien près de chez vous s'occupera de votre maison et de vos animaux pendant les fêtes de fin d'année.",
 };
 }
 if (month <= 2) {
 return {
 title: "Vous partez cet hiver ?",
 description: "Vacances au ski, week-ends prolongés, déplacements pro : confiez votre maison et vos animaux à un gardien près de chez vous.",
 };
 }
 if (month <= 5) {
 return {
 title: "Vous préparez vos vacances ?",
 description: "Anticipez : publiez votre annonce maintenant pour trouver le bon gardien avant le pic de l'été. La rencontre se fait toujours avant le départ.",
 };
 }
 if (month <= 7) {
 return {
 title: "Vous partez cet été ?",
 description: "Publiez votre annonce dès maintenant. Un gardien près de chez vous s'occupera de votre maison et de vos animaux pendant votre absence.",
 };
 }
 return {
 title: "Vous partez cet automne ?",
 description: "Toussaint, escapades, déplacements : un gardien près de chez vous veille sur votre maison et vos animaux pendant que vous êtes absent.",
 };
}



// Témoignages, répartition géographique équilibrée (France entière). Communauté
// fondatrice, période janvier à mai 2026, pour l'E-E-A-T local (expérience
// réelle et transparence).
const testimonials = [
  {
    name: "Nadia",
    detail: "2 chats, 1 chien · Mérignac (33)",
    period: "Mars 2026",
    text: "Deux chats et un chien. On n'avait pas pris de vraies vacances depuis trois ans. Notre gardienne habite à dix minutes. On s'est rencontrés autour d'un café le jeudi. On est partis le samedi.",
  },
  {
    name: "Tomas",
    detail: "Gardien · Grenoble (38)",
    period: "Février 2026",
    text: "Je cherchais un logement temporaire entre deux jobs. J'ai gardé quatre maisons en deux mois. J'ai découvert des endroits que j'habitais depuis dix ans sans jamais vraiment connaître.",
  },
  {
    name: "Rania & David",
    detail: "Maison de famille · Ardèche (07)",
    period: "Avril 2026",
    text: "On a une maison en Ardèche qu'on laissait vide huit mois par an. Maintenant elle vit. Les gens qui la gardent nous envoient des photos du jardin. C'est bizarre comme ça fait du bien.",
  },
  {
    name: "Giulia",
    detail: "Potager & poules · Anglet (64)",
    period: "Mai 2026",
    text: "Je devais partir trois semaines. Mon potager, mes poules, mes plantes. Un membre Guardiens a tout géré contre des légumes et des œufs. On se connaissait pas. On se voit encore.",
  },
  {
    name: "Sarah & Karim",
    detail: "Foyer multi-animaux · Quimper (29)",
    period: "Janvier 2026",
    text: "Trois chevaux, quatre chats, un perroquet. Tout le monde nous dit que c'est impossible à faire garder. Notre gardienne est venue deux fois avant qu'on parte. Elle connaissait leurs noms par cœur.",
  },
  {
    name: "Elena",
    detail: "Gardienne · Annecy (74)",
    period: "Mars 2026",
    text: "J'ai commencé par arroser les plantes d'un membre contre un repas. Maintenant je garde sa maison quand elle part. C'est comme ça que ça marche ici, doucement, naturellement.",
  },
];

// Initiales pour avatar (ex: "Sarah & Karim" → "S&K", "Nadia" → "N")
const getInitials = (name: string) =>
  name
    .split(/\s*&\s*|\s+/)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 3);



/* ── IntersectionObserver hook for scroll animations ── */
function useScrollReveal() {
 const ref = useRef<HTMLDivElement>(null);
 const [isVisible, setIsVisible] = useState(false);

 useEffect(() => {
 const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if (prefersReduced) {
 setIsVisible(true);
 return;
 }
 const el = ref.current;
 if (!el) return;
 const observer = new IntersectionObserver(
 ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
 { threshold: 0.1 }
 );
 observer.observe(el);
 return () => observer.disconnect();
 }, []);

 return { ref, isVisible };
}

const RevealSection = React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string; delay?: number }>(
 ({ children, className = "", delay = 0 }, _forwardedRef) => {
 const { ref, isVisible } = useScrollReveal();
 return (
 <div
 ref={ref}
 className={`transition-all duration-700 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"} ${className}`}
 style={{ transitionDelay: `${delay}s` }}
 >
 {children}
 </div>
 );
 }
);
RevealSection.displayName = "RevealSection";



const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: inventaire } = useInventaireCounts();
  const hasPros = (inventaire?.pros_total ?? 0) > 0;

  const seasonal = getSeasonalBanner();

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

 const [kpiMaisons, setKpiMaisons] = useState<number>(FOUNDERS_HOUSES_OFFSET);
 const [kpiAnimaux, setKpiAnimaux] = useState<number>(FOUNDERS_ANIMALS_OFFSET);
 const [kpiInscrits, setKpiInscrits] = useState<number>(0);
 const [kpiMissions, setKpiMissions] = useState<number>(0);

 useEffect(() => {
 const loadKPIs = async () => {
      const { data: rows } = await supabase.rpc('get_public_stats');
      const data = Array.isArray(rows) ? rows[0] : rows;
      if (data) {
        if (typeof data.maisons_gardees === 'number') {
          setKpiMaisons(data.maisons_gardees + FOUNDERS_HOUSES_OFFSET);
        }
        if (typeof data.total_inscrits === 'number') {
          setKpiInscrits(data.total_inscrits);
 }
 if (typeof data.missions_entraide === 'number') {
 setKpiMissions(data.missions_entraide);
 }
 if (typeof data.animaux_accompagnes === 'number') {
 setKpiAnimaux(data.animaux_accompagnes + FOUNDERS_ANIMALS_OFFSET);
 }
 }
 };
 loadKPIs();
 }, []);

 /* ── Local testimonial slider (no external runtime dependency) ── */
 const testimonialPages = Array.from(
 { length: Math.ceil(testimonials.length / 3) },
 (_, index) => testimonials.slice(index * 3, index * 3 + 3)
 );
 const [selectedIndex, setSelectedIndex] = useState(0);
 const [isTestimonialsHovered, setIsTestimonialsHovered] = useState(false);

 const goToTestimonialPage = (index: number) => {
 const totalPages = testimonialPages.length;
 if (totalPages <= 1) return;
 setSelectedIndex((index + totalPages) % totalPages);
 };

 useEffect(() => {
 if (testimonialPages.length <= 1 || isTestimonialsHovered) return;

 const intervalId = window.setInterval(() => {
 setSelectedIndex((prev) => (prev + 1) % testimonialPages.length);
 }, 5000);

 return () => window.clearInterval(intervalId);
 }, [isTestimonialsHovered, testimonialPages.length]);

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
        title="Garde d'animaux à domicile près de chez vous | Guardiens"
        description="Confiez votre maison et vos animaux à un gardien vérifié près de chez vous. Rencontre avant chaque garde, sans commission, partout en France."
  path="/"
  image={HOME_OG_IMAGE}
  />
      {/* JSON-LD consolidé : un seul @graph (Organization, WebSite, WebPage,
          BreadcrumbList, Service, FAQPage). Plus lisible pour Google qu'une
          collection de scripts indépendants, et permet de relier WebPage →
          mainEntity → FAQPage + Service. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://guardiens.fr/#organization",
                name: "Guardiens",
                alternateName: ["Guardiens.fr", "Home sitting Guardiens"],
                url: "https://guardiens.fr",
                logo: {
                  "@type": "ImageObject",
                  url: "https://guardiens.fr/icons/icon-512.png",
                  width: 512,
                  height: 512,
                },
                description:
                  "Plateforme de home sitting, garde d'animaux à domicile et petites missions d'entraide entre gens du coin. Sans abonnement pour les propriétaires.",
                areaServed: [
                  { "@type": "Country", name: "France" },
                  { "@type": "City", name: "Lyon" },
                  { "@type": "City", name: "Annecy" },
                  { "@type": "City", name: "Grenoble" },
                ],
                knowsAbout: [
                  "House-sitting",
                  "Pet-sitting",
                  "Garde d'animaux à domicile",
                  "Garde de chien",
                  "Garde de chat",
                  "Entraide entre gens du coin",
                  "Petites missions de proximité",
                ],
                slogan: "Quelqu'un du coin veille sur votre maison.",
                founder: [
                  { "@type": "Person", name: "Jérémie Martinot" },
                  { "@type": "Person", name: "Elisa" },
                ],
                sameAs: [
                  "https://www.linkedin.com/in/jeremiemartinot",
                  "https://maps.app.goo.gl/wBCoMpnyRu8GbrTV7",
                ],
              },
              {
                "@type": "WebSite",
                "@id": "https://guardiens.fr/#website",
                name: "Guardiens",
                url: "https://guardiens.fr",
                inLanguage: "fr-FR",
                publisher: { "@id": "https://guardiens.fr/#organization" },
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate:
                      "https://guardiens.fr/recherche?q={search_term_string}",
                  },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@type": "WebPage",
                "@id": "https://guardiens.fr/#webpage",
                url: "https://guardiens.fr/",
                name: "Home sitting & petites missions d'entraide locale | Guardiens",
                description:
                  "Home sitting et petites missions d'entraide entre gens du coin. Confiez votre maison, demandez un coup de main au quartier. Partout en France.",
                inLanguage: "fr-FR",
                isPartOf: { "@id": "https://guardiens.fr/#website" },
                about: { "@id": "https://guardiens.fr/#organization" },
                primaryImageOfPage: {
                  "@type": "ImageObject",
                  url: HOME_OG_IMAGE,
                },
                mainEntity: [
                  { "@id": "https://guardiens.fr/#service" },
                  { "@id": "https://guardiens.fr/#faq" },
                  { "@id": "https://guardiens.fr/#howto" },
                ],
              },
              {
                "@type": "HowTo",
                "@id": "https://guardiens.fr/#howto",
                name: "Comment trouver un gardien de confiance pour sa maison et ses animaux",
                description:
                  "Trois étapes pour confier votre maison et vos animaux à un gardien du coin sur Guardiens, sans abonnement pour les propriétaires.",
                totalTime: "PT5M",
                estimatedCost: {
                  "@type": "MonetaryAmount",
                  currency: "EUR",
                  value: "0",
                },
                supply: [
                  { "@type": "HowToSupply", name: "Dates de votre absence" },
                  { "@type": "HowToSupply", name: "Description de votre maison et de vos animaux" },
                ],
                step: [
                  {
                    "@type": "HowToStep",
                    position: 1,
                    name: "Décrivez votre garde",
                    text: "Renseignez vos animaux, vos dates et votre maison. En quelques minutes, votre annonce est publiée et visible des gardiens du coin.",
                    url: "https://guardiens.fr/#how-it-works",
                    image: `https://guardiens.fr${howtoStep1}`,
                  },
                  {
                    "@type": "HowToStep",
                    position: 2,
                    name: "Recevez des candidatures",
                    text: "Des gardiens proches de chez vous postulent. Consultez leurs profils vérifiés, lisez les avis, échangez par messagerie et rencontrez celui ou celle qui vous correspond.",
                    url: "https://guardiens.fr/#how-it-works",
                    image: `https://guardiens.fr${howtoStep2}`,
                  },
                  {
                    "@type": "HowToStep",
                    position: 3,
                    name: "Partez sereinement",
                    text: "Signez l'accord de garde, votre gardien s'installe, vous recevez des nouvelles régulières et vous rentrez l'esprit léger.",
                    url: "https://guardiens.fr/#how-it-works",
                    image: `https://guardiens.fr${howtoStep3}`,
                  },
                ],
              },
              {
                "@type": "BreadcrumbList",
                "@id": "https://guardiens.fr/#breadcrumb",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Accueil",
                    item: "https://guardiens.fr/",
                  },
                ],
              },
              {
                "@type": "Service",
                "@id": "https://guardiens.fr/#service",
                name: "Home sitting, garde d'animaux et entraide locale entre gens du coin",
                description:
                  "Deux services indépendants : home sitting et garde d'animaux à domicile d'un côté ; petites missions d'entraide entre gens du coin de l'autre. Avis croisés, vérification d'identité, sans commission.",
                provider: { "@id": "https://guardiens.fr/#organization" },
                areaServed: [
                  { "@type": "Country", name: "France" },
                  { "@type": "City", name: "Lyon" },
                  { "@type": "City", name: "Annecy" },
                  { "@type": "City", name: "Grenoble" },
                ],
                serviceType: [
                  "Home sitting",
                  "House sitting",
                  "Pet sitting",
                  "Garde d'animaux à domicile",
                  "Garde de chien",
                  "Garde de chat",
                  "Entraide locale",
                ],
                // Pas d'`offers` tant que PRICING_IS_ACTIVE = false : évite un
                // Rich Result Google avec un prix qui contredirait /tarifs.
              },
              {
                "@type": "FAQPage",
                "@id": "https://guardiens.fr/#faq",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "Qu'est-ce que le house sitting ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Le house sitting est un échange de services : un gardien habite sans frais dans votre maison pendant votre absence et prend soin de vos animaux. L'échange n'implique aucune transaction financière entre les deux parties.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Faut-il payer pour s'inscrire en tant que propriétaire ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "L'inscription, la publication d'annonces et les échanges avec les gardiens sont sans abonnement requis pour les propriétaires. Aucune carte bancaire demandée. Les gardiens bénéficient également d'un accès gratuit aujourd'hui, sans engagement. L'entraide entre gens du coin reste sans abonnement pour tous.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Comment trouver un pet sitter près de chez moi ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Inscrivez-vous sur Guardiens, publiez votre annonce de garde avec les dates et vos animaux, et recevez des candidatures de gardiens qui habitent près de chez vous. Vous choisissez après une rencontre.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Qui sont les gardiens sur Guardiens ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Des gens du coin, vérifiés par notre équipe. Chaque profil passe une vérification d'identité (pièce d'identité + selfie) traitée sous 24h. Vous voyez aussi leurs avis publiés par les propriétaires précédents.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Comment se déroule une garde sur Guardiens ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Vous publiez votre annonce, les gardiens du coin postulent, vous choisissez après une rencontre, puis votre gardien s'installe. Un accord de garde optionnel encadre les engagements de chacun pendant la garde.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Guardiens est-il disponible partout en France ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Oui. Le réseau Guardiens s'étend dans toutes les régions de France, du Pays basque à la Bretagne, en passant par les Alpes et le Nord. Vous trouverez un gardien près de chez vous quel que soit votre département.",
                    },
                  },
                ],
              },
            ],
          }),
        }}
      />

      {/* ItemList Schema.org des annonces récentes (Helmet, séparé du @graph). */}
      <RecentSitsItemListJsonLd limit={8} />

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <PublicHeader />

      {/* ═══════════════ MAIN LANDMARK (englobe tout le contenu) ═══════════════ */}
      <main id="main-content">
      {/* ═══════════════ SECTION 1, HERO (épuré, 5 blocs) ═══════════════ */}
      <section className="relative w-full min-h-screen flex items-center overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/65 to-black/50" />
        <div className="absolute inset-0 bg-foreground/10" aria-hidden />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-12 md:py-24">
          <div className="max-w-2xl lg:max-w-3xl">

            <p className="font-body text-xs text-white/85 tracking-[0.2em] uppercase mb-6 animate-hero-fade-up">
              {t("landing.hero.eyebrow")}
            </p>

            <p className="font-heading text-2xl md:text-3xl italic text-white/90 mb-3 animate-hero-fade-up animation-delay-400">
              {t("landing.hero.brand_tagline")}
            </p>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6 animate-hero-fade-up animation-delay-400 max-w-3xl">
              {t("landing.hero.title_main")} <span className="text-white/80">{t("landing.hero.title_accent")}</span>
            </h1>


            <p className="font-body text-lg md:text-xl text-white/85 max-w-xl mb-4 leading-relaxed animate-hero-fade-up animation-delay-700">
              {t("landing.hero.lede")}
            </p>
            <p className="font-body text-base md:text-lg text-white/85 max-w-xl mb-10 leading-relaxed italic animate-hero-fade-up animation-delay-700">
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
      <section id="usages" className="py-10 md:py-20 bg-background scroll-mt-24">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              {t("landing.usages.eyebrow")}
            </span>
            <h2 id="garde-et-entraide" className="text-2xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-3 scroll-mt-24">
              {t("landing.usages.title")}
            </h2>
            <p className="text-center text-foreground/60 font-body max-w-2xl mx-auto mb-8 md:mb-16 italic">
              {t("landing.usages.lede")}
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RevealSection delay={0.1}>
              <div className="bg-card rounded-2xl p-5 md:p-8 shadow-sm text-left h-full">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-3">{t("landing.usages.owner.tag")}</p>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.usages.owner.title")}</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  {t("landing.usages.owner.text")}
                </p>
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-body font-medium mb-4">
                  {t("landing.usages.owner.badge")}
                </span>
                <Link to="/inscription?role=owner" className="block text-sm font-body text-primary font-medium hover:underline">
                  {t("landing.usages.owner.cta")}
                </Link>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="bg-card rounded-2xl p-5 md:p-8 shadow-sm text-left h-full">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-3">{t("landing.usages.sitter.tag")}</p>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.usages.sitter.title")}</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  {t("landing.usages.sitter.text")}
                </p>
                <Link to="/inscription?role=sitter" className="text-sm font-body text-primary font-medium hover:underline">
                  {t("landing.usages.sitter.cta")}
                </Link>
              </div>
            </RevealSection>

            <RevealSection delay={0.3}>
              <div className="bg-card rounded-2xl p-5 md:p-8 shadow-sm text-left h-full border-2 border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-body font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                  {t("landing.usages.mutual.badge")}
                </div>
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-3">{t("landing.usages.mutual.tag")}</p>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.usages.mutual.title")}</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  {t("landing.usages.mutual.text")}
                </p>
                <a href="#entraide" className="text-sm font-body text-primary font-medium hover:underline">
                  {t("landing.usages.mutual.cta")}
                </a>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.4}>
            <div className="mt-10 bg-accent/40 border border-accent rounded-2xl p-6 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs tracking-widest uppercase text-foreground/60 font-body mb-1">{t("landing.usages.urgency.eyebrow")}</p>
                <h3 className="text-lg font-heading font-semibold text-foreground">{t("landing.usages.urgency.title")}</h3>
                <p className="text-sm font-body text-foreground/70 mt-1">
                  {t("landing.usages.urgency.text")}
                </p>
              </div>
              <Link
                to="/gardien-urgence"
                className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-foreground text-background font-body font-medium text-sm hover:bg-foreground/90 transition-colors"
              >
                {t("landing.usages.urgency.cta")}
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ SECTION 2.5, INTERNATIONAL (InternationalStrip) ═══════════════ */}
      <RevealSection>
        <InternationalStrip />
      </RevealSection>

      {/* ═══════════════ SECTION 2bis, CE QUI ARRIVE EN PLUS ═══════════════ */}
      <section id="rencontre" className="py-10 md:py-20 bg-accent/40 border-y border-accent scroll-mt-24">
        <div className="max-w-3xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/70 font-body mb-6 block text-center">
              {t("landing.meeting.eyebrow")}
            </span>
            <h2 id="le-vrai-pretexte" className="font-heading text-2xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] text-foreground text-center mb-10 scroll-mt-24">
              {t("landing.meeting.title_a")}<br className="hidden md:inline" /> {t("landing.meeting.title_b")}
            </h2>

            <div className="border-l-4 border-primary pl-6 md:pl-8 max-w-2xl mx-auto">
              <p className="text-lg md:text-xl font-body leading-relaxed text-foreground/80 mb-5">
                {t("landing.meeting.p1")}
              </p>
              <p className="text-lg md:text-xl font-body leading-relaxed text-foreground/80 mb-5">
                {t("landing.meeting.p2")}
              </p>
              <p className="font-heading text-xl md:text-2xl italic text-foreground leading-snug">
                {t("landing.meeting.p3")}
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ SECTION 3, COMMENT ÇA MARCHE ═══════════════ */}
      <section id="comment-ca-marche" className="py-10 md:py-20 bg-muted/30 scroll-mt-24">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              {t("landing.how.eyebrow")}
            </span>
            <h2 id="how-it-works" className="text-2xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-4 scroll-mt-24">
              {t("landing.how.title")}
            </h2>
            <p className="text-center text-foreground/60 font-body max-w-2xl mx-auto mb-8 md:mb-16">
              {seasonal.description}
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RevealSection delay={0.1}>
              <div className="text-center">
                <div className="relative mx-auto mb-4 w-56 h-56">
                  <img
                    src={howtoStep1}
                    alt="Illustration gouache d'un cottage en pierre avec un chat à la fenêtre et un chien à la porte."
                    width={1024}
                    height={1024}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-0 left-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-base shadow-md">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.how.step1_title")}</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70">
                  {t("landing.how.step1_text")}
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="text-center">
                <div className="relative mx-auto mb-4 w-56 h-56">
                  <img
                    src={howtoStep2}
                    alt="Illustration gouache de deux personnes qui se serrent la main autour d'une table, un chat et un chien à leurs côtés."
                    width={1024}
                    height={1024}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-0 left-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-base shadow-md">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.how.step2_title")}</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70">
                  {t("landing.how.step2_text")}
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={0.3}>
              <div className="text-center">
                <div className="relative mx-auto mb-4 w-56 h-56">
                  <img
                    src={howtoStep3}
                    alt="Illustration gouache d'une valise vintage prête au départ avec un chat et un chien à côté."
                    width={1024}
                    height={1024}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-0 left-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-base shadow-md">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">{t("landing.how.step3_title")}</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70">
                  {t("landing.how.step3_text")}
                </p>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.4} className="text-center mt-14">
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => {
                  trackEvent("cta_proprio_clicked", { metadata: { location: "how_it_works" } });
                  navigate("/inscription?role=owner");
                }}
                className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-primary text-primary-foreground hover:brightness-90 hover:scale-[1.02] transition-all duration-200"
              >
                {t("landing.how.cta_owner")}
              </button>
              <a
                href="#entraide"
                className="font-body text-sm font-medium tracking-wide rounded-full px-8 py-3.5 bg-transparent text-foreground border border-border hover:border-primary/40 hover:text-primary transition-all duration-200"
              >
                {t("landing.how.cta_secondary")}
              </a>
            </div>
            <p className="mt-3 text-xs text-muted-foreground font-body">
              {t("landing.how.footnote")}
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ SECTION 4, OSEZ L'ENTRAIDE ═══════════════ */}
      <section id="entraide" className="py-10 md:py-20 bg-accent scroll-mt-24">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              {t("landing.aid.eyebrow")}
            </span>
            <h2 id="osez-l-entraide" className="text-2xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-6 scroll-mt-24">
              {t("landing.aid.title")}
            </h2>
            <p className="text-center text-foreground/70 font-body max-w-2xl mx-auto mb-4 text-lg leading-relaxed">
              {t("landing.aid.p1")}
            </p>
            <p className="text-center text-foreground/70 font-body max-w-2xl mx-auto mb-8 md:mb-16 text-lg leading-relaxed">
              {t("landing.aid.p2")}
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <RevealSection delay={0.1}>
              <div className="bg-card rounded-2xl p-5 md:p-8 shadow-sm h-full">
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">
                  {t("landing.aid.need_title")}
                </h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  {t("landing.aid.need_text")}
                </p>
                <p className="text-sm font-body font-medium text-primary">
                  {t("landing.aid.need_footer")}
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="bg-card rounded-2xl p-5 md:p-8 shadow-sm h-full">
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">
                  {t("landing.aid.offer_title")}
                </h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  {t("landing.aid.offer_text")}
                </p>
                <p className="text-sm font-body font-medium text-primary">
                  {t("landing.aid.offer_footer")}
                </p>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.25} className="mt-16">
            <p className="text-center text-xs tracking-widest uppercase text-primary/60 font-body mb-6">
              {t("landing.aid.seen_this_week")}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
              {[
                "water_plants",
                "small_diy",
                "garden_pruning",
                "bread_class",
                "reiki",
                "parcel",
                "carpool",
                "seedlings",
                "coffee_listen",
                "groceries",
                "moving_help",
                "sewing",
              ].map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-center text-center bg-card rounded-xl px-3 py-4 border border-border/60 hover:border-primary/40 hover:shadow-sm transition-all min-h-[64px]"
                >
                  <span className="text-xs font-body text-foreground/80 leading-tight">{t(`landing.aid.examples.${key}`)}</span>
                </div>
              ))}
            </div>
          </RevealSection>

          <RevealSection delay={0.3} className="text-center mt-12">
            <div className="border-l-4 border-primary pl-6 max-w-xl mx-auto text-left mb-10">
              <p className="text-xl md:text-2xl font-heading font-semibold italic text-foreground leading-snug">
                {t("landing.aid.quote")}
              </p>
            </div>
            <Link
              to="/petites-missions"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-body font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              {t("landing.aid.cta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ SECTION 5, ANNONCES EN COURS (live) ═══════════════ */}
      <RevealSection>
        <LiveListingsSection />
      </RevealSection>

      {/* ═══════════════ SECTION 5.5, CHIFFRES DU RÉSEAU (InventoryStrip) ═══════════════ */}
      <RevealSection>
        <InventoryStrip />
      </RevealSection>

      {/* Vitrine démo désactivée : doublonnait LiveListingsSection avec des cards
          « Bientôt disponible » qui envoyaient un signal anti-vente juste après
          les vraies annonces live. */}

      {/* ═══════════════ SECTION 6, CONFIANCE & PÉRIMÈTRE ═══════════════ */}
      <section id="confiance" className="bg-background py-10 md:py-20 scroll-mt-24" aria-labelledby="trust-heading">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <RevealSection className="text-center max-w-3xl mx-auto mb-8 md:mb-16">
            <p className="text-xs md:text-[13px] tracking-[0.2em] uppercase text-primary font-body font-medium">
              {t("landing.trust.eyebrow")}
            </p>
            <h2 id="trust-heading" className="font-heading text-4xl md:text-5xl font-semibold text-foreground mt-4 leading-tight">
              {t("landing.trust.title")}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mt-5 leading-relaxed">
              {t("landing.trust.lede")}
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Illustration France */}
            <RevealOnScroll from="left" className="relative order-2 lg:order-1 mx-auto w-full max-w-md lg:max-w-none group/illu">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-3xl blur-2xl transition-opacity duration-500 group-hover/illu:opacity-80 opacity-60" aria-hidden="true" />
              <div className="relative bg-card/50 border border-border rounded-3xl p-4 sm:p-5 md:p-7 shadow-sm transition-all duration-500 group-hover/illu:shadow-lg group-hover/illu:-translate-y-0.5">
                <img
                  src={franceLocalNational}
                  alt="Illustration gouache d'une carte de France parsemée de points reliés, symbolisant le réseau de gardiens partout dans le pays."
                  width={960}
                  height={960}
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 60vw, 480px"
                  className="block w-full h-auto max-w-[420px] sm:max-w-[460px] lg:max-w-none mx-auto rounded-2xl transition-transform duration-700 ease-out group-hover/illu:scale-[1.02] motion-reduce:transition-none motion-reduce:transform-none"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            </RevealOnScroll>

            {/* 4 piliers */}
            <RevealOnScroll from="right" delay={120} className="order-1 lg:order-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body">01</p>
                <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">{t("landing.trust.p1_title")}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {t("landing.trust.p1_text")}
                </p>
              </article>

              <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body">02</p>
                <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">{t("landing.trust.p2_title")}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {t("landing.trust.p2_text")}
                </p>
              </article>

              <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body">03</p>
                <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">{t("landing.trust.p3_title")}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {t("landing.trust.p3_text")}
                </p>
              </article>

              <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body">04</p>
                <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">{t("landing.trust.p4_title")}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  {t("landing.trust.p4_text")}
                </p>
              </article>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 6.5, SCORE D'AFFINITÉ (AffinityScoreShowcase) ═══════════════ */}
      <RevealSection>
        <AffinityScoreShowcase />
      </RevealSection>

      {/* ═══════════════ SECTION 7, TÉMOIGNAGES ═══════════════ */}
      <section id="temoignages" className="py-10 md:py-20 bg-background scroll-mt-24">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <RevealSection className="text-center mb-16">
            <h2 id="ils-ont-ose" className="font-heading text-4xl md:text-5xl font-semibold text-foreground leading-snug scroll-mt-24">
              {t("landing.testimonials.title")}
            </h2>
            <p className="mt-4 font-body text-sm text-foreground/55 max-w-xl mx-auto">
              {t("landing.testimonials.source")}
            </p>
          </RevealSection>

          <RealMembersStrip />

          <div
            className="relative"
            onMouseEnter={() => setIsTestimonialsHovered(true)}
            onMouseLeave={() => setIsTestimonialsHovered(false)}
          >
            <button
              onClick={() => goToTestimonialPage(selectedIndex - 1)}
              className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground/70 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label={t("landing.testimonials.prev_aria")}
              disabled={testimonialPages.length <= 1}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToTestimonialPage(selectedIndex + 1)}
              className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground/70 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label={t("landing.testimonials.next_aria")}
              disabled={testimonialPages.length <= 1}
            >
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="overflow-hidden px-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(testimonialPages[selectedIndex] ?? []).map((quote) => (
                  <figure key={quote.name} className="min-w-0">
                    <blockquote className="rounded-2xl p-10 h-full bg-card border border-border shadow-sm flex flex-col">
                      <span aria-hidden className="block font-heading text-7xl leading-none mb-3 select-none text-primary/40">
                        "
                      </span>
                      <p className="font-body text-base md:text-lg text-foreground/70 leading-relaxed italic mb-6 flex-1">
                        {quote.text}
                      </p>
                      <figcaption className="flex items-center gap-3 pt-4 border-t border-border/60">
                        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-heading text-sm font-semibold">
                          {getInitials(quote.name)}
                        </span>
                        <span className="flex flex-col leading-tight">
                          <span className="font-body text-sm font-semibold text-foreground">
                            {quote.name}
                          </span>
                          <span className="font-body text-xs text-foreground/55">
                            {quote.detail}
                          </span>
                          <span className="font-body text-[11px] text-foreground/40 mt-0.5 uppercase tracking-widest">
                            {quote.period} · {t("landing.testimonials.program_label")}
                          </span>
                        </span>
                      </figcaption>
                    </blockquote>
                  </figure>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-2 mt-10">
              {testimonialPages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToTestimonialPage(i)}
                  className="inline-flex items-center justify-center min-w-11 min-h-11 group"
                  aria-label={t("landing.testimonials.page_aria", { n: i + 1 })}
                >
                  <span
                    className={`block w-2.5 h-2.5 rounded-full transition-colors ${
                      i === selectedIndex ? "bg-primary" : "bg-foreground/20 group-hover:bg-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 8, NOTRE HISTOIRE ═══════════════ */}
      <section id="notre-histoire" className="bg-muted/30 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-6 py-10 md:py-20">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block">
              {t("landing.story.eyebrow")}
            </span>
            <h2 id="commence-avec-un-visa" className="text-2xl md:text-5xl font-heading font-semibold leading-snug text-foreground mb-12 scroll-mt-24">
              {t("landing.story.title")}
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">
            <RevealSection delay={0.1}>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                {t("landing.story.p1")}
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                {t("landing.story.p2")}
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                {t("landing.story.p3")}
              </p>
              <div className="border-l-4 border-primary pl-6 my-8">
                <p className="text-2xl md:text-3xl font-heading font-semibold italic text-foreground leading-snug">
                  {t("landing.story.quote")}
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                {t("landing.story.p4")}
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                {t("landing.story.p5")}
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                {t("landing.story.p6")}
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                {t("landing.story.p7")}
              </p>
              <span className="text-sm font-body italic text-foreground/50 mt-10 block">
                {t("landing.story.signature")}
              </span>
            </RevealSection>
          </div>

          <div className="w-full mt-16 rounded-2xl overflow-hidden">
            <img
              src={notreHistoirePanorama}
              alt="Photographie panoramique d'une maison de campagne aux volets bleus, illustrant l'esprit du home sitting Guardiens : on confie ses clés, on est invité dans une vie."
              className="w-full h-64 md:h-96 object-cover object-center"
              loading="lazy"
              width={1920}
              height={600}
              decoding="async"
            />
          </div>
        </div>
      </section>

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
                  <li>
                    <Link
                      to="/actualites/s-absenter-avec-animal-guide-solutions-2026"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        S'absenter avec un animal : le guide des 8 situations en 2026
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/actualites/vacances-longues-garde-animal-2-semaines"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        Vacances longues : faire garder son animal pendant 2 semaines ou plus
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/actualites/pension-chien-alternatives-guide"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        Alternatives à la pension pour chien : 5 solutions pour partir sereinement
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/actualites/garde-animaux-savoie-guide"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        Garde d'animaux en Savoie : le guide complet
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/actualites/garde-animaux-haute-savoie-guide"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        Garde d'animaux en Haute-Savoie : le guide complet
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/actualites/garde-animaux-croix-rousse-lyon"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        Garde de chien et chat à la Croix-Rousse : spécificités du quartier
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/actualites/francais-etranger-garde-maison-france"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        Français de l'étranger : faire garder sa maison en France pendant son absence
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/actualites/expat-proprietaire-faire-garder-maison-etranger"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        Expatriés : faire garder sa maison à l'étranger (Bali, Lisbonne, Marrakech...) par un Français
                      </span>
                    </Link>
                  </li>

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
                  <li>
                    <Link
                      to="/house-sitting/lyon"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        <strong>House-sitting à Lyon</strong>. Des gardiens vérifiés dans chaque arrondissement, du Vieux Lyon à la Croix-Rousse, en passant par la Part-Dieu et Confluence.
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/house-sitting/annecy"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        <strong>House-sitting à Annecy</strong>. Lac, montagne, résidences secondaires en Haute-Savoie. Des gardiens locaux qui connaissent le gel, les accès et les vétos.
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/house-sitting/grenoble"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        <strong>House-sitting à Grenoble</strong>. Au pied du Vercors, de la Chartreuse et de Belledonne. Des gardiens qui connaissent la cuvette et les sentiers de la Bastille.
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/house-sitting/villeurbanne"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        <strong>House-sitting à Villeurbanne</strong>. Aux portes de Lyon, Gratte-Ciel, Charpennes, Cusset. Des gardiens qui circulent facilement entre les deux villes.
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/house-sitting/chambery"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        <strong>House-sitting à Chambéry</strong>. Capitale de la Savoie, entre lac du Bourget et massif des Bauges. Des gardiens à l'aise avec la montagne et l'hiver.
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/house-sitting/valence"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        <strong>House-sitting à Valence</strong>. Porte du sud, entre Rhône et Vercors. Des gardiens proches des trajets vacances et des résidences secondaires drômoises.
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/house-sitting/ecully"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        <strong>House-sitting à Écully</strong>. Ouest lyonnais résidentiel, maisons avec jardin et animaux. Des gardiens habitués aux propriétés calmes et familiales.
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/inscription"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        <strong>Partout en France</strong>. Du Pays basque à la Bretagne, en passant par les Alpes, la Provence et le Nord. Le réseau s'étend dans toutes les régions.
                      </span>
                    </Link>
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row gap-3 items-start">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/annonces">Voir toutes les annonces</Link>
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
            <dl className="space-y-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-card border border-border rounded-2xl p-6">
                  <dt className="font-heading font-semibold text-foreground mb-2">
                    {t(`landing.faq.q${n}`)}
                  </dt>
                  <dd className="text-sm text-foreground/70 leading-relaxed">
                    {t(`landing.faq.a${n}`)}
                  </dd>
                </div>
              ))}
            </dl>
          </RevealSection>
        </div>
      </section>

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
              className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-transparent text-white border-2 border-white/40 hover:bg-white/10 transition-all duration-200"
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
