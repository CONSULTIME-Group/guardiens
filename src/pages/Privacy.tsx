import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Politique de confidentialité | Guardiens"
        description="Comment Guardiens protège vos données personnelles : collecte, conservation, partage, cookies et exercice de vos droits RGPD en France."
        path="/confidentialite"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-muted-foreground mb-8">Version 2, Dernière mise à jour : 3 mai 2026</p>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p>
            La présente Politique de confidentialité décrit les modalités de collecte, d'utilisation, de conservation et de protection des données personnelles des utilisateurs de la plateforme Guardiens (<a href="https://guardiens.fr" className="text-primary hover:underline">guardiens.fr</a>).
          </p>
          <p>
            Elle s'applique conjointement aux <a href="/cgu" className="text-primary hover:underline">Conditions Générales d'Utilisation</a>, dont elle fait partie intégrante.
          </p>

          {/* 1 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Responsable du traitement</h2>
          <p>Le responsable du traitement des données personnelles est :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Guardiens, Jérémie Martinot</strong>, entrepreneur individuel</li>
            <li><strong className="text-foreground">Adresse</strong> : 22 rue Juiverie, 69005 Lyon, France</li>
            <li><strong className="text-foreground">SIRET</strong> : 894 864 040 00015</li>
            <li><strong className="text-foreground">Contact général</strong> : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a></li>
          </ul>

          {/* 2 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Délégué à la protection des données (DPO)</h2>
          <p>Pour toute question relative à la protection des données personnelles, un point de contact dédié est mis à disposition :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Email</strong> : <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a></li>
          </ul>
          <p>
            Compte tenu de la taille actuelle de la structure et conformément à l'article 37 du RGPD, la désignation d'un Délégué à la protection des données (DPO) au sens formel du Règlement n'est pas obligatoire. Les missions équivalentes sont assurées par le responsable du traitement.
          </p>

          {/* 3 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Données collectées</h2>
          <p>Les catégories de données traitées par la Plateforme sont les suivantes :</p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.1 Données d'identification</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nom, prénom</li>
            <li>Adresse email</li>
            <li>Mot de passe (haché par algorithme bcrypt, jamais stocké en clair)</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.2 Données de profil</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Photo de profil</li>
            <li>Biographie, présentation, motivations</li>
            <li>Ville, code postal</li>
            <li>Rôle (propriétaire, gardien, ou les deux)</li>
            <li>Préférences, mode de vie, compétences déclarées</li>
            <li>Photos de logement, photos d'animaux, galeries</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.3 Données relatives aux animaux et propriétés</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Espèce, race, âge, caractère des animaux</li>
            <li>Type de logement, surface, équipements</li>
            <li>Description et atouts du lieu</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.4 Données de communication</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Messages échangés via la messagerie interne</li>
            <li>Candidatures et réponses</li>
            <li>Avis et écussons attribués</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.5 Données de géolocalisation</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Coordonnées approximatives associées au code postal déclaré, utilisées pour la recherche par rayon (15 km par défaut)</li>
            <li>Adresse précise du logement, communiquée uniquement après confirmation d'une garde</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.6 Données de vérification d'identité (optionnelles)</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Document officiel d'identité (carte d'identité, passeport, titre de séjour)</li>
            <li>Selfie de vérification</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.7 Données de paiement</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Aucune donnée bancaire complète n'est conservée par Guardiens</li>
            <li>Le traitement des paiements est intégralement délégué à Stripe (cf. article 6)</li>
            <li>Guardiens conserve uniquement : identifiant Stripe, dates et montants des transactions, statut d'abonnement</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">3.8 Données techniques</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Adresse IP</li>
            <li>Type de navigateur, système d'exploitation</li>
            <li>Données de connexion (logs, horodatages)</li>
            <li>Pages visitées, parcours utilisateur (en cas de consentement aux cookies de mesure d'audience)</li>
          </ul>

          {/* 4 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Finalités et bases légales</h2>
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left text-foreground">Finalité</th>
                <th className="p-2 text-left text-foreground">Base légale (RGPD art. 6)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border"><td className="p-2">Création et gestion du compte utilisateur</td><td className="p-2">Exécution du contrat (art. 6.1.b)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Mise en relation propriétaires/gardiens</td><td className="p-2">Exécution du contrat (art. 6.1.b)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Messagerie interne</td><td className="p-2">Exécution du contrat (art. 6.1.b)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Gestion des paiements et abonnements</td><td className="p-2">Exécution du contrat (art. 6.1.b)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Vérification d'identité</td><td className="p-2">Consentement (art. 6.1.a)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Notifications transactionnelles (candidatures, messages, gardes)</td><td className="p-2">Exécution du contrat (art. 6.1.b)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Notifications marketing (newsletter, recommandations)</td><td className="p-2">Consentement (art. 6.1.a)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Mesure d'audience (Google Analytics)</td><td className="p-2">Consentement (art. 6.1.a)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Modération et lutte contre la fraude</td><td className="p-2">Intérêt légitime (art. 6.1.f)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Amélioration du service et statistiques anonymisées</td><td className="p-2">Intérêt légitime (art. 6.1.f)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Respect des obligations comptables et fiscales</td><td className="p-2">Obligation légale (art. 6.1.c)</td></tr>
            </tbody>
          </table>

          {/* 5 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Durée de conservation</h2>
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left text-foreground">Catégorie de donnée</th>
                <th className="p-2 text-left text-foreground">Durée de conservation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border"><td className="p-2">Données de compte (profil actif)</td><td className="p-2">Pendant toute la durée de l'inscription</td></tr>
              <tr className="border-t border-border"><td className="p-2">Données de compte (après suppression)</td><td className="p-2">Effacement dans les 7 jours suivant la demande, sauf obligations légales contraires</td></tr>
              <tr className="border-t border-border"><td className="p-2">Selfie de vérification d'identité</td><td className="p-2">Supprimé immédiatement après validation de la vérification</td></tr>
              <tr className="border-t border-border"><td className="p-2">Document d'identité</td><td className="p-2">12 mois maximum après la vérification, sauf obligation légale (notamment LCB-FT)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Messages échangés via la messagerie</td><td className="p-2">Pendant toute la durée du compte, anonymisés à la suppression</td></tr>
              <tr className="border-t border-border"><td className="p-2">Avis publiés</td><td className="p-2">Conservés sous forme anonymisée après suppression du compte (intérêt légitime, intégrité du système d'évaluation)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Données de connexion (logs)</td><td className="p-2">12 mois conformément à l'article L. 34-1 du Code des postes et communications électroniques</td></tr>
              <tr className="border-t border-border"><td className="p-2">Données de facturation</td><td className="p-2">10 ans conformément à l'article L. 123-22 du Code de commerce</td></tr>
              <tr className="border-t border-border"><td className="p-2">Cookies de mesure d'audience</td><td className="p-2">13 mois maximum (recommandation CNIL)</td></tr>
            </tbody>
          </table>

          {/* 6 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Sous-traitants et destinataires</h2>
          <p>Les données peuvent être transmises aux sous-traitants suivants, dans le strict cadre du fonctionnement de la Plateforme et sous le régime de l'article 28 du RGPD :</p>
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left text-foreground">Sous-traitant</th>
                <th className="p-2 text-left text-foreground">Service rendu</th>
                <th className="p-2 text-left text-foreground">Localisation des données</th>
                <th className="p-2 text-left text-foreground">Cadre du transfert</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border"><td className="p-2"><strong className="text-foreground">Supabase Inc.</strong></td><td className="p-2">Hébergement BDD, authentification, stockage</td><td className="p-2">UE (Francfort), sauvegardes US possibles</td><td className="p-2">EU-US Data Privacy Framework + Clauses contractuelles types</td></tr>
              <tr className="border-t border-border"><td className="p-2"><strong className="text-foreground">Lovable AB</strong></td><td className="p-2">Plateforme de développement et déploiement front-end</td><td className="p-2">Suède (UE)</td><td className="p-2">Pas de transfert hors UE</td></tr>
              <tr className="border-t border-border"><td className="p-2"><strong className="text-foreground">Cloudflare Inc.</strong> (via Cloudflare Ireland Ltd)</td><td className="p-2">DNS, CDN, protection anti-DDoS, edge computing</td><td className="p-2">Réseau mondial, société-mère US</td><td className="p-2">EU-US Data Privacy Framework + Clauses contractuelles types</td></tr>
              <tr className="border-t border-border"><td className="p-2"><strong className="text-foreground">Stripe Payments Europe Ltd</strong> (filiale de Stripe Inc.)</td><td className="p-2">Traitement des paiements et abonnements</td><td className="p-2">UE (Dublin), transferts US encadrés</td><td className="p-2">EU-US Data Privacy Framework + Clauses contractuelles types</td></tr>
              <tr className="border-t border-border"><td className="p-2"><strong className="text-foreground">Resend Inc.</strong></td><td className="p-2">Envoi d'emails transactionnels</td><td className="p-2">États-Unis</td><td className="p-2">EU-US Data Privacy Framework + Clauses contractuelles types</td></tr>
              <tr className="border-t border-border"><td className="p-2"><strong className="text-foreground">Prerender LLC</strong></td><td className="p-2">Pré-rendu serveur pour indexation SEO</td><td className="p-2">États-Unis</td><td className="p-2">EU-US Data Privacy Framework + Clauses contractuelles types</td></tr>
              <tr className="border-t border-border"><td className="p-2"><strong className="text-foreground">Google LLC</strong> (via Google Ireland Ltd)</td><td className="p-2">Mesure d'audience Google Analytics 4 (sous réserve de consentement)</td><td className="p-2">UE/US</td><td className="p-2">EU-US Data Privacy Framework + Clauses contractuelles types</td></tr>
            </tbody>
          </table>
          <p>
            <strong className="text-foreground">Aucune donnée n'est vendue à des tiers.</strong> Les données ne sont communiquées à des autorités publiques qu'en cas de réquisition légale dûment notifiée.
          </p>

          {/* 7 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Transferts hors Union européenne</h2>
          <p>Certains sous-traitants listés à l'article 6 sont situés ou rattachés à des sociétés-mères établies aux États-Unis. Ces transferts sont encadrés par :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>le <strong className="text-foreground">EU-US Data Privacy Framework</strong> adopté par décision d'exécution (UE) 2023/1795 de la Commission du 10 juillet 2023, lorsque le sous-traitant y est certifié ;</li>
            <li>à défaut, par les <strong className="text-foreground">clauses contractuelles types</strong> approuvées par la Commission européenne (décision d'exécution (UE) 2021/914 du 4 juin 2021).</li>
          </ul>
          <p>Ces mécanismes garantissent un niveau de protection des données équivalent à celui offert par le RGPD.</p>

          {/* 8 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Vos droits</h2>
          <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Droit d'accès</strong> (art. 15) : obtenir la confirmation que vos données sont traitées et en recevoir une copie.</li>
            <li><strong className="text-foreground">Droit de rectification</strong> (art. 16) : corriger des données inexactes ou incomplètes.</li>
            <li><strong className="text-foreground">Droit à l'effacement</strong> (art. 17) : demander la suppression de vos données dans les conditions prévues par le RGPD.</li>
            <li><strong className="text-foreground">Droit à la limitation du traitement</strong> (art. 18) : restreindre le traitement de vos données dans certains cas.</li>
            <li><strong className="text-foreground">Droit à la portabilité</strong> (art. 20) : recevoir vos données dans un format structuré, couramment utilisé et lisible par machine.</li>
            <li><strong className="text-foreground">Droit d'opposition</strong> (art. 21) : vous opposer au traitement de vos données fondé sur l'intérêt légitime.</li>
            <li><strong className="text-foreground">Droit de retirer votre consentement</strong> à tout moment, sans affecter la licéité du traitement antérieur.</li>
            <li><strong className="text-foreground">Droit de définir des directives post-mortem</strong> relatives au sort de vos données après votre décès (art. 85 LIL).</li>
          </ul>
          <p><strong className="text-foreground">Pour exercer vos droits</strong> :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email : <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a></li>
            <li>Délai de réponse : 30 jours maximum (prolongation possible à 60 jours pour les demandes complexes, avec notification préalable)</li>
            <li>Vous pouvez également exporter vos données directement depuis les paramètres de votre compte.</li>
          </ul>

          {/* 9 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Cookies et traceurs</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">9.1 Cookies strictement nécessaires</h3>
          <p>La Plateforme utilise des cookies strictement nécessaires à son fonctionnement, qui ne requièrent pas de consentement préalable conformément à l'article 82 de la loi Informatique et Libertés et à la doctrine CNIL :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cookie d'authentification (session utilisateur)</li>
            <li>Cookie de préférences d'affichage (langue, état du menu)</li>
            <li>Cookie de sécurité (protection contre les attaques CSRF)</li>
          </ul>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">9.2 Cookies de mesure d'audience (Google Analytics 4)</h3>
          <p>La Plateforme utilise Google Analytics 4 pour mesurer l'audience et améliorer le service. Ces cookies sont déposés <strong className="text-foreground">uniquement après consentement explicite</strong> de l'utilisateur, recueilli via un bandeau cookies conforme aux recommandations CNIL :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Le refus est aussi simple que l'acceptation</li>
            <li>Le retrait du consentement est possible à tout moment depuis la page Paramètres &gt; Cookies</li>
            <li>En cas de refus, aucun cookie de mesure d'audience n'est déposé</li>
            <li>Les données collectées sont anonymisées (anonymisation IP activée)</li>
            <li>Durée de conservation : 13 mois maximum</li>
          </ul>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">9.3 Absence de cookies publicitaires</h3>
          <p>Aucun cookie publicitaire ni de retargeting n'est utilisé par la Plateforme.</p>

          {/* 10 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">10. Sécurité des données</h2>
          <p>Les mesures techniques et organisationnelles suivantes sont mises en œuvre pour protéger les données :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Chiffrement des communications</strong> : HTTPS/TLS 1.3 sur l'ensemble du trafic</li>
            <li><strong className="text-foreground">Chiffrement des mots de passe</strong> : algorithme bcrypt</li>
            <li><strong className="text-foreground">Politiques de sécurité au niveau des lignes</strong> (Row Level Security, Supabase) pour cloisonner l'accès aux données</li>
            <li><strong className="text-foreground">Authentification à deux facteurs</strong> disponible pour les comptes administrateurs</li>
            <li><strong className="text-foreground">Accès restreint</strong> aux données de production aux seules personnes habilitées</li>
            <li><strong className="text-foreground">Journalisation des accès</strong> aux données sensibles</li>
            <li><strong className="text-foreground">Sauvegardes chiffrées</strong> quotidiennes avec restauration testée</li>
            <li><strong className="text-foreground">Audits de sécurité</strong> réguliers</li>
          </ul>

          {/* 11 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">11. Procédure en cas de violation de données</h2>
          <p>Conformément aux articles 33 et 34 du RGPD, en cas de violation de données personnelles susceptible d'engendrer un risque pour les droits et libertés des personnes concernées :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Guardiens <strong className="text-foreground">notifie la CNIL</strong> dans un délai maximum de 72 heures après en avoir pris connaissance.</li>
            <li>En cas de risque élevé, Guardiens <strong className="text-foreground">informe directement les utilisateurs concernés</strong> dans les meilleurs délais, par email, en précisant la nature de la violation, les conséquences probables et les mesures prises.</li>
            <li>Un registre interne des violations est tenu conformément à l'article 33.5 du RGPD.</li>
          </ul>

          {/* 12 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">12. Analyse d'impact relative à la protection des données (AIPD)</h2>
          <p>
            Compte tenu de la nature de certains traitements (vérification d'identité, géolocalisation, communications entre membres), une <strong className="text-foreground">analyse d'impact relative à la protection des données</strong> (AIPD) sera réalisée conformément à l'article 35 du RGPD avant le 15 juillet 2026, date du passage payant. Cette analyse est mise à jour à chaque évolution majeure du service.
          </p>

          {/* 13 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">13. Mineurs</h2>
          <p>
            La Plateforme est strictement réservée aux personnes majeures (18 ans révolus). La création de compte par un mineur est interdite et entraîne la suppression immédiate du compte ainsi que l'effacement des données.
          </p>
          <p>
            Les utilisateurs s'engagent à ne pas publier de photographies de mineurs identifiables sans le consentement écrit de leurs représentants légaux. Toute publication contraire fait l'objet d'un retrait immédiat et peut entraîner la suspension du compte.
          </p>

          {/* 14 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">14. Modification de la présente Politique</h2>
          <p>
            Guardiens se réserve le droit de modifier la présente Politique de confidentialité. Les utilisateurs sont informés de toute modification substantielle par notification sur la Plateforme et par email au moins 30 jours avant son entrée en vigueur. La date de dernière mise à jour figure en tête de document.
          </p>

          {/* 15 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">15. Réclamation auprès de la CNIL</h2>
          <p>
            Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés ou que le traitement de vos données constitue une violation du RGPD, vous avez le droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Site web</strong> : <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr/fr/plaintes</a></li>
            <li><strong className="text-foreground">Adresse postale</strong> : CNIL, 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</li>
            <li><strong className="text-foreground">Téléphone</strong> : 01 53 73 22 22</li>
          </ul>

          {/* 16 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">16. Contact</h2>
          <p>Pour toute question relative à la protection de vos données :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">DPO / Point de contact RGPD</strong> : <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a></li>
            <li><strong className="text-foreground">Contact général</strong> : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a></li>
            <li><strong className="text-foreground">Adresse</strong> : 22 rue Juiverie, 69005 Lyon, France</li>
          </ul>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Privacy;
