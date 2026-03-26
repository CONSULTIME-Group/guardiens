import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Home, PawPrint, Clock, Handshake, Sparkles, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroDogBbq from "@/assets/hero-dog-bbq.jpg";

const differentiators = [
  {
    icon: PawPrint,
    title: "Vos animaux restent chez eux",
    description:
      "Votre chien dort dans son panier, votre chat garde son canapé préféré. Ils restent dans leur univers, entourés de leurs habitudes et de quelqu'un qui les aime.",
  },
  {
    icon: Home,
    title: "Votre maison vit",
    description:
      "Volets ouverts, jardin arrosé, une bonne odeur de café le matin. Votre maison n'est pas vide — elle est habitée par quelqu'un qui en prend soin.",
  },
  {
    icon: Clock,
    title: "Vos voisins, en mieux",
    description:
      "Vos gardiens habitent à côté. On se croise au marché, on connaît le boulanger, on sait où promener le chien quand il pleut.",
  },
  {
    icon: Handshake,
    title: "On se connaît avant de se confier",
    description:
      "Un dîner, un café, une balade ensemble. On se rencontre, on rigole, et après seulement on se confie les clés. C'est comme ça que la confiance naît.",
  },
  {
    icon: Sparkles,
    title: "Ça va au-delà de la garde",
    description:
      "Des barbecues improvisés, des sentiers secrets, des apéros qui s'éternisent. On est venus garder un chien, on est repartis avec des amis.",
  },
  {
    icon: Wrench,
    title: "Construit par des gardiens",
    description:
      "On a dormi dans 37 maisons, promené 234 animaux, et découvert des coins qu'on n'aurait jamais trouvés seuls. Guardiens, c'est notre histoire — et bientôt la vôtre.",
  },
];

const testimonials = [
  {
    name: "Sophie & Marc",
    detail: "2 chats · Écully",
    text: "On est partis 10 jours au Maroc et nos deux chats sont restés sur leur canapé préféré, avec quelqu'un qui leur faisait des câlins tous les jours. On a reçu des photos tous les soirs — ils avaient l'air plus détendus que nous !",
  },
  {
    name: "Thomas",
    detail: "Gardien · Lyon 7e",
    text: "Un chalet à Megève, un golden retriever qui m'attendait chaque matin devant la cheminée, des balades dans la neige et des voisins adorables. La plus belle semaine de mon hiver — et le début d'une vraie amitié avec les proprios.",
  },
  {
    name: "Claire & Antoine",
    detail: "3 chevaux · Monts du Lyonnais",
    text: "Notre gardienne connaît nos trois chevaux par leur prénom. Elle arrive la veille, on dîne ensemble, on lui montre les petites habitudes, et le lendemain on part le sourire aux lèvres. On a enfin retrouvé le plaisir de voyager.",
  },
];

