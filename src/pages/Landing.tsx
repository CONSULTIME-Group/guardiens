import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import useEmblaCarousel from "embla-carousel-react";
import heroDogBbq from "@/assets/hero-dog-bbq.jpg";

const differentiators = [
  {
    title: "Vos animaux restent chez eux.",
    description:
      "Leur panier, leur canapé, leurs habitudes. Quelqu'un du coin qui les connaît par leur prénom.",
  },
  {
    title: "Votre maison vit.",
    description:
      "Volets ouverts, courrier relevé, lumières allumées. Pas une maison vide — une maison habitée.",
  },
  {
    title: "On se rencontre avant.",
    description:
      "Un café, une balade. La confiance ne se crée pas en ligne. Elle se vit.",
  },
  {
    title: "Votre jardin contre un repas.",
    description:
      "Vos clés contre une histoire. Ici personne ne facture ce qui n'a pas de prix.",
  },
  {
    title: "Et au-delà des gardes.",
    description:
      "Un coup de main, un service rendu, une compétence échangée. Des gens du coin qui s'ouvrent.",
  },
  {
    title: "37 maisons. 234 animaux. 5 ans.",
    description:
      "On a vécu ce qu'on construit. Guardiens c'est notre histoire — et bientôt la vôtre.",
  },
];

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

const ownerSteps = [
  { number: "01", title: "Tu publies", description: "Ta maison, tes animaux, tes dates.\nCe dont tu as besoin. Cinq minutes." },
  { number: "02", title: "Tu choisis", description: "Des profils du quartier.\nTu lis, tu échanges, tu rencontres.\nC'est toi qui décides." },
  { number: "03", title: "Tu pars.", description: "Vraiment." },
];

