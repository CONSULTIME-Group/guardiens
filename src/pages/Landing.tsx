import React, { useState, useEffect, useRef } from "react";
import notreHistoirePanorama from "@/assets/story-photo.webp";
import franceLocalNational from "@/assets/illustrations/france-local-national.webp";
import howtoStep1 from "@/assets/illustrations/howto-step-1-annonce.png";
import howtoStep2 from "@/assets/illustrations/howto-step-2-rencontre.png";
import howtoStep3 from "@/assets/illustrations/howto-step-3-depart.png";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

import PageMeta from "@/components/PageMeta";
import DemoListingShowcase from "@/components/landing/DemoListingShowcase";
import RealMembersStrip from "@/components/landing/RealMembersStrip";
import PublicHeader from "@/components/layout/PublicHeader";
import FreePeriodBanner from "@/components/marketing/FreePeriodBanner";

import PublicFooter from "@/components/layout/PublicFooter";
import { staticRoutes, DEFAULT_OG_IMAGE } from "@/data/siteRoutes";
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



// Témoignages — répartition géographique équilibrée (France entière, hors
// concentration AURA), avec date et libellé "Programme Fondateurs" pour
// l'E-E-A-T (Expérience réelle + transparence).
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
    text: "J'ai commencé par arroser les plantes d'un membre contre un repas. Maintenant je garde sa maison quand elle part. C'est comme ça que ça marche ici — doucement, naturellement.",
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

 // KPIs : valeurs réelles depuis public_stats + socle historique fondateurs
 // - Maisons : 37 maisons gardées en 5 ans par Jérémie & Elisa (cité dans le récit fondateur).
 // - Animaux : 234 animaux accompagnés sur la même période (cité dans le récit fondateur,
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
        title="Garde d'animaux à domicile entre particuliers | Guardiens"
        description="Trouvez un gardien du coin pour votre maison et vos animaux. Home sitting et entraide entre particuliers, vérifiés et notés. Partout en France."
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
                name: "Home sitting, garde d'animaux et entraide entre gens du coin",
                description:
                  "Home sitting et garde d'animaux à domicile, complétés par des petites missions d'entraide locale. Avis croisés, vérification d'identité, sans commission.",
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
                offers: [
                  {
                    "@type": "Offer",
                    name: "Espace propriétaire",
                    priceSpecification: {
                      "@type": "PriceSpecification",
                      price: "0",
                      priceCurrency: "EUR",
                      description:
                        "Publication d'annonces et mise en relation sans abonnement pour les propriétaires. Sans carte bancaire.",
                    },
                  },
                  {
                    "@type": "Offer",
                    name: "Abonnement gardien",
                    priceSpecification: {
                      "@type": "PriceSpecification",
                      price: "6.99",
                      priceCurrency: "EUR",
                      unitCode: "MON",
                      description:
                        "Abonnement gardien à 6,99 €/mois après le 14 juillet 2026 — accès sans abonnement jusqu'à cette date.",
                    },
                  },
                  {
                    "@type": "Offer",
                    name: "Entraide entre gens du coin",
                    priceSpecification: {
                      "@type": "PriceSpecification",
                      price: "0",
                      priceCurrency: "EUR",
                      description:
                        "Petites missions et entraide sans abonnement pour tous.",
                    },
                  },
                ],
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
                      text: "Le house sitting est un échange de services : un gardien habite gratuitement dans votre maison pendant votre absence et prend soin de vos animaux. L'échange n'implique aucune transaction financière entre les deux parties.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Faut-il payer pour s'inscrire en tant que propriétaire ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "L'inscription, la publication d'annonces et les échanges avec les gardiens sont sans abonnement requis pour les propriétaires. Aucune carte bancaire demandée. Les gardiens bénéficient d'un accès sans abonnement jusqu'au 14 juillet 2026, puis l'abonnement est à 6,99 €/mois. L'entraide entre gens du coin reste sans abonnement pour tous.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Comment trouver un pet sitter près de chez moi ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Inscrivez-vous sur Guardiens, publiez votre annonce de garde avec les dates et vos animaux, et recevez des candidatures de gardiens qui habitent près de chez vous.",
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

      {/* ═══════════════ NAVBAR + BANDEAU GRATUITÉ ═══════════════ */}
      <PublicHeader />
      <FreePeriodBanner />

      {/* ═══════════════ SECTION 1 — HERO (épuré, 5 blocs) ═══════════════ */}
      <section className="relative w-full min-h-screen flex items-center overflow-hidden">
        <img
          src="/hero-landing.webp"
          alt="Un golden retriever souriant dans un jardin ensoleillé — l'esprit Guardiens"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          width={1920}
          height={1080}
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/45 to-black/20" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-24">
          <div className="max-w-2xl lg:max-w-3xl">

            <p className="font-body text-xs text-white/70 tracking-[0.2em] uppercase mb-6 animate-hero-fade-up">
              Home sitting · Garde d'animaux · Entraide
            </p>

            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6 animate-hero-fade-up animation-delay-400">
              Garde d'animaux à domicile, par un gardien du coin.
            </h1>

            <p className="font-body text-lg md:text-xl text-white/85 max-w-xl mb-4 leading-relaxed animate-hero-fade-up animation-delay-700">
              Confiez vos animaux et votre maison à une personne de confiance,
              près de chez vous, partout en France.
            </p>
            <p className="font-body text-base md:text-lg text-white/70 max-w-xl mb-10 leading-relaxed italic animate-hero-fade-up animation-delay-700">
              Et derrière chaque garde, une rencontre, un coin de France à vivre,
              des histoires qu'on n'aurait pas cherchées.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 animate-hero-fade-up animation-delay-900">
              <button
                onClick={() => {
                  trackEvent("cta_proprio_clicked", { metadata: { location: "hero" } });
                  navigate("/inscription?role=owner");
                }}
                className="font-body text-base font-semibold tracking-wide rounded-full px-12 py-4 bg-primary text-primary-foreground hover:brightness-95 hover:scale-[1.03] transition-all duration-200 shadow-xl shadow-primary/40 ring-2 ring-primary-foreground/10"
              >
                Publier mon annonce
              </button>
              <button
                onClick={() => {
                  trackEvent("cta_sitter_clicked", { metadata: { location: "hero" } });
                  navigate("/inscription?role=sitter");
                }}
                className="font-body text-sm font-medium tracking-wide rounded-full px-7 py-3 bg-transparent text-white border border-white/60 hover:bg-white/10 transition-all duration-200"
              >
                Je veux garder
              </button>
            </div>

            {(kpiMaisons > 0 || kpiAnimaux > 0 || kpiInscrits > 0 || kpiMissions > 0) && (
              <div className="flex flex-row flex-wrap justify-start gap-x-12 gap-y-6 mt-14 animate-hero-fade-up animation-delay-1100">
                {kpiMaisons > 0 && (
                  <div className="border-r border-white/20 pr-12 last:border-r-0 last:pr-0">
                    <span className="block text-3xl font-heading font-bold text-white">{kpiMaisons}</span>
                    <span className="text-xs font-body text-white/50 tracking-wide uppercase mt-1 block">maisons gardées</span>
                  </div>
                )}
                {kpiAnimaux > 0 && (
                  <div className="border-r border-white/20 pr-12 last:border-r-0 last:pr-0">
                    <span className="block text-3xl font-heading font-bold text-white">{kpiAnimaux}</span>
                    <span className="text-xs font-body text-white/50 tracking-wide uppercase mt-1 block">animaux accompagnés</span>
                  </div>
                )}
                {kpiInscrits > 0 && (
                  <div className="border-r border-white/20 pr-12 last:border-r-0 last:pr-0">
                    <span className="block text-3xl font-heading font-bold text-white">{kpiInscrits}</span>
                    <span className="text-xs font-body text-white/50 tracking-wide uppercase mt-1 block">inscrits</span>
                  </div>
                )}
                {kpiMissions > 0 && (
                  <div>
                    <span className="block text-3xl font-heading font-bold text-white">{kpiMissions}</span>
                    <span className="text-xs font-body text-white/50 tracking-wide uppercase mt-1 block">missions d'entraide</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 2 — CE QU'ON FAIT ENSEMBLE ═══════════════ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              Ce qu'on fait ensemble
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-3">
              Home sitting, garde d'animaux et entraide entre gens du coin.
            </h2>
            <p className="text-center text-foreground/60 font-body max-w-2xl mx-auto mb-16 italic">
              Trois façons de s'engager, à votre rythme.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RevealSection delay={0.1}>
              <div className="bg-card rounded-2xl p-8 shadow-sm text-left h-full">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-3">Propriétaires</p>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Vous partez. Votre maison vit.</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  Trouvez quelqu'un du coin pour garder votre maison et vos animaux. Vous le rencontrez avant. Vous choisissez.
                </p>
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-body font-medium mb-4">
                  Sans abonnement requis
                </span>
                <Link to="/inscription?role=owner" className="block text-sm font-body text-primary font-medium hover:underline">
                  Je cherche un gardien →
                </Link>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="bg-card rounded-2xl p-8 shadow-sm text-left h-full">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-3">Gardiens</p>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Vous gardez. Vous découvrez.</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  Proposez-vous comme gardien. Vivez dans des maisons, avec des animaux, dans des quartiers que vous n'auriez jamais explorés autrement.
                </p>
                <Link to="/inscription?role=sitter" className="text-sm font-body text-primary font-medium hover:underline">
                  Je veux garder →
                </Link>
              </div>
            </RevealSection>

            <RevealSection delay={0.3}>
              <div className="bg-card rounded-2xl p-8 shadow-sm text-left h-full border-2 border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-body font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                  Sans abonnement
                </div>
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-3">Entraide</p>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Un coup de main. Un échange.</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  Arroser un potager, promener un chien, partager une compétence. Sans argent.
                  Et souvent, ce qu'on en retient, ce n'est pas le service rendu — c'est la rencontre.
                </p>
                <Link to="/petites-missions" className="text-sm font-body text-primary font-medium hover:underline">
                  Découvrir l'entraide →
                </Link>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.4}>
            <div className="mt-10 bg-accent/40 border border-accent rounded-2xl p-6 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs tracking-widest uppercase text-foreground/60 font-body mb-1">Imprévu de dernière minute</p>
                <h3 className="text-lg font-heading font-semibold text-foreground">Besoin d'un gardien en urgence ?</h3>
                <p className="text-sm font-body text-foreground/70 mt-1">
                  Hospitalisation, déplacement imprévu, urgence familiale : trouvez quelqu'un du coin disponible rapidement.
                </p>
              </div>
              <Link
                to="/gardien-urgence"
                className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-foreground text-background font-body font-medium text-sm hover:bg-foreground/90 transition-colors"
              >
                Trouver un gardien d'urgence →
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ SECTION 2bis — CE QUI ARRIVE EN PLUS ═══════════════ */}
      <section className="py-28 md:py-36 bg-accent/40 border-y border-accent">
        <div className="max-w-3xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/70 font-body mb-6 block text-center">
              Ce qu'on n'écrit jamais dans une annonce
            </span>
            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] text-foreground text-center mb-10">
              Bien plus qu'un échange<br className="hidden md:inline" /> de services.
            </h2>

            <div className="border-l-4 border-primary pl-6 md:pl-8 max-w-2xl mx-auto">
              <p className="text-lg md:text-xl font-body leading-relaxed text-foreground/80 mb-5">
                Garder une maison, ce n'est pas rendre service à un propriétaire.
                Confier ses clés, ce n'est pas céder un toit en échange d'une garde.
              </p>
              <p className="text-lg md:text-xl font-body leading-relaxed text-foreground/80 mb-5">
                C'est, surtout, une façon de vivre des expériences qu'on n'aurait jamais cherchées :
                découvrir une région, une autre manière d'habiter, une histoire de famille,
                un coin de France qu'on n'aurait jamais visité, des gens qu'on n'aurait jamais croisés.
              </p>
              <p className="font-heading text-xl md:text-2xl italic text-foreground leading-snug">
                On apprend, on découvre, on s'attache —
                sans aller le chercher. Juste en laissant la place à ce qui peut arriver.
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ SECTION 3 — COMMENT ÇA MARCHE ═══════════════ */}
      <section id="how-it-works" className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              Simple et transparent
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-center text-foreground/60 font-body max-w-2xl mx-auto mb-16">
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
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Décrivez votre garde</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70">
                  Vos animaux, vos dates, votre maison. En quelques minutes, votre annonce est en ligne.
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
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Recevez des candidatures</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70">
                  Des gardiens du coin postulent. Consultez leurs profils, lisez les avis, échangez par messagerie. Rencontrez-vous.
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
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Partez sereinement</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70">
                  Signez l'accord de garde. Votre gardien s'installe. Vous recevez des nouvelles. Vous rentrez l'esprit léger.
                </p>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.4} className="text-center mt-14">
            <button
              onClick={() => {
                trackEvent("cta_proprio_clicked", { metadata: { location: "how_it_works" } });
                navigate("/inscription?role=owner");
              }}
              className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-primary text-primary-foreground hover:brightness-90 hover:scale-[1.02] transition-all duration-200"
            >
              Publier mon annonce
            </button>
            <p className="mt-3 text-xs text-muted-foreground font-body">
              Inscription en 2 minutes · Sans carte bancaire
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ SECTION 4 — VITRINE DÉMO ═══════════════ */}
      <RevealSection>
        <DemoListingShowcase />
      </RevealSection>

      {/* ═══════════════ SECTION 5 — CONFIANCE & PÉRIMÈTRE (fusion) ═══════════════ */}
      <section className="bg-background py-24 md:py-32" aria-labelledby="trust-heading">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <RevealSection className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-xs md:text-[13px] tracking-[0.2em] uppercase text-primary font-body font-medium">
              Confiance &amp; périmètre
            </p>
            <h2 id="trust-heading" className="font-heading text-4xl md:text-5xl font-semibold text-foreground mt-4 leading-tight">
              Tout pour choisir en confiance, près de chez vous ou plus loin.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mt-5 leading-relaxed">
              Quatre piliers pour partir l'esprit léger : la gratuité côté propriétaires, la rencontre avant chaque garde, des profils vérifiés, et un périmètre que vous choisissez librement.
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
                <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">Gratuit pour les propriétaires</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  Publication, candidatures, messagerie : tout est sans frais ni abonnement requis. Aucune carte bancaire demandée.
                </p>
              </article>

              <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body">02</p>
                <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">Rencontre avant chaque garde</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  Un café, une visite du logement. Vous choisissez après vous être regardés dans les yeux. La confiance ne se devine pas, elle se construit.
                </p>
              </article>

              <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body">03</p>
                <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">Profils vérifiés &amp; avis croisés</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  Pièce d'identité contrôlée, avis publiés par les propriétaires précédents, historique de gardes réalisées : tout est transparent.
                </p>
              </article>

              <article className="bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 motion-reduce:transition-none motion-reduce:transform-none">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body">04</p>
                <h3 className="mt-3 font-heading font-semibold text-lg text-foreground">De votre rue à l'autre bout de la France</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  Hyper-local pour un dépannage, élargi pour découvrir une autre région : c'est vous qui décidez jusqu'où vous voulez aller — et chaque garde devient une porte qui s'ouvre.
                </p>
              </article>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 6 — OSEZ L'ENTRAIDE ═══════════════ */}
      <section className="py-24 md:py-32 bg-accent">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              Pour tous · Sans abonnement
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-6">
              Osez demander un coup de main.
            </h2>
            <p className="text-center text-foreground/70 font-body max-w-2xl mx-auto mb-16 text-lg leading-relaxed">
              Avant, il y avait quelqu'un du coin qui passait arroser le jardin, qui gardait le chien, qui venait fixer un volet.
              Ce n'est pas du passé. C'est juste qu'on n'ose plus demander. Guardiens est le prétexte pour recommencer.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <RevealSection delay={0.1}>
              <div className="bg-card rounded-2xl p-8 shadow-sm h-full">
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">
                  « J'ai besoin d'aide »
                </h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  Votre potager pendant les vacances. Vos poules ce weekend. Promener votre chien après une opération.
                  Ce n'est pas un aveu de faiblesse — c'est un acte de confiance.
                </p>
                <p className="text-sm font-body font-medium text-primary">
                  Pas d'argent. Pas d'abonnement. C'est le pari.
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="bg-card rounded-2xl p-8 shadow-sm h-full">
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">
                  « Je propose mon aide »
                </h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  Vous savez tailler des rosiers. Vous adorez les chiens. Vous avez du temps samedi matin.
                  Proposez — et vivez quelque chose que vous n'auriez jamais vécu sans cette rencontre.
                </p>
                <p className="text-sm font-body font-medium text-primary">
                  C'est comme ça que le tissu local se recrée.
                </p>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.25} className="mt-16">
            <p className="text-center text-xs tracking-widest uppercase text-primary/60 font-body mb-6">
              Quelques exemples vus sur Guardiens cette semaine
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
              {[
                "Arroser les plantes",
                "Garder les poules",
                "Promener le chien",
                "Petit bricolage",
                "Tailler le jardin",
                "Séance de Reiki",
                "Cours de pain maison",
                "Réceptionner un colis",
                "Covoiturage rdv",
                "Bouture, semis",
                "Visite d'un chat",
                "Café & écoute",
              ].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-center text-center bg-card rounded-xl px-3 py-4 border border-border/60 hover:border-primary/40 hover:shadow-sm transition-all min-h-[64px]"
                >
                  <span className="text-xs font-body text-foreground/80 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </RevealSection>

          <RevealSection delay={0.3} className="text-center mt-12">
            <div className="border-l-4 border-primary pl-6 max-w-xl mx-auto text-left mb-10">
              <p className="text-xl md:text-2xl font-heading font-semibold italic text-foreground leading-snug">
                La vie de village n'a pas disparu. Elle attendait juste qu'on ose la première question.
              </p>
            </div>
            <Link
              to="/petites-missions"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-body font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              Découvrir les petites missions <ArrowRight className="h-4 w-4" />
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ SECTION 7 — TÉMOIGNAGES ═══════════════ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <RevealSection className="text-center mb-16">
            <h2 className="font-heading text-4xl md:text-5xl font-semibold text-foreground leading-snug">
              Ils ont osé. Voici ce qu'ils en disent.
            </h2>
            <p className="mt-4 font-body text-sm text-foreground/55 max-w-xl mx-auto">
              Témoignages recueillis auprès des membres du Programme Fondateurs (janvier–mai 2026). Prénoms et villes réels, récits anonymisés à leur demande.
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
              aria-label="Témoignage précédent"
              disabled={testimonialPages.length <= 1}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToTestimonialPage(selectedIndex + 1)}
              className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground/70 disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Témoignage suivant"
              disabled={testimonialPages.length <= 1}
            >
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="overflow-hidden px-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(testimonialPages[selectedIndex] ?? []).map((t) => (
                  <figure key={t.name} className="min-w-0">
                    <blockquote className="rounded-2xl p-10 h-full bg-card border border-border shadow-sm flex flex-col">
                      <span aria-hidden className="block font-heading text-7xl leading-none mb-3 select-none text-primary/40">
                        "
                      </span>
                      <p className="font-body text-base md:text-lg text-foreground/70 leading-relaxed italic mb-6 flex-1">
                        {t.text}
                      </p>
                      <figcaption className="flex items-center gap-3 pt-4 border-t border-border/60">
                        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-heading text-sm font-semibold">
                          {getInitials(t.name)}
                        </span>
                        <span className="flex flex-col leading-tight">
                          <span className="font-body text-sm font-semibold text-foreground">
                            {t.name}
                          </span>
                          <span className="font-body text-xs text-foreground/55">
                            {t.detail}
                          </span>
                          <span className="font-body text-[11px] text-foreground/40 mt-0.5 uppercase tracking-widest">
                            {t.period} · Programme Fondateurs
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
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === selectedIndex ? "bg-primary" : "bg-foreground/20"
                  }`}
                  aria-label={`Aller à la page de témoignages ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 8 — NOTRE HISTOIRE ═══════════════ */}
      <section className="bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block">
              Notre histoire
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-semibold leading-snug text-foreground mb-12">
              Tout a commencé avec un visa.
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">
            <RevealSection delay={0.1}>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                L'habitude de s'ouvrir aux gens du coin s'est perdue. Par manque de prétexte.
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                Elisa, ma compagne et co-fondatrice de Guardiens, est arrivée d'Argentine avec un visa qui ne lui permettait pas de travailler. Elle gardait des animaux. Elle rentrait avec des histoires : des gens qui ouvraient leur porte, leur vie, librement. Des inconnus qui finissaient par nous inviter à Noël.
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                Elisa et moi avons gardé 37 maisons en cinq ans, dans des villages, des villes, des hameaux.
              </p>
              <div className="border-l-4 border-primary pl-6 my-8">
                <p className="text-2xl md:text-3xl font-heading font-semibold italic text-foreground leading-snug">
                  On n'a jamais gardé des maisons. On a été invités dans des vies.
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                C'est ça que le village faisait naturellement.
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                Guardiens, c'est le prétexte qui manquait. Les petites missions d'abord : un potager arrosé contre un repas, une compétence contre une autre, l'échange en nature entre gens du coin. La garde ensuite : vos clés confiées à quelqu'un que vous avez regardé dans les yeux.
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                Vous partirez l'esprit léger. Vous rentrerez avec une histoire. Nous, on ne s'attendait pas à ce que ça compte autant.
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                C'est pour ça qu'on a construit Guardiens. Pour que vous viviez ça aussi.
              </p>
              <span className="text-sm font-body italic text-foreground/50 mt-10 block">
                — Jérémie &amp; Elisa
              </span>
            </RevealSection>
          </div>

          <div className="w-full mt-16 rounded-2xl overflow-hidden">
            <img
              src={notreHistoirePanorama}
              alt="Une garde de maison et d'animaux — Guardiens"
              className="w-full h-64 md:h-96 object-cover object-center"
              loading="lazy"
              width={1920}
              height={600}
              decoding="async"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 9 — GUIDES + VILLES (fusion SEO) ═══════════════ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <RevealSection className="text-center mb-14">
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block">
              Guides &amp; villes
            </span>
            <h2 className="font-heading text-4xl md:text-5xl font-semibold text-foreground leading-snug mb-4">
              House-sitting près de chez vous : guides et villes.
            </h2>
            <p className="text-lg font-body text-foreground/70 max-w-2xl mx-auto">
              Des guides pratiques pour préparer votre garde d'animaux, et des hubs locaux pour les villes les plus actives — Lyon, Annecy, Grenoble et toute la France.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Colonne Guides */}
            <RevealSection delay={0.1}>
              <div className="rounded-2xl bg-card border border-border p-8 h-full">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-2">Guides &amp; conseils</p>
                <h3 className="font-heading text-2xl font-semibold text-foreground mb-6">
                  Préparer votre garde
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
                </ul>
                <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row gap-3">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/actualites">Tous les articles</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/guides">Guides locaux par ville</Link>
                  </Button>
                </div>
              </div>
            </RevealSection>

            {/* Colonne Villes */}
            <RevealSection delay={0.2}>
              <div className="rounded-2xl bg-card border border-border p-8 h-full">
                <p className="text-xs tracking-widest uppercase text-primary/70 font-body mb-2">House-sitting par ville</p>
                <h3 className="font-heading text-2xl font-semibold text-foreground mb-6">
                  Près de chez vous
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link
                      to="/house-sitting/lyon"
                      className="group flex items-start gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <ArrowRight className="h-4 w-4 mt-1 shrink-0 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm leading-relaxed">
                        <strong>House-sitting à Lyon</strong> — Des gardiens vérifiés dans chaque arrondissement, du Vieux Lyon à la Croix-Rousse, en passant par la Part-Dieu et Confluence.
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
                        <strong>House-sitting à Annecy</strong> — Lac, montagne, résidences secondaires en Haute-Savoie. Des gardiens locaux qui connaissent le gel, les accès et les vétos.
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
                        <strong>House-sitting à Grenoble</strong> — Au pied du Vercors, de la Chartreuse et de Belledonne. Des gardiens qui connaissent la cuvette et les sentiers de la Bastille.
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
                        <strong>Partout en France</strong> — Du Pays basque à la Bretagne, en passant par les Alpes, la Provence et le Nord. Le réseau s'étend dans toutes les régions.
                      </span>
                    </Link>
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    Quel que soit votre département, vous trouvez un gardien à proximité.
                  </p>
                </div>
              </div>
            </RevealSection>
          </div>

          {/* FAQ visible — miroir du JSON-LD FAQPage déclaré en haut de page */}
          <RevealSection delay={0.3} className="mt-16 max-w-3xl mx-auto">
            <h3 className="font-heading text-2xl md:text-3xl font-semibold text-foreground text-center mb-8">
              Questions fréquentes
            </h3>
            <dl className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6">
                <dt className="font-heading font-semibold text-foreground mb-2">
                  Qu'est-ce que le house-sitting ?
                </dt>
                <dd className="text-sm text-foreground/70 leading-relaxed">
                  Le house-sitting est un échange de services : un gardien habite gratuitement dans votre maison pendant votre absence et prend soin de vos animaux. L'échange n'implique aucune transaction financière entre les deux parties.
                </dd>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6">
                <dt className="font-heading font-semibold text-foreground mb-2">
                  Faut-il payer pour s'inscrire en tant que propriétaire ?
                </dt>
                <dd className="text-sm text-foreground/70 leading-relaxed">
                  L'inscription, la publication d'annonces et les échanges avec les gardiens sont sans abonnement requis pour les propriétaires. Aucune carte bancaire demandée. Les gardiens bénéficient d'un accès sans abonnement jusqu'au 14 juillet 2026, puis l'abonnement est à 6,99 €/mois. L'entraide entre gens du coin reste sans abonnement pour tous.
                </dd>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6">
                <dt className="font-heading font-semibold text-foreground mb-2">
                  Comment trouver un pet sitter près de chez moi ?
                </dt>
                <dd className="text-sm text-foreground/70 leading-relaxed">
                  Inscrivez-vous sur Guardiens, publiez votre annonce de garde avec les dates et vos animaux, et recevez des candidatures de gardiens qui habitent près de chez vous. Vous choisissez après une rencontre.
                </dd>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6">
                <dt className="font-heading font-semibold text-foreground mb-2">
                  Qui sont les gardiens sur Guardiens ?
                </dt>
                <dd className="text-sm text-foreground/70 leading-relaxed">
                  Des gens du coin, vérifiés par notre équipe. Chaque profil passe une vérification d'identité (pièce d'identité + selfie) traitée sous 24 h. Vous voyez aussi leurs avis publiés par les propriétaires précédents.
                </dd>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6">
                <dt className="font-heading font-semibold text-foreground mb-2">
                  Comment se déroule une garde sur Guardiens ?
                </dt>
                <dd className="text-sm text-foreground/70 leading-relaxed">
                  Vous publiez votre annonce, les gardiens du coin postulent, vous choisissez après une rencontre, puis votre gardien s'installe. Un accord de garde optionnel encadre les engagements de chacun pendant la garde.
                </dd>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6">
                <dt className="font-heading font-semibold text-foreground mb-2">
                  Guardiens est-il disponible partout en France ?
                </dt>
                <dd className="text-sm text-foreground/70 leading-relaxed">
                  Oui. Le réseau Guardiens s'étend dans toutes les régions de France, du Pays basque à la Bretagne, en passant par les Alpes et le Nord. Vous trouverez un gardien près de chez vous quel que soit votre département.
                </dd>
              </div>
            </dl>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ SECTION 10 — CTA FINAL (fusion Fondateur + double CTA) ═══════════════ */}
      <section className="py-24 md:py-32 bg-primary">
        <RevealSection className="max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center rounded-full px-4 py-1.5 mb-8 bg-white/15 border border-white/30">
            <span className="font-body text-xs text-white uppercase tracking-widest">Programme Fondateurs</span>
          </div>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Votre histoire commence ici.
          </h2>
          <p className="font-body text-lg text-white/85 leading-relaxed max-w-lg mx-auto mb-10">
            Vous partirez l'esprit léger. Vous rentrerez avec une histoire —
            un coin découvert, une rencontre, des gens que vous n'auriez jamais croisés.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button
              onClick={() => {
                trackEvent("cta_proprio_clicked", { metadata: { location: "final_cta" } });
                navigate("/inscription?role=owner");
              }}
              className="font-body text-sm font-bold tracking-wide rounded-full px-10 py-4 bg-white text-primary hover:bg-background hover:scale-[1.02] transition-all duration-200"
            >
              Publier mon annonce
            </button>
            <button
              onClick={() => {
                trackEvent("cta_sitter_clicked", { metadata: { location: "final_cta" } });
                navigate("/inscription?role=sitter");
              }}
              className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-transparent text-white border-2 border-white/40 hover:bg-white/10 transition-all duration-200"
            >
              Je veux garder
            </button>
          </div>
          <p className="text-xs text-white/70 font-body">
            Sans carte bancaire · Inscription en 2 minutes · Badge Fondateur pour les inscrits avant le 13 juillet 2026.
          </p>
        </RevealSection>
      </section>

      <PublicFooter />

      {/* Hero animation keyframes */}
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
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
