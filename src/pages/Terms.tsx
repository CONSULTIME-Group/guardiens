import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Conditions Générales d'Utilisation — Guardiens"
        description="Consultez les conditions générales d'utilisation de la plateforme Guardiens."
        path="/cgu"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Conditions Générales d'Utilisation</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p className="text-sm">Dernière mise à jour : 26 mars 2026</p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Objet</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la plateforme Guardiens, accessible à l'adresse guardiens.fr (ci-après « la Plateforme »). Guardiens est une plateforme de mise en relation entre propriétaires d'animaux et de logements et gardiens bénévoles pour le house-sitting.
          </p>
          <p>
            L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Définitions</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Propriétaire</strong> : utilisateur publiant des annonces de garde de maison et/ou d'animaux.</li>
            <li><strong className="text-foreground">Gardien</strong> : utilisateur postulant pour effectuer une garde.</li>
            <li><strong className="text-foreground">Garde</strong> : période durant laquelle un gardien occupe le logement d'un propriétaire et prend soin de ses animaux.</li>
            <li><strong className="text-foreground">Petite mission</strong> : entraide ponctuelle entre membres, sans échange d'argent.</li>
            
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Inscription et compte</h2>
          <p>
            L'inscription est ouverte à toute personne physique majeure (18 ans révolus). L'utilisateur s'engage à fournir des informations exactes, complètes et à jour. Chaque utilisateur est responsable de la confidentialité de ses identifiants de connexion et de toute activité réalisée sous son compte.
          </p>
          <p>
            Guardiens se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU, de comportement frauduleux ou de signalements répétés.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Services proposés et tarification</h2>
          <p>La Plateforme propose les services suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Publication et consultation d'annonces de garde</li>
            <li>Système de candidatures et de messagerie</li>
            <li>Avis croisés entre propriétaires et gardiens</li>
            <li>Guides locaux et fiches races</li>
            <li>Petites missions d'entraide communautaire</li>
            <li>Vérification d'identité optionnelle</li>
          </ul>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">Tarifs</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Propriétaires</strong> : accès gratuit (en 2026).</li>
            <li><strong className="text-foreground">Gardiens</strong> : abonnement annuel de 49€ TTC. Les utilisateurs inscrits avant le 13 mai 2026 bénéficient d'un an d'accès gratuit.</li>
            
          </ul>
          <p>
            Aucune commission n'est prélevée sur les gardes.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Nature de la relation</h2>
          <p>
            Guardiens agit exclusivement en tant qu'intermédiaire technique de mise en relation. La Plateforme n'est pas partie aux accords conclus entre utilisateurs. Le house-sitting tel que proposé sur Guardiens repose sur un échange de bons procédés (garde d'animaux contre hébergement gratuit) et ne constitue pas une relation de travail.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Responsabilités et limitations</h2>
          <p>
            Guardiens ne peut être tenu responsable :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Des litiges survenant entre utilisateurs</li>
            <li>Des dommages matériels, corporels ou immatériels survenus lors d'une garde</li>
            <li>De la véracité des informations fournies par les utilisateurs</li>
            <li>De l'indisponibilité temporaire de la Plateforme</li>
            <li>Du contenu échangé entre utilisateurs dans la messagerie</li>
          </ul>
          <p>
            Les utilisateurs sont invités à souscrire une assurance responsabilité civile et à vérifier que leur assurance habitation couvre la présence d'un tiers occupant le logement.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Petites missions</h2>
          <p>
            Les petites missions sont des échanges d'entraide ponctuels entre membres. Elles fonctionnent exclusivement sur le principe de l'échange en nature (repas, produits du jardin, service réciproque). Tout échange d'argent est strictement interdit. Les utilisateurs contrevenant à cette règle s'exposent à la suspension de leur compte.
          </p>
          <p>
            Guardiens n'est pas responsable de la qualité, de l'exécution ou des conséquences des petites missions réalisées entre membres.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Vérification d'identité</h2>
          <p>
            Guardiens propose un système optionnel de vérification d'identité par document officiel. Cette vérification atteste qu'un utilisateur a soumis un document d'identité jugé conforme. Elle ne constitue en aucun cas une garantie absolue de fiabilité, d'honnêteté ou de compétence de l'utilisateur.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Propriété intellectuelle</h2>
          <p>
            L'ensemble du contenu de la Plateforme (textes, images, logos, design, bases de données, logiciels) est la propriété exclusive de Guardiens, sauf mention contraire. Toute reproduction, représentation ou exploitation non autorisée est passible de poursuites.
          </p>
          <p>
            Les utilisateurs conservent la propriété intellectuelle de leurs contenus (photos, textes) mais accordent à Guardiens une licence non exclusive, gratuite et mondiale d'utilisation de ces contenus dans le cadre du fonctionnement de la Plateforme.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">10. Comportement des utilisateurs</h2>
          <p>Tout utilisateur s'engage à :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Utiliser la Plateforme de manière respectueuse et conforme à la loi</li>
            <li>Ne pas publier de contenu diffamatoire, discriminatoire, illicite ou trompeur</li>
            <li>Ne pas utiliser la Plateforme à des fins commerciales non autorisées</li>
            <li>Ne pas tenter de contourner les systèmes de sécurité</li>
            <li>Signaler tout comportement abusif via le système de signalement</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">11. Droit de rétractation</h2>
          <p>
            Conformément à l'article L. 221-18 du Code de la consommation, l'utilisateur dispose d'un délai de 14 jours à compter de la souscription de son abonnement pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités. La demande doit être adressée à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>.
          </p>
          <p>
            Si l'utilisateur a commencé à utiliser le service pendant le délai de rétractation, il reconnaît que le droit de rétractation est perdu conformément à l'article L. 221-28 du Code de la consommation, sur demande expresse de sa part.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">12. Résiliation</h2>
          <p>
            L'utilisateur peut résilier son compte à tout moment depuis les paramètres de son profil. La suppression du compte entraîne la perte de l'accès aux services, des avis publiés (anonymisés) et des données de profil, conformément à notre politique de confidentialité.
          </p>
          <p>
            En cas de résiliation d'un abonnement en cours, aucun remboursement prorata temporis n'est effectué, sauf exercice du droit de rétractation dans le délai légal.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">13. Modification des CGU</h2>
          <p>
            Guardiens se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés par notification sur la Plateforme et par email au moins 30 jours avant l'entrée en vigueur des modifications substantielles. L'utilisation continue de la Plateforme après cette date vaut acceptation des nouvelles conditions.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">14. Droit applicable et médiation</h2>
          <p>
            Les présentes CGU sont régies par le droit français. En cas de litige relatif à l'interprétation ou l'exécution des présentes, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire.
          </p>
          <p>
            Conformément aux articles L. 611-1 et R. 612-1 du Code de la consommation, en cas de litige non résolu, le consommateur peut recourir gratuitement à un médiateur de la consommation. Le médiateur compétent sera communiqué dès sa désignation. Plus d'informations sur <a href="https://www.economie.gouv.fr/mediation-conso" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">economie.gouv.fr/mediation-conso</a>.
          </p>
          <p>
            La plateforme européenne de Règlement en Ligne des Litiges (RLL) est accessible à l'adresse : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
          </p>
          <p>
            À défaut de résolution amiable, les tribunaux de Lyon (France) sont compétents.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">15. Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU :<br />
            Email : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a><br />
            Adresse : 22 rue Juiverie, 69005 Lyon, France
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Terms;
