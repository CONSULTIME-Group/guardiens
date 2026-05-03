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
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-8">
          Conditions Générales d'Utilisation
        </h1>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p className="text-sm">Dernière mise à jour : 3 mai 2026</p>

          {/* ============ 1. ÉDITEUR ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Éditeur de la Plateforme</h2>
          <p>
            La plateforme Guardiens (ci-après « la Plateforme »), accessible à l'adresse{" "}
            <a href="https://guardiens.fr" className="text-primary hover:underline">guardiens.fr</a>, est éditée par :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Jérémie Martinot</strong>, entrepreneur individuel</li>
            <li>SIRET : 894 864 040 00015</li>
            <li>Adresse : 22 rue Juiverie, 69005 Lyon, France</li>
            <li>Email : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a></li>
            <li>Directeur de la publication : Jérémie Martinot</li>
            <li>TVA non applicable, art. 293 B du CGI</li>
          </ul>
          <p>
            <strong className="text-foreground">Hébergeur</strong> : les coordonnées de l'hébergeur technique de la Plateforme sont disponibles sur la page <a href="/mentions-legales" className="text-primary hover:underline">Mentions légales</a>. Langue contractuelle : français.
          </p>

          {/* ============ 2. OBJET ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Objet</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la Plateforme, qui met en relation des propriétaires de logements et d'animaux avec des gardiens, dans une logique d'échange de bons procédés non lucratif (house-sitting). L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU.
          </p>

          {/* ============ 3. STATUT JURIDIQUE ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Statut juridique : double régime éditeur / hébergeur</h2>
          <p>
            La Plateforme combine deux régimes juridiques distincts, qui déterminent l'étendue de la responsabilité de Guardiens :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong className="text-foreground">Régime « éditeur »</strong> pour les <strong className="text-foreground">contenus éditoriaux Guardiens</strong> (guides locaux, fiches races, articles, pages institutionnelles, charte graphique). Guardiens en assume la responsabilité éditoriale au sens de la loi du 29 juillet 1881 et de la LCEN.
            </li>
            <li>
              <strong className="text-foreground">Régime « hébergeur »</strong> au sens de l'article 6-I-2 de la LCEN pour les <strong className="text-foreground">contenus utilisateurs</strong> (annonces, profils, photos, avis, messages, candidatures). Guardiens n'a pas d'obligation générale de surveillance ; sa responsabilité ne peut être engagée du fait de ces contenus que si, dûment notifiée dans les conditions de l'article 13, elle n'a pas agi promptement pour les retirer.
            </li>
            <li>
              <strong className="text-foreground">Service intermédiaire</strong> au sens du Règlement (UE) 2022/2065 du 19 octobre 2022 (Digital Services Act, ci-après « DSA »).
            </li>
          </ul>

          {/* ============ 4. DÉFINITIONS ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Définitions</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Propriétaire</strong> : utilisateur publiant des annonces de garde de logement et/ou d'animaux.</li>
            <li><strong className="text-foreground">Gardien</strong> : utilisateur postulant pour effectuer une garde.</li>
            <li><strong className="text-foreground">Garde</strong> : période durant laquelle un gardien occupe le logement d'un propriétaire et prend soin de ses animaux.</li>
            <li><strong className="text-foreground">Petite mission</strong> : entraide ponctuelle entre membres, sans nuitée et sans contrepartie financière.</li>
            <li><strong className="text-foreground">Avis</strong> : évaluation publiée par un utilisateur après une garde ou une mission.</li>
          </ul>

          {/* ============ 5. INSCRIPTION ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Inscription et compte</h2>
          <p>
            L'inscription est ouverte à toute personne physique majeure (18 ans révolus) capable juridiquement. L'utilisateur s'engage à fournir des informations exactes, complètes et à jour. Toute fausse déclaration concernant l'âge ou l'identité entraîne la suspension immédiate du compte, sans préjudice des poursuites éventuelles.
          </p>
          <p>
            Chaque utilisateur est responsable de la confidentialité de ses identifiants et de toute activité réalisée sous son compte. Guardiens se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU, dans le respect des garanties de motivation et de recours prévues à l'article 13.
          </p>

          {/* ============ 6. SERVICES ET TARIFS ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Services proposés et tarification</h2>
          <p>La Plateforme propose les services suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Publication et consultation d'annonces de garde</li>
            <li>Système de candidatures et de messagerie interne</li>
            <li>Avis croisés entre propriétaires et gardiens (cf. article 11)</li>
            <li>Guides locaux et fiches races</li>
            <li>Petites missions d'entraide communautaire</li>
            <li>Vérification d'identité optionnelle (cf. article 10)</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">Tarifs</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Espace Propriétaire</strong> : gratuit, sans carte bancaire requise, sans limite de durée.</li>
            <li><strong className="text-foreground">Espace Gardien</strong> : abonnement standard à <strong className="text-foreground">6,99 € TTC par mois</strong>, sans engagement, résiliable à tout moment depuis l'espace personnel. Un essai gratuit est proposé lors de la première souscription, sans prélèvement automatique à l'issue de la période d'essai (l'utilisateur choisit explicitement de poursuivre).</li>
            <li><strong className="text-foreground">Petites missions (entraide)</strong> : gratuites pour tous les membres, sans condition d'abonnement et sans limite de durée.</li>
            <li><strong className="text-foreground">Programme Fondateur, parrainage et offres promotionnelles</strong> : les conditions, durées et modalités des offres ponctuelles (gratuité étendue, remises, badge, mois offert par filleul actif) sont précisées sur les pages dédiées de la Plateforme et peuvent évoluer dans le temps.</li>
          </ul>
          <p>
            Aucune commission n'est prélevée sur les gardes ou sur les petites missions. Les prix sont exprimés en euros toutes taxes comprises.
          </p>

          {/* ============ 7. NATURE DE LA RELATION ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Nature de la relation entre utilisateurs</h2>
          <p>
            Guardiens agit exclusivement en tant qu'<strong className="text-foreground">intermédiaire technique de mise en relation</strong>. La Plateforme n'est ni partie, ni mandataire, ni garante des accords conclus entre utilisateurs.
          </p>
          <p>
            Le house-sitting tel que proposé sur Guardiens repose sur un échange de bons procédés (garde d'animaux contre hébergement à titre gratuit) à titre non lucratif. Il <strong className="text-foreground">ne constitue pas</strong> :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>un contrat de travail (absence de lien de subordination, de rémunération et d'horaire imposé) ;</li>
            <li>une prestation de services à titre onéreux soumise à déclaration URSSAF ;</li>
            <li>un contrat de bail ou de sous-location au sens de la loi n° 89-462 du 6 juillet 1989 ;</li>
            <li>un hébergement touristique soumis à la taxe de séjour (occupation à titre gratuit, sans transaction financière directe).</li>
          </ul>
          <p>
            Les parties peuvent, si elles le souhaitent, formaliser leur accord sous la forme d'un prêt à usage (commodat) régi par les articles 1875 et suivants du Code civil.
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">Conditions matérielles de la garde</h3>
          <p>
            Les utilisateurs sont seuls responsables des modalités pratiques de la garde (remise des clés, périmètre d'occupation, accès aux pièces, gestion des effets personnels). Il leur appartient de :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>vérifier que leur <strong className="text-foreground">assurance multirisque habitation (MRH)</strong> couvre la présence d'un tiers occupant le logement à titre gratuit, et de souscrire une extension le cas échéant ;</li>
            <li>vérifier que leur <strong className="text-foreground">responsabilité civile</strong> personnelle est en cours de validité ;</li>
            <li>convenir par écrit (via la messagerie interne) des conditions de la garde avant son commencement.</li>
          </ul>
          <p>
            Guardiens met à disposition un guide pratique non contractuel ainsi qu'un dispositif de confirmation mutuelle préalable à toute garde.
          </p>

          {/* ============ 8. PETITES MISSIONS ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Petites missions (entraide)</h2>
          <p>
            Les petites missions sont des échanges d'entraide ponctuels entre membres, sans nuitée. Elles fonctionnent exclusivement sur le principe de l'échange en nature (repas, produits du jardin, service réciproque). <strong className="text-foreground">Tout échange d'argent est strictement interdit</strong> et expose le compte à une suspension immédiate.
          </p>
          <p>
            Ces échanges entre particuliers à titre non lucratif et sans recherche de profit ne constituent pas, en principe, des revenus imposables (cf. BOI-IR-BASE-10-10-10-10). Chaque utilisateur reste néanmoins responsable de sa propre situation fiscale.
          </p>

          {/* ============ 9. RESPONSABILITÉ ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Responsabilité, garantie et plafond d'indemnisation</h2>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">9.1 Régime applicable</h3>
          <p>
            La responsabilité de Guardiens s'apprécie au regard du double régime décrit à l'article 3.
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">9.2 Exclusions</h3>
          <p>Sous réserve des dispositions légales d'ordre public, Guardiens ne peut être tenu responsable :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>des litiges survenant entre utilisateurs ;</li>
            <li>des dommages matériels ou immatériels survenus lors d'une garde ou d'une petite mission, hors faute lourde ou dolosive imputable à Guardiens ;</li>
            <li>de la véracité des informations fournies par les utilisateurs ;</li>
            <li>de l'indisponibilité temporaire de la Plateforme due à une opération de maintenance ou à un cas de force majeure (article 19) ;</li>
            <li>du contenu échangé entre utilisateurs dans la messagerie interne.</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">9.3 Garanties expressément réservées</h3>
          <p>
            <strong className="text-foreground">Aucune clause des présentes CGU ne saurait être interprétée comme excluant ou limitant</strong> la responsabilité de Guardiens en cas de :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>faute lourde ou dolosive ;</li>
            <li>atteinte à l'intégrité physique ou à la vie d'une personne ;</li>
            <li>manquement aux garanties légales de conformité (art. L. 217-3 et s. C. conso) et des vices cachés (art. 1641 C. civ.) ;</li>
            <li>violation d'une obligation d'ordre public.</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">9.4 Plafond d'indemnisation</h3>
          <p>
            Sans préjudice des cas visés au 9.3, et conformément à l'article 1231-3 du Code civil, la responsabilité totale de Guardiens envers un utilisateur, tous chefs de préjudices confondus et toutes causes confondues, est expressément limitée au montant des sommes effectivement versées par cet utilisateur à Guardiens au titre des <strong className="text-foreground">douze (12) derniers mois</strong> précédant le fait générateur du dommage. Pour les utilisateurs n'ayant versé aucune somme (Propriétaires, comptes en période d'essai), ce plafond est fixé à <strong className="text-foreground">cent (100) euros</strong>. Cette stipulation reflète l'équilibre économique d'un service à très faible coût et ne saurait être considérée comme excluant la réparation d'un préjudice essentiel.
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">9.5 Disponibilité du service</h3>
          <p>
            Guardiens s'engage à fournir ses meilleurs efforts pour assurer la disponibilité de la Plateforme 24/7, sans toutefois souscrire d'engagement chiffré de niveau de service (SLA). Cette obligation est une obligation de moyens.
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">9.6 Assurance des utilisateurs</h3>
          <p>
            Les utilisateurs sont vivement invités à souscrire une assurance responsabilité civile et à vérifier la couverture de leur MRH avant toute garde (cf. article 7).
          </p>

          {/* ============ 10. VÉRIFICATION ID ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">10. Vérification d'identité</h2>
          <p>
            Guardiens propose un système optionnel de vérification d'identité reposant sur l'analyse d'un document officiel par un prestataire spécialisé agissant en qualité de sous-traitant au sens de l'article 28 du RGPD. Cette vérification atteste qu'un utilisateur a soumis un document jugé conforme. Elle <strong className="text-foreground">ne constitue pas une garantie absolue</strong> de fiabilité, d'honnêteté ou de compétence de l'utilisateur.
          </p>
          <p>
            La base légale du traitement est le consentement (art. 6.1.a RGPD). Les pièces d'identité et données biométriques éventuelles sont conservées pour une durée maximale de <strong className="text-foreground">douze (12) mois</strong> après la vérification, conformément à la doctrine CNIL (délibération n° 2005-208 et orientations CNIL relatives au KYC), sauf obligation légale contraire (notamment LCB-FT). L'utilisateur peut retirer son consentement et demander la suppression de ses pièces à tout moment depuis son espace.
          </p>

          {/* ============ 11. AVIS ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">11. Avis en ligne (art. L. 111-7-2 C. conso)</h2>
          <p>
            Conformément à l'article L. 111-7-2 du Code de la consommation et au décret n° 2017-1436 du 29 septembre 2017, Guardiens informe les utilisateurs des modalités de collecte, de modération et de publication des avis :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Origine</strong> : seuls les utilisateurs ayant effectivement réalisé une garde ou une mission via la Plateforme peuvent déposer un avis sur leur partenaire d'échange.</li>
            <li><strong className="text-foreground">Contrôle préalable</strong> : aucun contrôle automatisé préalable n'est effectué. Les avis sont publiés immédiatement après dépôt, sous réserve d'un contrôle a posteriori en cas de signalement.</li>
            <li><strong className="text-foreground">Critères de rejet</strong> : un avis peut être retiré s'il contient des propos injurieux, diffamatoires, discriminatoires, hors sujet, des données personnelles de tiers, ou s'il est manifestement de mauvaise foi.</li>
            <li><strong className="text-foreground">Délai de publication</strong> : immédiat à compter du dépôt.</li>
            <li><strong className="text-foreground">Date affichée</strong> : la date de publication et la date de la garde concernée sont systématiquement indiquées.</li>
            <li><strong className="text-foreground">Droit de réponse</strong> : l'utilisateur évalué peut répondre publiquement à l'avis dans un délai de 30 jours.</li>
            <li><strong className="text-foreground">Signalement</strong> : tout utilisateur peut signaler un avis qu'il estime non conforme via le formulaire dédié. Guardiens examine le signalement dans les 14 jours ouvrés.</li>
            <li><strong className="text-foreground">Aucune contrepartie</strong> : aucun avantage n'est consenti en échange d'un avis ; les avis ne sont ni achetés, ni filtrés sur la base de leur note.</li>
            <li><strong className="text-foreground">Conservation après suppression de compte</strong> : les avis sont conservés sous forme anonymisée afin de préserver l'intégrité du système d'évaluation, sur le fondement de l'intérêt légitime (art. 6.1.f RGPD).</li>
          </ul>

          {/* ============ 12. COMPORTEMENT ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">12. Comportement des utilisateurs</h2>
          <p>Tout utilisateur s'engage à :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>utiliser la Plateforme de manière respectueuse et conforme à la loi ;</li>
            <li>ne pas publier de contenu diffamatoire, discriminatoire, haineux, illicite ou trompeur ;</li>
            <li>ne pas publier de photographies de mineurs identifiables sans le consentement écrit de leurs représentants légaux ;</li>
            <li>ne pas utiliser la Plateforme à des fins commerciales non autorisées ;</li>
            <li>ne pas tenter de contourner les systèmes de sécurité ou de modération ;</li>
            <li>signaler tout comportement abusif via le système prévu à l'article 13.</li>
          </ul>

          {/* ============ 13. MODÉRATION DSA ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">13. Modération, signalement, recours (LCEN &amp; DSA)</h2>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.1 Notification de contenus illicites</h3>
          <p>
            Conformément à l'article 16 du DSA et à l'article 6-I-5 de la LCEN, tout utilisateur peut signaler un contenu qu'il estime illicite via le formulaire de signalement intégré à chaque fiche, ou par email à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. La notification doit comprendre :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>l'identification précise du contenu (URL ou capture) ;</li>
            <li>les motifs précis du signalement et la qualification juridique alléguée ;</li>
            <li>les coordonnées du notifiant ;</li>
            <li>une déclaration de bonne foi.</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.2 Traitement et motivation</h3>
          <p>
            Guardiens accuse réception du signalement et l'examine dans un délai cible de <strong className="text-foreground">14 jours ouvrés</strong>. Toute décision de modération (retrait, déréférencement, restriction de visibilité, suspension ou résiliation de compte) est <strong className="text-foreground">motivée</strong> et notifiée à l'utilisateur concerné, conformément à l'article 17 du DSA.
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.3 Recours interne</h3>
          <p>
            Conformément à l'article 20 du DSA, l'utilisateur destinataire d'une décision de modération dispose d'un <strong className="text-foreground">droit de recours interne</strong> à exercer dans un délai de 6 mois auprès de <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. Le recours est examiné par une personne distincte de celle ayant pris la décision initiale, dans un délai de 14 jours ouvrés. À défaut de résolution interne satisfaisante, l'utilisateur peut saisir un organe de règlement extrajudiciaire des litiges agréé au titre de l'article 21 du DSA, ou la médiation de la consommation (article 21 ci-dessous).
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.4 Point de contact unique</h3>
          <p>
            Le point de contact unique au sens des articles 11 et 12 du DSA, joignable par les autorités et les utilisateurs, est : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>.
          </p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.5 Signaleurs de confiance et transparence</h3>
          <p>
            Les signalements émanant de signaleurs de confiance désignés au titre de l'article 22 du DSA sont traités en priorité. Guardiens publie chaque année, à titre volontaire, des statistiques agrégées de modération (nombre de signalements reçus, décisions prises, recours exercés).
          </p>

          {/* ============ 14. PROPRIÉTÉ INTELLECTUELLE ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">14. Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments composant la Plateforme (textes éditoriaux, illustrations, logos, charte graphique, bases de données, code source) est la propriété exclusive de Guardiens, sauf mention contraire. Toute reproduction, représentation, adaptation ou exploitation non autorisée est passible de poursuites au titre des articles L. 335-2 et suivants du CPI.
          </p>
          <p>
            Les utilisateurs conservent l'intégralité de leurs droits sur les contenus qu'ils publient. Ils accordent à Guardiens, conformément à l'article L. 131-3 du CPI, une licence <strong className="text-foreground">non exclusive, gratuite</strong>, pour le monde entier, pour la durée strictement nécessaire à la diffusion sur la Plateforme, augmentée d'un délai technique maximal de <strong className="text-foreground">30 jours</strong> permettant la purge des sauvegardes, aux seules fins :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>d'affichage et de diffusion des contenus sur la Plateforme et ses canaux officiels ;</li>
            <li>de promotion de la Plateforme sous une forme anonymisée si l'utilisateur n'a pas consenti expressément à son identification.</li>
          </ul>
          <p>
            Cette licence prend fin à la suppression du contenu ou du compte, sous réserve des contenus déjà diffusés par des tiers indépendants de la Plateforme.
          </p>

          {/* ============ 15. RÉTRACTATION ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">15. Droit de rétractation</h2>
          <p>
            Conformément à l'article L. 221-18 du Code de la consommation, l'utilisateur consommateur dispose d'un délai de <strong className="text-foreground">14 jours</strong> à compter de la souscription de l'abonnement Gardien pour exercer son droit de rétractation, sans avoir à motiver sa décision ni à supporter de pénalités.
          </p>
          <p>Pour exercer ce droit, l'utilisateur peut :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>adresser une déclaration claire à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a> ;</li>
            <li>ou utiliser le <strong className="text-foreground">formulaire-type de rétractation</strong> reproduit ci-dessous (annexe à l'art. R. 221-1 C. conso) :</li>
          </ul>
          <blockquote className="border-l-4 border-primary pl-4 italic">
            « À l'attention de Jérémie Martinot — Guardiens, 22 rue Juiverie, 69005 Lyon, contact@guardiens.fr : Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous : [abonnement Gardien]. Commandé le [date]. Nom du consommateur : […]. Adresse : […]. Date : […]. Signature (uniquement si notification papier). »
          </blockquote>
          <p>
            Le remboursement intervient dans un délai de <strong className="text-foreground">14 jours</strong> à compter de la réception de la demande, par le même moyen de paiement que celui utilisé pour la transaction initiale, sauf accord exprès contraire.
          </p>
          <p>
            <strong className="text-foreground">Renonciation expresse</strong> : conformément à l'article L. 221-25 du Code de la consommation, l'utilisateur qui souhaite que l'exécution du service commence avant l'expiration du délai de 14 jours doit en faire la demande expresse, par une <strong className="text-foreground">case à cocher distincte de l'acceptation des CGU</strong> lors de la souscription. Dans ce cas, il reconnaît perdre son droit de rétractation dès que la prestation est pleinement exécutée.
          </p>

          {/* ============ 16. RÉSILIATION ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">16. Résiliation et suppression de compte</h2>
          <p>
            L'utilisateur peut résilier son abonnement et supprimer son compte à tout moment depuis les paramètres de son profil. La suppression entraîne une <strong className="text-foreground">période de grâce de 30 jours</strong> durant laquelle le compte peut être réactivé. Au-delà, les données de profil sont supprimées ou anonymisées conformément à la Politique de confidentialité ; les avis publiés sont conservés sous forme anonymisée (cf. article 11) sur le fondement de l'intérêt légitime.
          </p>
          <p>
            <strong className="text-foreground">Aucun remboursement prorata temporis</strong> n'est effectué pour la fraction d'abonnement déjà entamée, sauf exercice du droit de rétractation dans le délai légal (article 15).
          </p>

          {/* ============ 17. MODIF CGU ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">17. Modification des CGU</h2>
          <p>
            Guardiens se réserve le droit de modifier les présentes CGU. Les utilisateurs sont informés par notification sur la Plateforme et par email <strong className="text-foreground">au moins 30 jours</strong> avant l'entrée en vigueur de toute modification substantielle.
          </p>
          <p>
            En cas de refus des nouvelles conditions, l'utilisateur dispose du droit de <strong className="text-foreground">résilier son compte sans frais ni pénalité</strong> avant la date d'entrée en vigueur. L'utilisation continue de la Plateforme après cette date vaut acceptation des nouvelles conditions.
          </p>

          {/* ============ 18. RGPD ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">18. Données personnelles et cookies</h2>
          <p>
            Le traitement des données personnelles est décrit dans la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>. La Plateforme n'utilise que des cookies strictement nécessaires à son fonctionnement, conformément à la doctrine CNIL (aucun bandeau requis).
          </p>

          {/* ============ 19. FORCE MAJEURE ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">19. Force majeure</h2>
          <p>
            Aucune des parties ne pourra être tenue responsable d'un manquement à ses obligations résultant d'un cas de force majeure au sens de l'article 1218 du Code civil.
          </p>

          {/* ============ 20. CESSION ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">20. Cession et transfert d'exploitation</h2>
          <p>
            En cas de cession, fusion, ou apport partiel d'actif portant sur l'exploitation de la Plateforme, les présentes CGU et les données associées pourront être transférées au cessionnaire, dans les conditions prévues par le RGPD. L'utilisateur en sera informé préalablement et pourra résilier son compte sans frais ni pénalité dans un délai de 30 jours suivant cette notification.
          </p>

          {/* ============ 21. PREUVE ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">21. Convention de preuve</h2>
          <p>
            Conformément à l'article 1368 du Code civil, les enregistrements informatiques (logs de connexion, horodatages, échanges via la messagerie interne, traces d'acceptation des CGU et de paiement) conservés sur les serveurs de Guardiens font foi entre les parties à titre de preuve, sauf preuve contraire apportée par tout moyen.
          </p>

          {/* ============ 22. NULLITÉ ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">22. Nullité partielle</h2>
          <p>
            Si une clause des présentes CGU était déclarée nulle ou inapplicable par une décision de justice définitive, les autres clauses demeureraient en vigueur. Les parties s'efforceraient de remplacer la clause invalide par une stipulation équivalente économiquement et juridiquement valide.
          </p>

          {/* ============ 23. MÉDIATION ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">23. Réclamations et résolution amiable</h2>
          <p>
            <strong className="text-foreground">Réclamation interne préalable</strong> : avant toute action contentieuse ou démarche externe, l'utilisateur s'engage à adresser sa réclamation par email à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>, en précisant l'objet du différend et les éléments justificatifs. Guardiens accuse réception sous 7 jours ouvrés et s'efforce d'apporter une réponse motivée dans un délai maximum de <strong className="text-foreground">deux (2) mois</strong>.
          </p>
          <p>
            <strong className="text-foreground">Médiation de la consommation</strong> : le dispositif prévu aux articles L. 611-1 et suivants du Code de la consommation s'applique aux litiges nés d'un contrat de vente ou de fourniture de services à titre onéreux entre un professionnel et un consommateur. Le service Guardiens étant, à la date des présentes, fourni à titre entièrement gratuit, aucun médiateur de la consommation n'est désigné à ce stade. Un médiateur agréé par la Commission d'évaluation et de contrôle de la médiation de la consommation (CECMC) sera désigné préalablement à l'ouverture de toute offre payante destinée aux consommateurs ; ses coordonnées seront alors publiées sur la page <a href="/mentions-legales#mediation" className="text-primary hover:underline">Mentions légales</a> et indiquées dans toute réponse écrite à une réclamation, conformément à l'article R. 616-1 du Code de la consommation. La liste officielle des médiateurs agréés est consultable sur <a href="https://www.economie.gouv.fr/mediation-conso" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">economie.gouv.fr/mediation-conso</a>, et la plateforme européenne de règlement en ligne des litiges est accessible sur <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
          </p>
          <p>
            <strong className="text-foreground">Règlement en ligne des litiges (UE)</strong> : la plateforme européenne RLL est accessible à : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
          </p>

          {/* ============ 24. DROIT APPLICABLE ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">24. Droit applicable et juridictions compétentes</h2>
          <p>
            Les présentes CGU sont régies par le droit français. À défaut de résolution amiable, les tribunaux français sont compétents.
          </p>
          <p>
            <strong className="text-foreground">Sans préjudice des règles d'ordre public en matière de protection des consommateurs</strong> (notamment l'article R. 631-3 du Code de la consommation), qui permettent au consommateur de saisir, à son choix, soit l'une des juridictions territorialement compétentes en vertu du Code de procédure civile, soit la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable.
          </p>

          {/* ============ 25. CONTACT ============ */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">25. Contact</h2>
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
