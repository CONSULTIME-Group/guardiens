import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home, PawPrint, Clock, Handshake, Sparkles, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
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
    text: "J'ai commencé par arroser les plantes d'une voisine contre un repas. Maintenant je garde sa maison quand elle part. C'est comme ça que ça marche ici — doucement, naturellement.",
  },
];

const steps = [
  {
    number: "01",
    title: "Inscrivez-vous",
    description:
      "5 minutes. Racontez votre maison, vos animaux, ce que vous cherchez. Ou racontez qui vous êtes et ce que vous avez envie de vivre.",
  },
  {
    number: "02",
    title: "Trouvez votre match",
    description:
      "Des profils vérifiés, proches de chez vous. Pas des inconnus — des voisins qui n'attendent que de se rencontrer.",
  },
  {
    number: "03",
    title: "Rencontrez-vous",
    description:
      "Un café, une balade, une visite. La confiance se crée en vrai. Puis vous partez — ou vous accueillez. L'histoire commence là.",
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const [latestArticles, setLatestArticles] = useState<any[]>([]);
  const [dynamicCounts, setDynamicCounts] = useState<{ members: number; missions: number; sits: number } | null>(null);
  const lastFetchRef = useRef<number>(0);

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

      const [membersRes, missionsRes, sitsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("small_missions").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress", "completed"]),
        supabase.from("sits").select("id", { count: "exact", head: true }).in("status", ["confirmed", "completed"]),
      ]);
      setDynamicCounts({
        members: membersRes.count ?? 0,
        missions: missionsRes.count ?? 0,
        sits: sitsRes.count ?? 0,
      });
    };
    fetchCounts();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Guardiens — Pet sitting & House sitting gratuit en Auvergne-Rhône-Alpes"
        description="Trouvez un pet sitter ou house sitter de confiance près de chez vous. Garde d'animaux gratuite, gardiens vérifiés, avis détaillés. Vos animaux restent chez eux, votre maison vit."
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
              "Entraide de voisinage",
              "Petites missions entre voisins",
              "Auvergne-Rhône-Alpes",
            ],
            slogan: "Comme confier ses clés à un voisin.",
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
            description: "Service de garde d'animaux et house sitting gratuit en Auvergne-Rhône-Alpes. Gardiens vérifiés, avis croisés, inscription gratuite.",
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
                  text: "Inscrivez-vous sur Guardiens, publiez votre annonce de garde avec les dates et vos animaux, et recevez des candidatures de gardiens vérifiés qui habitent près de chez vous.",
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
            Guides & Conseils
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/guides")}>
            Guides
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/petites-missions")}>
            Entraide
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
        {/* Colored overlay to harmonize + bottom gradient for text */}
        <div className="absolute inset-0 bg-primary/[0.15]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
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

          <h1 className="font-heading text-3xl md:text-6xl lg:text-7xl font-bold leading-tight mb-3 md:mb-4 text-white drop-shadow-lg animate-fade-in">
            Comme confier ses clés
            <br />
            <span className="italic text-primary-foreground/90">aux gens du coin.</span>
          </h1>
          <p className="text-base md:text-xl text-white/90 max-w-2xl mx-auto mb-6 md:mb-8 drop-shadow animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Des gardes, de l'entraide, des petits services
            entre gens du coin.
            Des gens proches à qui vous avez choisi
            de faire confiance.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center w-full sm:w-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Button variant="hero" size="xl" onClick={() => navigate("/register")}>
              Je cherche un gardien
            </Button>
            <Button
              size="xl"
              onClick={() => navigate("/register")}
              className="bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 font-semibold rounded-2xl"
            >
              Je veux garder
            </Button>
          </div>
          <p className="mt-3 md:mt-4 text-xs md:text-sm text-white/70 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            Gratuit · Premiers inscrits, premiers servis.
          </p>
        </div>
      </section>

      {/* ═══════════════ 1. HERO CONTENT (stats) ═══════════════ */}
      <section className="px-6 md:px-12 pt-12 pb-16 max-w-5xl mx-auto text-center">

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
      <section className="px-6 md:px-12 py-20 bg-card">
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

            <div className="py-2" />

            <p>
              On a gardé 37 maisons en cinq ans.
              Géraldine, 72 ans, cheveux rouges, à Passy —
              un perroquet et deux chiens sur le pas de la porte.
              Rio à Collonges — on y est retournés six fois.
              À Briord, ils nous ont laissé les clés de la maison,
              les clés de la Triumph, les clés du bateau,
              les clés de la BM.
            </p>
            <p>
              Des gens qu'on ne connaissait pas
              trois semaines avant.
            </p>
            <p>
              <strong className="text-foreground">On ne gardait pas des maisons.
              On collectionnait des vies.</strong>
            </p>

            <div className="py-2" />

            <p>
              Un soir chez Helen — Stanley qui aboyait,
              Rafa couché sur nos pieds, la vue sur le Mont-Blanc.
              On s'est dit&nbsp;: pourquoi il n'y a pas plus de monde
              qui fait ça ?
            </p>
            <p>
              C'est pour ça qu'on a construit Guardiens.
            </p>

            <div className="py-2" />

            <p>
              Votre jardin contre un repas.
              Vos clés contre une histoire.
              Des gens du coin qui se font confiance —
              et parfois des amis pour la vie.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════ 3. CTA INTERMÉDIAIRE ═══════════════ */}
      <section className="px-6 md:px-12 py-20 bg-secondary/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Envie de{" "}
            <span className="text-primary italic">tenter l'aventure</span> ?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Que vous cherchiez quelqu'un pour garder votre maison, ou que vous
            rêviez d'échappées à côté de chez vous — on vous attend.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" onClick={() => navigate("/register")}>
              Je cherche un gardien
            </Button>
            <Button variant="heroOutline" size="xl" onClick={() => navigate("/register")}>
              Je veux garder
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════ 4. DIFFÉRENCIATEURS ═══════════════ */}
      <section className="px-6 md:px-12 py-20">
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
                className="bg-card rounded-xl p-8 animate-fade-in"
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
      <section className="px-6 md:px-12 py-10" style={{ backgroundColor: "#F9F6F1" }}>
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
            Jamais d'argent. L'échange se décide entre vous.
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

      {/* ═══════════════ 5. TÉMOIGNAGES ═══════════════ */}
      <section className="px-6 md:px-12 py-20 bg-card">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-14">
            Ils ont sauté le pas.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className="bg-background rounded-xl p-8 animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <p className="text-muted-foreground leading-relaxed text-sm mb-6">
                  "{t.text}"
                </p>
                <p className="font-heading font-semibold text-sm">
                  {t.name}{" "}
                  <span className="text-muted-foreground font-body font-normal">
                    — {t.detail}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ 6. COMMENT ÇA MARCHE ═══════════════ */}
      <section className="px-6 md:px-12 py-20">
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

      {/* ═══════════════ 7. PRICING ═══════════════ */}
      <section className="px-6 md:px-12 py-20 bg-card">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-5">
            On vient de lancer. Donc c'est{" "}
            <span className="text-primary italic">gratuit.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Transparent, simple, et toujours à votre écoute. On construit la communauté
            d'abord, on verra le reste ensemble. Profitez-en — les premiers
            inscrits auront toujours une place spéciale.
          </p>
        </div>
      </section>

      {/* ═══════════════ ENCART FONDATEUR ═══════════════ */}
      <section className="px-6 md:px-12 py-12">
        <div
          className="max-w-3xl mx-auto rounded-2xl p-8 md:p-10 text-center space-y-4 border-2"
          style={{ backgroundColor: "#FEF3C7", borderColor: "hsl(24 36% 60%)" }}
        >
          <h3 className="font-heading text-xl md:text-2xl font-bold text-foreground">
            ⭐ Inscrivez-vous avant le 13 mai.
          </h3>
          <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Badge Fondateur à vie. Accès gratuit jusqu'au 13 juin.
            Et surtout — vous serez parmi les premiers à vivre ça.
            Pourquoi le 13 mai ? C'est l'anniversaire de Jérémie.
            Il préfère offrir l'accès plutôt que recevoir des chaussettes.
          </p>
          <Button variant="hero" size="xl" onClick={() => navigate("/register")}>
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
      <section className="px-6 md:px-12 py-20" style={{ backgroundColor: "#1C1B18" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4 text-white">
            Votre quartier vous attend.
          </h2>
          <p className="text-white/60 text-lg mb-8">
            Des gardes, de l'entraide, des petits services
            contre un repas ou des légumes du jardin.
            Des endroits qu'on n'aurait jamais connus.
            Des gens qu'on n'aurait jamais croisés.
            Des histoires qu'on n'aurait jamais vécues.
            Gratuit pour commencer.
            Irremplaçable pour la suite.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-white text-foreground hover:bg-white/90 font-semibold"
              onClick={() => navigate("/register?role=owner")}
            >
              Je cherche un gardien
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 font-semibold"
              onClick={() => navigate("/register?role=guardian")}
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
                <li><Link to="/actualites" className="hover:text-primary transition-colors">Guides & Conseils</Link></li>
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
