import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Home, PawPrint, Clock, Handshake, Sparkles, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import useEmblaCarousel from "embla-carousel-react";
import heroDogBbq from "@/assets/hero-dog-bbq.jpg";

const differentiators = [
  {
    icon: PawPrint,
    title: "Vos animaux restent chez eux.",
    description:
      "Leur panier, leur canapé, leurs habitudes. Quelqu'un du coin qui les connaît par leur prénom.",
  },
  {
    icon: Home,
    title: "Votre maison vit.",
    description:
      "Volets ouverts, courrier relevé, lumières allumées. Pas une maison vide — une maison habitée.",
  },
  {
    icon: Clock,
    title: "On se rencontre avant.",
    description:
      "Un café, une balade. La confiance ne se crée pas en ligne. Elle se vit.",
  },
  {
    icon: Handshake,
    title: "Votre jardin contre un repas.",
    description:
      "Vos clés contre une histoire. Ici personne ne facture ce qui n'a pas de prix.",
  },
  {
    icon: Sparkles,
    title: "Et au-delà des gardes.",
    description:
      "Un coup de main, un service rendu, une compétence échangée. Des gens du coin qui s'ouvrent.",
  },
  {
    icon: Wrench,
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

const steps = [
  {
    number: "01",
    title: "Raconte-toi",
    description:
      "5 minutes. Ta maison, tes animaux, ce que tu cherches. Ou qui tu es et ce que tu as envie de vivre.",
  },
  {
    number: "02",
    title: "Découvre tes gens du coin",
    description:
      "Des profils proches de chez toi. Des gens qui n'attendent que de se rencontrer.",
  },
  {
    number: "03",
    title: "Rencontrez-vous en vrai",
    description:
      "Un café, une balade, une visite. La confiance se crée en face à face. Puis tu pars — ou tu accueilles. L'histoire commence là.",
  },
];

/* ── Separator for histoire section ── */
const StoryDivider = () => (
  <div className="flex justify-center my-8">
    <div className="w-[60px] h-px" style={{ backgroundColor: "#E8E4DC" }} />
  </div>
);

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
        // Maisons: count distinct properties with confirmed/completed sits
        const sitsRes = await supabase
          .from("sits")
          .select("property_id")
          .in("status", ["confirmed", "completed"]);
        const distinctProperties = new Set((sitsRes.data || []).map(s => s.property_id));
        const maisons = 37 + distinctProperties.size;

        // Animaux: get pets from properties that have confirmed/completed sits
        const propertyIds = Array.from(distinctProperties);
        let animaux = 234;
        if (propertyIds.length > 0) {
          const petsRes = await supabase
            .from("pets")
            .select("id", { count: "exact", head: true })
            .in("property_id", propertyIds);
          animaux += (petsRes.count ?? 0);
        }

        // Missions d'entraide
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
            areaServed: {
              "@type": "AdministrativeArea",
              name: "Auvergne-Rhône-Alpes",
            },
            knowsAbout: [
              "House-sitting",
              "Pet-sitting",
              "Garde d'animaux à domicile",
              "Entraide entre gens du coin",
              "Petites missions entre gens du coin",
              "Auvergne-Rhône-Alpes",
            ],
            slogan: "Proches de chez vous. Partir. Revenir. Recommencer.",
            founder: [
              { "@type": "Person", name: "Jérémie" },
              { "@type": "Person", name: "Elisa" },
            ],
            sameAs: [],
          }),
        }}
      />
      {/* JSON-LD: WebSite with SearchAction + SiteLinksSearchBox */}
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
              target: {
                "@type": "EntryPoint",
                urlTemplate: "https://guardiens.fr/recherche?q={search_term_string}",
              },
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      {/* JSON-LD: Service */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Pet sitting & House sitting gratuit",
            description: "Service de garde d'animaux et house sitting gratuit en Auvergne-Rhône-Alpes. Avis croisés, inscription gratuite.",
            provider: {
              "@type": "Organization",
              name: "Guardiens",
              url: "https://guardiens.fr",
            },
            areaServed: {
              "@type": "AdministrativeArea",
              name: "Auvergne-Rhône-Alpes",
            },
            serviceType: ["Pet sitting", "House sitting", "Garde d'animaux", "Gardiennage de maison", "Garde de chien", "Garde de chat"],
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
              description: "Inscription et mise en relation 100% gratuites",
            },
          }),
        }}
      />
      {/* JSON-LD: FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "Qu'est-ce que le house sitting ?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Le house sitting est un échange de services : un gardien habite gratuitement dans votre maison pendant votre absence et prend soin de vos animaux. C'est gratuit pour les deux parties.",
                },
              },
              {
                "@type": "Question",
                name: "Guardiens est-il gratuit ?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Oui, Guardiens est 100% gratuit. Pas de commission, pas d'abonnement obligatoire, pas de frais cachés. L'inscription et la mise en relation sont entièrement gratuites.",
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
            ],
          }),
        }}
      />

      {/* Navbar */}
      <header className="flex items-center justify-between px-4 md:px-12 py-4 md:py-5 sticky top-0 bg-background/80 backdrop-blur-md z-50 border-b border-border/50">
        <h2 className="font-heading text-xl md:text-2xl font-bold">
          <span className="text-primary">g</span>uardiens
        </h2>
        <div className="flex gap-2 md:gap-3 items-center">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/actualites")}>
            Articles
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/guides")}>
            Guides locaux
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <a href="#entraide">Entraide</a>
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/tarifs")}>
            Tarifs
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
            Connexion
          </Button>
          <Button size="sm" onClick={() => navigate("/register")}>S'inscrire</Button>
        </div>
      </header>

      {/* ═══════════════ HERO BANNER ═══════════════ */}
      <section className="relative w-full h-[520px] md:h-[520px] lg:h-[600px] overflow-hidden">
        <img
          src={heroDogBbq}
          alt="Un golden retriever souriant dans un jardin ensoleillé — l'esprit Guardiens"
          className="absolute inset-0 w-full h-full object-cover blur-[3px] scale-[1.02]"
          loading="eager"
        />
        {/* Left-to-right gradient overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(0,0,0,0.45), rgba(0,0,0,0.15))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 md:pb-16 px-4 md:px-6 text-center">
          {/* Pastille */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 md:px-4 py-1.5 mb-4 md:mb-6 animate-fade-in">
            <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 md:h-2.5 md:w-2.5 bg-primary-foreground" />
            </span>
            <span className="text-xs md:text-sm text-primary-foreground font-medium">
              Auvergne-Rhône-Alpes · Bientôt partout
            </span>
          </div>

          <div className="space-y-2 md:space-y-3 mb-6 md:mb-8 animate-fade-in">
            <h1 className="font-heading text-3xl md:text-6xl lg:text-7xl font-bold leading-tight text-white drop-shadow-lg">
              Proches de chez vous.
            </h1>
            <p className="font-heading text-2xl md:text-4xl lg:text-5xl italic text-white/95 drop-shadow-lg">
              Partir. Revenir. Recommencer.
            </p>
            <p className="text-base md:text-xl text-white/85 max-w-2xl mx-auto drop-shadow">
              Garder une maison. Échanger un service. Se faire confiance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center w-full sm:w-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Button variant="hero" size="xl" onClick={() => navigate("/inscription?role=owner")}>
              Je cherche un gardien
            </Button>
            <Button
              size="xl"
              onClick={() => navigate("/inscription?role=sitter")}
              className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-semibold rounded-2xl"
            >
              Je veux garder
            </Button>
          </div>
          <Link to="/petites-missions" className="mt-3 text-sm text-primary-foreground hover:underline inline-flex items-center gap-1 animate-fade-in" style={{ animationDelay: "0.22s" }}>
            Découvrir les petites missions <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <p className="mt-2 md:mt-3 text-xs md:text-sm text-white/70 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            Gratuit · Premiers inscrits, premiers servis.
          </p>
        </div>
      </section>

      {/* ═══════════════ 1. HERO CONTENT (stats) ═══════════════ */}
      <section className="px-6 md:px-12 pt-16 pb-20 max-w-5xl mx-auto text-center">

        {/* Stats avec séparateurs */}
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground/60 mb-6">
          Ce qu'on a vécu avant de construire Guardiens.
        </p>
        <div
          className="flex flex-wrap items-center justify-center gap-0 mt-0 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="text-center px-6 md:px-10">
            <span className="block font-heading text-3xl md:text-4xl font-bold text-primary">37</span>
            <span className="text-muted-foreground text-sm">maisons gardées</span>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="text-center px-6 md:px-10">
            <span className="block font-heading text-3xl md:text-4xl font-bold text-primary">234</span>
            <span className="text-muted-foreground text-sm">animaux accompagnés</span>
          </div>
          <div className="w-px h-12 bg-border" />
          <div className="text-center px-6 md:px-10">
            <span className="block font-heading text-3xl md:text-4xl font-bold text-primary">5 ans</span>
            <span className="text-muted-foreground text-sm">en AURA</span>
          </div>
          {dynamicCounts && dynamicCounts.members > 50 && (
            <>
              <div className="w-px h-12 bg-border hidden sm:block" />
              <div className="text-center px-6 md:px-10 mt-4 sm:mt-0">
                <span className="block font-heading text-3xl md:text-4xl font-bold text-primary">{dynamicCounts.members}</span>
                <span className="text-muted-foreground text-sm">membres</span>
              </div>
            </>
          )}
          {dynamicCounts && dynamicCounts.sits > 5 && (
            <>
              <div className="w-px h-12 bg-border hidden sm:block" />
              <div className="text-center px-6 md:px-10 mt-4 sm:mt-0">
                <span className="block font-heading text-3xl md:text-4xl font-bold text-primary">{dynamicCounts.sits}</span>
                <span className="text-muted-foreground text-sm">gardes confirmées</span>
              </div>
            </>
          )}
          {dynamicCounts && dynamicCounts.missions > 10 && (
            <>
              <div className="w-px h-12 bg-border hidden sm:block" />
              <div className="text-center px-6 md:px-10 mt-4 sm:mt-0">
                <span className="block font-heading text-3xl md:text-4xl font-bold text-primary">{dynamicCounts.missions}</span>
                <span className="text-muted-foreground text-sm">missions d'entraide</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══════════════ 2. L'HISTOIRE ═══════════════ */}
      <section className="px-6 md:px-12 py-24 lg:py-28 bg-card">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-10 text-center">
            Tout a commencé avec un visa.
          </h2>

          <div className="space-y-6 text-muted-foreground leading-relaxed text-base md:text-lg">
            <p>
              Elisa est arrivée d'Argentine avec un visa
              qui ne lui permettait pas de travailler.
              Elle gardait des animaux. Elle rentrait avec
              des histoires. Des gens qui ouvraient leur porte
              sans calcul, leur vie sans condition.
            </p>
            <p>
              Un soir un propriétaire lui a dit&nbsp;:
              <em className="text-foreground">{" "}« Et si tu restais chez nous pendant qu'on part ? »</em>
            </p>

            <StoryDivider />

            <p>
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
            <p>
              Des gens qu'on ne connaissait pas
              trois semaines avant.
            </p>
            <p>
              <strong className="text-foreground">On ne gardait pas des maisons.
              On collectionnait des vies.</strong>
            </p>

            <StoryDivider />

            <p>
              Un soir chez Helen — Stanley qui aboyait,
              Rafa couché sur nos pieds, la vue sur le Mont-Blanc.
              On s'est dit&nbsp;: pourquoi il n'y a pas plus de monde
              qui fait ça ?
            </p>
            <p>
              C'est pour ça qu'on a construit Guardiens.
            </p>

            <StoryDivider />

            <p>
              Votre jardin contre un repas.
              Vos clés contre une histoire.
              Des gens du coin qui se font confiance —
              et parfois des amis pour la vie.
            </p>
          </div>
        </div>
      </section>

      {/* Section "Envie de tenter l'aventure" SUPPRIMÉE */}

      {/* ═══════════════ 4. DIFFÉRENCIATEURS ═══════════════ */}
      <section className="px-6 md:px-12 py-24 lg:py-28">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-3">
            Un réseau de gens du coin qui se font confiance.
          </h2>
          <p className="text-muted-foreground text-lg text-center mb-14">
            Pas des inconnus. Des gens proches, que vous avez rencontrés en vrai.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {differentiators.map((item, i) => (
              <div
                key={item.title}
                className="bg-card rounded-xl p-8 animate-fade-in border-b-2 border-transparent hover:border-primary transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-5">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 4b. ENCART ENTRAIDE ═══════════════ */}
      <section id="entraide" className="px-6 md:px-12 py-20 scroll-mt-20" style={{ backgroundColor: "#F9F6F1" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-2">
            Et au-delà des gardes.
          </h2>
          <p className="text-muted-foreground text-base mb-8">
            Parce que l'échange ne s'arrête pas à la porte d'entrée.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <span className="text-2xl">🌱</span>
              <span>Tondre un jardin contre des légumes du potager</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <span className="text-2xl">🍽️</span>
              <span>Donner un coup de main contre un repas maison</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <span className="text-2xl">📬</span>
              <span>Réceptionner un colis contre un cours de cuisine</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4 italic">
            L'échange se décide entre vous. Jamais d'argent. Juste des gens du coin.
          </p>
          <Link to="/petites-missions" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Découvrir les petites missions <ArrowRight className="h-4 w-4" />
          </Link>
          {dynamicCounts && dynamicCounts.missions > 10 && (
            <p className="text-xs text-muted-foreground mt-3">
              {dynamicCounts.missions} missions actives en AURA en ce moment
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════ 5. TÉMOIGNAGES (CAROUSEL) ═══════════════ */}
      <section className="px-6 md:px-12 py-24 lg:py-28 bg-card">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-14">
            Ils ont sauté le pas.
          </h2>

          <div className="relative">
            {/* Arrows */}
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
              aria-label="Témoignage précédent"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="absolute -right-4 md:-right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
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
                      className="bg-background rounded-2xl p-7 h-full"
                      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                    >
                      {/* Opening quote */}
                      <span
                        className="block font-serif leading-none mb-2 select-none text-primary"
                        style={{ fontSize: "60px", opacity: 0.3 }}
                      >
                        "
                      </span>
                      <p className="text-muted-foreground leading-relaxed mb-6" style={{ fontSize: "15px", lineHeight: 1.6 }}>
                        {t.text}
                      </p>
                      <p>
                        <span className="font-semibold text-primary" style={{ fontSize: "13px" }}>
                          {t.name}
                        </span>
                        <span className="text-muted-foreground" style={{ fontSize: "13px" }}>
                          {" "}— {t.detail}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination dots */}
            <div className="flex justify-center gap-2 mt-8">
              {scrollSnaps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === selectedIndex ? "bg-primary" : "bg-border"
                  }`}
                  aria-label={`Aller au témoignage ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ 6. COMMENT ÇA MARCHE ═══════════════ */}
      <section className="px-6 md:px-12 py-24 lg:py-28">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-16">
            Trois étapes. Une relation.
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <span className="inline-block font-heading text-5xl font-bold text-primary/20 mb-4">
                  {step.number}
                </span>
                <h3 className="font-heading text-xl font-semibold mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ ENCART FONDATEUR ═══════════════ */}
      <section className="px-6 md:px-12 py-16">
        <div
          className="max-w-3xl mx-auto rounded-2xl p-8 md:p-10 text-center space-y-4 border-2"
          style={{ backgroundColor: "#FEF3C7", borderColor: "hsl(24 36% 60%)" }}
        >
          <h3 className="font-heading text-xl md:text-2xl font-bold text-foreground">
            ⭐ Inscris-toi avant le 13 mai.
          </h3>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Badge Fondateur à vie. Accès gratuit jusqu'au 13 juin.
            Et surtout — tu seras parmi les premiers à vivre ça.
            Pourquoi le 13 mai ? C'est l'anniversaire de Jérémie.
            Il préfère offrir l'accès plutôt que recevoir des chaussettes.
          </p>
          <Button variant="hero" size="xl" onClick={() => navigate("/inscription")}>
            Rejoindre le mouvement
          </Button>
        </div>
      </section>

      {/* ═══════════════ DERNIERS ARTICLES ═══════════════ */}
      {latestArticles.length > 0 && (
        <section className="px-6 md:px-12 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
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
            <div className="grid md:grid-cols-3 gap-6">
              {latestArticles.map((a) => (
                <Link
                  key={a.id}
                  to={`/actualites/${a.slug}`}
                  className="group bg-card rounded-xl overflow-hidden border border-border/50 hover:shadow-lg transition-shadow"
                >
                  {a.cover_image_url && (
                    <img
                      src={a.cover_image_url}
                      alt={a.title}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="p-5">
                    <h3 className="font-heading text-base font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {a.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {a.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ 8. CTA FINAL (fond sombre) ═══════════════ */}
      <section className="px-6 md:px-12 py-24" style={{ backgroundColor: "#1C1B18" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4 text-white">
            Votre prochaine histoire commence ici.
          </h2>
          <p className="text-white/60 text-lg mb-8 leading-relaxed">
            Des gardes, de l'entraide, des gens du coin
            <br />
            qui se font confiance.
            <br />
            Gratuit pour commencer.
            <br />
            Ce que vous allez vivre ne l'est pas.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-white text-foreground hover:bg-white/90 font-semibold"
              onClick={() => navigate("/inscription?role=owner")}
            >
              Je cherche un gardien
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 font-semibold"
              onClick={() => navigate("/inscription?role=sitter")}
            >
              Je veux garder
            </Button>
          </div>
          <p className="mt-4 text-xs text-white/40">
            Gratuit · Badge Fondateur à vie · Accès jusqu'au 13 juin
          </p>
        </div>
      </section>

      {/* ═══════════════ 9. FOOTER ═══════════════ */}
      <footer className="border-t border-border px-6 md:px-12 py-10">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* SEO local links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">House-sitting par ville</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><Link to="/house-sitting/lyon" className="hover:text-primary transition-colors">House-sitting Lyon</Link></li>
                <li><Link to="/house-sitting/annecy" className="hover:text-primary transition-colors">House-sitting Annecy</Link></li>
                <li><Link to="/house-sitting/grenoble" className="hover:text-primary transition-colors">House-sitting Grenoble</Link></li>
                <li><Link to="/house-sitting/chambery" className="hover:text-primary transition-colors">House-sitting Chambéry</Link></li>
                <li><Link to="/house-sitting/caluire-et-cuire" className="hover:text-primary transition-colors">House-sitting Caluire</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">House-sitting AURA</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><Link to="/actualites/house-sitting-auvergne-rhone-alpes" className="hover:text-primary transition-colors">House-sitting en AURA</Link></li>
                <li><Link to="/actualites/parcs-chiens-lyon-guide-complet" className="hover:text-primary transition-colors">Parcs chiens Lyon</Link></li>
                <li><Link to="/actualites/parcs-balades-chiens-annecy-guide" className="hover:text-primary transition-colors">Parcs chiens Annecy</Link></li>
                <li><Link to="/actualites/parcs-balades-chiens-grenoble-guide" className="hover:text-primary transition-colors">Parcs chiens Grenoble</Link></li>
                <li><Link to="/actualites/gardes-longue-duree-guide" className="hover:text-primary transition-colors">Gardes longue durée</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Ressources</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><Link to="/actualites" className="hover:text-primary transition-colors">Articles</Link></li>
                <li><Link to="/guides" className="hover:text-primary transition-colors">Guides locaux</Link></li>
                <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
                <li><Link to="/tarifs" className="hover:text-primary transition-colors">Tarifs</Link></li>
                <li><Link to="/actualites/c-est-quoi-le-house-sitting" className="hover:text-primary transition-colors">C'est quoi le house-sitting</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Guardiens</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li><Link to="/a-propos" className="hover:text-primary transition-colors">À propos</Link></li>
                <li><Link to="/notre-histoire" className="hover:text-primary transition-colors">Notre histoire</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link to="/register" className="hover:text-primary transition-colors">Inscription</Link></li>
                <li><Link to="/petites-missions" className="hover:text-primary transition-colors">Petites missions</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg font-semibold">
              <span className="text-primary">g</span>uardiens
            </h3>
            <p className="text-muted-foreground text-sm">
              House-sitting de proximité en AURA
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>© 2026 Guardiens</span>
            <span className="text-border">·</span>
            <Link to="/cgu" className="hover:text-foreground transition-colors">
              CGU
            </Link>
            <span className="text-border">·</span>
            <Link to="/confidentialite" className="hover:text-foreground transition-colors">
              Politique de confidentialité
            </Link>
            <span className="text-border">·</span>
            <Link to="/mentions-legales" className="hover:text-foreground transition-colors">
              Mentions légales
            </Link>
            <span className="text-border">·</span>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
