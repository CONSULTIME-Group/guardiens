import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Shield, Heart, Users, Star, Quote, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const steps = [
  {
    number: "01",
    title: "Créez votre profil",
    description:
      "Propriétaire : décrivez votre maison, vos animaux, vos attentes. Gardien : racontez qui vous êtes, votre expérience, vos disponibilités.",
  },
  {
    number: "02",
    title: "Trouvez votre match",
    description:
      "Notre moteur de recherche par proximité vous connecte avec des personnes de confiance près de chez vous. Pas à l'autre bout du pays — dans votre quartier.",
  },
  {
    number: "03",
    title: "Partez l'esprit léger",
    description:
      "Échangez, rencontrez-vous, et confirmez. Votre gardien veille sur votre maison et vos animaux comme un voisin le ferait.",
  },
];

const differentiators = [
  {
    icon: MapPin,
    title: "La proximité",
    description:
      "Vos gardiens sont près de chez vous. En cas d'imprévu, ils sont là en quelques minutes — pas en quelques heures d'avion.",
  },
  {
    icon: Shield,
    title: "La confiance",
    description:
      "Profils vérifiés, avis croisés, métriques de fiabilité. Vous savez exactement à qui vous confiez vos clés.",
  },
  {
    icon: Heart,
    title: "La simplicité",
    description:
      "Pas d'abonnement au lancement. Pas de commission sur les gardes classiques. On crée le réseau de confiance, le reste suit.",
  },
  {
    icon: Users,
    title: "Le réseau local",
    description:
      "Ce n'est pas une marketplace anonyme. C'est une communauté de voisins qui s'entraident — comme Elisa l'a vécu.",
  },
];

const testimonials = [
  {
    name: "Sophie",
    location: "Écully",
    text: "On a confié notre maison et nos deux chats à une gardienne Guardiens pendant 3 semaines. On a reçu des photos tous les jours et les chats avaient l'air plus heureux qu'avec nous !",
  },
  {
    name: "Thomas",
    location: "Megève",
    text: "En tant que gardien, j'ai découvert des endroits incroyables en AURA. Et les propriétaires sont devenus des amis. C'est bien plus qu'une plateforme.",
  },
  {
    name: "Claire",
    location: "Monts du Lyonnais",
    text: "Avec 3 chiens, 4 chats et un potager, trouver quelqu'un de confiance relevait du miracle. Guardiens a changé nos étés.",
  },
];

const stats = [
  { value: "37", label: "maisons gardées" },
  { value: "234", label: "animaux accompagnés" },
  { value: "5 ans", label: "en AURA" },
  { value: "100%", label: "gratuit au lancement" },
];

