import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const Terms = () => {
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

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Conditions Générales d'Utilisation</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p className="text-sm">Dernière mise à jour : 25 mars 2026</p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Objet</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme Guardiens, accessible à l'adresse guardiens.fr. Guardiens est une plateforme de mise en relation entre propriétaires et gardiens pour le house-sitting en région Auvergne-Rhône-Alpes.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Inscription</h2>
          <p>
            L'inscription est gratuite et ouverte à toute personne majeure. L'utilisateur s'engage à fournir des informations exactes et à jour. Chaque utilisateur est responsable de la confidentialité de ses identifiants de connexion.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Services proposés</h2>
          <p>
            Guardiens permet aux propriétaires de publier des annonces de garde de maison et d'animaux, et aux gardiens de postuler à ces annonces. La plateforme facilite la mise en relation mais n'est pas partie prenante des accords conclus entre utilisateurs.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Responsabilités</h2>
          <p>
            Guardiens agit en tant qu'intermédiaire technique. La plateforme ne peut être tenue responsable des litiges entre utilisateurs, des dommages matériels ou corporels survenus lors d'une garde, ni de la véracité des informations fournies par les utilisateurs.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Vérification d'identité</h2>
          <p>
            Guardiens propose un système de vérification d'identité optionnel. Cette vérification ne constitue pas une garantie absolue de fiabilité. Les utilisateurs sont invités à prendre toutes les précautions nécessaires avant de confier leur domicile.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Comportement des utilisateurs</h2>
          <p>
            Tout utilisateur s'engage à utiliser la plateforme de manière respectueuse et conforme à la loi. Les comportements abusifs, frauduleux ou nuisibles pourront entraîner la suspension ou la suppression du compte sans préavis.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Propriété intellectuelle</h2>
          <p>
            L'ensemble du contenu de la plateforme (textes, images, logos, design) est la propriété de Guardiens. Toute reproduction ou utilisation non autorisée est interdite.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Modification des CGU</h2>
          <p>
            Guardiens se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications par notification sur la plateforme. L'utilisation continue de la plateforme vaut acceptation des nouvelles conditions.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU, contactez-nous à{" "}
            <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>.
          </p>
        </div>
      </main>

      <footer className="border-t border-border px-6 md:px-12 py-8 text-center text-muted-foreground text-xs">
        © 2026 Guardiens — House-sitting de proximité en Auvergne-Rhône-Alpes
      </footer>
    </div>
  );
};

export default Terms;
