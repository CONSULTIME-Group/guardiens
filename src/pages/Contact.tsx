import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, MapPin } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const Contact = () => {
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

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Contact</h1>

        <div className="space-y-8 text-muted-foreground">
          <p className="text-lg">
            Une question, une suggestion ou besoin d'aide ? N'hésitez pas à nous contacter.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-6">
              <Mail className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-heading font-semibold text-foreground mb-2">Email</h3>
              <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">
                contact@guardiens.fr
              </a>
            </div>
            <div className="bg-card rounded-xl p-6">
              <MapPin className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-heading font-semibold text-foreground mb-2">Localisation</h3>
              <p>Lyon, Auvergne-Rhône-Alpes</p>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6">
            <h3 className="font-heading font-semibold text-foreground mb-2">Réseaux sociaux</h3>
            <ul className="space-y-2">
              <li>Instagram : <span className="text-primary">@guardiens.fr</span></li>
              <li>LinkedIn : <span className="text-primary">Guardiens</span></li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-6 md:px-12 py-8 text-center text-muted-foreground text-xs">
        © 2026 Guardiens — House-sitting de proximité en Auvergne-Rhône-Alpes
      </footer>
    </div>
  );
};

export default Contact;
