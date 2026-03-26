import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PageMeta from "@/components/PageMeta";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Politique de confidentialité — Guardiens"
        description="Découvrez comment Guardiens protège vos données personnelles et respecte votre vie privée conformément au RGPD."
        path="/confidentialite"
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

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Politique de confidentialité</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p className="text-sm">Dernière mise à jour : 26 mars 2026</p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles est :<br />
            <strong className="text-foreground">Guardiens — Jérémie Martinot (EI)</strong><br />
            22 rue Juiverie, 69005 Lyon, France<br />
            SIRET : 894 864 040 00015<br />
            Contact : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Délégué à la protection des données (DPO)</h2>
          <p>
            Pour toute question relative à la protection de vos données personnelles, vous pouvez contacter notre DPO à l'adresse :{" "}
            <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a>.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Données collectées</h2>
          <p>Nous collectons les catégories de données suivantes :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Données d'identification</strong> : nom, prénom, adresse email, mot de passe (haché)</li>
            <li><strong className="text-foreground">Données de profil</strong> : photo, biographie, ville, code postal, rôle (propriétaire/gardien)</li>
            <li><strong className="text-foreground">Données relatives aux animaux et propriétés</strong> : espèce, race, âge, type de logement, équipements</li>
            <li><strong className="text-foreground">Données de communication</strong> : messages échangés sur la plateforme</li>
            <li><strong className="text-foreground">Données de vérification</strong> : document d'identité (en cas de vérification optionnelle)</li>
            <li><strong className="text-foreground">Données techniques</strong> : adresse IP, type de navigateur, données de connexion</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Finalités et bases légales</h2>
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left text-foreground">Finalité</th>
                <th className="p-2 text-left text-foreground">Base légale</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border"><td className="p-2">Création et gestion de compte</td><td className="p-2">Exécution du contrat (CGU)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Mise en relation propriétaires/gardiens</td><td className="p-2">Exécution du contrat</td></tr>
              <tr className="border-t border-border"><td className="p-2">Messagerie</td><td className="p-2">Exécution du contrat</td></tr>
              <tr className="border-t border-border"><td className="p-2">Vérification d'identité</td><td className="p-2">Consentement</td></tr>
              <tr className="border-t border-border"><td className="p-2">Notifications par email</td><td className="p-2">Intérêt légitime / Consentement</td></tr>
              <tr className="border-t border-border"><td className="p-2">Amélioration du service</td><td className="p-2">Intérêt légitime</td></tr>
              <tr className="border-t border-border"><td className="p-2">Sécurité et prévention de la fraude</td><td className="p-2">Intérêt légitime</td></tr>
            </tbody>
          </table>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Durée de conservation</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Données de compte</strong> : conservées pendant la durée de l'inscription, puis supprimées dans les 30 jours suivant la demande de suppression.</li>
            <li><strong className="text-foreground">Documents d'identité</strong> : supprimés après vérification (délai maximum de 30 jours après validation).</li>
            <li><strong className="text-foreground">Messages</strong> : conservés pendant la durée du compte.</li>
            <li><strong className="text-foreground">Données de connexion</strong> : conservées 12 mois conformément à la réglementation.</li>
            <li><strong className="text-foreground">Données de facturation</strong> : conservées 10 ans conformément aux obligations comptables.</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Sous-traitants et destinataires</h2>
          <p>Vos données peuvent être transmises aux sous-traitants suivants, dans le strict cadre du fonctionnement de la Plateforme :</p>
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left text-foreground">Sous-traitant</th>
                <th className="p-2 text-left text-foreground">Service</th>
                <th className="p-2 text-left text-foreground">Localisation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border"><td className="p-2">Supabase Inc.</td><td className="p-2">Hébergement, base de données, authentification</td><td className="p-2">UE (Francfort) / US</td></tr>
              <tr className="border-t border-border"><td className="p-2">Lovable GmbH</td><td className="p-2">Interface et déploiement</td><td className="p-2">Allemagne (UE)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Resend Inc.</td><td className="p-2">Envoi d'emails transactionnels</td><td className="p-2">US</td></tr>
            </tbody>
          </table>
          <p>
            Vos données ne sont jamais vendues à des tiers.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Transferts hors UE</h2>
          <p>
            Certains de nos sous-traitants sont situés aux États-Unis. Ces transferts sont encadrés par le EU-US Data Privacy Framework ou, à défaut, par des clauses contractuelles types approuvées par la Commission européenne (décision d'exécution 2021/914), garantissant un niveau de protection adéquat de vos données.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Vos droits</h2>
          <p>Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Droit d'accès</strong> (art. 15) : obtenir la confirmation du traitement et une copie de vos données.</li>
            <li><strong className="text-foreground">Droit de rectification</strong> (art. 16) : corriger des données inexactes ou incomplètes.</li>
            <li><strong className="text-foreground">Droit à l'effacement</strong> (art. 17) : demander la suppression de vos données.</li>
            <li><strong className="text-foreground">Droit à la limitation du traitement</strong> (art. 18) : restreindre le traitement dans certains cas.</li>
            <li><strong className="text-foreground">Droit à la portabilité</strong> (art. 20) : recevoir vos données dans un format structuré.</li>
            <li><strong className="text-foreground">Droit d'opposition</strong> (art. 21) : vous opposer au traitement basé sur l'intérêt légitime.</li>
            <li><strong className="text-foreground">Droit de retirer votre consentement</strong> à tout moment, sans affecter la licéité du traitement antérieur.</li>
          </ul>
          <p>
            Pour exercer vos droits, contactez-nous à{" "}
            <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a>.
            Nous répondons dans un délai maximum de 30 jours.
          </p>
          <p>
            Vous pouvez également exporter vos données directement depuis les paramètres de votre compte.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Cookies</h2>
          <p>
            La Plateforme utilise exclusivement des <strong className="text-foreground">cookies strictement nécessaires</strong> au fonctionnement du service :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cookie d'authentification (session utilisateur)</li>
            <li>Cookie de préférences d'affichage (thème clair/sombre, état du menu)</li>
          </ul>
          <p>
            Aucun cookie publicitaire, analytique ou de suivi tiers n'est utilisé. Conformément à la recommandation CNIL du 17 septembre 2020 et aux lignes directrices du CEPD, ces cookies strictement nécessaires ne requièrent pas de recueil de consentement.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">10. Sécurité</h2>
          <p>
            Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Chiffrement des communications (HTTPS/TLS)</li>
            <li>Mots de passe hachés (bcrypt)</li>
            <li>Politiques de sécurité au niveau des lignes (Row Level Security)</li>
            <li>Accès restreint aux données de production</li>
            <li>Journalisation des accès</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">11. Réclamation auprès de la CNIL</h2>
          <p>
            Si vous estimez que le traitement de vos données constitue une violation du RGPD, vous avez le droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :<br />
            <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr/fr/plaintes</a><br />
            CNIL — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">12. Contact</h2>
          <p>
            Pour toute question relative à la protection de vos données :<br />
            DPO : <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a><br />
            Contact général : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>
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
