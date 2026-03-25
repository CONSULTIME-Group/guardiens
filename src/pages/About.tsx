import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-6 md:px-12 py-5 sticky top-0 bg-background/80 backdrop-blur-md z-50 border-b border-border/50">
        <h2 className="font-heading text-2xl font-bold cursor-pointer" onClick={() => navigate("/")}>
          <span className="text-primary">g</span>uardiens
        </h2>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate("/login")}>Connexion</Button>
          <Button onClick={() => navigate("/register")}>S'inscrire</Button>
        </div>
      </header>

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-8" onClick={() => navigate(-1 as any)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">À propos de Guardiens</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p>
            Guardiens est né d'une passion simple : prendre soin des maisons et des animaux de ses voisins.
          </p>
          <p>
            Tout a commencé quand Elisa, Argentine installée à Lyon, a découvert le house-sitting par hasard. Une voisine lui a confié ses chats pour un week-end. Puis un ami ses deux chiens pour une semaine. De fil en aiguille, les propriétaires du quartier se sont passé le mot : « Demande à Elisa. »
          </p>
          <p>
            En cinq ans, c'est devenu 37 maisons gardées et 234 animaux accompagnés dans toute la région Auvergne-Rhône-Alpes. Un soir, autour d'un BBQ chez des propriétaires devenus amis, la question est tombée : « Et si d'autres personnes pouvaient vivre ça aussi ? »
          </p>
          <p className="font-heading text-xl font-semibold text-primary">
            Guardiens est né ce soir-là.
          </p>

          <h2 className="font-heading text-2xl font-bold text-foreground pt-4">Notre mission</h2>
          <p>
            Créer un réseau de confiance local où propriétaires et gardiens se rencontrent, échangent et s'entraident — comme entre voisins. Pas une marketplace anonyme, mais une communauté de proximité.
          </p>

          <h2 className="font-heading text-2xl font-bold text-foreground pt-4">Notre région</h2>
          <p>
            Nous sommes basés à Lyon et opérons dans toute la région Auvergne-Rhône-Alpes : de Megève à Montélimar, des Monts du Lyonnais au Vercors. Notre force, c'est la proximité.
          </p>
        </div>
      </main>

      <footer className="border-t border-border px-6 md:px-12 py-8 text-center text-muted-foreground text-xs">
        © 2026 Guardiens — House-sitting de proximité en Auvergne-Rhône-Alpes
      </footer>
    </div>
  );
};

export default About;
