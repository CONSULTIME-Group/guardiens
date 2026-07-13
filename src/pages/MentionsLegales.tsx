import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const MentionsLegales = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Mentions légales, Éditeur et hébergeur | Guardiens"
        description="Mentions légales de la plateforme Guardiens : éditeur, hébergement européen, propriété intellectuelle, cookies, responsabilité et médiation."
        path="/mentions-legales"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-8 md:py-16 max-w-3xl mx-auto">

        <h1 className="font-heading text-2xl md:text-4xl font-bold mb-5 md:mb-8">Mentions légales</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p className="text-sm">Dernière mise à jour : 13 juillet 2026</p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Éditeur du site</h2>
          <p>Le site guardiens.fr est édité par :</p>
          <p>
            <strong className="text-foreground">Jérémie Martinot</strong>, entrepreneur individuel<br />
            Siège d'activité : 22 rue Juiverie, 69005 Lyon, France<br />
            SIRET : 894 864 040 00015<br />
            TVA non applicable, article 293 B du Code général des impôts<br />
            Directeur de la publication : Jérémie Martinot<br />
            Contact : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Hébergement et infrastructure européenne</h2>
          <p>
            Les données personnelles des utilisateurs sont hébergées au sein de l'Union européenne.
          </p>
          <p>
            <strong className="text-foreground">Base de données, authentification et stockage des fichiers</strong> :<br />
            Fournisseur : Supabase Inc.<br />
            Localisation des données : Francfort, Allemagne (région eu-central-1)
          </p>
          <p>
            <strong className="text-foreground">Réseau CDN, DNS et sécurité</strong> :<br />
            Fournisseur contractant : Cloudflare Ireland Limited<br />
            Siège : 25/28 North Wall Quay, Dublin 1, D01 H104, Irlande
          </p>
          <p>
            <strong className="text-foreground">Interface applicative et outillage de développement</strong> :<br />
            Fournisseur : Lovable Labs, société d'origine suédoise dotée d'un représentant établi dans l'Union européenne<br />
            Représentant UE : Lovable Labs AB, Regeringsgatan 25, 111 53 Stockholm, Suède<br />
            Encadrement des transferts internationaux : Clauses contractuelles types (SCC) Module 2 approuvées par la Commission européenne (décision d'exécution UE 2021/914)
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments composant le site (textes, graphismes, logos, icônes, images, extraits sonores, logiciels, mise en page) sont la propriété exclusive de Guardiens ou de ses partenaires. Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site est interdite sans autorisation écrite préalable.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Données personnelles</h2>
          <p>
            Conformément à la loi n° 78-17 du 6 janvier 1978 modifiée (Informatique et Libertés) et au Règlement Général sur la Protection des Données (RGPD, UE 2016/679), vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition, de limitation et de portabilité de vos données. Pour exercer ces droits, écrivez à <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a> en précisant la mention "Données personnelles" dans l'objet du message.
          </p>
          <p>
            Pour en savoir plus, consultez la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a> et les <a href="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</a>.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Cookies</h2>
          <p>
            Le site utilise des cookies strictement nécessaires à son fonctionnement (authentification, session, sécurité, préférences d'affichage), exemptés de consentement conformément aux lignes directrices de la CNIL du 17 septembre 2020. Les cookies de mesure d'audience sont déposés uniquement après recueil du consentement explicite via la bannière affichée à la première visite. Aucun cookie publicitaire ni cookie de profilage commercial n'est utilisé. Le détail des traceurs figure sur la page Politique cookies.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Statut d'intermédiaire technique et exclusion de responsabilité</h2>
          <p>
            Guardiens agit exclusivement en qualité d'intermédiaire technique de mise en relation entre utilisateurs, au sens de l'article 6-I-2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN). À ce titre, Guardiens :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>N'est ni partie, ni mandataire, ni garant des accords conclus entre utilisateurs</li>
            <li>N'exerce aucun contrôle sur la véracité, la fiabilité ou la légalité des contenus, profils, annonces et communications publiés par les utilisateurs</li>
            <li>N'exerce aucune surveillance des gardes, missions, échanges ou activités convenus entre utilisateurs</li>
            <li>Ne saurait être tenu responsable des litiges, dommages matériels, immatériels ou corporels survenant à l'occasion ou dans le cadre d'une garde, d'une mission ou d'une rencontre entre utilisateurs</li>
            <li>Ne saurait être tenu responsable de la véracité des informations fournies par les utilisateurs, ni des comportements des utilisateurs entre eux ou envers les tiers</li>
            <li>Ne saurait être tenu responsable des difficultés d'accès ou d'indisponibilité temporaire du service</li>
          </ul>
          <p>
            Les utilisateurs reconnaissent que la confiance mutuelle repose sur la rencontre physique préalable à toute garde, les avis croisés publiés après chaque expérience, et l'historique visible sur chaque profil. Les utilisateurs sont seuls responsables de vérifier la couverture de leur assurance responsabilité civile et de leur assurance multirisque habitation avant toute garde ou mission.
          </p>
          <p>
            Le régime détaillé de responsabilité, incluant les cas d'exclusion, les garanties expressément réservées par la loi et le plafond d'indemnisation, figure à l'article 13 des <a href="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</a>.
          </p>

          <h2 id="mediation" className="font-heading text-xl font-bold text-foreground pt-4">7. Droit applicable, réclamations et médiation</h2>
          <p>
            Les présentes mentions sont régies par le droit français. En cas de litige, et après échec d'une résolution amiable, les tribunaux français territorialement compétents au sens des articles 42 et suivants du Code de procédure civile pourront être saisis. Le consommateur conserve la faculté de saisir, à son choix, la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable (article R. 631-3 du Code de la consommation).
          </p>
          <p>
            <strong className="text-foreground">Réclamation préalable</strong> : toute réclamation doit être adressée en premier lieu à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. Guardiens s'engage à répondre dans un délai maximal de deux mois.
          </p>
          <p>
            <strong className="text-foreground">Médiation de la consommation</strong> : le service Guardiens est, à la date des présentes, fourni à titre entièrement gratuit à ses utilisateurs. Aucune somme n'est perçue auprès des consommateurs. Le dispositif de médiation de la consommation prévu aux articles L. 611-1 et suivants du Code de la consommation s'applique aux litiges nés de l'exécution d'un contrat de vente ou de fourniture de services à titre onéreux entre un professionnel et un consommateur. En l'absence de relation contractuelle onéreuse, Guardiens n'est pas tenu, à ce stade, de désigner un médiateur de la consommation. Un médiateur agréé par la Commission d'évaluation et de contrôle de la médiation de la consommation (CECMC) sera désigné préalablement à l'ouverture de toute offre payante destinée aux consommateurs.
          </p>
          <p>
            <strong className="text-foreground">Plateforme européenne de règlement en ligne des litiges</strong> : conformément à l'article 14 du règlement (UE) n° 524/2013, la Commission européenne met à disposition une plateforme de règlement en ligne des litiges, accessible à <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Crédits</h2>
          <p>
            Conception et développement : Guardiens.<br />
            Certaines images utilisées sur le site sont générées par intelligence artificielle ou issues de banques d'images libres de droits.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default MentionsLegales;
