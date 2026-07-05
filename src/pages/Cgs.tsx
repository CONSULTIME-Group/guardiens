import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const Cgs = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Conditions générales de services | Guardiens"
        description="Conditions générales de services Guardiens : tarifs, paiement, résiliation simplifiée et droit de rétractation."
        path="/cgs"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">
          Conditions Générales de Services
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Version 1, Dernière mise à jour : 3 mai 2026
        </p>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p>
            Les présentes Conditions Générales de Services (ci-après «&nbsp;CGS&nbsp;») régissent les conditions tarifaires et commerciales des services proposés par la plateforme Guardiens. Elles s'appliquent conjointement aux{" "}
            <a href="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</a>
            {" "}(qui régissent les règles d'usage de la Plateforme) et à la{" "}
            <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>
            {" "}(qui détaille le traitement des données personnelles).
          </p>
          <p>
            L'acceptation des CGS est obligatoire pour souscrire à tout service payant proposé sur la Plateforme.
          </p>

          {/* 1 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Éditeur de la Plateforme</h2>
          <p>
            La plateforme Guardiens, accessible à l'adresse{" "}
            <a href="https://guardiens.fr" className="text-primary hover:underline">guardiens.fr</a>, est éditée par&nbsp;:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Jérémie Martinot</strong>, entrepreneur individuel</li>
            <li><strong className="text-foreground">SIRET</strong> : 894 864 040 00015</li>
            <li><strong className="text-foreground">Adresse</strong> : 22 rue Juiverie, 69005 Lyon, France</li>
            <li><strong className="text-foreground">Email</strong> : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a></li>
            <li><strong className="text-foreground">TVA non applicable</strong>, art. 293 B du CGI</li>
          </ul>

          {/* 2 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Objet et services proposés</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">2.1 Objet</h3>
          <p>
            Les présentes CGS ont pour objet de définir les conditions tarifaires, les modalités de paiement et de résiliation des services proposés par Guardiens à ses utilisateurs.
          </p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">2.2 Services proposés</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Espace Propriétaire</strong> : publication d'annonces de garde, consultation des candidatures, messagerie interne, gestion des avis. Service entièrement gratuit.</li>
            <li><strong className="text-foreground">Espace Gardien</strong> : consultation et candidature aux annonces, messagerie interne, profil enrichi, accès aux fonctionnalités complètes de la Plateforme. Service payant après la période de lancement.</li>
            <li><strong className="text-foreground">Petites missions (entraide)</strong> : participation au système d'entraide communautaire, sans nuitée. Service entièrement gratuit pour tous les membres.</li>
            <li><strong className="text-foreground">Vérification d'identité</strong> : service optionnel de validation d'identité, gratuit.</li>
          </ul>

          {/* 3 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Tarifs</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.1 Grille tarifaire</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-2 text-left text-foreground">Profil</th>
                  <th className="p-2 text-left text-foreground">Tarif</th>
                  <th className="p-2 text-left text-foreground">Engagement</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border"><td className="p-2">Espace Propriétaire</td><td className="p-2">Gratuit, sans carte bancaire requise</td><td className="p-2">Aucun</td></tr>
                <tr className="border-t border-border"><td className="p-2">Espace Gardien (standard)</td><td className="p-2">6,99&nbsp;€ TTC/mois</td><td className="p-2">Sans engagement, résiliable à tout moment</td></tr>
                <tr className="border-t border-border"><td className="p-2">Petites missions (entraide)</td><td className="p-2">Gratuit pour tous les membres</td><td className="p-2">Aucun</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Les prix sont exprimés en euros toutes taxes comprises. La TVA n'est pas applicable conformément à l'article 293 B du CGI.
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.2 Modèle actuel</h3>
          <p>
            Guardiens reste gratuit tant que l'éditeur n'est pas satisfait du service qu'il souhaite offrir. Aucune date de bascule tarifaire n'est fixée à ce jour. L'accès Gardien comme l'accès Propriétaire est intégralement offert, sans engagement de durée et sans carte bancaire requise à l'inscription.
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.3 Préavis en cas d'évolution</h3>
          <p>
            Si l'éditeur décide d'activer une facturation à l'avenir, chaque membre sera prévenu par email au moins 30&nbsp;jours avant la bascule. Les conditions tarifaires précises seront communiquées à ce moment-là. Aucun prélèvement ne pourra intervenir sans consentement explicite du membre.
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.4 Programme Fondateur</h3>
          <p>Les premiers utilisateurs inscrits sur Guardiens bénéficient du statut de <strong className="text-foreground">Fondateur</strong>, matérialisé par un badge permanent affiché sur leur profil. Ce badge est symbolique et distingue les membres qui ont rejoint l'aventure dès le départ.</p>


          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.5 Programme de parrainage</h3>
          <p>
            Tout utilisateur peut parrainer un nouveau membre. Lorsqu'un filleul devient membre actif (compte vérifié, profil complété et au moins une candidature ou une annonce publiée), le parrain et le filleul bénéficient chacun d'un mois d'abonnement Gardien offert.
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.6 Absence de commission</h3>
          <p>Aucune commission n'est prélevée sur les gardes ou sur les petites missions.</p>

          {/* 4 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Modalités de paiement</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">4.1 Prestataire de paiement</h3>
          <p>
            Les paiements sont traités par le prestataire <strong className="text-foreground">Stripe Payments Europe Ltd</strong>, société de paiement agréée par la Banque centrale d'Irlande, agissant en qualité de sous-traitant au sens de l'article 28 du RGPD. Aucune donnée bancaire complète n'est conservée par Guardiens.
          </p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">4.2 Moyens de paiement acceptés</h3>
          <p>Les paiements sont acceptés par carte bancaire (Visa, Mastercard, American Express), conformément aux moyens de paiement supportés par Stripe.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">4.3 Fréquence de prélèvement</h3>
          <p>L'abonnement Gardien est prélevé mensuellement, à la date anniversaire de la souscription. Le premier prélèvement intervient immédiatement à la souscription, sauf en période de lancement (cf. 3.3) ou en cas d'avoir actif (parrainage, programme Fondateur).</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">4.4 Échec de paiement</h3>
          <p>En cas d'échec de paiement (carte expirée, fonds insuffisants, refus banque), Stripe procède à plusieurs tentatives de relance automatique sur une période de 7 jours. À défaut de régularisation, l'accès aux fonctionnalités payantes est suspendu jusqu'à mise à jour du moyen de paiement.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">4.5 Facturation</h3>
          <p>Les factures sont mises à disposition de l'utilisateur depuis son espace personnel, dans la rubrique «&nbsp;Mes paiements&nbsp;». Elles peuvent être téléchargées au format PDF à tout moment.</p>

          {/* 5 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Reconduction tacite et résiliation</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">5.1 Reconduction tacite</h3>
          <p>L'abonnement Gardien est reconduit tacitement chaque mois jusqu'à résiliation par l'utilisateur. Conformément à l'article L.&nbsp;215-1 du Code de la consommation, l'utilisateur peut résilier à tout moment depuis son espace personnel, sans frais ni pénalité.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">5.2 Résiliation simplifiée</h3>
          <p>Conformément à l'article L.&nbsp;224-42 du Code de la consommation, la résiliation est possible en ligne, par un bouton accessible directement depuis l'espace personnel de l'utilisateur, en quelques étapes, sans formalité supplémentaire.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">5.3 Effets de la résiliation</h3>
          <p>La résiliation prend effet à la fin de la période en cours pour laquelle le paiement a été effectué. L'utilisateur conserve l'accès aux fonctionnalités payantes jusqu'à cette date. Aucun remboursement prorata temporis n'est effectué pour la fraction d'abonnement déjà entamée, sauf exercice du droit de rétractation dans le délai légal (article 6).</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">5.4 Suppression de compte</h3>
          <p>L'utilisateur peut supprimer son compte à tout moment depuis les paramètres de son profil. La suppression entraîne une période de grâce de 7 jours durant laquelle le compte peut être réactivé. Au-delà, les données de profil sont supprimées ou anonymisées conformément à la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>.</p>

          {/* 6 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Droit de rétractation</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">6.1 Délai légal</h3>
          <p>Conformément à l'article L.&nbsp;221-18 du Code de la consommation, l'utilisateur consommateur dispose d'un délai de <strong className="text-foreground">14 jours</strong> à compter de la souscription de l'abonnement Gardien pour exercer son droit de rétractation, sans avoir à motiver sa décision ni à supporter de pénalités.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">6.2 Modalités d'exercice</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>adresser une déclaration claire et non équivoque à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>&nbsp;;</li>
            <li>ou utiliser le formulaire-type de rétractation reproduit en annexe (annexe à l'art. R.&nbsp;221-1 C. conso).</li>
          </ul>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">6.3 Remboursement</h3>
          <p>Le remboursement intervient dans un délai de 14 jours à compter de la réception de la demande, par le même moyen de paiement que celui utilisé pour la transaction initiale, sauf accord exprès contraire.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">6.4 Renonciation expresse au droit de rétractation</h3>
          <p>Conformément à l'article L.&nbsp;221-25 du Code de la consommation, l'utilisateur qui souhaite que l'exécution du service commence avant l'expiration du délai de 14 jours doit en faire la demande expresse, par une case à cocher distincte de l'acceptation des CGS lors de la souscription. Dans ce cas, il reconnaît perdre son droit de rétractation dès que la prestation est pleinement exécutée.</p>

          {/* 7 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Suspension pour défaut de paiement ou manquement aux CGU</h2>
          <p>Guardiens se réserve le droit de suspendre l'accès aux services payants en cas de&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>défaut de paiement persistant après les relances automatiques de Stripe&nbsp;;</li>
            <li>manquement grave aux CGU pouvant entraîner la suspension du compte&nbsp;;</li>
            <li>soupçon de fraude ou d'utilisation abusive du service.</li>
          </ul>
          <p>La suspension prend effet immédiatement et est notifiée à l'utilisateur par email. Elle ne donne lieu à aucun remboursement de la fraction d'abonnement déjà entamée.</p>

          {/* 8 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Modification des CGS</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">8.1 Modifications tarifaires</h3>
          <p>Toute modification tarifaire fait l'objet d'une notification individuelle par email aux utilisateurs concernés au moins 30 jours avant son entrée en vigueur, conformément à l'article L.&nbsp;224-33 du Code de la consommation. L'utilisateur peut résilier sans frais ni pénalité avant la date d'entrée en vigueur de la nouvelle grille tarifaire.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">8.2 Autres modifications</h3>
          <p>Toute autre modification substantielle des CGS fait l'objet d'une notification individuelle au moins 30 jours avant son entrée en vigueur. L'utilisation continue du service après cette date vaut acceptation des nouvelles CGS.</p>

          {/* 9 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Protection du consommateur</h2>
          <p>L'utilisateur consommateur bénéficie de l'ensemble des protections prévues par le Code de la consommation, notamment&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>les garanties légales de conformité (art. L.&nbsp;217-3 et suivants)&nbsp;;</li>
            <li>la garantie des vices cachés (art. 1641 et suivants du Code civil)&nbsp;;</li>
            <li>la protection contre les clauses abusives (art. L.&nbsp;212-1 et suivants).</li>
          </ul>

          {/* 10 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">10. Réclamations et résolution des litiges</h2>
          <p>Toute réclamation relative aux services payants doit être adressée par écrit à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. Guardiens s'engage à accuser réception sous 7 jours ouvrés et à apporter une réponse motivée dans un délai maximal de 30 jours.</p>
          <p>En cas de désaccord persistant après la procédure amiable, le consommateur conserve la faculté de saisir&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>la plateforme européenne de Règlement en Ligne des Litiges (RLL)&nbsp;: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr</a>&nbsp;;</li>
            <li>les autorités administratives compétentes, notamment la DGCCRF via SignalConso (<a href="https://signal.conso.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">signal.conso.gouv.fr</a>)&nbsp;;</li>
            <li>la juridiction compétente conformément aux dispositions des CGU (article 21).</li>
          </ul>

          {/* 11 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">11. Droit applicable et juridiction compétente</h2>
          <p>Les présentes CGS sont régies par le droit français. Les modalités de juridiction sont identiques à celles prévues à l'article 21 des <a href="/cgu" className="text-primary hover:underline">CGU</a>.</p>

          {/* 12 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">12. Contact</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Email</strong> : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a></li>
            <li><strong className="text-foreground">Adresse</strong> : 22 rue Juiverie, 69005 Lyon, France</li>
          </ul>

          {/* Annexe */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">Annexe, Formulaire-type de rétractation</h2>
          <p className="italic text-sm">
            (à remplir et à renvoyer uniquement si vous souhaitez vous rétracter du contrat, annexe à l'art. R.&nbsp;221-1 C. conso)
          </p>
          <div className="border border-border rounded-md p-4 bg-muted/20 text-sm space-y-2">
            <p><strong className="text-foreground">À l'attention de</strong>&nbsp;: Jérémie Martinot, Guardiens, 22 rue Juiverie, 69005 Lyon, contact@guardiens.fr</p>
            <p>Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous&nbsp;:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong className="text-foreground">Prestation</strong>&nbsp;: abonnement Gardien</li>
              <li><strong className="text-foreground">Date de souscription</strong>&nbsp;: …………………</li>
              <li><strong className="text-foreground">Nom du consommateur</strong>&nbsp;: …………………</li>
              <li><strong className="text-foreground">Adresse du consommateur</strong>&nbsp;: …………………</li>
              <li><strong className="text-foreground">Date</strong>&nbsp;: …………………</li>
              <li><strong className="text-foreground">Signature</strong> <em>(uniquement en cas de notification papier)</em>&nbsp;: …………………</li>
            </ul>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Cgs;
