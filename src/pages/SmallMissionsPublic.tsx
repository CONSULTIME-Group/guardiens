import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";

const SmallMissionsPublic = () => {
  return (
    <>
      <PageMeta
        title="Petites missions — Échanges sans argent entre gens du coin | Guardiens"
        description="Un coup de main contre un repas. Un jardin contre des légumes. L'entraide de proximité sans argent. Rejoignez Guardiens gratuitement."
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="font-heading text-2xl font-bold tracking-tight">
              <span className="text-primary">g</span>
              <span className="text-foreground">uardiens</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/actualites" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Articles</Link>
              <Link to="/guides" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Guides locaux</Link>
              <Link to="/tarifs" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">Tarifs</Link>
              <Link to="/login"><Button variant="outline" size="sm">Connexion</Button></Link>
              <Link to="/register"><Button size="sm">S'inscrire</Button></Link>
            </div>
          </div>
        </header>

        {/* Section 1 — Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200"
              alt="Jardin partagé"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
          </div>
          <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-32 text-center space-y-6">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Des échanges sans argent.
              <br />
              Entre gens du coin.
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Un coup de main contre un repas.
              <br />
              Un jardin contre des légumes.
              <br />
              Une compétence contre une soirée.
              <br />
              Ici personne ne facture ce qui n'a pas de prix.
            </p>
            <Button variant="hero" size="xl" asChild>
              <Link to="/register">Rejoindre Guardiens</Link>
            </Button>
          </div>
        </section>

        {/* Section 2 — Comment ça marche */}
        <section className="px-6 md:px-12 py-20">
          <div className="max-w-4xl mx-auto space-y-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center">
              Simple comme bonjour.
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  emoji: "📝",
                  title: "Publiez votre besoin",
                  text: "Décrivez la tâche, estimez la durée, proposez ce que vous donnez en échange.",
                },
                {
                  emoji: "🤝",
                  title: "Un voisin répond",
                  text: "Les membres Guardiens proches de chez vous voient votre mission et peuvent proposer leur aide.",
                },
                {
                  emoji: "⭐",
                  title: "Échangez, évaluez",
                  text: "Après la mission, un avis et un écusson. La confiance se construit comme ça.",
                },
              ].map((step) => (
                <div key={step.title} className="text-center space-y-3">
                  <div className="text-4xl">{step.emoji}</div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3 — Exemples */}
        <section className="px-6 md:px-12 py-20" style={{ backgroundColor: "hsl(40 33% 96%)" }}>
          <div className="max-w-4xl mx-auto space-y-10">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center">
              Ce que les gens s'échangent.
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { emoji: "🌱", left: "Tondre un jardin", right: "légumes du potager" },
                { emoji: "🔨", left: "Monter des meubles", right: "repas maison" },
                { emoji: "📬", left: "Réceptionner un colis", right: "cours de cuisine" },
                { emoji: "🐕", left: "Promener un chien", right: "café et croissants" },
                { emoji: "🌿", left: "Arroser les plantes", right: "bouteille de vin" },
                { emoji: "🚗", left: "Covoiturage", right: "retour service rendu" },
              ].map((ex) => (
                <div
                  key={ex.left}
                  className="bg-card rounded-xl p-5 border border-border/50 space-y-2"
                >
                  <div className="text-2xl">{ex.emoji}</div>
                  <p className="font-medium text-sm text-foreground">{ex.left}</p>
                  <p className="text-xs text-muted-foreground">→ {ex.right}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — Règle d'or */}
        <section className="px-6 md:px-12 py-16" style={{ backgroundColor: "hsl(153 42% 30%)" }}>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-white text-lg md:text-xl leading-relaxed font-medium">
              Jamais d'argent. L'échange se décide entre vous.
              <br />
              Guardiens fournit l'espace — pas la transaction.
            </p>
          </div>
        </section>

        {/* Section 5 — CTA final */}
        <section className="px-6 md:px-12 py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              Prêt à donner un coup de main ?
            </h2>
            <p className="text-muted-foreground text-lg">
              Gratuit pour les propriétaires.
              <br />
              Accessible dès 60% de profil complété.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="lg" asChild>
                <Link to="/register?role=owner">Je veux proposer une mission</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/register?role=sitter">Je veux aider</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              name: "Petites missions Guardiens",
              description: "Entraide communautaire entre voisins. Échanges sans argent autour des animaux, du jardin et de la maison.",
              areaServed: { "@type": "AdministrativeArea", name: "Auvergne-Rhône-Alpes" },
              provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
            }),
          }}
        />

        {/* Footer */}
        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-4">
            <Link to="/a-propos" className="hover:text-foreground">À propos</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
            <Link to="/cgu" className="hover:text-foreground">CGU</Link>
            <Link to="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
            <Link to="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SmallMissionsPublic;
