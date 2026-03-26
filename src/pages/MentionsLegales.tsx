import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const MentionsLegales = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Mentions légales — Guardiens"
        description="Mentions légales de la plateforme Guardiens : éditeur, hébergeur, propriété intellectuelle."
        path="/mentions-legales"
      />
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

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Mentions légales</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p className="text-sm">Dernière mise à jour : 26 mars 2026</p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Éditeur du site</h2>
          <p>
            Le site guardiens.fr est édité par :<br />
            <strong className="text-foreground">Guardiens</strong><br />
            Forme juridique : [À compléter — SAS / SARL / auto-entrepreneur]<br />
            Siège social : [Adresse complète à compléter], Lyon, France<br />
            SIRET : [À compléter]<br />
            RCS : [À compléter]<br />
            Capital social : [À compléter]<br />
            Directeur de la publication : Jérémie [Nom de famille à compléter]<br />
            Contact : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Hébergeur</h2>
          <p>
            Le site est hébergé par :<br />
            <strong className="text-foreground">Supabase Inc.</strong><br />
            970 Toa Payoh North, #07-04, Singapore 318992<br />
            Site web : <a href="https://supabase.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">supabase.com</a>
          </p>
          <p>
            L'interface est servie par :<br />
            <strong className="text-foreground">Lovable GmbH</strong><br />
            Berlin, Allemagne<br />
            Site web : <a href="https://lovable.dev" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">lovable.dev</a>
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments composant le site (textes, graphismes, logos, icônes, images, extraits sonores, logiciels, mise en page) sont la propriété exclusive de Guardiens ou de ses partenaires. Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site est interdite sans autorisation écrite préalable.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Données personnelles</h2>
          <p>
            Conformément à la loi n° 78-17 du 6 janvier 1978 modifiée (« Informatique et Libertés ») et au Règlement Général sur la Protection des Données (RGPD – UE 2016/679), vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Pour exercer ces droits, contactez-nous à{" "}
            <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a>.
          </p>
          <p>
            Pour en savoir plus, consultez notre{" "}
            <a href="/confidentialite" className="text-primary hover:underline">politique de confidentialité</a>.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Cookies</h2>
          <p>
            Le site utilise exclusivement des cookies techniques nécessaires au fonctionnement du service (authentification, préférences d'affichage). Aucun cookie publicitaire, analytique ou de suivi tiers n'est déposé. Conformément à la recommandation CNIL du 17 septembre 2020, ces cookies strictement nécessaires ne requièrent pas de consentement.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Limitation de responsabilité</h2>
          <p>
            Guardiens s'efforce de fournir sur le site des informations aussi précises que possible. Toutefois, Guardiens ne pourra être tenu responsable des omissions, inexactitudes ou carences dans la mise à jour, qu'elles soient de son fait ou du fait de tiers partenaires qui lui fournissent ces informations.
          </p>
          <p>
            Guardiens est une plateforme de mise en relation. Elle n'est pas partie aux accords conclus entre utilisateurs et ne saurait être tenue responsable des litiges, dommages matériels ou corporels survenant dans le cadre d'une garde.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Comparatifs tarifaires</h2>
          <p>
            Les comparaisons de prix et de fonctionnalités présentées sur ce site sont réalisées de bonne foi, sur la base de données publiquement accessibles sur les sites des concurrents aux dates indiquées. Elles sont fournies à titre informatif et ne constituent ni un dénigrement, ni une publicité comparative au sens de l'article L. 122-1 du Code de la consommation. Les tarifs des tiers peuvent évoluer. Guardiens s'engage à mettre à jour ces informations régulièrement.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Droit applicable et médiation</h2>
          <p>
            Les présentes mentions sont régies par le droit français. En cas de litige, les tribunaux de Lyon sont compétents. Conformément aux articles L. 611-1 et R. 612-1 du Code de la consommation, en cas de litige non résolu, le consommateur peut recourir gratuitement à un médiateur de la consommation. Médiateur compétent : [À compléter avec le nom du médiateur].
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Crédits</h2>
          <p>
            Conception et développement : Guardiens.<br />
            Certaines images utilisées sur le site sont générées par intelligence artificielle ou issues de banques d'images libres de droits.
          </p>
        </div>
      </main>

      <footer className="border-t border-border px-6 md:px-12 py-8 text-center text-muted-foreground text-xs">
        © 2026 Guardiens — House-sitting de proximité en Auvergne-Rhône-Alpes
      </footer>
    </div>
  );
};

export default MentionsLegales;
