import { legalVersionHeading } from "@/lib/legalPageVersion";

/**
 * CGS version 3 (lot J2b). Le chapitre Abonnement reste hors ligne.
 * Texte validé par Jérémie le 14/10/2026 (arène du 14/10/2026, final-v9.md).
 * L'en-tête de version (dates de publication et d'entrée en vigueur) se calcule
 * depuis src/config/legalVersions.ts.
 */
const CgsV3 = () => {
  return (
    <>
      <p className="text-sm text-muted-foreground mb-8">{legalVersionHeading("cgs", "3")}</p>

      <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
        {/* 1 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Objet et documents applicables</h2>
        <p>Les présentes Conditions Générales de Services (CGS) décrivent les services de la plateforme Guardiens et leurs conditions financières. Guardiens est édité par Jérémie Martinot, entrepreneur individuel (SIRET 894 864 040 00015, 22 rue Juiverie, 69005 Lyon, <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>), ci-après «&nbsp;Guardiens&nbsp;». Les CGS complètent les <a href="/cgu?version=9" className="text-primary hover:underline">Conditions Générales d'Utilisation</a> (CGU) et la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>, acceptées ensemble à l'inscription. Les CGS régissent la description des services et les questions financières&nbsp;; les CGU régissent l'usage de la Plateforme, la modération et la responsabilité, et prévalent sur ces points. Les termes définis à l'article 4 des CGU ont le même sens dans les CGS.</p>
        {/* 2 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Guardiens est gratuit</h2>
        <p>Guardiens est gratuit. L'inscription et l'usage des services décrits à l'article 3 sont gratuits pour tous les membres.</p>
        {/* 3 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Services fournis</h2>
        <p>À la date de la présente version, Guardiens met à la disposition des membres les outils suivants&nbsp;:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>un profil de propriétaire, de gardien, ou les deux&nbsp;;</li>
          <li>la publication d'annonces de garde de logement et d'animaux, et les candidatures&nbsp;;</li>
          <li>la recherche d'annonces, de profils et de besoins d'entraide&nbsp;;</li>
          <li>la messagerie entre membres&nbsp;;</li>
          <li>l'accord de garde facultatif et le guide de la maison, remplis par les membres&nbsp;;</li>
          <li>l'Entraide&nbsp;: besoins, propositions de coups de main et projets participatifs&nbsp;;</li>
          <li>les avis croisés après une garde, et les mots d'entraide après un coup de main&nbsp;;</li>
          <li>la vérification d'identité facultative et son badge&nbsp;;</li>
          <li>le signalement de contenus&nbsp;;</li>
          <li>Alma, assistante fonctionnant par intelligence artificielle&nbsp;;</li>
          <li>les guides locaux, les articles et l'annuaire d'associations animalières&nbsp;;</li>
          <li>l'annuaire des professionnels, en version d'essai («&nbsp;bêta&nbsp;»)&nbsp;;</li>
          <li>les notifications par email et, pour les membres qui les activent, par le navigateur.</li>
        </ul>
        <p>Une fonctionnalité présentée comme «&nbsp;bientôt disponible&nbsp;» entre dans les services à la date de son ouverture, avec ses conditions propres. Une fonctionnalité en version bêta est fournie dans l'état de son développement&nbsp;; elle peut évoluer ou être retirée. Les services évoluent selon l'article 13 bis des CGU.</p>
        {/* 4 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Nature des services</h2>
        <p>Les services sont des outils de mise en relation. Le service de Guardiens consiste en leur fourniture, au titre d'une obligation de moyens (article 13 des CGU). La recherche d'un gardien, d'une garde ou d'une aide, le choix des personnes, la conclusion d'une garde ou d'un coup de main, leur déroulement et leur résultat appartiennent aux membres (article 6 des CGU).</p>
        {/* 5 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Règles d'usage</h2>
        <p>Chaque outil s'utilise selon les règles affichées à l'écran au moment de l'usage, par exemple un niveau minimal de profil rempli pour candidater, un nombre maximal de candidatures par annonce fixé par son auteur, ou un lieu situé pour publier un besoin d'entraide. Guardiens peut appliquer des limites techniques destinées à protéger la Plateforme et ses membres.</p>
        {/* 6 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Argent entre membres</h2>
        <p>Les gardes et les coups de main se font à titre gratuit entre membres (articles 6.3 et 7.2 des CGU). La seule somme admise entre membres est le remboursement d'une dépense avancée pour le compte de l'autre, au montant exact et sur justificatif, dans les conditions de l'article 6.3 a) des CGU. Toute autre somme demandée ou versée entre membres est interdite et expose le compte aux mesures de l'article 11 des CGU. Les membres règlent ces remboursements directement entre eux&nbsp;; Guardiens reste extérieur à ces règlements.</p>
        {/* 7 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Membres professionnels</h2>
        <p>Un professionnel du secteur animalier (article 10 bis des CGU) présente ses prestations rémunérées sur sa fiche de l'annuaire des professionnels, et là seulement. Il contracte directement avec son client et assume seul les obligations attachées à son activité (information du client, facturation, assurance). Guardiens est tiers à ce contrat et à son prix. Une garde conclue entre membres reste à titre gratuit, y compris lorsque le gardien est un professionnel.</p>
        {/* 8 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Paiement</h2>
        <p>Toute somme due à Guardiens naît exclusivement d'une souscription distincte, volontaire et expresse du membre, précédée de l'information prévue par la loi et de l'acceptation de conditions particulières présentées avant tout paiement. Le compte reste gratuit en l'absence d'une telle souscription.</p>
        {/* 9 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Durée et fermeture du compte</h2>
        <p>Le contrat est conclu pour une durée indéterminée à compter de l'inscription. Le membre y met fin à tout moment, gratuitement, en fermant son compte depuis ses paramètres ou par email à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>.</p>
        <p>Lorsqu'une de ses annonces de garde est confirmée ou en cours, ou qu'une de ses candidatures est en attente ou acceptée, la Plateforme lui demande d'abord de la clôturer ou de la retirer depuis son espace, afin que l'autre membre soit prévenu. La demande par email reste ouverte dans tous les cas&nbsp;; elle est traitée après vérification de l'identité de son auteur, dans le délai prévu par la réglementation sur les données personnelles. Les effets de la fermeture sur les données figurent dans la Politique de confidentialité.</p>
        <p>Guardiens peut mettre fin au contrat dans les conditions des articles 11 (manquement, ou fin du compte avec un préavis de 30 jours selon l'article 11.6) et 13 bis (évolution, interruption et arrêt du service) des CGU.</p>
        {/* 10 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">10. Modification des CGS</h2>
        <p>Les CGS évoluent selon l'article 15 des CGU.</p>
        {/* 11 */}
        <h2 className="font-heading text-xl font-bold text-foreground pt-4">11. Réclamations, droit applicable et juridiction</h2>
        <p>Les réclamations suivent l'article 19 des CGU. Les CGS sont régies par le droit français&nbsp;; la juridiction compétente est déterminée selon l'article 21 des CGU.</p>
      </div>
    </>
  );
};

export default CgsV3;
