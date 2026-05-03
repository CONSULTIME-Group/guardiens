import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Politique de confidentialité — Guardiens"
        description="Comment Guardiens collecte, utilise et protège vos données personnelles, conformément au RGPD et à la loi Informatique et Libertés."
        path="/confidentialite"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">

        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">Politique de confidentialité</h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p className="text-sm">Dernière mise à jour : 3 mai 2026</p>

          <p>
            La présente politique décrit la manière dont Guardiens collecte, utilise, conserve et protège les données à caractère personnel des personnes utilisant la Plateforme, conformément au règlement (UE) 2016/679 du 27 avril 2016 (RGPD) et à la loi n° 78-17 du 6 janvier 1978 modifiée (loi Informatique et Libertés). Elle s'applique cumulativement avec les <a href="/cgu" className="text-primary hover:underline">Conditions générales d'utilisation</a> et les <a href="/mentions-legales" className="text-primary hover:underline">Mentions légales</a>.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Responsable du traitement</h2>
          <p>
            Le responsable du traitement des données personnelles est :<br />
            <strong className="text-foreground">Guardiens — Jérémie Martinot (entrepreneur individuel)</strong><br />
            22 rue Juiverie, 69005 Lyon, France<br />
            SIRET : 894 864 040 00015<br />
            Contact : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Point de contact « Données personnelles »</h2>
          <p>
            Compte tenu de la nature et du volume actuel des traitements, Guardiens n'est pas légalement tenu de désigner un délégué à la protection des données au sens de l'article 37 du RGPD. Un point de contact dédié est néanmoins mis à votre disposition pour toute question relative à la protection de vos données : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>, en précisant la mention « Données personnelles » dans l'objet du message.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Données collectées</h2>
          <p>Les catégories de données suivantes sont susceptibles d'être collectées :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Identification</strong> : nom, prénom, adresse email, mot de passe (haché, jamais stocké en clair), date de naissance.</li>
            <li><strong className="text-foreground">Profil public</strong> : photo, biographie, ville, code postal, rôle (propriétaire/gardien), expériences déclarées.</li>
            <li><strong className="text-foreground">Annonces et logements</strong> : caractéristiques du logement, équipements, photos, localisation approximative (point d'ancrage cartographique).</li>
            <li><strong className="text-foreground">Animaux</strong> : espèce, race, âge, particularités, soins nécessaires.</li>
            <li><strong className="text-foreground">Communications</strong> : messages échangés sur la messagerie interne, signalements, avis publiés.</li>
            <li><strong className="text-foreground">Vérification d'identité</strong> (facultative) : copie d'une pièce d'identité, traitée puis supprimée après contrôle.</li>
            <li><strong className="text-foreground">Paiement</strong> (le cas échéant pour l'abonnement gardien) : identifiants techniques transmis par notre prestataire de paiement, à l'exclusion de tout numéro de carte bancaire qui n'est jamais accessible à Guardiens.</li>
            <li><strong className="text-foreground">Données techniques</strong> : adresse IP, type de navigateur, système d'exploitation, logs de connexion et d'activité.</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Finalités et bases légales</h2>
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left text-foreground">Finalité</th>
                <th className="p-2 text-left text-foreground">Base légale (art. 6 RGPD)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border"><td className="p-2">Création et gestion de compte</td><td className="p-2">Exécution du contrat (art. 6.1.b)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Mise en relation propriétaires/gardiens et entraide</td><td className="p-2">Exécution du contrat (art. 6.1.b)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Messagerie interne et notifications de service</td><td className="p-2">Exécution du contrat (art. 6.1.b)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Vérification d'identité (facultative)</td><td className="p-2">Consentement (art. 6.1.a)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Mesure d'audience anonymisée (Google Analytics)</td><td className="p-2">Consentement (art. 6.1.a) — recueilli via la bannière</td></tr>
              <tr className="border-t border-border"><td className="p-2">Sécurité, prévention de la fraude, modération</td><td className="p-2">Intérêt légitime (art. 6.1.f)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Gestion de la facturation (abonnement gardien)</td><td className="p-2">Exécution du contrat + obligation légale comptable (art. 6.1.b et 6.1.c)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Réponse aux réquisitions et obligations légales</td><td className="p-2">Obligation légale (art. 6.1.c)</td></tr>
            </tbody>
          </table>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Durée de conservation</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Compte actif</strong> : pendant toute la durée d'utilisation du service.</li>
            <li><strong className="text-foreground">Compte supprimé</strong> : suppression effective après un délai de grâce de 30 jours (cf. <a href="/cgu" className="text-primary hover:underline">CGU</a>, article relatif à la résiliation).</li>
            <li><strong className="text-foreground">Documents d'identité</strong> : supprimés au plus tard 30 jours après vérification.</li>
            <li><strong className="text-foreground">Messages et avis</strong> : conservés pendant la durée du compte.</li>
            <li><strong className="text-foreground">Logs de connexion</strong> : conservés 12 mois conformément aux obligations issues du Code des postes et des communications électroniques et du décret n° 2021-1363.</li>
            <li><strong className="text-foreground">Données de facturation</strong> : conservées 10 ans à compter de la clôture de l'exercice (article L. 123-22 du Code de commerce).</li>
            <li><strong className="text-foreground">Données de prospection</strong> : 3 ans à compter du dernier contact.</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Sous-traitants et destinataires</h2>
          <p>Vos données peuvent être transmises aux sous-traitants suivants, dans le strict cadre du fonctionnement de la Plateforme et sous la couverture d'un contrat conforme à l'article 28 du RGPD :</p>
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left text-foreground">Sous-traitant</th>
                <th className="p-2 text-left text-foreground">Service</th>
                <th className="p-2 text-left text-foreground">Localisation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border"><td className="p-2">Supabase Inc.</td><td className="p-2">Hébergement, base de données, authentification, stockage de fichiers</td><td className="p-2">UE (Francfort) / US</td></tr>
              <tr className="border-t border-border"><td className="p-2">Lovable GmbH</td><td className="p-2">Hébergement de l'interface et déploiement</td><td className="p-2">Allemagne (UE)</td></tr>
              <tr className="border-t border-border"><td className="p-2">Resend Inc.</td><td className="p-2">Envoi d'emails transactionnels</td><td className="p-2">US</td></tr>
              <tr className="border-t border-border"><td className="p-2">Stripe Payments Europe Ltd.</td><td className="p-2">Traitement des paiements (abonnement gardien)</td><td className="p-2">Irlande (UE) / US</td></tr>
              <tr className="border-t border-border"><td className="p-2">Google Ireland Ltd.</td><td className="p-2">Mesure d'audience (Google Analytics), uniquement après consentement</td><td className="p-2">Irlande (UE) / US</td></tr>
              <tr className="border-t border-border"><td className="p-2">OpenStreetMap Foundation</td><td className="p-2">Fonds cartographiques affichés sur la Plateforme</td><td className="p-2">Royaume-Uni</td></tr>
            </tbody>
          </table>
          <p>
            Vos données ne sont jamais vendues, louées ni cédées à des tiers à des fins commerciales.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Transferts hors Union européenne</h2>
          <p>
            Certains sous-traitants peuvent traiter des données depuis les États-Unis. Ces transferts sont encadrés soit par le <em>EU-US Data Privacy Framework</em> (décision d'adéquation de la Commission européenne du 10 juillet 2023), soit, à défaut, par les clauses contractuelles types approuvées par la Commission européenne (décision d'exécution 2021/914), assorties de mesures techniques complémentaires (chiffrement en transit et au repos, contrôle des accès).
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Mineurs</h2>
          <p>
            La Plateforme est strictement réservée aux personnes âgées d'au moins 18 ans. Aucune inscription de mineur n'est autorisée et aucun traitement de données relatives à un mineur n'est effectué de manière intentionnelle. Si vous estimez qu'un mineur s'est inscrit en méconnaissance de cette règle, vous pouvez le signaler à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a> ; le compte concerné sera fermé sans délai et les données associées supprimées.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Prise de décision automatisée et profilage</h2>
          <p>
            Guardiens ne met en œuvre aucune décision exclusivement automatisée produisant des effets juridiques à votre égard ou vous affectant de manière significative au sens de l'article 22 du RGPD. Certains tris d'annonces ou de gardiens reposent sur des critères de proximité géographique, de disponibilité ou de réputation déclarative ; ces opérations relèvent d'un classement de pertinence et n'opèrent aucune décision automatisée individuelle.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">10. Vos droits</h2>
          <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Droit d'accès</strong> (art. 15) : obtenir la confirmation du traitement et une copie de vos données.</li>
            <li><strong className="text-foreground">Droit de rectification</strong> (art. 16) : corriger des données inexactes ou incomplètes.</li>
            <li><strong className="text-foreground">Droit à l'effacement</strong> (art. 17) : demander la suppression de vos données.</li>
            <li><strong className="text-foreground">Droit à la limitation du traitement</strong> (art. 18) : restreindre le traitement dans certains cas.</li>
            <li><strong className="text-foreground">Droit à la portabilité</strong> (art. 20) : recevoir vos données dans un format structuré et lisible par machine.</li>
            <li><strong className="text-foreground">Droit d'opposition</strong> (art. 21) : vous opposer au traitement fondé sur l'intérêt légitime.</li>
            <li><strong className="text-foreground">Droit de retirer votre consentement</strong> à tout moment, sans affecter la licéité du traitement antérieur.</li>
            <li><strong className="text-foreground">Droit de définir des directives post-mortem</strong> (article 85 de la loi n° 78-17) relatives au sort de vos données après votre décès.</li>
          </ul>
          <p>
            Pour exercer l'un de ces droits, adressez votre demande à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a> en mentionnant « Données personnelles » dans l'objet, accompagnée de tout élément permettant de vérifier votre identité. Une réponse vous sera apportée dans un délai d'un mois à compter de la réception, prorogeable de deux mois en cas de demande complexe (article 12.3 du RGPD).
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">11. Cookies et traceurs</h2>
          <p>
            La Plateforme utilise deux catégories de traceurs :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Cookies strictement nécessaires</strong> : authentification, session, préférences d'affichage (thème, état du menu). Conformément à l'article 82 de la loi Informatique et Libertés et aux lignes directrices de la CNIL du 17 septembre 2020, ces cookies sont exemptés de consentement.</li>
            <li><strong className="text-foreground">Cookies de mesure d'audience (Google Analytics)</strong> : déposés uniquement après recueil de votre consentement explicite via la bannière affichée à votre première visite. Vous pouvez retirer votre consentement à tout moment en effaçant les cookies de votre navigateur ou en nous contactant.</li>
          </ul>
          <p>
            Aucun cookie publicitaire ni cookie de profilage commercial n'est déposé.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">12. Sécurité</h2>
          <p>
            Guardiens met en œuvre les mesures techniques et organisationnelles appropriées au regard du risque, conformément à l'article 32 du RGPD :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Chiffrement des communications (HTTPS/TLS 1.2+).</li>
            <li>Hachage des mots de passe (algorithme bcrypt).</li>
            <li>Politiques de sécurité au niveau des lignes (Row Level Security) sur la base de données.</li>
            <li>Cloisonnement des accès, journalisation et revue régulière des permissions.</li>
            <li>Sauvegardes chiffrées et plan de reprise d'activité.</li>
          </ul>
          <p>
            En cas de violation de données susceptible d'engendrer un risque pour vos droits et libertés, Guardiens notifiera la CNIL dans les 72 heures et, le cas échéant, les personnes concernées, conformément aux articles 33 et 34 du RGPD.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">13. Réclamation auprès de la CNIL</h2>
          <p>
            Sans préjudice de tout autre recours administratif ou juridictionnel, vous avez le droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) si vous estimez que le traitement de vos données constitue une violation du RGPD :<br />
            <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr/fr/plaintes</a><br />
            CNIL — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">14. Modifications</h2>
          <p>
            La présente politique peut être mise à jour pour refléter l'évolution de la Plateforme, des traitements ou de la réglementation applicable. La date de dernière mise à jour figure en tête de document. Les modifications substantielles font l'objet d'une information préalable raisonnable des utilisateurs.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">15. Contact</h2>
          <p>
            Pour toute question relative à la protection de vos données :<br />
            Point de contact « Données personnelles » : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Privacy;
