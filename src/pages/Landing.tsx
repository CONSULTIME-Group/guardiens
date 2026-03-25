import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Heart, MapPin } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Confiance & proximité",
    description: "Des gardiens vérifiés, près de chez vous, pour une tranquillité totale.",
  },
  {
    icon: Heart,
    title: "Vos animaux chouchoutés",
    description: "Des passionnés qui prennent soin de vos compagnons comme des leurs.",
  },
  {
    icon: MapPin,
    title: "Auvergne-Rhône-Alpes",
    description: "Une communauté locale de confiance dans toute la région.",
  },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-5">
        <h1 className="font-heading text-2xl font-bold">
          <span className="text-primary">g</span>uardiens
        </h1>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate("/login")}>
            Connexion
          </Button>
          <Button onClick={() => navigate("/register")}>
            S'inscrire
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-16 md:pt-24 pb-20 max-w-5xl mx-auto text-center">
        <h2 className="font-heading text-4xl md:text-6xl font-bold leading-tight mb-6 animate-fade-in">
          Comme confier ses clés
          <br />
          <span className="text-primary">à un voisin</span>
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Trouvez un gardien de confiance près de chez vous pour veiller sur votre maison et vos animaux pendant vos vacances.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <Button variant="hero" size="xl" onClick={() => navigate("/register")}>
            Trouver un gardien
          </Button>
          <Button variant="heroOutline" size="xl" onClick={() => navigate("/register")}>
            Devenir gardien
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-20 bg-card">
        <div className="max-w-5xl mx-auto">
          <h3 className="font-heading text-3xl font-bold text-center mb-14">
            Comment ça marche
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="bg-background rounded-lg p-8 text-center animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-5">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h4 className="font-heading text-xl font-semibold mb-3">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="font-heading text-3xl font-bold mb-5">
            Rejoignez la communauté Guardiens
          </h3>
          <p className="text-muted-foreground text-lg mb-8">
            Des centaines de propriétaires et gardiens en Auvergne-Rhône-Alpes nous font déjà confiance.
          </p>
          <Button variant="hero" size="xl" onClick={() => navigate("/register")}>
            Créer mon compte gratuitement
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 md:px-12 py-8 text-center text-muted-foreground text-sm">
        © 2026 Guardiens — House-sitting de proximité en Auvergne-Rhône-Alpes
      </footer>
    </div>
  );
};

export default Landing;
