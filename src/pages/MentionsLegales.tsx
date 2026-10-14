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

      <main id="main-content" className="px-6 md:px-12 py-8 md:py-16 max-w-3xl mx-auto">

        <h1 className="font-heading text-2xl md:text-4xl font-bold mb-5 md:mb-8">Mentions légales</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p className="text-sm">Dernière mise à jour : 16 octobre 2026</p>

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
            L'ensemble des éléments composant le site (textes, graphismes, logos, icônes, images, extraits sonores, logiciels, mise en page) sont la propriété exclusive de l'éditeur ou de ses partenaires. Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site est interdite sans autorisation écrite préalable.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Données personnelles</h2>
          <p>
            Conformément à la loi n° 78-17 du 6 janvier 1978 modifiée (Informatique et Libertés) et au Règlement Général sur la Protection des Données (RGPD, UE 2016/679), vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition, de limitation et de portabilité de vos données. Pour exercer ces droits, écrivez à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a> en précisant la mention "Données personnelles" dans l'objet du message.
          </p>
          <p>
            Pour en savoir plus, consultez la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a> et les <a href="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</a>.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Cookies</h2>
          <p>
            Le site utilise des cookies strictement nécessaires à son fonctionnement (authentification, session, sécurité, préférences d'affichage), exemptés de consentement conformément aux lignes directrices de la CNIL du 17 septembre 2020. Les cookies de mesure d'audience sont déposés uniquement après recueil du consentement explicite via la bannière affichée à la première visite. Aucun cookie publicitaire ni cookie de profilage commercial n'est utilisé. Le détail des traceurs figure sur la page Politique cookies.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Statut d'hébergeur et d'intermédiaire</h2>
          <p>
            Pour les contenus publiés par les membres (annonces, profils, photos, avis, messages), Guardiens a la qualité d'hébergeur au sens de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN) et du règlement (UE) 2022/2065 sur les services numériques. Guardiens met en relation les membres et reste extérieur aux accords qu'ils concluent entre eux, gardes comme coups de main.
          </p>
          <p>
            Avant toute garde ou tout coup de main, chaque membre s'assure de la couverture de son assurance responsabilité civile et, pour le propriétaire, de son assurance multirisque habitation.
          </p>
          <p>
            Le régime de responsabilité de l'éditeur, avec les garanties que la loi réserve dans tous les cas, figure à l'article 13 des <a href="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</a>.
          </p>

          <h2 id="mediation" className="font-heading text-xl font-bold text-foreground pt-4">7. Droit applicable, réclamations et médiation</h2>
          <p>
            Les présentes mentions sont régies par le droit français. En cas de litige, et après échec d'une résolution amiable, les tribunaux français territorialement compétents au sens des articles 42 et suivants du Code de procédure civile pourront être saisis. Le consommateur conserve la faculté de saisir, à son choix, la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable (article R. 631-3 du Code de la consommation).
          </p>
          <p>
            <strong className="text-foreground">Réclamation préalable</strong> : toute réclamation doit être adressée en premier lieu à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. Les modalités de traitement figurent à l'article 19 des <a href="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</a>.
          </p>
          <p>
            <strong className="text-foreground">Médiation de la consommation</strong> : lorsqu'un contrat conclu à titre onéreux lie Guardiens à un consommateur, les conditions de ce contrat désignent le médiateur de la consommation compétent, auquel le consommateur recourt gratuitement.
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
