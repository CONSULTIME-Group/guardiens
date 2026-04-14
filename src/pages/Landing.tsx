import { useState, useEffect, useRef, useCallback } from "react";
import notreHistoirePanorama from "@/assets/story-photo.jpeg";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Home, Key, Handshake, ShieldCheck, MessageCircle, Users, ClipboardCheck, Star, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import PageMeta from "@/components/PageMeta";
import useEmblaCarousel from "embla-carousel-react";
import heroDogBbq from "@/assets/hero-landing.png";
import DemoListingShowcase from "@/components/landing/DemoListingShowcase";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";



const testimonials = [
  {
    name: "Nadia",
    detail: "2 chats, 1 chien · Lyon 6e",
    text: "Deux chats et un chien. On n'avait pas pris de vraies vacances depuis trois ans. Notre gardienne habite à Caluire. On s'est rencontrés autour d'un café le jeudi. On est partis le samedi.",
  },
  {
    name: "Tomas",
    detail: "Grenoble",
    text: "Je cherchais un logement temporaire entre deux jobs. J'ai gardé quatre maisons en deux mois. J'ai découvert des endroits que j'habitais depuis dix ans sans jamais vraiment connaître.",
  },
  {
    name: "Rania & David",
    detail: "Ardèche",
    text: "On a une maison en Ardèche qu'on laissait vide huit mois par an. Maintenant elle vit. Les gens qui la gardent nous envoient des photos du jardin. C'est bizarre comme ça fait du bien.",
  },
  {
    name: "Giulia",
    detail: "Écully",
    text: "Je devais partir trois semaines. Mon potager, mes poules, mes plantes. Un membre Guardiens a tout géré contre des légumes et des œufs. On se connaissait pas. On se voit encore.",
  },
  {
    name: "Sarah & Karim",
    detail: "Monts du Lyonnais",
    text: "Trois chevaux, quatre chats, un perroquet. Tout le monde nous dit que c'est impossible à faire garder. Notre gardienne est venue deux fois avant qu'on parte. Elle connaissait leurs noms par cœur.",
  },
  {
    name: "Elena",
    detail: "Annecy",
    text: "J'ai commencé par arroser les plantes d'un membre contre un repas. Maintenant je garde sa maison quand elle part. C'est comme ça que ça marche ici — doucement, naturellement.",
  },
];


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

const RevealSection = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
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
};



