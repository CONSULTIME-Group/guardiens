import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const Privacy = () => {
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

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Politique de confidentialité</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p className="text-sm">Dernière mise à jour : 25 mars 2026</p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Responsable du traitement</h2>
          <p>
            Guardiens, basé à Lyon (Auvergne-Rhône-Alpes, France), est responsable du traitement des données personnelles collectées via la plateforme guardiens.fr.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Données collectées</h2>
          <p>Nous collectons les données suivantes :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Données d'identification : nom, prénom, adresse email</li>
            <li>Données de profil : photo, biographie, ville, code postal</li>
            <li>Données relatives aux animaux et propriétés</li>
            <li>Messages échangés sur la plateforme</li>
            <li>Données de connexion et de navigation</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Finalités du traitement</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Créer et gérer votre compte utilisateur</li>
            <li>Permettre la mise en relation entre propriétaires et gardiens</li>
            <li>Faciliter la communication entre utilisateurs</li>
            <li>Améliorer nos services et l'expérience utilisateur</li>
            <li>Assurer la sécurité de la plateforme</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Base légale</h2>
          <p>
            Le traitement de vos données repose sur l'exécution du contrat (CGU) et votre consentement pour certaines fonctionnalités optionnelles (vérification d'identité, notifications par email).
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Durée de conservation</h2>
          <p>
            Vos données sont conservées pendant la durée de votre utilisation de la plateforme, puis supprimées dans un délai de 30 jours après la suppression de votre compte, sauf obligation légale contraire.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Partage des données</h2>
          <p>
            Vos données ne sont pas vendues à des tiers. Elles peuvent être partagées avec nos prestataires techniques (hébergement, authentification) dans le strict cadre du fonctionnement de la plateforme.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement</li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition</li>
          </ul>
          <p>
            Pour exercer vos droits, contactez-nous à{" "}
            <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Cookies</h2>
          <p>
            La plateforme utilise des cookies techniques nécessaires au fonctionnement du service. Aucun cookie publicitaire ou de suivi n'est utilisé.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Sécurité</h2>
          <p>
            Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, modification, divulgation ou destruction.
          </p>
        </div>
      </main>

      <footer className="border-t border-border px-6 md:px-12 py-8 text-center text-muted-foreground text-xs">
        © 2026 Guardiens — House-sitting de proximité en Auvergne-Rhône-Alpes
      </footer>
    </div>
  );
};

export default Privacy;
