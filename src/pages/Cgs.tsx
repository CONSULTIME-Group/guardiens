import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const Cgs = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Conditions Générales de Services | Guardiens"
        description="Conditions Générales de Services Guardiens : gratuité actuelle, fonctionnalités incluses, passage éventuel à un modèle payant et résiliation."
        path="/cgs"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Conditions Générales de Services</h1>
        <p className="text-sm text-muted-foreground mb-8">Version 1, dernière mise à jour : 13 juillet 2026</p>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Objet</h2>
          <p>
            Les présentes Conditions Générales de Services (CGS) régissent les conditions commerciales et tarifaires de la plateforme Guardiens, éditée par Jérémie Martinot (entrepreneur individuel, SIRET 894 864 040 00015, 22 rue Juiverie, 69005 Lyon).
          </p>
          <p>
            Elles complètent les <a href="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</a> (CGU) et la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>. L'utilisation de la Plateforme implique l'acceptation pleine et entière de ces trois documents.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Gratuité actuelle du service</h2>
          <p>
            À la date des présentes, Guardiens est fourni à titre entièrement gratuit à ses utilisateurs, propriétaires comme gardiens. Aucune somme n'est perçue auprès des membres de la Plateforme. Aucune carte bancaire n'est demandée à l'inscription. Aucune limite d'usage n'est appliquée.
          </p>
          <p>
            Cette gratuité est un choix éditorial délibéré, motivé par la volonté de faire mûrir le service et de valider sa qualité avant toute demande de contrepartie financière.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Fonctionnalités incluses</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Publication d'annonces de garde sans limitation</li>
            <li>Consultation des annonces et candidatures sans limitation</li>
            <li>Messagerie interne entre membres</li>
            <li>Publication et réponse aux petites missions d'entraide</li>
            <li>Consultation des guides locaux et articles</li>
            <li>Accès au dispositif Gardien d'urgence</li>
            <li>Publication d'avis après une garde ou une mission</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Absence de contrepartie financière entre utilisateurs</h2>
          <p>
            Guardiens repose sur un échange de bons procédés à titre non lucratif entre membres (garde d'animaux contre hébergement à titre gratuit, entraide locale par échange en nature). Aucun échange d'argent n'est autorisé entre membres via la Plateforme, quel qu'en soit le motif. Tout contournement expose le compte à une suspension immédiate.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Passage éventuel à un modèle payant</h2>
          <p>
            Guardiens se réserve le droit d'introduire à terme un modèle payant, notamment sous la forme d'un abonnement destiné à financer le maintien et l'évolution du service. Ce passage n'aura lieu qu'à partir du moment où Guardiens estimera que le service justifie une contrepartie financière.
          </p>
          <p>
            Les utilisateurs seront informés par email avec un préavis minimal de trente (30) jours avant toute mise en place d'une offre payante. Cette information précisera :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Les fonctionnalités concernées</li>
            <li>Le tarif applicable</li>
            <li>Les modalités de souscription, de facturation, de résiliation et de remboursement</li>
            <li>Le maintien éventuel d'un niveau gratuit</li>
            <li>Les coordonnées du médiateur agréé CECMC désigné à cette occasion</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Résiliation et suppression de compte</h2>
          <p>
            L'utilisateur peut à tout moment supprimer son compte depuis les paramètres ou par email à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. La suppression est effective dans les 7 jours suivant la demande. Les modalités de conservation des données post-suppression sont détaillées dans la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a> (article 5).
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Loi applicable et juridiction</h2>
          <p>
            Les présentes CGS sont régies par le droit français. En cas de litige et après échec d'une résolution amiable, les juridictions françaises sont compétentes, dans les conditions prévues à l'article 21 des <a href="/cgu" className="text-primary hover:underline">CGU</a>.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Cgs;