const sitterSteps = [
  { number: "01", title: "Tu te présentes", description: "Qui tu es, ce que tu aimes,\noù tu veux aller. Cinq minutes." },
  { number: "02", title: "Tu postules", description: "Des gardes proches de chez toi.\nTu choisis celles qui te ressemblent." },
  { number: "03", title: "Tu rencontres.", description: "Des gens que tu n'aurais\njamais croisés autrement." },
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
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const [latestArticles, setLatestArticles] = useState<any[]>([]);
  const [dynamicCounts, setDynamicCounts] = useState<{ maisons: number; animaux: number; missions: number } | null>(null);
  const lastFetchRef = useRef<number>(0);

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

  useEffect(() => {
    supabase
      .from("articles")
      .select("id,title,slug,excerpt,cover_image_url,category,published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setLatestArticles(data || []));

    // Dynamic counters with 10-min cache
    const fetchCounts = async () => {
      const now = Date.now();
      if (now - lastFetchRef.current < 10 * 60 * 1000) return;
      lastFetchRef.current = now;

      try {
        const sitsRes = await supabase
          .from("sits")
          .select("property_id")
          .in("status", ["confirmed", "completed"]);
        const distinctProperties = new Set((sitsRes.data || []).map(s => s.property_id));
        const maisons = 37 + distinctProperties.size;

        const propertyIds = Array.from(distinctProperties);
        let animaux = 234;
        if (propertyIds.length > 0) {
          const petsRes = await supabase
            .from("pets")
            .select("id", { count: "exact", head: true })
            .in("property_id", propertyIds);
          animaux += (petsRes.count ?? 0);
        }

        const missionsRes = await supabase
          .from("small_missions")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "in_progress", "completed"]);

        setDynamicCounts({
          maisons,
          animaux,
          missions: missionsRes.count ?? 0,
        });
      } catch {
        setDynamicCounts({ maisons: 37, animaux: 234, missions: 0 });
      }
    };
    fetchCounts();
  }, []);

  /* Count-up animation */
  const CountUp = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
    const [count, setCount] = useState(0);
    const { ref, isVisible } = useScrollReveal();

    useEffect(() => {
      if (!isVisible) return;
      const duration = 1200;
      const steps = 40;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }, [isVisible, target]);

    return <span ref={ref}>{count}{suffix}</span>;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Guardiens — Pet sitting & House sitting gratuit en Auvergne-Rhône-Alpes"
        description="Trouvez un pet sitter ou house sitter de confiance près de chez vous. Garde d'animaux gratuite, avis détaillés. Vos animaux restent chez eux, votre maison vit."
        path="/"
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
            slogan: "Proches de chez vous. Partir. Revenir. Recommencer.",
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
              { "@type": "Question", name: "Guardiens est-il gratuit ?", acceptedAnswer: { "@type": "Answer", text: "Oui, Guardiens est 100% gratuit. Pas de commission, pas d'abonnement obligatoire, pas de frais cachés. L'inscription et la mise en relation sont entièrement gratuites." } },
              { "@type": "Question", name: "Comment trouver un pet sitter près de chez moi ?", acceptedAnswer: { "@type": "Answer", text: "Inscrivez-vous sur Guardiens, publiez votre annonce de garde avec les dates et vos animaux, et recevez des candidatures de gardiens qui habitent près de chez vous." } },
            ],
          }),
        }}
      />

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <header className="flex items-center justify-between px-[5%] md:px-[8%] py-5 sticky top-0 bg-background/80 backdrop-blur-md z-50 border-b border-border/50">
        <h2 className="font-heading text-xl md:text-2xl font-bold cursor-pointer" onClick={() => navigate("/")}>
          <span className="text-primary">g</span>uardiens
        </h2>
        <div className="flex gap-2 md:gap-3 items-center">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/petites-missions")}>
            Entraide
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/guides")}>
            Guides locaux
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/tarifs")}>
            Tarifs
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/actualites")}>
            Articles
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
            Connexion
          </Button>
          <Button size="sm" onClick={() => navigate("/register")}>S'inscrire</Button>
        </div>
      </header>

      {/* ═══════════════ SECTION 1 — HERO ═══════════════ */}
      <section className="relative w-full min-h-screen flex items-center overflow-hidden">
        <img
          src={heroDogBbq}
          alt="Un golden retriever souriant dans un jardin ensoleillé — l'esprit Guardiens"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.2) 100%)",
          }}
        />

        <div className="relative z-10 w-full px-[5%] md:px-[8%] py-24">
          <div className="max-w-[680px]">
            {/* Badge géographique */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 mb-8"
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span className="text-white text-[13px] tracking-[0.1em] font-body">
                Auvergne-Rhône-Alpes · Bientôt partout
              </span>
            </div>

            {/* H1 with staggered animation */}
            <h1
              className="font-heading text-[48px] md:text-[72px] lg:text-[80px] font-bold text-white leading-[1.1] mb-4"
              style={{ animation: "heroFadeUp 0.8s ease-out both" }}
            >
              Proches de chez vous.
            </h1>
            <p
              className="font-heading text-[32px] md:text-[44px] lg:text-[52px] italic text-white/90 leading-[1.1] mb-4"
              style={{ animation: "heroFadeUp 0.8s ease-out 0.4s both" }}
            >
              Partir. Revenir. Recommencer.
            </p>
            <p
              className="font-body text-base md:text-xl text-white/75 max-w-[500px] mb-10"
              style={{ animation: "heroFadeUp 0.6s ease-out 0.7s both" }}
            >
              Garder une maison. Échanger un service. Se faire confiance.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row gap-3 mb-4"
              style={{ animation: "heroFadeUp 0.6s ease-out 0.9s both" }}
            >
              <button
                onClick={() => navigate("/inscription?role=owner")}
                className="font-body text-[15px] font-semibold tracking-[0.03em] rounded-full px-10 py-[18px] bg-primary text-primary-foreground hover:brightness-90 hover:scale-[1.02] transition-all duration-200"
              >
                Je cherche un gardien
              </button>
              <button
                onClick={() => navigate("/inscription?role=sitter")}
                className="font-body text-[15px] font-semibold tracking-[0.03em] rounded-full px-10 py-[18px] bg-transparent text-white border-2 border-white/70 hover:bg-white/15 transition-all duration-200"
              >
                Je veux garder
              </button>
            </div>

            <Link
              to="/petites-missions"
              className="inline-flex items-center gap-1 text-white/80 text-sm underline underline-offset-4 hover:text-white transition-colors"
              style={{ animation: "heroFadeUp 0.5s ease-out 1s both" }}
            >
              Découvrir les petites missions <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <p
              className="mt-4 text-[13px] text-white/60 font-body"
              style={{ animation: "heroFadeUp 0.5s ease-out 1.1s both" }}
            >
              Gratuit · Premiers inscrits, premiers servis.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 2 — CHIFFRES FONDATEURS ═══════════════ */}
      <section className="py-20 md:py-[80px] bg-background">
        <RevealSection className="max-w-[900px] mx-auto px-6">
          <p className="text-[11px] font-body font-semibold tracking-[0.15em] uppercase text-primary/60 text-center mb-10">
            Ce qu'on a vécu avant de construire Guardiens.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-0">
            <div className="text-center px-8 md:px-12 py-4 md:py-0">
              <span className="block font-heading text-[48px] md:text-[72px] font-bold text-foreground leading-none">
                <CountUp target={dynamicCounts?.maisons ?? 37} />
              </span>
              <span className="font-body text-sm text-foreground/60 tracking-[0.05em]">maisons gardées</span>
            </div>
            <div className="hidden md:block w-px h-16 bg-border" />
            <div className="block md:hidden w-16 h-px bg-border my-2" />
            <div className="text-center px-8 md:px-12 py-4 md:py-0">
              <span className="block font-heading text-[48px] md:text-[72px] font-bold text-foreground leading-none">
                <CountUp target={dynamicCounts?.animaux ?? 234} />
              </span>
              <span className="font-body text-sm text-foreground/60 tracking-[0.05em]">animaux accompagnés</span>
            </div>
            <div className="hidden md:block w-px h-16 bg-border" />
            <div className="block md:hidden w-16 h-px bg-border my-2" />
            <div className="text-center px-8 md:px-12 py-4 md:py-0">
              <span className="block font-heading text-[48px] md:text-[72px] font-bold text-foreground leading-none">
                5
              </span>
              <span className="font-body text-sm text-foreground/60 tracking-[0.05em]">ans d'expérience</span>
            </div>
            {dynamicCounts && dynamicCounts.missions > 10 && (
              <>
                <div className="hidden md:block w-px h-16 bg-border" />
                <div className="block md:hidden w-16 h-px bg-border my-2" />
                <div className="text-center px-8 md:px-12 py-4 md:py-0">
                  <span className="block font-heading text-[48px] md:text-[72px] font-bold text-foreground leading-none">
                    <CountUp target={dynamicCounts.missions} />
                  </span>
                  <span className="font-body text-sm text-foreground/60 tracking-[0.05em]">missions d'entraide</span>
                </div>
              </>
            )}
          </div>
        </RevealSection>
      </section>

      {/* ═══════════════ SECTION 3 — NOTRE HISTOIRE ═══════════════ */}
      <section className="py-20 md:py-[120px] bg-muted">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-[2fr_3fr] gap-12 md:gap-20">
            {/* Left column — sticky */}
            <RevealSection>
              <div className="md:sticky md:top-[120px]">
                <p className="text-[11px] font-body font-semibold tracking-[0.15em] uppercase text-primary/60 mb-4">
                  Notre histoire
                </p>
                <h2 className="font-heading text-[36px] md:text-[48px] font-semibold text-foreground leading-[1.2]">
                  Tout a commencé avec un visa.
                </h2>
              </div>
            </RevealSection>

            {/* Right column — text */}
            <RevealSection delay={0.15}>
              <div className="space-y-7">
                <p className="font-body text-[17px] leading-[1.8] text-foreground/85">
                  Elisa est arrivée d'Argentine avec un visa
                  qui ne lui permettait pas de travailler.
                  Elle gardait des animaux. Elle rentrait avec
                  des histoires. Des gens qui ouvraient leur porte
                  sans calcul, leur vie sans condition.
                </p>
                <p className="font-body text-[17px] leading-[1.8] text-foreground/85">
                  Un soir un propriétaire lui a dit&nbsp;:
                </p>
                <blockquote className="border-l-[3px] border-primary pl-6 my-8">
                  <p className="font-heading text-[22px] italic text-foreground/85 leading-[1.6]">
                    « Et si tu restais chez nous pendant qu'on part ? »
                  </p>
                </blockquote>

                <div className="h-10" />

                <p className="font-body text-[17px] leading-[1.8] text-foreground/85">
                  On a gardé 37 maisons en cinq ans.
                  Géraldine, l'irlandaise de 77 ans aux cheveux
                  rouge fluo à Passy, avec son perroquet Coco
                  et ses deux chiens sur le pas de la porte.
                  Rio à Collonges, le chien joueur infatigable
                  chez qui on est retournés six fois.
                  Et puis Briord. Les clés de la maison.
                  Les clés de la Triumph. Les clés du bateau.
                  Les clés de la BM.
                </p>
                <p className="font-body text-[17px] leading-[1.8] text-foreground/85">
                  Des gens qu'on ne connaissait pas
                  trois semaines avant.
                </p>
                <p className="font-body text-[17px] leading-[1.8] text-foreground font-bold">
                  On ne gardait pas des maisons.
                  On collectionnait des vies.
                </p>

                <div className="h-10" />

                <p className="font-body text-[17px] leading-[1.8] text-foreground/85">
                  Un soir chez Helen — Stanley qui aboyait,
                  Rafa couché sur nos pieds, la vue sur le Mont-Blanc.
                  On s'est dit&nbsp;: pourquoi il n'y a pas plus de monde
                  qui fait ça ?
                </p>
                <p className="font-body text-[17px] leading-[1.8] text-foreground/85">
                  C'est pour ça qu'on a construit Guardiens.
                </p>

                <div className="h-10" />

                <p className="font-body text-[17px] leading-[1.8] text-foreground/85">
                  Votre jardin contre un repas.
                  Vos clés contre une histoire.
                  Des gens du coin qui se font confiance —
                  et parfois des amis pour la vie.
                </p>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 4 — PILIERS ═══════════════ */}
      <section className="py-20 md:py-[120px] bg-background">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <RevealSection className="text-center mb-16">
            <p className="text-[11px] font-body font-semibold tracking-[0.15em] uppercase text-primary/60 mb-4">
              Pourquoi Guardiens
            </p>
            <h2 className="font-heading text-[36px] md:text-[48px] lg:text-[52px] font-semibold text-foreground leading-[1.2]">
              Un réseau de gens du coin qui se font confiance.
            </h2>
            <p className="font-body text-xl text-foreground/70 max-w-[600px] mx-auto mt-4">
              Pas des inconnus. Des gens proches, que vous avez rencontrés en vrai.
            </p>
          </RevealSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {differentiators.map((item, i) => (
              <RevealSection key={item.title} delay={0.1 * i}>
                <div className="relative bg-card border border-border rounded-2xl p-10 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 h-full overflow-hidden">
                  {/* Large background number */}
                  <span className="absolute top-4 right-6 font-heading text-[64px] text-primary/10 leading-none select-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-heading text-[22px] font-semibold text-foreground mb-3 relative z-10">
                    {item.title}
                  </h3>
                  <p className="font-body text-[15px] text-foreground/70 leading-[1.7] relative z-10">
                    {item.description}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 5 — TÉMOIGNAGES ═══════════════ */}
      <section className="py-20 md:py-[120px] bg-foreground">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <RevealSection className="text-center mb-16">
            <h2 className="font-heading text-[36px] md:text-[48px] lg:text-[52px] font-semibold text-white leading-[1.2]">
              Ils ont sauté le pas.
            </h2>
          </RevealSection>

          <div className="relative">
            {/* Arrows */}
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              aria-label="Témoignage précédent"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors text-white/60 hover:text-white"
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
                    <div
                      className="rounded-2xl p-10 h-full"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                      }}
                    >
                      <span
                        className="block font-heading leading-none mb-3 select-none text-primary"
                        style={{ fontSize: "80px", opacity: 0.4, lineHeight: 0.8 }}
                      >
                        "
                      </span>
                      <p className="font-body text-[17px] text-white/90 leading-[1.7] italic mb-6">
                        {t.text}
                      </p>
                      <p className="font-body text-[13px] text-white/50 uppercase tracking-[0.1em]">
                        {t.name} — {t.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination dots */}
            <div className="flex justify-center gap-2 mt-10">
              {scrollSnaps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === selectedIndex ? "bg-primary" : "bg-white/30"
                  }`}
                  aria-label={`Aller au témoignage ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECTION 6 — TROIS ÉTAPES ═══════════════ */}
      <section className="py-20 md:py-[120px] bg-background">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <RevealSection className="text-center mb-16">
            <h2 className="font-heading text-[36px] md:text-[48px] lg:text-[52px] font-semibold text-foreground leading-[1.2]">
              Trois étapes. Une relation.
            </h2>
          </RevealSection>

          <div className="grid md:grid-cols-2 gap-12 md:gap-0">
            {/* Colonne gauche — Propriétaire */}
            <RevealSection className="md:pr-10 lg:pr-16 md:border-r md:border-border">
              <p className="text-[11px] font-body font-semibold tracking-[0.15em] uppercase text-primary mb-10">
                Tu as une maison, des animaux
              </p>
              <div className="space-y-12">
                {ownerSteps.map((step) => (
                  <div key={step.number}>
                    <span className="block font-heading text-[80px] text-primary/15 leading-none">{step.number}</span>
                    <h3 className="font-heading text-2xl font-semibold text-foreground mt-1 mb-2">{step.title}</h3>
                    <p className="font-body text-base text-foreground/70 leading-[1.7] whitespace-pre-line">{step.description}</p>
                  </div>
                ))}
              </div>
              <Link
                to="/inscription?role=owner"
                className="inline-flex items-center gap-2 mt-10 text-primary font-body text-[15px] font-semibold hover:gap-3 transition-all"
              >
                Je cherche un gardien <ArrowRight className="h-4 w-4" />
              </Link>
            </RevealSection>

            {/* Colonne droite — Gardien */}
            <RevealSection delay={0.15} className="md:pl-10 lg:pl-16">
              <p className="text-[11px] font-body font-semibold tracking-[0.15em] uppercase text-primary mb-10">
                Tu veux garder
              </p>
              <div className="space-y-12">
                {sitterSteps.map((step) => (
                  <div key={step.number}>
                    <span className="block font-heading text-[80px] text-primary/15 leading-none">{step.number}</span>
                    <h3 className="font-heading text-2xl font-semibold text-foreground mt-1 mb-2">{step.title}</h3>
                    <p className="font-body text-base text-foreground/70 leading-[1.7] whitespace-pre-line">{step.description}</p>
                  </div>
                ))}
              </div>
              <Link
                to="/inscription?role=sitter"
                className="inline-flex items-center gap-2 mt-10 text-primary font-body text-[15px] font-semibold hover:gap-3 transition-all"
              >
                Je veux garder <ArrowRight className="h-4 w-4" />
              </Link>
            </RevealSection>
          </div>

          {/* Encart entraide */}
          <RevealSection className="mt-20">
            <div className="bg-muted rounded-[20px] p-12 md:p-12 max-w-[800px] mx-auto text-center">
              <h3 className="font-heading text-[26px] md:text-[32px] font-semibold text-foreground mb-4">
                Un jardin à arroser ? Un meuble à monter ?
              </h3>
              <p className="font-body text-[17px] text-foreground/75 leading-[1.7] max-w-xl mx-auto mb-6">
                Jardinage, bricolage, courses, coup de main —
                les petites missions sont là pour ça.
                <br />
                Sans argent. Entre gens du coin qui se choisissent.
              </p>
              <Link
                to="/petites-missions"
                className="text-primary font-body font-semibold text-[15px] underline underline-offset-4 hover:no-underline inline-flex items-center gap-1"
              >
                Découvrir les petites missions <ArrowRight className="h-4 w-4" />
              </Link>
              {dynamicCounts && dynamicCounts.missions > 10 && (
                <p className="font-body text-xs text-foreground/50 mt-4">
                  {dynamicCounts.missions} missions actives en AURA en ce moment
                </p>
              )}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ═══════════════ SECTION 7 — ENCART FONDATEUR ═══════════════ */}
      <section className="py-16 md:py-[100px] bg-primary">
        <RevealSection className="max-w-[600px] mx-auto px-6 text-center">
          <div
            className="inline-flex items-center rounded-full px-4 py-1.5 mb-6"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <span className="font-body text-[12px] text-white uppercase tracking-[0.1em]">Fondateur</span>
          </div>
          <h2 className="font-heading text-[36px] md:text-[48px] lg:text-[52px] font-bold text-white leading-[1.2] mb-6">
            ⭐ Inscris-toi avant le 13 mai.
          </h2>
          <p className="font-body text-[18px] text-white/85 leading-[1.7] mb-10">
            Badge Fondateur à vie. Accès gratuit jusqu'au 13 juin.
            Et surtout — tu seras parmi les premiers à vivre ça.
            Pourquoi le 13 mai ? C'est l'anniversaire de Jérémie.
            Il préfère offrir l'accès plutôt que recevoir des chaussettes.
          </p>
          <button
            onClick={() => navigate("/inscription")}
            className="font-body text-[15px] font-bold tracking-[0.03em] rounded-full px-12 py-[18px] bg-white text-primary hover:bg-background hover:scale-[1.02] transition-all duration-200"
          >
            Rejoindre le mouvement
          </button>
        </RevealSection>
      </section>

      {/* ═══════════════ DERNIERS ARTICLES ═══════════════ */}
      {latestArticles.length > 0 && (
        <section className="py-20 md:py-[100px] bg-background">
          <div className="max-w-6xl mx-auto px-6 md:px-12">
            <RevealSection>
              <div className="flex items-center justify-between mb-12">
                <h2 className="font-heading text-[28px] md:text-[36px] font-semibold text-foreground">
                  Derniers guides & conseils
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/actualites")}
                  className="text-primary"
                >
                  Voir tous les guides <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </RevealSection>
            <div className="grid md:grid-cols-3 gap-8">
              {latestArticles.map((a, i) => (
                <RevealSection key={a.id} delay={0.1 * i}>
                  <Link
                    to={`/actualites/${a.slug}`}
                    className="group bg-card rounded-2xl overflow-hidden border border-border hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 block"
                  >
                    {a.cover_image_url && (
                      <img
                        src={a.cover_image_url}
                        alt={a.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="p-6">
                      <h3 className="font-heading text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {a.title}
                      </h3>
                      <p className="font-body text-sm text-foreground/60 line-clamp-2">
                        {a.excerpt}
                      </p>
                    </div>
                  </Link>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ SECTION 8 — CTA FINAL ═══════════════ */}
      <section className="py-20 md:py-[120px] bg-foreground">
        <RevealSection className="max-w-[700px] mx-auto px-6 text-center">
          <h2 className="font-heading text-[44px] md:text-[56px] lg:text-[64px] font-bold text-white leading-[1.1] mb-6">
            Votre prochaine histoire commence ici.
          </h2>
          <p className="font-body text-[18px] text-white/70 leading-[1.7] max-w-[500px] mx-auto mb-10">
            Des gardes, de l'entraide, des gens du coin
            qui se font confiance.
            Gratuit pour commencer.
            Ce que vous allez vivre ne l'est pas.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/inscription?role=owner")}
              className="font-body text-[15px] font-semibold tracking-[0.03em] rounded-full px-10 py-[18px] bg-primary text-primary-foreground hover:brightness-90 hover:scale-[1.02] transition-all duration-200"
            >
              Je cherche un gardien
            </button>
            <button
              onClick={() => navigate("/inscription?role=sitter")}
              className="font-body text-[15px] font-semibold tracking-[0.03em] rounded-full px-10 py-[18px] bg-transparent text-white border-2 border-white/40 hover:bg-white/10 transition-all duration-200"
            >
              Je veux garder
            </button>
          </div>
          <p className="mt-6 text-[13px] text-white/40 font-body">
            Gratuit · Badge Fondateur à vie · Accès jusqu'au 13 juin
          </p>
        </RevealSection>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="bg-foreground" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <h4 className="font-body text-[11px] uppercase tracking-[0.15em] text-white/30 mb-4">House-sitting par ville</h4>
              <ul className="space-y-2">
                <li><Link to="/house-sitting/lyon" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting Lyon</Link></li>
                <li><Link to="/house-sitting/annecy" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting Annecy</Link></li>
                <li><Link to="/house-sitting/grenoble" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting Grenoble</Link></li>
                <li><Link to="/house-sitting/chambery" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting Chambéry</Link></li>
                <li><Link to="/house-sitting/caluire-et-cuire" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting Caluire</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-body text-[11px] uppercase tracking-[0.15em] text-white/30 mb-4">House-sitting AURA</h4>
              <ul className="space-y-2">
                <li><Link to="/actualites/house-sitting-auvergne-rhone-alpes" className="font-body text-sm text-white/50 hover:text-white transition-colors">House-sitting en AURA</Link></li>
                <li><Link to="/actualites/parcs-chiens-lyon-guide-complet" className="font-body text-sm text-white/50 hover:text-white transition-colors">Parcs chiens Lyon</Link></li>
                <li><Link to="/actualites/parcs-balades-chiens-annecy-guide" className="font-body text-sm text-white/50 hover:text-white transition-colors">Parcs chiens Annecy</Link></li>
                <li><Link to="/actualites/parcs-balades-chiens-grenoble-guide" className="font-body text-sm text-white/50 hover:text-white transition-colors">Parcs chiens Grenoble</Link></li>
                <li><Link to="/actualites/gardes-longue-duree-guide" className="font-body text-sm text-white/50 hover:text-white transition-colors">Gardes longue durée</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-body text-[11px] uppercase tracking-[0.15em] text-white/30 mb-4">Ressources</h4>
              <ul className="space-y-2">
                <li><Link to="/actualites" className="font-body text-sm text-white/50 hover:text-white transition-colors">Articles</Link></li>
                <li><Link to="/guides" className="font-body text-sm text-white/50 hover:text-white transition-colors">Guides locaux</Link></li>
                <li><Link to="/faq" className="font-body text-sm text-white/50 hover:text-white transition-colors">FAQ</Link></li>
                <li><Link to="/tarifs" className="font-body text-sm text-white/50 hover:text-white transition-colors">Tarifs</Link></li>
                <li><Link to="/actualites/c-est-quoi-le-house-sitting" className="font-body text-sm text-white/50 hover:text-white transition-colors">C'est quoi le house-sitting</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-body text-[11px] uppercase tracking-[0.15em] text-white/30 mb-4">Guardiens</h4>
              <ul className="space-y-2">
                <li><Link to="/a-propos" className="font-body text-sm text-white/50 hover:text-white transition-colors">À propos</Link></li>
                <li><Link to="/notre-histoire" className="font-body text-sm text-white/50 hover:text-white transition-colors">Notre histoire</Link></li>
                <li><Link to="/contact" className="font-body text-sm text-white/50 hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/register" className="font-body text-sm text-white/50 hover:text-white transition-colors">Inscription</Link></li>
                <li><Link to="/petites-missions" className="font-body text-sm text-white/50 hover:text-white transition-colors">Petites missions</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div>
              <h3 className="font-heading text-lg font-semibold text-white/90">
                <span className="text-primary">g</span>uardiens
              </h3>
              <p className="font-body text-sm text-white/40">
                House-sitting de proximité en AURA
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-white/40 font-body">
              <span>© 2026 Guardiens</span>
              <span className="text-white/20">·</span>
              <Link to="/cgu" className="hover:text-white transition-colors">CGU</Link>
              <span className="text-white/20">·</span>
              <Link to="/confidentialite" className="hover:text-white transition-colors">Politique de confidentialité</Link>
              <span className="text-white/20">·</span>
              <Link to="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
              <span className="text-white/20">·</span>
              <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Hero animation keyframes */}
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
};

export default Landing;