const Landing = () => {
  const navigate = useNavigate();
  const [latestArticles, setLatestArticles] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("articles").select("id,title,slug,excerpt,cover_image_url,category,published_at")
      .eq("published", true).order("published_at", { ascending: false }).limit(3)
      .then(({ data }) => setLatestArticles(data || []));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Guardiens",
            description:
              "House-sitting de confiance en Auvergne-Rhône-Alpes",
            url: "https://guardiens.fr",
            areaServed: {
              "@type": "AdministrativeArea",
              name: "Auvergne-Rhône-Alpes",
            },
            address: {
              "@type": "PostalAddress",
              addressLocality: "Lyon",
              addressRegion: "Auvergne-Rhône-Alpes",
              addressCountry: "FR",
            },
          }),
        }}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-5 sticky top-0 bg-background/80 backdrop-blur-md z-50 border-b border-border/50">
        <h2 className="font-heading text-2xl font-bold">
          <span className="text-primary">g</span>uardiens
        </h2>
        <div className="flex gap-3 items-center">
          <Button variant="ghost" onClick={() => navigate("/actualites")}>
            Actualités
          </Button>
          <Button variant="ghost" onClick={() => navigate("/login")}>
            Connexion
          </Button>
          <Button onClick={() => navigate("/register")}>S'inscrire</Button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-20 md:pt-32 pb-16 max-w-5xl mx-auto text-center">
        <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-in">
          Comme confier ses clés
          <br />
          <span className="text-primary">à un voisin</span>
        </h1>
        <p
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          Trouvez un gardien de confiance près de chez vous pour veiller sur
          votre maison et vos animaux pendant vos vacances.
        </p>
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <Button
            variant="hero"
            size="xl"
            onClick={() => navigate("/register")}
          >
            Je cherche un gardien
          </Button>
          <Button
            variant="heroOutline"
            size="xl"
            onClick={() => navigate("/register")}
          >
            Je veux garder
          </Button>
        </div>
        <p
          className="mt-10 text-sm text-muted-foreground animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          37 maisons gardées · 234 animaux accompagnés · 5 ans en AURA
        </p>
      </section>

      {/* L'histoire */}
      <section className="px-6 md:px-12 py-20 bg-card">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-8 text-center">
            Née d'une passion,
            <br />
            <span className="text-primary">pas d'un business plan</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed text-base md:text-lg text-center">
            Tout a commencé quand Elisa, Argentine installée à Lyon, a découvert
            le house-sitting par hasard. Une voisine lui a confié ses chats pour
            un week-end. Puis un ami ses deux chiens pour une semaine. De fil en
            aiguille, les propriétaires du quartier se sont passé le mot&nbsp;:
            «&nbsp;Demande à Elisa.&nbsp;»
          </p>
          <p className="text-muted-foreground leading-relaxed text-base md:text-lg text-center mt-4">
            En cinq ans, c'est devenu 37&nbsp;maisons gardées et
            234&nbsp;animaux accompagnés dans toute la région
            Auvergne-Rhône-Alpes. Un soir, autour d'un BBQ chez des
            propriétaires devenus amis, la question est tombée&nbsp;:
            «&nbsp;Et si d'autres personnes pouvaient vivre ça
            aussi&nbsp;?&nbsp;»
          </p>
          <p className="font-heading text-xl font-semibold text-center mt-6 text-primary">
            Guardiens est né ce soir-là.
          </p>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-16">
            Simple comme bonjour
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

      {/* Pourquoi Guardiens */}
      <section className="px-6 md:px-12 py-20 bg-card">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-14">
            Ce qui nous rend différents
          </h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {differentiators.map((item, i) => (
              <div
                key={item.title}
                className="bg-background rounded-xl p-8 animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
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

      {/* Témoignages */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-14">
            Ils nous font confiance
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className="bg-card rounded-xl p-8 relative animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <Quote className="h-8 w-8 text-primary/15 absolute top-6 right-6" />
                <div className="flex items-center gap-2 mb-4">
                  <Star className="h-4 w-4 text-secondary fill-secondary" />
                  <Star className="h-4 w-4 text-secondary fill-secondary" />
                  <Star className="h-4 w-4 text-secondary fill-secondary" />
                  <Star className="h-4 w-4 text-secondary fill-secondary" />
                  <Star className="h-4 w-4 text-secondary fill-secondary" />
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm mb-6">
                  "{t.text}"
                </p>
                <p className="font-heading font-semibold text-sm">
                  {t.name}{" "}
                  <span className="text-muted-foreground font-body font-normal">
                    — {t.location}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* C'est gratuit */}
      <section className="px-6 md:px-12 py-20 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-5">
            On vient de lancer,
            <br />
            donc c'est gratuit
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-10 leading-relaxed">
            Pas d'abonnement, pas de commission sur les gardes. On construit
            d'abord la communauté, on verra le modèle ensuite. Profitez-en pour
            être parmi les premiers.
          </p>
          <Button
            size="xl"
            className="bg-background text-foreground hover:bg-background/90 rounded-pill shadow-lg text-base font-body"
            onClick={() => navigate("/register")}
          >
            Rejoindre Guardiens
          </Button>
        </div>
      </section>

      {/* Preuve sociale — bandeau chiffres */}
      <section className="px-6 md:px-12 py-16 bg-card">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <span className="block font-heading text-3xl md:text-4xl font-bold text-primary">
                {s.value}
              </span>
              <span className="text-muted-foreground text-sm mt-1 block">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 md:px-12 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-10">
            <div>
              <h3 className="font-heading text-lg font-semibold mb-4">
                <span className="text-primary">g</span>uardiens
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                House-sitting de proximité
                <br />
                en Auvergne-Rhône-Alpes
              </p>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-sm mb-3">Liens</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-foreground cursor-pointer transition-colors" onClick={() => navigate("/a-propos")}>À propos</li>
                <li className="hover:text-foreground cursor-pointer transition-colors" onClick={() => navigate("/actualites")}>Blog</li>
                <li className="hover:text-foreground cursor-pointer transition-colors" onClick={() => navigate("/contact")}>Contact</li>
                <li className="hover:text-foreground cursor-pointer transition-colors" onClick={() => navigate("/cgu")}>CGU</li>
                <li className="hover:text-foreground cursor-pointer transition-colors" onClick={() => navigate("/confidentialite")}>Politique de confidentialité</li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-semibold text-sm mb-3">Réseaux</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-foreground cursor-pointer transition-colors">Instagram @guardiens.fr</li>
                <li className="hover:text-foreground cursor-pointer transition-colors">LinkedIn</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 text-center text-muted-foreground text-xs">
            © 2026 Guardiens — House-sitting de proximité en Auvergne-Rhône-Alpes
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
