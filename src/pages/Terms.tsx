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

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Éditeur de la Plateforme</h2>
          <p>
            La plateforme Guardiens (ci-après « la Plateforme »), accessible à l'adresse <a href="https://guardiens.fr" className="text-primary hover:underline">guardiens.fr</a>, est éditée par :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Jérémie Martinot</strong>, entrepreneur individuel</li>
            <li>SIRET : 894 864 040 00015</li>
            <li>Adresse : 22 rue Juiverie, 69005 Lyon, France</li>
            <li>Email : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a></li>
            <li>Directeur de la publication : Jérémie Martinot</li>
          </ul>
          <p>
            <strong className="text-foreground">Hébergeur</strong> : les informations relatives à l'hébergeur de la Plateforme sont disponibles sur la page Mentions légales.
          </p>
          <p>
            La Plateforme est qualifiée d'<strong className="text-foreground">hébergeur</strong> au sens de l'article 6-I-2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN) et de <strong className="text-foreground">service intermédiaire</strong> au sens du Règlement (UE) 2022/2065 du 19 octobre 2022 (Digital Services Act, ci-après « DSA »). Langue contractuelle : français.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Objet</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la Plateforme, qui met en relation des propriétaires de logements et d'animaux avec des gardiens, dans une logique d'échange de bons procédés non lucratif (house-sitting). L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Définitions</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Propriétaire</strong> : utilisateur publiant des annonces de garde de logement et/ou d'animaux.</li>
            <li><strong className="text-foreground">Gardien</strong> : utilisateur postulant pour effectuer une garde.</li>
            <li><strong className="text-foreground">Garde</strong> : période durant laquelle un gardien occupe le logement d'un propriétaire et prend soin de ses animaux.</li>
            <li><strong className="text-foreground">Petite mission</strong> : entraide ponctuelle entre membres, sans nuitée et sans contrepartie financière.</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Inscription et compte</h2>
          <p>
            L'inscription est ouverte à toute personne physique majeure (18 ans révolus) capable juridiquement. L'utilisateur s'engage à fournir des informations exactes, complètes et à jour. Toute fausse déclaration concernant l'âge ou l'identité entraîne la suspension immédiate du compte, sans préjudice des poursuites éventuelles.
          </p>
          <p>
            Chaque utilisateur est responsable de la confidentialité de ses identifiants et de toute activité réalisée sous son compte. Guardiens se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU, de comportement frauduleux ou de signalements répétés, dans le respect des garanties prévues à l'article 12 (modération).
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Services proposés et tarification</h2>
          <p>La Plateforme propose les services suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Publication et consultation d'annonces de garde</li>
            <li>Système de candidatures et de messagerie interne</li>
            <li>Avis croisés entre propriétaires et gardiens</li>
            <li>Guides locaux et fiches races</li>
            <li>Petites missions d'entraide communautaire</li>
            <li>Vérification d'identité optionnelle</li>
          </ul>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">Tarifs</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Espace Propriétaire</strong> : gratuit, sans limite de durée.</li>
            <li><strong className="text-foreground">Espace Gardien</strong> : abonnement standard à <strong className="text-foreground">9 € TTC par mois</strong>, sans engagement, résiliable à tout moment.</li>
            <li><strong className="text-foreground">Petites missions</strong> : gratuites pour tous les membres, sans limite de durée.</li>
            <li><strong className="text-foreground">Programme Fondateur</strong> : les utilisateurs inscrits avant le 13 mai 2026 bénéficient de conditions préférentielles, détaillées sur la page Tarifs.</li>
            <li><strong className="text-foreground">Parrainage</strong> : un mois d'abonnement Gardien offert par filleul actif, dans les conditions précisées sur la page dédiée.</li>
          </ul>
          <p>
            Aucune commission n'est prélevée sur les gardes ou sur les petites missions. Les prix sont exprimés en euros toutes taxes comprises (TVA non applicable, art. 293 B du CGI le cas échéant).
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Nature de la relation entre utilisateurs</h2>
          <p>
            Guardiens agit exclusivement en tant qu'<strong className="text-foreground">intermédiaire technique de mise en relation</strong>. La Plateforme n'est ni partie, ni mandataire, ni garante des accords conclus entre utilisateurs.
          </p>
          <p>
            Le house-sitting tel que proposé sur Guardiens repose sur un échange de bons procédés (garde d'animaux contre hébergement gratuit) à titre non lucratif. Il <strong className="text-foreground">ne constitue pas</strong> :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>un contrat de travail (absence de lien de subordination, de rémunération et d'horaire imposé) ;</li>
            <li>une prestation de services à titre onéreux soumise à déclaration URSSAF ;</li>
            <li>un contrat de bail ou de sous-location au sens de la loi n° 89-462 du 6 juillet 1989.</li>
          </ul>
          <p>
            Les parties peuvent, si elles le souhaitent, formaliser leur accord sous la forme d'un prêt à usage (commodat) régi par les articles 1875 et suivants du Code civil.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Petites missions</h2>
          <p>
            Les petites missions sont des échanges d'entraide ponctuels entre membres, sans nuitée. Elles fonctionnent exclusivement sur le principe de l'échange en nature (repas, produits du jardin, service réciproque). <strong className="text-foreground">Tout échange d'argent est strictement interdit</strong> et expose le compte à une suspension immédiate.
          </p>
          <p>
            Ces échanges entre particuliers à titre non lucratif et sans recherche de profit ne constituent pas, en principe, des revenus imposables (cf. BOI-IR-BASE-10-10-10-10). Chaque utilisateur reste néanmoins responsable de sa propre situation fiscale.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Responsabilités et limitations</h2>
          <p>
            En sa qualité d'hébergeur (art. 6-I-2 LCEN), Guardiens n'est pas soumis à une obligation générale de surveillance des contenus. Sa responsabilité ne peut être engagée du fait des contenus stockés que si, dûment notifié dans les conditions prévues à l'article 12, elle n'a pas agi promptement pour les retirer.
          </p>
          <p>Sous réserve des dispositions légales d'ordre public, Guardiens ne peut être tenu responsable :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>des litiges survenant entre utilisateurs ;</li>
            <li>des dommages matériels ou immatériels survenus lors d'une garde, hors faute lourde ou dolosive imputable à Guardiens ;</li>
            <li>de la véracité des informations fournies par les utilisateurs ;</li>
            <li>de l'indisponibilité temporaire de la Plateforme due à une opération de maintenance, un cas fortuit ou de force majeure ;</li>
            <li>du contenu échangé entre utilisateurs dans la messagerie interne.</li>
          </ul>
          <p>
            <strong className="text-foreground">Sont expressément réservées</strong> : la responsabilité de Guardiens en cas de faute lourde, de dol, ou d'atteinte à l'intégrité physique d'une personne, conformément aux articles 1231-1 et suivants du Code civil et à l'article R. 212-1 du Code de la consommation. Aucune clause des présentes CGU ne saurait être interprétée comme excluant ces cas.
          </p>
          <p>
            Les utilisateurs sont vivement invités à souscrire une assurance responsabilité civile et à vérifier que leur assurance habitation couvre la présence d'un tiers occupant le logement.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Vérification d'identité</h2>
          <p>
            Guardiens propose un système optionnel de vérification d'identité reposant sur l'analyse d'un document officiel par un prestataire spécialisé agissant en qualité de sous-traitant au sens de l'article 28 du RGPD. Cette vérification atteste qu'un utilisateur a soumis un document jugé conforme. Elle <strong className="text-foreground">ne constitue pas une garantie absolue</strong> de fiabilité, d'honnêteté ou de compétence de l'utilisateur.
          </p>
          <p>
            La base légale du traitement est le consentement (art. 6.1.a RGPD). Les pièces d'identité collectées sont conservées pour une durée maximale conforme à la doctrine CNIL applicable, puis supprimées. L'utilisateur peut retirer son consentement à tout moment depuis son espace.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">10. Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments composant la Plateforme (textes éditoriaux, illustrations, logos, charte graphique, bases de données, code source) est la propriété exclusive de Guardiens, sauf mention contraire. Toute reproduction, représentation, adaptation ou exploitation non autorisée est passible de poursuites au titre des articles L. 335-2 et suivants du Code de la propriété intellectuelle.
          </p>
          <p>
            Les utilisateurs conservent l'intégralité de leurs droits sur les contenus qu'ils publient (photos, descriptifs, avis). Ils accordent à Guardiens, conformément à l'article L. 131-3 du CPI, une licence <strong className="text-foreground">non exclusive, gratuite</strong>, pour le monde entier, et pour la <strong className="text-foreground">durée d'utilisation de la Plateforme augmentée de 12 mois</strong>, aux seules fins :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>d'affichage et de diffusion des contenus sur la Plateforme et ses canaux officiels ;</li>
            <li>de promotion de la Plateforme (réseaux sociaux, communication institutionnelle) sous une forme anonymisée si l'utilisateur n'a pas consenti expressément à son identification.</li>
          </ul>
          <p>
            Cette licence prend fin à la suppression du contenu ou du compte, sous réserve de la conservation technique des contenus déjà diffusés (sauvegardes, captures, partages tiers indépendants).
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">11. Comportement des utilisateurs</h2>
          <p>Tout utilisateur s'engage à :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>utiliser la Plateforme de manière respectueuse et conforme à la loi ;</li>
            <li>ne pas publier de contenu diffamatoire, discriminatoire, haineux, illicite ou trompeur ;</li>
            <li>ne pas utiliser la Plateforme à des fins commerciales non autorisées ;</li>
            <li>ne pas tenter de contourner les systèmes de sécurité ou de modération ;</li>
            <li>signaler tout comportement abusif via le système prévu à l'article 12.</li>
          </ul>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">12. Modération, signalement et DSA</h2>
          <p>
            Conformément à l'article 16 du Règlement (UE) 2022/2065 (DSA) et à l'article 6-I-5 de la LCEN, tout utilisateur peut signaler un contenu qu'il estime illicite via le formulaire de signalement intégré à chaque fiche, ou par email à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. La notification doit comprendre :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>l'identification du contenu (URL ou capture) ;</li>
            <li>les motifs précis du signalement ;</li>
            <li>les coordonnées du notifiant ;</li>
            <li>une déclaration de bonne foi.</li>
          </ul>
          <p>
            Guardiens accuse réception du signalement et examine la demande dans les meilleurs délais. Toute décision de modération (retrait, déréférencement, suspension de compte) est <strong className="text-foreground">motivée</strong> et notifiée à l'utilisateur concerné, qui dispose d'un <strong className="text-foreground">droit de recours interne</strong> à exercer dans un délai de 6 mois auprès de <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>.
          </p>
          <p>
            Le point de contact unique au sens des articles 11 et 12 du DSA est joignable à la même adresse.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">13. Droit de rétractation</h2>
          <p>
            Conformément à l'article L. 221-18 du Code de la consommation, l'utilisateur consommateur dispose d'un délai de <strong className="text-foreground">14 jours</strong> à compter de la souscription de l'abonnement Gardien pour exercer son droit de rétractation, sans avoir à motiver sa décision ni à supporter de pénalités.
          </p>
          <p>
            Pour exercer ce droit, l'utilisateur peut :
          </p>
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
            <strong className="text-foreground">Renonciation expresse</strong> : conformément à l'article L. 221-25 du Code de la consommation, l'utilisateur qui souhaite que l'exécution du service commence avant l'expiration du délai de 14 jours doit en faire la demande expresse, en cochant la case dédiée lors de la souscription. Dans ce cas, il reconnaît perdre son droit de rétractation dès que la prestation est pleinement exécutée.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">14. Résiliation et suppression de compte</h2>
          <p>
            L'utilisateur peut résilier son abonnement et supprimer son compte à tout moment depuis les paramètres de son profil. La suppression entraîne une <strong className="text-foreground">période de grâce de 30 jours</strong> durant laquelle le compte peut être réactivé. Au-delà, les données de profil sont supprimées ou anonymisées conformément à la Politique de confidentialité ; les avis publiés sont conservés sous forme anonymisée pour préserver l'intégrité du système d'évaluation.
          </p>
          <p>
            <strong className="text-foreground">Aucun remboursement prorata temporis</strong> n'est effectué pour la fraction d'abonnement déjà entamée, sauf exercice du droit de rétractation dans le délai légal (article 13).
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">15. Modification des CGU</h2>
          <p>
            Guardiens se réserve le droit de modifier les présentes CGU. Les utilisateurs sont informés par notification sur la Plateforme et par email <strong className="text-foreground">au moins 30 jours</strong> avant l'entrée en vigueur de toute modification substantielle.
          </p>
          <p>
            En cas de refus des nouvelles conditions, l'utilisateur dispose du droit de <strong className="text-foreground">résilier son compte sans frais ni pénalité</strong> avant la date d'entrée en vigueur. L'utilisation continue de la Plateforme après cette date vaut acceptation des nouvelles conditions.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">16. Données personnelles et cookies</h2>
          <p>
            Le traitement des données personnelles est décrit dans la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>. La Plateforme n'utilise que des cookies strictement nécessaires à son fonctionnement, conformément à la doctrine CNIL.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">17. Force majeure</h2>
          <p>
            Aucune des parties ne pourra être tenue responsable d'un manquement à ses obligations résultant d'un cas de force majeure au sens de l'article 1218 du Code civil.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">18. Nullité partielle</h2>
          <p>
            Si une clause des présentes CGU était déclarée nulle ou inapplicable, les autres clauses demeureraient en vigueur. Les parties s'efforceraient de remplacer la clause invalide par une stipulation équivalente économiquement et juridiquement valide.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">19. Droit applicable, médiation et juridictions compétentes</h2>
          <p>
            Les présentes CGU sont régies par le droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire.
          </p>
          <p>
            Conformément aux articles L. 611-1 et R. 612-1 du Code de la consommation, le consommateur peut recourir gratuitement à un <strong className="text-foreground">médiateur de la consommation</strong>. Le médiateur compétent sera communiqué dès sa désignation. Plus d'informations sur <a href="https://www.economie.gouv.fr/mediation-conso" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">economie.gouv.fr/mediation-conso</a>.
          </p>
          <p>
            La plateforme européenne de Règlement en Ligne des Litiges (RLL) est accessible à : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ec.europa.eu/consumers/odr</a>.
          </p>
          <p>
            À défaut de résolution amiable, les tribunaux français sont compétents. <strong className="text-foreground">Sans préjudice des règles d'ordre public en matière de protection des consommateurs</strong> (notamment l'article R. 631-3 du Code de la consommation), qui permettent au consommateur de saisir, à son choix, la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable.
          </p>

          <h2 className="font-heading text-xl font-bold text-foreground pt-4">20. Contact</h2>
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
