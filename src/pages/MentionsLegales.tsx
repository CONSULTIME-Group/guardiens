import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const MentionsLegales = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Mentions légales, Éditeur et hébergeur | Guardiens"
        description="Mentions légales de la plateforme Guardiens : éditeur, hébergeur, directeur de publication, propriété intellectuelle et coordonnées de contact."
        path="/mentions-legales"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Mentions légales</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p className="text-sm">Dernière mise à jour : 26 mars 2026</p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Éditeur du site</h2>
          <p>
            Le site guardiens.fr est édité par :<br />
            <strong className="text-foreground">Guardiens</strong><br />
            Forme juridique : Entrepreneur individuel<br />
            Siège social : 22 rue Juiverie, 69005 Lyon, France<br />
            SIRET : 894 864 040 00015<br />
            N° TVA intracommunautaire : FR53894864040<br />
            Directeur de la publication : Jérémie Martinot<br />
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
            <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a> en précisant la mention « Données personnelles » dans l'objet du message.
          </p>
          <p>
            Pour en savoir plus, consultez notre{" "}
            <a href="/confidentialite" className="text-primary hover:underline">politique de confidentialité</a> et nos{" "}
            <a href="/cgu" className="text-primary hover:underline">conditions générales d'utilisation</a>.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Cookies</h2>
          <p>
            Le site utilise des cookies strictement nécessaires au fonctionnement du service (authentification, session, préférences d'affichage), exemptés de consentement conformément aux lignes directrices de la CNIL du 17 septembre 2020. Un cookie de mesure d'audience (Google Analytics) est susceptible d'être déposé uniquement après recueil de votre consentement explicite via la bannière affichée à votre première visite. Aucun cookie publicitaire ni cookie de profilage commercial n'est utilisé. Le détail des traceurs et de leur durée figure dans la <a href="/confidentialite" className="text-primary hover:underline">politique de confidentialité</a>.
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

          <h2 id="mediation" className="font-heading text-xl font-bold text-foreground pt-4">8. Droit applicable, réclamations et médiation de la consommation</h2>
          <p>
            Les présentes mentions sont régies par le droit français. En cas de litige, et après échec d'une résolution amiable, les tribunaux français territorialement compétents au sens des articles 42 et suivants du Code de procédure civile pourront être saisis. Le consommateur conserve la faculté de saisir, à son choix, la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable (article R. 631-3 du Code de la consommation).
          </p>
          <p>
            <strong className="text-foreground">Réclamation préalable</strong> : toute réclamation doit être adressée en premier lieu à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. Guardiens s'engage à répondre dans un délai maximal de deux (2) mois à compter de la réception de la demande.
          </p>
          <p>
            <strong className="text-foreground">Médiation de la consommation</strong> : le service Guardiens est, à la date des présentes, fourni à titre entièrement gratuit à ses utilisateurs. Aucune somme n'est perçue auprès des consommateurs. Le dispositif de médiation de la consommation prévu aux articles L. 611-1 et suivants du Code de la consommation s'applique aux litiges nés de l'exécution d'un contrat de vente ou de fourniture de services à titre onéreux entre un professionnel et un consommateur (article L. 611-1, 1°). En l'absence de relation contractuelle onéreuse, Guardiens n'est pas tenu, à ce stade, de désigner un médiateur de la consommation. Un médiateur agréé par la Commission d'évaluation et de contrôle de la médiation de la consommation (CECMC) sera désigné préalablement à l'ouverture de toute offre payante destinée aux consommateurs, et ses coordonnées seront publiées sur la présente page ainsi que mentionnées dans toute réponse écrite à une réclamation, conformément à l'article R. 616-1 du Code de la consommation.
          </p>
          <p>
            <strong className="text-foreground">Plateforme européenne de règlement en ligne des litiges</strong> : conformément à l'article 14 du règlement (UE) n° 524/2013, la Commission européenne met à disposition une plateforme de règlement en ligne des litiges, accessible à l'adresse <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Crédits</h2>
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