const steps = [
  {
    number: "01",
    title: "Inscrivez-vous",
    description:
      "Créez votre profil en 5 minutes. Propriétaire : décrivez votre maison et vos animaux. Gardien : racontez votre expérience et vos envies.",
  },
  {
    number: "02",
    title: "Trouvez votre match",
    description:
      "Parcourez les annonces de garde près de chez vous, ou rendez-vous disponible et laissez les propriétaires venir à vous.",
  },
  {
    number: "03",
    title: "Rencontrez-vous",
    description:
      "Un café, un dîner, une balade ensemble. La confiance ne se crée pas en ligne — elle se vit. Puis partez l'esprit léger.",
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const [latestArticles, setLatestArticles] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [emailBottom, setEmailBottom] = useState("");

  useEffect(() => {
    supabase
      .from("articles")
      .select("id,title,slug,excerpt,cover_image_url,category,published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setLatestArticles(data || []));
  }, []);

  const handleEmailSignup = (emailValue: string) => {
    if (!emailValue.trim()) {
      toast.error("Veuillez entrer votre email.");
      return;
    }
    navigate(`/register?email=${encodeURIComponent(emailValue)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Guardiens",
            url: "https://guardiens.fr",
            description:
              "House-sitting de confiance en Auvergne-Rhône-Alpes. Trouvez un gardien de maison et d'animaux près de chez vous.",
            areaServed: {
              "@type": "AdministrativeArea",
              name: "Auvergne-Rhône-Alpes",
            },
            founder: [
              { "@type": "Person", name: "Jérémie" },
              { "@type": "Person", name: "Elisa" },
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
            Actualités
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
            <span className="italic text-primary-foreground/90">à un voisin.</span>
          </h1>
          <p className="text-base md:text-xl text-white/90 max-w-2xl mx-auto mb-6 md:mb-8 drop-shadow animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Vos animaux restent chez eux, votre maison vit, et vous partez
            l'esprit léger. Des gardiens de confiance, près de chez vous.
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
        <div
          className="flex items-center justify-center gap-0 mt-12 animate-fade-in"
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
        </div>
      </section>

      {/* ═══════════════ 2. L'HISTOIRE ═══════════════ */}
      <section className="px-6 md:px-12 py-20 bg-card">
        <div className="max-w-3xl mx-auto">
          <span className="block text-center text-xs font-semibold tracking-[0.2em] uppercase text-secondary mb-4">
            Notre histoire
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-10 text-center">
            Ça a commencé avec{" "}
            <span className="text-primary italic">un chien à promener.</span>
          </h2>

          <div className="space-y-6 text-muted-foreground leading-relaxed text-base md:text-lg">
            <p>
              Quand Elisa est arrivée d'Argentine, elle avait une certitude :
              elle voulait passer ses journées avec des animaux. Alors elle a
              commencé par promener des chiens dans le quartier. Puis elle a
              nourri des chats, brossé des chevaux, donné le biberon à des
              agneaux. Chaque jour, un nouveau compagnon, une nouvelle histoire.
            </p>
            <p>
              Et puis un jour, un propriétaire lui a dit quelque chose de tout
              simple : « Et si tu restais chez nous pendant qu'on part ? » Les
              animaux garderaient leurs habitudes, la maison serait vivante, et
              tout le monde partirait le cœur léger. C'était une évidence.
            </p>

            {/* Citation encadrée */}
            <blockquote className="border-l-4 border-primary pl-6 py-3 my-8 bg-primary/5 rounded-r-lg">
              <p className="font-heading text-lg font-semibold text-foreground italic">
                « Et si tu restais chez nous ? » — C'est cette phrase toute
                simple qui a tout déclenché.
              </p>
            </blockquote>

            <p>
              Très vite, un petit réseau s'est tissé. Des voisins, des amis
              d'amis, des gens du coin qui se recommandent entre eux. On connaît
              les animaux par leur prénom, on sait que le chat de Sophie aime
              dormir sur le radiateur et que le golden de Marc rapporte toujours
              la même balle.
            </p>
            <p>
              Et puis il y a eu tout le reste — le meilleur, en fait. Les
              dîners improvisés chez les proprios, les balades sur des sentiers
              qu'on n'aurait jamais trouvés seuls, les barbecues qui finissent
              tard, les fous rires avec le chien qui vole les chaussettes.
              On pourrait écrire un livre sur la ressemblance entre les
              propriétaires et leurs animaux — c'est fascinant (et souvent
              hilarant).
            </p>
            <p>
              Un soir d'été, chez Helen — trois chats, un cocker, une vue
              incroyable sur les monts — on s'est regardés et on a dit : « Il
              faut que d'autres gens puissent vivre ça. » Un réseau de voisins
              qui se font confiance, qui s'entraident, qui partagent bien plus
              que des clés. Guardiens est né ce soir-là, autour d'un verre de
              rouge et d'un cocker endormi sur nos pieds.
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
            La proximité change tout.
          </h2>
          <p className="text-muted-foreground text-lg text-center mb-14">
            Ce qu'on a vécu en vrai, on veut le rendre possible pour tous.
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

      {/* ═══════════════ 5. TÉMOIGNAGES ═══════════════ */}
      <section className="px-6 md:px-12 py-20 bg-card">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-14">
            Des histoires comme les nôtres.
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
            Aussi simple que ça.
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
            Pas de piège, pas de petites lignes. On construit la communauté
            d'abord, on verra le reste ensemble. Profitez-en — les premiers
            inscrits auront toujours une place spéciale.
          </p>
        </div>
      </section>

      {/* ═══════════════ DERNIERS ARTICLES ═══════════════ */}
      {latestArticles.length > 0 && (
        <section className="px-6 md:px-12 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <h2 className="font-heading text-3xl md:text-4xl font-bold">
                Derniers articles
              </h2>
              <Button
                variant="ghost"
                onClick={() => navigate("/actualites")}
                className="text-primary"
              >
                Voir tous les articles <ArrowRight className="h-4 w-4 ml-1" />
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
            On construit Guardiens avec vous.
          </h2>
          <p className="text-white/60 text-lg mb-8">
            Rejoignez la liste d'attente. Vous serez les premiers à tester — et
            à façonner ce que Guardiens deviendra.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              handleEmailSignup(emailBottom);
            }}
          >
            <Input
              type="email"
              placeholder="votre@email.com"
              value={emailBottom}
              onChange={(e) => setEmailBottom(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
            <Button type="submit" className="whitespace-nowrap">
              S'inscrire
            </Button>
          </form>
          <p className="mt-4 text-xs text-white/40">
            Gratuit · Pas de spam · On vous contacte quand c'est prêt.
          </p>
        </div>
      </section>

      {/* ═══════════════ 9. FOOTER ═══════════════ */}
      <footer className="border-t border-border px-6 md:px-12 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
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
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
