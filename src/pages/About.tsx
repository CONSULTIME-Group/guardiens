import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="À propos de Guardiens"
        description="Découvrez l'histoire de Guardiens, née d'une passion pour les animaux et le house-sitting de proximité en Auvergne-Rhône-Alpes."
        path="/a-propos"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-8" onClick={() => navigate(-1 as any)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">À propos de Guardiens</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p>
            Guardiens est né entre deux promenades de chiens, dans un appartement lyonnais qui sentait la croquette, avec un chat sur le canapé et un border collie sous la table.
          </p>

          <h2 className="font-heading text-2xl font-bold text-foreground pt-4">Le retour d'Argentine</h2>
          <p>
            En 2021, nous sommes rentrés d'Argentine. Le Covid n'était pas terminé, les visas étaient compliqués à obtenir — Elisa ne pouvait tout simplement <strong className="text-foreground">pas travailler</strong> en attendant notre mariage et la régularisation de sa situation.
          </p>
          <p>
            Il fallait pourtant s'occuper. Et Elisa adorait les animaux. Ça a commencé par des <strong className="text-foreground">promenades de chiens</strong> dans le quartier. Un voisin qui part au travail, un autre qui se remet d'une opération. Du bouche-à-oreille, rien de plus.
          </p>

          <blockquote className="border-l-4 border-primary bg-primary/5 rounded-r-lg py-3 px-5 not-italic text-foreground/80">
            « Au début, c'était juste rendre service. Promener le chien d'une voisine le matin. Puis elle en a parlé à une amie, qui en a parlé à sa sœur… » — Elisa
          </blockquote>

          <h2 className="font-heading text-2xl font-bold text-foreground pt-4">Des promenades au house-sitting</h2>
          <p>
            Très vite, les demandes se sont multipliées. Plus seulement des promenades, mais des <strong className="text-foreground">gardes à la maison</strong>. Puis on a commencé à recevoir des animaux chez nous. Et un jour, une propriétaire nous a proposé de garder ses animaux <strong className="text-foreground">chez elle</strong>, pendant ses vacances.
          </p>
          <p>
            C'était notre premier house-sitting. On a adoré.
          </p>
          <p>
            À partir de là, tout s'est enchaîné. D'abord dans le <strong className="text-foreground">département</strong>, puis dans toute la <strong className="text-foreground">région</strong>, puis sur <strong className="text-foreground">toute la France</strong> — chalets en montagne, maisons en bord de mer, fermes avec des poules et des chèvres, pavillons de banlieue avec des labradors trop affectueux.
          </p>

          <h2 className="font-heading text-2xl font-bold text-foreground pt-4">Aujourd'hui</h2>
          <p>
            Pour différentes raisons, on n'est plus aussi mobiles qu'avant. Mais chaque semaine, on <strong className="text-foreground">reçoit des animaux chez nous</strong>. C'est devenu un mode de vie, et surtout une communauté informelle qui fonctionne sur un seul principe : la confiance entre voisins.
          </p>

          <h2 className="font-heading text-2xl font-bold text-foreground pt-4">Pourquoi Guardiens</h2>
          <p>
            Le problème, c'est que cette communauté restait invisible. Les plateformes internationales mettent en relation des gens qui ne se connaissent pas, à des centaines de kilomètres. Guardiens est né d'une frustration simple : permettre à des voisins de se faire confiance et de s'entraider — comme Elisa le fait depuis 2021.
          </p>
          <p>
            Pas une marketplace anonyme. Un <strong className="text-foreground">réseau local de confiance</strong>, en Auvergne-Rhône-Alpes d'abord, basé à Lyon.
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