const Landing = () => {
  const navigate = useNavigate();

  const [kpiMaisons, setKpiMaisons] = useState<number>(37);
  const [kpiAnimaux, setKpiAnimaux] = useState<number>(234);
  const [kpiInscrits, setKpiInscrits] = useState<number>(0);
  const [kpiMissions, setKpiMissions] = useState<number>(0);

  useEffect(() => {
    const loadKPIs = async () => {
      const { data } = await supabase
        .from('public_stats')
        .select('*')
        .single();
      if (data) {
        if (typeof data.maisons_gardees === 'number') {
          setKpiMaisons(data.maisons_gardees + 37);
        }
        if (typeof data.total_inscrits === 'number') {
          setKpiInscrits(data.total_inscrits);
        }
        if (typeof data.missions_entraide === 'number') {
          setKpiMissions(data.missions_entraide);
        }
        if (typeof data.animaux_accompagnes === 'number') {
          setKpiAnimaux(234 + data.animaux_accompagnes);
        }
      }
    };
    loadKPIs();
  }, []);

  /* ── Embla carousel for testimonials ── */
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    slidesToScroll: 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onEmblaSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onEmblaSelect);
    onEmblaSelect();
    return () => { emblaApi.off("select", onEmblaSelect); };
  }, [emblaApi, onEmblaSelect]);

  /* Autoplay every 5s, pause on hover */
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    if (isHovered) {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      return;
    }
    autoplayRef.current = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [emblaApi, isHovered]);


  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Guardiens — Quelqu'un du coin veille sur votre maison."
        description="Garde de maison gratuite entre voisins. Entraide locale, petits services, échanges sans argent. Osez demander. Osez proposer. Rejoignez le mouvement."
        path="/"
        image="https://guardiens.fr/og-default.jpg"
      />
      {/* JSON-LD: Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Guardiens",
            url: "https://guardiens.fr",
            logo: "https://guardiens.fr/favicon.ico",
            description: "Plateforme gratuite de pet sitting et house sitting de proximité en Auvergne-Rhône-Alpes.",
            areaServed: { "@type": "AdministrativeArea", name: "Auvergne-Rhône-Alpes" },
            knowsAbout: ["House-sitting", "Pet-sitting", "Garde d'animaux à domicile", "Entraide entre gens du coin", "Petites missions entre gens du coin", "Auvergne-Rhône-Alpes"],
            slogan: "Quelqu'un du coin veille sur votre maison.",
            founder: [{ "@type": "Person", name: "Jérémie" }, { "@type": "Person", name: "Elisa" }],
            sameAs: [],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Guardiens",
            url: "https://guardiens.fr",
            potentialAction: {
              "@type": "SearchAction",
              target: { "@type": "EntryPoint", urlTemplate: "https://guardiens.fr/recherche?q={search_term_string}" },
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Pet sitting & House sitting gratuit",
            description: "Service de garde d'animaux et house sitting gratuit en Auvergne-Rhône-Alpes. Avis croisés, inscription gratuite.",
            provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
            areaServed: { "@type": "AdministrativeArea", name: "Auvergne-Rhône-Alpes" },
            serviceType: ["Pet sitting", "House sitting", "Garde d'animaux", "Gardiennage de maison", "Garde de chien", "Garde de chat"],
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR", description: "Inscription et mise en relation 100% gratuites" },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              { "@type": "Question", name: "Qu'est-ce que le house sitting ?", acceptedAnswer: { "@type": "Answer", text: "Le house sitting est un échange de services : un gardien habite gratuitement dans votre maison pendant votre absence et prend soin de vos animaux. C'est gratuit pour les deux parties." } },
              { "@type": "Question", name: "Guardiens est-il gratuit ?", acceptedAnswer: { "@type": "Answer", text: "Oui, Guardiens est 100% gratuit pour les propriétaires. Les gardiens bénéficient d'un accès gratuit jusqu'au 13 juin 2026, puis l'abonnement est à 9€/mois. L'entraide reste gratuite pour tous, pour toujours." } },
              { "@type": "Question", name: "Comment trouver un pet sitter près de chez moi ?", acceptedAnswer: { "@type": "Answer", text: "Inscrivez-vous sur Guardiens, publiez votre annonce de garde avec les dates et vos animaux, et recevez des candidatures de gardiens qui habitent près de chez vous." } },
            ],
          }),
        }}
      />

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <PublicHeader />

      {/* ═══════════════ SECTION 1 — HERO ═══════════════ */}
      <section className="relative w-full min-h-screen flex items-center overflow-hidden">
        <img
          src={heroDogBbq}
          alt="Un golden retriever souriant dans un jardin ensoleillé — l'esprit Guardiens"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/45 to-black/20" />

        <div className="relative z-10 w-full px-[5%] md:px-[8%] py-24">
          <div className="max-w-2xl">

            {/* Badge gratuit */}
            <div className="inline-flex items-center rounded-full px-4 py-1.5 mb-6 bg-white/15 border border-white/30 backdrop-blur-sm animate-hero-fade-up">
              <span className="font-body text-xs text-white tracking-wide">Gratuit pour les propriétaires — pour toujours</span>
            </div>

            {/* H1 with staggered animation */}
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-2 animate-hero-fade-up animation-delay-400">
              Quelqu'un du coin veille sur votre maison.
            </h1>
            <p className="font-heading text-2xl md:text-3xl lg:text-4xl italic text-white/85 leading-snug mb-6 animate-hero-fade-up animation-delay-700">
              Et l'entraide entre voisins redevient naturelle.
            </p>
            <p className="font-body text-base md:text-lg text-white/70 max-w-lg mb-10 leading-relaxed animate-hero-fade-up animation-delay-700">
              Confiez vos animaux à un gardien de votre quartier. Osez demander un coup de main. Osez en proposer un.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 animate-hero-fade-up animation-delay-900">
              <button
                onClick={() => navigate("/register?role=owner")}
                className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-primary text-primary-foreground hover:brightness-90 hover:scale-[1.02] transition-all duration-200"
              >
                Je cherche un gardien
              </button>
              <button
                onClick={() => navigate("/register?role=sitter")}
                className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all duration-200"
              >
                Je veux garder
              </button>
            </div>

            <Link
              to="/petites-missions"
              className="inline-flex items-center gap-1 text-white/80 text-sm underline underline-offset-4 hover:text-white transition-colors animate-hero-fade-up animation-delay-1000"
            >
              Découvrir l'entraide entre voisins <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <p className="mt-4 text-xs text-white/60 font-body animate-hero-fade-up animation-delay-1100">
              Badge Fondateur à vie pour les inscrits avant le 13 mai.
            </p>

            <div className="flex flex-row justify-center sm:justify-start gap-12 mt-12 animate-hero-fade-up animation-delay-1100">
              <div className="border-r border-white/20 pr-12">
                <span className="block text-3xl font-heading font-bold text-white">{kpiMaisons}</span>
                <span className="text-xs font-body text-white/50 tracking-wide uppercase mt-1 block">maisons gardées</span>
              </div>
              <div className="border-r border-white/20 pr-12">
                <span className="block text-3xl font-heading font-bold text-white">{kpiAnimaux}</span>
                <span className="text-xs font-body text-white/50 tracking-wide uppercase mt-1 block">animaux accompagnés</span>
              </div>
              <div className="border-r border-white/20 pr-12">
                <span className="block text-3xl font-heading font-bold text-white">{kpiInscrits}</span>
                <span className="text-xs font-body text-white/50 tracking-wide uppercase mt-1 block">inscrits</span>
              </div>
              <div>
                <span className="block text-3xl font-heading font-bold text-white">{kpiMissions}</span>
                <span className="text-xs font-body text-white/50 tracking-wide uppercase mt-1 block">entraides</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ BANDEAU ENTRAIDE ═══════════════ */}
      <section className="bg-primary/5 border-y border-primary/10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center sm:text-left">
          <Handshake className="h-5 w-5 text-primary shrink-0" />
          <p className="font-body text-sm md:text-base text-foreground/80">
            <strong className="text-foreground">L'entraide entre gens du coin est gratuite.</strong> Pour tous. Pour toujours. C'est l'esprit de Guardiens.
          </p>
          <Link to="/petites-missions" className="text-sm font-body text-primary font-medium hover:underline whitespace-nowrap shrink-0">
            En savoir plus →
          </Link>
        </div>
      </section>

      {/* ═══════════════ SECTION 2 — CE QU'ON FAIT ENSEMBLE ═══════════════ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              Ce qu'on fait ensemble
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-16">
              Trois façons de vivre quelque chose.
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RevealSection delay={0.1}>
              <div className="bg-card rounded-2xl p-8 shadow-sm text-left h-full">
                <Home className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Vous partez. Votre maison vit.</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  Trouvez quelqu'un du coin pour garder votre maison et vos animaux. Vous le rencontrez avant. Vous choisissez.
                </p>
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-body font-medium mb-4">
                  Gratuit pour les propriétaires
                </span>
                <Link to="/register?role=owner" className="block text-sm font-body text-primary font-medium hover:underline">
                  Je cherche un gardien →
                </Link>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="bg-card rounded-2xl p-8 shadow-sm text-left h-full">
                <Key className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Vous gardez. Vous découvrez.</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  Proposez-vous comme gardien. Vivez dans des maisons, avec des animaux, dans des quartiers que vous n'auriez jamais explorés autrement.
                </p>
                <Link to="/register?role=sitter" className="text-sm font-body text-primary font-medium hover:underline">
                  Je veux garder →
                </Link>
              </div>
            </RevealSection>

            <RevealSection delay={0.3}>
              <div className="bg-card rounded-2xl p-8 shadow-sm text-left h-full border-2 border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-body font-bold uppercase tracking-wider px-3 py-1 rounded-bl-lg">
                  Gratuit pour tous
                </div>
                <Handshake className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Un coup de main. Un échange.</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                  Arroser un potager, promener un chien, partager une compétence. Sans argent. C'est l'âme de Guardiens — et ça ne changera jamais.
                </p>
                <Link to="/petites-missions" className="text-sm font-body text-primary font-medium hover:underline">
                  Découvrir l'entraide →
                </Link>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>


      {/* ═══════════════ SECTION 3 — COMMENT ÇA MARCHE ═══════════════ */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              Simple et transparent
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-16">
              Comment ça marche ?
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RevealSection delay={0.1}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-heading font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Décrivez votre garde</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70">
                  Vos animaux, vos dates, votre maison. En quelques minutes, votre annonce est en ligne.
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-heading font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Recevez des candidatures</h3>
                <p className="text-base font-body leading-relaxed text-foreground/70">
                  Des gardiens du coin postulent. Consultez leurs profils, lisez les avis, échangez par messagerie. Rencontrez-vous.
                </p>
              </div>
            </RevealSection>

            <RevealSection delay={0.3}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-heading font-bold text-primary">3</span>
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
              onClick={() => navigate("/register?role=owner")}
              className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-primary text-primary-foreground hover:brightness-90 hover:scale-[1.02] transition-all duration-200"
            >
              Je cherche un gardien — c'est gratuit
            </button>
          </RevealSection>
        </div>
      </section>


      {/* ═══════════════ SECTION 4 — VITRINE DÉMO ═══════════════ */}
      <RevealSection>
        <DemoListingShowcase />
      </RevealSection>


      {/* ═══════════════ SECTION 5 — OUTILS DE CONFIANCE ═══════════════ */}
      <section className="py-24 md:py-32 bg-background">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              Pas besoin de chance, juste de bons outils
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-6">
              Tout pour choisir en confiance.
            </h2>
            <p className="text-center text-foreground/60 font-body max-w-2xl mx-auto mb-16">
              Guardiens vous donne les moyens de connaître, sécuriser et communiquer avec votre gardien — avant, pendant et après la garde.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connaître */}
            <RevealSection delay={0.1}>
              <div className="bg-card rounded-2xl p-8 shadow-sm h-full border border-border">
                <Users className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-heading font-semibold text-foreground mb-3">Connaître</h3>
                <ul className="space-y-3 text-sm font-body text-foreground/70 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <Star className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Avis croisés</strong> — Après chaque garde, chacun note l'autre. Transparent.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Profils détaillés</strong> — Compétences, expériences vérifiées, galerie photos.</span>
                  </li>
                </ul>
              </div>
            </RevealSection>

            {/* Sécuriser */}
            <RevealSection delay={0.2}>
              <div className="bg-card rounded-2xl p-8 shadow-sm h-full border border-border">
                <ShieldCheck className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-heading font-semibold text-foreground mb-3">Sécuriser</h3>
                <ul className="space-y-3 text-sm font-body text-foreground/70 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Vérification d'identité</strong> — Badge visible sur le profil de chaque gardien vérifié.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <ClipboardCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Accord de garde</strong> — Un document clair, signé par les deux parties avant le départ.</span>
                  </li>
                </ul>
              </div>
            </RevealSection>

            {/* Communiquer */}
            <RevealSection delay={0.3}>
              <div className="bg-card rounded-2xl p-8 shadow-sm h-full border border-border">
                <MessageCircle className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-heading font-semibold text-foreground mb-3">Communiquer</h3>
                <ul className="space-y-3 text-sm font-body text-foreground/70 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <MessageCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Messagerie intégrée</strong> — Échangez avant, pendant et après la garde.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span><strong className="text-foreground">Guide de maison</strong> — Vétérinaire, clés, Wi-Fi, habitudes : tout au même endroit.</span>
                  </li>
                </ul>
              </div>
            </RevealSection>
          </div>

          <RevealSection delay={0.4} className="text-center mt-14">
            <button
              onClick={() => navigate("/register?role=owner")}
              className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-primary text-primary-foreground hover:brightness-90 hover:scale-[1.02] transition-all duration-200"
            >
              Créer mon compte gratuit
            </button>
          </RevealSection>
        </div>
      </section>


      {/* ═══════════════ SECTION 6 — OSEZ L'ENTRAIDE ═══════════════ */}
      <section className="py-24 md:py-32 bg-accent">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              Gratuit · Pour tous · Pour toujours
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-6">
              Osez demander un coup de main.
            </h2>
            <p className="text-center text-foreground/70 font-body max-w-2xl mx-auto mb-6 text-lg leading-relaxed">
              Avant, il y avait le voisin qui passait arroser le jardin. La grand-mère d'à côté qui gardait le chien.
              Le bricoleur du quartier qui venait fixer un volet. Personne ne demandait rien en échange — c'était normal.
            </p>
            <p className="text-center text-foreground/70 font-body max-w-2xl mx-auto mb-16 text-lg leading-relaxed">
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
                  Ce n'est pas un aveu de faiblesse — c'est un acte de confiance. Et quelqu'un près de chez vous n'attend que ça.
                </p>
                <p className="text-sm font-body font-medium text-primary">
                  Pas d'argent. Pas d'abonnement. Jamais.
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

          <RevealSection delay={0.3} className="text-center mt-12">
            <div className="border-l-4 border-primary pl-6 max-w-xl mx-auto text-left mb-10">
              <p className="text-xl md:text-2xl font-heading font-semibold italic text-foreground leading-snug">
                La vie de village n'a pas disparu. Elle attendait juste qu'on ose la première question.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/petites-missions"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-body font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                Découvrir les petites missions <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-card text-foreground border border-border px-8 py-4 rounded-full font-body font-medium text-sm hover:bg-muted transition-colors"
              >
                Créer mon compte — c'est gratuit
              </Link>
            </div>
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
          </RevealSection>

          <div className="relative">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground/70"
              aria-label="Témoignage précédent"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground/5 transition-colors text-foreground/40 hover:text-foreground/70"
              aria-label="Témoignage suivant"
            >
              <ArrowRight className="h-4 w-4" />
            </button>

            <div
              ref={emblaRef}
              className="overflow-hidden"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="flex">
                {testimonials.map((t) => (
                  <div
                    key={t.name}
                    className="flex-[0_0_100%] md:flex-[0_0_33.333%] min-w-0 px-3"
                  >
                    <div className="rounded-2xl p-10 h-full bg-card border border-border shadow-sm">
                      <span className="block font-heading text-7xl leading-none mb-3 select-none text-primary/40">
                        "
                      </span>
                      <p className="font-body text-base md:text-lg text-foreground/70 leading-relaxed italic mb-6">
                        {t.text}
                      </p>
                      <p className="font-body text-xs text-foreground/50 uppercase tracking-widest">
                        {t.name} — {t.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-2 mt-10">
              {scrollSnaps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === selectedIndex ? "bg-primary" : "bg-foreground/20"
                  }`}
                  aria-label={`Aller au témoignage ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════ SECTION 8 — NOTRE HISTOIRE ═══════════════ */}
      <section className="bg-background">
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
            {/* Colonne gauche */}
            <RevealSection delay={0.1}>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                L'habitude de s'ouvrir aux gens du coin s'est perdue. Par manque de prétexte.
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                Elisa, ma compagne et co-fondatrice de Guardiens, est arrivée d'Argentine avec un visa qui ne lui permettait pas de travailler. Elle gardait des animaux. Elle rentrait avec des histoires : des gens qui ouvraient leur porte, leur vie, librement. Des inconnus qui finissaient par nous inviter à Noël.
              </p>
              <p className="text-lg font-body leading-relaxed text-foreground/85 mb-7">
                Elisa et moi avons gardé 37 maisons en cinq ans en Auvergne-Rhône-Alpes.
              </p>
              <div className="border-l-4 border-primary pl-6 my-8">
                <p className="text-2xl md:text-3xl font-heading font-semibold italic text-foreground leading-snug">
                  On n'a jamais gardé des maisons. On a été invités dans des vies.
                </p>
              </div>
            </RevealSection>

            {/* Colonne droite */}
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

          {/* Photo panoramique */}
          <div className="w-full mt-16 rounded-2xl overflow-hidden">
            <img
              src={notreHistoirePanorama}
              alt="Une garde en Auvergne-Rhône-Alpes — Guardiens"
              className="w-full h-64 md:h-96 object-cover object-center"
              loading="lazy"
            />
          </div>
        </div>
      </section>


      {/* ═══════════════ SECTION 9 — VILLES PRIORITAIRES ═══════════════ */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <span className="text-xs tracking-widest uppercase text-primary/60 font-body mb-4 block text-center">
              Proches de chez vous
            </span>
            <h2 className="text-4xl md:text-5xl font-heading font-semibold leading-snug text-foreground text-center mb-6">
              House-sitting près de chez vous
            </h2>
            <p className="text-center text-foreground/60 font-body max-w-2xl mx-auto mb-16">
              Des gardiens vérifiés dans votre ville, disponibles rapidement. Gratuit pour les propriétaires.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RevealSection delay={0.1}>
              <Link to="/house-sitting/lyon" className="group block">
                <div className="bg-card rounded-2xl p-8 shadow-sm text-left h-full border border-border group-hover:border-primary/30 transition-colors">
                  <h3 className="text-xl font-heading font-semibold text-foreground mb-3">House-sitting à Lyon</h3>
                  <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                    Des gardiens dans chaque arrondissement. Du Vieux Lyon à la Croix-Rousse, quelqu'un de confiance est toujours à côté.
                  </p>
                  <span className="text-sm font-body text-primary font-medium group-hover:underline inline-flex items-center gap-1">
                    Voir les gardiens à Lyon <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </RevealSection>

            <RevealSection delay={0.2}>
              <Link to="/house-sitting/annecy" className="group block">
                <div className="bg-card rounded-2xl p-8 shadow-sm text-left h-full border border-border group-hover:border-primary/30 transition-colors">
                  <h3 className="text-xl font-heading font-semibold text-foreground mb-3">House-sitting à Annecy</h3>
                  <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                    Lac, montagne, résidences secondaires. Des gardiens locaux qui connaissent le gel, les accès et les vétos de Haute-Savoie.
                  </p>
                  <span className="text-sm font-body text-primary font-medium group-hover:underline inline-flex items-center gap-1">
                    Voir les gardiens à Annecy <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </RevealSection>

            <RevealSection delay={0.3}>
              <Link to="/house-sitting/grenoble" className="group block">
                <div className="bg-card rounded-2xl p-8 shadow-sm text-left h-full border border-border group-hover:border-primary/30 transition-colors">
                  <h3 className="text-xl font-heading font-semibold text-foreground mb-3">House-sitting à Grenoble</h3>
                  <p className="text-base font-body leading-relaxed text-foreground/70 mb-4">
                    Au pied de trois massifs. Des gardiens qui connaissent la cuvette, la pollution, et les sentiers de la Bastille.
                  </p>
                  <span className="text-sm font-body text-primary font-medium group-hover:underline inline-flex items-center gap-1">
                    Voir les gardiens à Grenoble <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </RevealSection>
          </div>
        </div>
      </section>


      {/* ═══════════════ SECTION 10 — ENCART FONDATEUR ═══════════════ */}
      <section className="py-24 md:py-32 bg-primary">
        <RevealSection className="max-w-xl mx-auto px-6 text-center">
          <div className="inline-flex items-center rounded-full px-4 py-1.5 mb-6 bg-white/15 border border-white/30">
            <span className="font-body text-xs text-white uppercase tracking-widest">Fondateurs</span>
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-white leading-snug mb-6">
            Inscrivez-vous avant le 13 mai.
          </h2>
          <p className="font-body text-lg text-white/85 leading-relaxed mb-10">
            Badge Fondateur à vie. Accès gratuit jusqu'au 13 juin. Et surtout, vous serez parmi les premiers à vivre ça. Pourquoi le 13 mai ? C'est l'anniversaire de Jérémie. Il préfère offrir l'accès plutôt que recevoir des chaussettes.
          </p>
          <button
            onClick={() => navigate("/register")}
            className="font-body text-sm font-bold tracking-wide rounded-full px-12 py-4 bg-white text-primary hover:bg-background hover:scale-[1.02] transition-all duration-200"
          >
            Rejoindre le mouvement
          </button>
        </RevealSection>
      </section>


      {/* ═══════════════ SECTION 11 — CTA FINAL ═══════════════ */}
      <section className="py-24 md:py-32 bg-foreground">
        <RevealSection className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Votre histoire commence ici.
          </h2>
          <p className="font-body text-lg text-white/70 leading-relaxed max-w-lg mx-auto mb-10">
            Garder une maison. Donner un coup de main. Recevoir de l'aide. Ce sont des gestes simples — mais ils changent tout.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button
              onClick={() => navigate("/register?role=owner")}
              className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-primary text-primary-foreground hover:brightness-90 hover:scale-[1.02] transition-all duration-200"
            >
              Je cherche un gardien — gratuit
            </button>
            <button
              onClick={() => navigate("/register?role=sitter")}
              className="font-body text-sm font-semibold tracking-wide rounded-full px-10 py-4 bg-transparent text-white border-2 border-white/40 hover:bg-white/10 transition-all duration-200"
            >
              Je veux garder
            </button>
          </div>
          <button
            onClick={() => navigate("/petites-missions")}
            className="font-body text-sm font-medium tracking-wide rounded-full px-8 py-3 bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all duration-200"
          >
            Découvrir l'entraide — gratuit pour tous
          </button>
          <p className="mt-8 text-xs text-white/40 font-body">
            Badge Fondateur à vie · Accès gratuit jusqu'au 13 juin · L'entraide reste gratuite pour toujours
          </p>
        </RevealSection>
      </section>

      <PublicFooter />

      {/* Hero animation keyframes */}
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-hero-fade-up { animation: heroFadeUp 0.8s ease-out both; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-700 { animation-delay: 0.7s; }
        .animation-delay-900 { animation-delay: 0.9s; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-1100 { animation-delay: 1.1s; }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
