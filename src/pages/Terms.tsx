import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Conditions générales d'utilisation | Guardiens"
        description="Consultez les conditions générales d'utilisation de la plateforme Guardiens : engagements, responsabilités, droits et obligations des membres."
        path="/cgu"
      />
      <PublicHeader />

      <main className="px-6 md:px-12 py-16 max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">
          Conditions Générales d'Utilisation
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Version 5, Dernière mise à jour : 3 mai 2026
        </p>

        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p>
            Les présentes Conditions Générales d'Utilisation (ci-après «&nbsp;CGU&nbsp;») régissent l'accès et l'utilisation de la plateforme Guardiens. Elles s'appliquent conjointement aux{" "}
            <a href="/cgs" className="text-primary hover:underline">Conditions Générales de Services</a>
            {" "}(qui régissent les conditions commerciales et tarifaires) et à la{" "}
            <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>
            {" "}(qui détaille le traitement des données personnelles).
          </p>
          <p>
            L'utilisation de la Plateforme implique l'acceptation pleine et entière de ces trois documents.
          </p>

          {/* 1 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">1. Éditeur de la Plateforme</h2>
          <p>
            La plateforme Guardiens (ci-après «&nbsp;la Plateforme&nbsp;»), accessible à l'adresse{" "}
            <a href="https://guardiens.fr" className="text-primary hover:underline">guardiens.fr</a>, est éditée par&nbsp;:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Jérémie Martinot</strong>, entrepreneur individuel</li>
            <li><strong className="text-foreground">SIRET</strong> : 894 864 040 00015</li>
            <li><strong className="text-foreground">Adresse</strong> : 22 rue Juiverie, 69005 Lyon, France</li>
            <li><strong className="text-foreground">Email</strong> : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a></li>
            <li><strong className="text-foreground">Directeur de la publication</strong> : Jérémie Martinot</li>
            <li><strong className="text-foreground">TVA non applicable</strong>, article 293 B du Code général des impôts</li>
          </ul>
          <p>
            <strong className="text-foreground">Hébergement des données</strong> : Supabase Inc., région eu-central-1 (Francfort, Allemagne).
          </p>
          <p>
            <strong className="text-foreground">Infrastructure CDN et sécurité</strong> : Cloudflare Ireland Limited (Dublin, Irlande).
          </p>
          <p>
            <strong className="text-foreground">Interface applicative</strong> : Lovable Labs, société d'origine suédoise, représentée dans l'Union européenne par Lovable Labs AB (Stockholm).
          </p>
          <p><strong className="text-foreground">Langue contractuelle</strong> : français.</p>

          {/* 2 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">2. Objet</h2>
          <p>
            Les présentes CGU définissent les règles d'accès et d'utilisation de la Plateforme, qui met en relation des propriétaires de logements et d'animaux avec des gardiens, dans une logique d'échange de bons procédés non lucratif (house-sitting).
          </p>
          <p>
            L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU, des <a href="/cgs" className="text-primary hover:underline">Conditions Générales de Services</a> et de la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>. Cette acceptation se matérialise lors de la création du compte par une case à cocher distincte et non pré-cochée.
          </p>

          {/* 3 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">3. Statut juridique : double régime éditeur / hébergeur</h2>
          <p>La Plateforme combine deux régimes juridiques distincts, qui déterminent l'étendue de la responsabilité de Guardiens&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Régime «&nbsp;éditeur&nbsp;»</strong> pour les contenus éditoriaux Guardiens (guides locaux, fiches races, articles, pages institutionnelles, charte graphique). Guardiens en assume la responsabilité éditoriale au sens de la loi du 29 juillet 1881 et de la LCEN.</li>
            <li><strong className="text-foreground">Régime «&nbsp;hébergeur&nbsp;»</strong> au sens de l'article 6-I-2 de la LCEN pour les contenus utilisateurs (annonces, profils, photos, avis, messages, candidatures). Guardiens n'a pas d'obligation générale de surveillance&nbsp;; sa responsabilité ne peut être engagée du fait de ces contenus que si, dûment notifiée dans les conditions de l'article 14, elle n'a pas agi promptement pour les retirer.</li>
          </ul>
          <p>
            La Plateforme constitue par ailleurs un service intermédiaire au sens du Règlement (UE) 2022/2065 du 19 octobre 2022 (Digital Services Act, ci-après «&nbsp;DSA&nbsp;»).
          </p>

          {/* 4 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">4. Définitions</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Propriétaire</strong> : utilisateur publiant des annonces de garde de logement et/ou d'animaux.</li>
            <li><strong className="text-foreground">Gardien</strong> : utilisateur postulant pour effectuer une garde.</li>
            <li><strong className="text-foreground">Garde</strong> : période durant laquelle un gardien occupe le logement d'un propriétaire et prend soin de ses animaux.</li>
            <li><strong className="text-foreground">Petite mission</strong> : entraide ponctuelle entre membres, sans nuitée et sans contrepartie financière.</li>
            <li><strong className="text-foreground">Avis</strong> : évaluation publiée par un utilisateur après une garde ou une mission.</li>
            <li><strong className="text-foreground">Contenu utilisateur</strong> : tout élément publié par un utilisateur sur la Plateforme (annonce, profil, photo, message, avis, candidature).</li>
          </ul>

          {/* 5 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">5. Inscription, compte et protection des mineurs</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">5.1 Conditions d'inscription</h3>
          <p>L'inscription est strictement réservée aux personnes physiques majeures (18 ans révolus) capables juridiquement. La Plateforme n'est pas accessible aux mineurs.</p>
          <p>L'utilisateur s'engage à fournir des informations exactes, complètes et à jour, et à les actualiser sans délai en cas de changement. Toute fausse déclaration concernant l'âge ou l'identité entraîne la suspension immédiate du compte, sans préjudice des poursuites éventuelles.</p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">5.2 Acceptation explicite des CGU, CGS et Politique de confidentialité</h3>
          <p>L'acceptation des CGU, des CGS et de la Politique de confidentialité s'effectue par une case à cocher non pré-cochée, distincte de toute autre acceptation (notamment marketing). La case d'acceptation est obligatoire pour finaliser l'inscription. Le consentement marketing fait l'objet d'une case séparée et facultative.</p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">5.3 Sécurité du compte</h3>
          <p>Les identifiants de connexion sont confidentiels, uniques et personnels. Chaque utilisateur est responsable de toutes les activités réalisées à l'aide de ses identifiants et de l'utilisation abusive de ces données. L'utilisateur s'engage à ne pas transmettre ses identifiants à un tiers, y compris à un autre utilisateur.</p>
          <p>En cas de perte, de vol ou de soupçon d'usage frauduleux de ses identifiants, l'utilisateur informe sans délai Guardiens à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a> afin que les mesures appropriées soient prises (réinitialisation, suspension temporaire).</p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">5.4 Protection des mineurs</h3>
          <p>Conformément à l'article 8 du RGPD et à la loi pour une République numérique, Guardiens prend les mesures appropriées pour empêcher l'inscription de mineurs. Toute information révélant qu'un compte a été créé par un mineur entraîne la suppression immédiate du compte et l'effacement des données associées.</p>
          <p>Les utilisateurs sont expressément interdits de publier des photographies de mineurs identifiables sans le consentement écrit de leurs représentants légaux.</p>

          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">5.5 Accès accidentel à un autre compte</h3>
          <p>Si un utilisateur accède, par inadvertance, à l'espace personnel d'un autre utilisateur, il s'engage à en informer immédiatement Guardiens à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>, à considérer comme strictement confidentielles toutes les informations dont il aurait eu connaissance à cette occasion, et à ne pas les divulguer ni les exploiter de quelque manière que ce soit.</p>

          {/* 6 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">6. Nature de la relation entre utilisateurs</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">6.1 Rôle d'intermédiaire</h3>
          <p>Guardiens agit exclusivement en tant qu'intermédiaire technique de mise en relation. La Plateforme n'est ni partie, ni mandataire, ni garante des accords conclus entre utilisateurs.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">6.2 Qualification juridique</h3>
          <p>Le house-sitting tel que proposé sur Guardiens repose sur un échange de bons procédés (garde d'animaux contre hébergement à titre gratuit) à titre non lucratif. Il ne constitue pas&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>un contrat de travail (absence de lien de subordination, de rémunération et d'horaire imposé)&nbsp;;</li>
            <li>une prestation de services à titre onéreux soumise à déclaration URSSAF&nbsp;;</li>
            <li>un contrat de bail ou de sous-location au sens de la loi n°&nbsp;89-462 du 6 juillet 1989&nbsp;;</li>
            <li>un hébergement touristique soumis à la taxe de séjour (occupation à titre gratuit, sans transaction financière directe).</li>
          </ul>
          <p>Les parties peuvent, si elles le souhaitent, formaliser leur accord sous la forme d'un prêt à usage (commodat) régi par les articles 1875 et suivants du Code civil.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">6.3 Conditions matérielles de la garde</h3>
          <p>Les utilisateurs sont seuls responsables des modalités pratiques de la garde (remise des clés, périmètre d'occupation, accès aux pièces, gestion des effets personnels). Il leur appartient de&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>vérifier que leur assurance multirisque habitation (MRH) couvre la présence d'un tiers occupant le logement à titre gratuit, et de souscrire une extension le cas échéant&nbsp;;</li>
            <li>vérifier que leur responsabilité civile personnelle est en cours de validité&nbsp;;</li>
            <li>convenir par écrit (via la messagerie interne ou via le dispositif d'accord de garde proposé par la Plateforme) des conditions de la garde avant son commencement.</li>
          </ul>
          <p>Guardiens met à disposition un guide pratique non contractuel ainsi qu'un dispositif d'accord de garde optionnel et non bloquant.</p>

          {/* 7 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">7. Petites missions (entraide)</h2>
          <p>Les petites missions sont des échanges d'entraide ponctuels entre membres, sans nuitée. Elles fonctionnent exclusivement sur le principe de l'<strong className="text-foreground">échange en nature</strong> (repas, produits du jardin, service réciproque). Tout échange d'argent est strictement interdit et expose le compte à une suspension immédiate.</p>
          <p>Ces échanges entre particuliers, à titre non lucratif et sans recherche de profit, ne constituent pas, en principe, des revenus imposables (cf. BOI-IR-BASE-10-10-10-10 et instruction fiscale du 30 août 2016 relative aux revenus issus de l'économie collaborative). Chaque utilisateur reste néanmoins seul responsable de ses obligations déclaratives au titre de la solidarité et de l'entraide entre particuliers.</p>

          {/* 8 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">8. Vérification d'identité</h2>
          <p>
            La Plateforme prévoit un dispositif de vérification d'identité optionnel, qui sera mis en œuvre par un prestataire spécialisé lorsque le service atteindra la maturité technique et le volume d'usage justifiant son ouverture.
          </p>
          <p>
            À la date des présentes, ce dispositif n'est pas actif. La confiance entre utilisateurs repose sur la rencontre physique préalable à toute garde, les avis croisés publiés après chaque garde ou petite mission, l'historique visible sur chaque profil, et les mécanismes de signalement et de modération décrits aux articles 10 et 14.
          </p>
          <p>
            Les utilisateurs seront informés par email, avec un préavis de trente (30) jours, de l'activation du dispositif de vérification d'identité. Les modalités précises (prestataire retenu, base légale, conservation, exercice des droits) seront alors publiées dans la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a> et rendues opposables par un avenant aux présentes CGU.
          </p>

          {/* 9 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">9. Avis en ligne (art. L.&nbsp;111-7-2 C. conso)</h2>
          <p>Conformément à l'article L.&nbsp;111-7-2 du Code de la consommation et au décret n°&nbsp;2017-1436 du 29 septembre 2017, Guardiens informe les utilisateurs des modalités de collecte, de modération et de publication des avis&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Origine</strong> : seuls les utilisateurs ayant effectivement réalisé une garde ou une mission via la Plateforme peuvent déposer un avis sur leur partenaire d'échange.</li>
            <li><strong className="text-foreground">Contrôle préalable</strong> : aucun contrôle automatisé préalable n'est effectué. Les avis sont publiés immédiatement après dépôt, sous réserve d'un contrôle a posteriori en cas de signalement.</li>
            <li><strong className="text-foreground">Critères de rejet</strong> : un avis peut être retiré s'il contient des propos injurieux, diffamatoires, discriminatoires, hors sujet, des données personnelles de tiers, ou s'il est manifestement de mauvaise foi.</li>
            <li><strong className="text-foreground">Délai de publication</strong> : immédiat à compter du dépôt.</li>
            <li><strong className="text-foreground">Date affichée</strong> : la date de publication et la date de la garde concernée sont systématiquement indiquées.</li>
            <li><strong className="text-foreground">Droit de réponse</strong> : l'utilisateur évalué peut répondre publiquement à l'avis dans un délai de 30 jours.</li>
            <li><strong className="text-foreground">Signalement</strong> : tout utilisateur peut signaler un avis qu'il estime non conforme via le formulaire dédié. Guardiens examine le signalement dans les 14 jours ouvrés.</li>
            <li><strong className="text-foreground">Aucune contrepartie</strong> : aucun avantage n'est consenti en échange d'un avis&nbsp;; les avis ne sont ni achetés, ni filtrés sur la base de leur note.</li>
            <li><strong className="text-foreground">Conservation après suppression de compte</strong> : les avis sont conservés sous forme anonymisée afin de préserver l'intégrité du système d'évaluation, sur le fondement de l'intérêt légitime (art. 6.1.f RGPD).</li>
          </ul>

          {/* 10 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">10. Comportement des utilisateurs</h2>
          <p>Tout utilisateur s'engage à&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>utiliser la Plateforme de manière respectueuse et conforme à la loi&nbsp;;</li>
            <li>fournir des informations exactes et actualisées, et ne pas usurper l'identité d'un tiers&nbsp;;</li>
            <li>ne pas publier de contenu diffamatoire, discriminatoire, haineux, illicite ou trompeur&nbsp;;</li>
            <li>ne pas harceler, menacer, intimider ou discriminer un autre utilisateur, notamment en raison du sexe, de l'orientation sexuelle, de la religion, de l'origine, de l'âge, d'un handicap ou de toute autre caractéristique personnelle&nbsp;;</li>
            <li>ne pas publier de photographies de mineurs identifiables sans le consentement écrit de leurs représentants légaux&nbsp;;</li>
            <li>ne pas utiliser la Plateforme à des fins commerciales non autorisées, ni pour réaliser des opérations de prospection commerciale non sollicitée&nbsp;;</li>
            <li>ne pas tenter de contourner les systèmes de sécurité, de modération ou les mesures techniques protégeant la Plateforme&nbsp;;</li>
            <li>ne pas réaliser de tests d'intrusion, attaques par déni de service, ou toute action visant à compromettre la disponibilité ou l'intégrité de la Plateforme&nbsp;;</li>
            <li>ne pas utiliser de robots, scripts d'extraction automatisée, scrapers, ou techniques similaires pour collecter, extraire ou réutiliser tout ou partie des contenus de la Plateforme, notamment les annonces et profils publiés par les autres utilisateurs&nbsp;;</li>
            <li>ne pas réutiliser, intégrer ou republier les contenus de la Plateforme sur un autre site, application ou support, numérique ou papier, sans autorisation écrite préalable&nbsp;;</li>
            <li>signaler tout comportement abusif via le système prévu à l'article 14.</li>
          </ul>
          <p>Tout manquement à ces engagements peut entraîner la suspension ou la résiliation immédiate du compte, sans préjudice des poursuites éventuelles et des mesures prévues à l'article 11.</p>

          {/* 11 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">11. Sanctions et mesures de modération</h2>
          <p>Guardiens se réserve le droit, sans préavis, de&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>supprimer ou masquer tout contenu utilisateur contraire aux présentes CGU ou à la loi&nbsp;;</li>
            <li>suspendre temporairement un compte en cas de violation présumée des CGU&nbsp;;</li>
            <li>résilier définitivement un compte en cas de violation grave ou répétée des CGU.</li>
          </ul>
          <p>Toute décision de modération fait l'objet d'une motivation et d'une notification à l'utilisateur concerné, dans les conditions de l'article 14.</p>

          {/* 12 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">12. Propriété intellectuelle</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">12.1 Éléments Guardiens</h3>
          <p>L'ensemble des éléments composant la Plateforme (textes éditoriaux, illustrations, logos, charte graphique, bases de données, code source, structure et organisation des contenus) est la propriété exclusive de Guardiens, sauf mention contraire. Toute reproduction, représentation, adaptation ou exploitation non autorisée est passible de poursuites au titre des articles L.&nbsp;335-2 et suivants du CPI.</p>
          <p>Guardiens concède à l'utilisateur un droit d'utilisation personnel, non exclusif et non cessible de la Plateforme, strictement limité à un usage conforme aux présentes CGU.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">12.2 Contenus utilisateurs</h3>
          <p>Les utilisateurs conservent l'intégralité de leurs droits sur les contenus qu'ils publient. Ils accordent à Guardiens, conformément à l'article L.&nbsp;131-3 du CPI, une licence non exclusive, gratuite, pour le monde entier, pour la durée strictement nécessaire à la diffusion sur la Plateforme, augmentée d'un délai technique maximal de 30 jours permettant la purge des sauvegardes, aux seules fins&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>d'affichage et de diffusion des contenus sur la Plateforme et ses canaux officiels&nbsp;;</li>
            <li>de promotion de la Plateforme sous une forme anonymisée si l'utilisateur n'a pas consenti expressément à son identification.</li>
          </ul>
          <p>Cette licence prend fin à la suppression du contenu ou du compte, sous réserve des contenus déjà diffusés par des tiers indépendants de la Plateforme.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">12.3 Interdictions spécifiques</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>accéder ou tenter d'accéder aux codes sources de la Plateforme&nbsp;;</li>
            <li>décompiler, désassembler ou extraire la Plateforme, sauf dans la stricte mesure autorisée par la loi&nbsp;;</li>
            <li>créer des œuvres dérivées à partir de la Plateforme&nbsp;;</li>
            <li>revendre, louer ou exploiter commercialement la Plateforme.</li>
          </ul>

          {/* 13 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">13. Responsabilité, garantie et plafond d'indemnisation</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.1 Régime applicable</h3>
          <p>La responsabilité de Guardiens s'apprécie au regard du double régime décrit à l'article 3.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.2 Exclusions</h3>
          <p>Sous réserve des dispositions légales d'ordre public, Guardiens ne peut être tenu responsable&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>des litiges survenant entre utilisateurs&nbsp;;</li>
            <li>des dommages matériels ou immatériels survenus lors d'une garde ou d'une petite mission, hors faute lourde ou dolosive imputable à Guardiens&nbsp;;</li>
            <li>de la véracité des informations fournies par les utilisateurs&nbsp;;</li>
            <li>de l'indisponibilité temporaire de la Plateforme due à une opération de maintenance ou à un cas de force majeure&nbsp;;</li>
            <li>du contenu échangé entre utilisateurs dans la messagerie interne.</li>
          </ul>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.3 Garanties expressément réservées</h3>
          <p>Aucune clause des présentes CGU ne saurait être interprétée comme excluant ou limitant la responsabilité de Guardiens en cas de&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>faute lourde ou dolosive&nbsp;;</li>
            <li>atteinte à l'intégrité physique ou à la vie d'une personne&nbsp;;</li>
            <li>manquement aux garanties légales de conformité (art. L.&nbsp;217-3 et s. C. conso) et des vices cachés (art. 1641 C. civ.)&nbsp;;</li>
            <li>violation d'une obligation d'ordre public.</li>
          </ul>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.4 Plafond d'indemnisation</h3>
          <p>Sans préjudice des cas visés au 13.3, et conformément à l'article 1231-3 du Code civil, la responsabilité totale de Guardiens envers un utilisateur, tous chefs de préjudices confondus et toutes causes confondues, est expressément limitée au montant des sommes effectivement versées par cet utilisateur à Guardiens au titre des douze (12) derniers mois précédant le fait générateur du dommage. Pour les utilisateurs n'ayant versé aucune somme (Propriétaires, comptes non abonnés ou en période de gratuité de lancement), ce plafond est fixé à cent (100) euros.</p>
          <p>Cette stipulation reflète l'équilibre économique d'un service à très faible coût et ne saurait être considérée comme excluant la réparation d'un préjudice essentiel.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.5 Disponibilité du service</h3>
          <p>Guardiens s'engage à fournir ses meilleurs efforts pour assurer la disponibilité de la Plateforme 24/7, sans toutefois souscrire d'engagement chiffré de niveau de service (SLA). Cette obligation est une obligation de moyens.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.6 Assurance des utilisateurs</h3>
          <p>Les utilisateurs sont vivement invités à souscrire une assurance responsabilité civile et à vérifier la couverture de leur MRH avant toute garde.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">13.7 Action récursoire</h3>
          <p>Dans l'hypothèse où Guardiens viendrait à faire l'objet d'une réclamation, d'une procédure amiable ou d'une action judiciaire à raison d'un usage fautif de la Plateforme par un utilisateur ou d'un manquement de celui-ci aux présentes CGU, Guardiens se réserve le droit de se retourner contre cet utilisateur pour obtenir l'indemnisation intégrale des préjudices, condamnations, frais et honoraires en découlant.</p>

          {/* 14 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">14. Modération, signalement, recours (LCEN &amp; DSA)</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">14.1 Notification de contenus illicites</h3>
          <p>Conformément à l'article 16 du DSA et à l'article 6-I-5 de la LCEN, tout utilisateur peut signaler un contenu qu'il estime illicite via le formulaire de signalement intégré à chaque fiche, ou par email à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. La notification doit comprendre&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>l'identification précise du contenu (URL ou capture)&nbsp;;</li>
            <li>les motifs précis du signalement et la qualification juridique alléguée&nbsp;;</li>
            <li>les coordonnées du notifiant&nbsp;;</li>
            <li>une déclaration de bonne foi.</li>
          </ul>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">14.2 Traitement et motivation</h3>
          <p>Guardiens accuse réception du signalement et l'examine dans un délai cible de 14 jours ouvrés. Toute décision de modération (retrait, déréférencement, restriction de visibilité, suspension ou résiliation de compte) est motivée et notifiée à l'utilisateur concerné, conformément à l'article 17 du DSA.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">14.3 Recours interne</h3>
          <p>Conformément à l'article 20 du DSA, l'utilisateur destinataire d'une décision de modération dispose d'un droit de recours interne à exercer dans un délai de 6 mois auprès de <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. Le recours est examiné par une personne distincte de celle ayant pris la décision initiale, dans un délai de 14 jours ouvrés.</p>
          <p>À défaut de résolution interne satisfaisante, l'utilisateur peut recourir aux voies prévues à l'article 19 des présentes CGU.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">14.4 Point de contact unique</h3>
          <p>Le point de contact unique au sens des articles 11 et 12 du DSA, joignable par les autorités et les utilisateurs, est&nbsp;: <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">14.5 Signaleurs de confiance et transparence</h3>
          <p>Les signalements émanant de signaleurs de confiance désignés au titre de l'article 22 du DSA sont traités en priorité. Guardiens publie chaque année, à titre volontaire, des statistiques agrégées de modération (nombre de signalements reçus, décisions prises, recours exercés).</p>

          {/* 15 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">15. Modification des CGU</h2>
          <p>Guardiens se réserve le droit de modifier les présentes CGU. Les utilisateurs sont informés par notification sur la Plateforme et par email au moins 30 jours avant l'entrée en vigueur de toute modification substantielle.</p>
          <p>Sont considérées comme modifications substantielles&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>toute modification des finalités du traitement des données&nbsp;;</li>
            <li>toute restriction ou suppression d'un service essentiel&nbsp;;</li>
            <li>toute modification des règles de modération ou de résiliation&nbsp;;</li>
            <li>toute modification du régime de responsabilité ou du plafond d'indemnisation.</li>
          </ul>
          <p>En cas de refus des nouvelles conditions, l'utilisateur dispose du droit de résilier son compte sans frais ni pénalité avant la date d'entrée en vigueur. L'utilisation continue de la Plateforme après cette date vaut acceptation des nouvelles conditions.</p>
          <p>Les évolutions tarifaires et commerciales sont régies par les <a href="/cgs" className="text-primary hover:underline">Conditions Générales de Services</a>.</p>

          {/* 16 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">16. Données personnelles et cookies</h2>
          <p>
            Le traitement des données personnelles est décrit dans la <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>, accessible à guardiens.fr/confidentialite.
          </p>
          <p>
            La Plateforme utilise des cookies strictement nécessaires à son fonctionnement, exemptés de consentement, ainsi que des cookies de mesure d'audience soumis au consentement préalable de l'utilisateur, conformément à l'article 82 de la loi Informatique et Libertés. Le refus est aussi simple que l'acceptation et n'empêche pas l'accès au service. Le détail des traceurs figure sur la page guardiens.fr/cookies.
          </p>

          {/* 17 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">17. Force majeure</h2>
          <p>Aucune des parties ne pourra être tenue responsable d'un manquement à ses obligations résultant d'un cas de force majeure au sens de l'article 1218 du Code civil.</p>

          {/* 18 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">18. Cession et transfert d'exploitation</h2>
          <p>En cas de cession, fusion, ou apport partiel d'actif portant sur l'exploitation de la Plateforme, les présentes CGU et les données associées pourront être transférées au cessionnaire, dans les conditions prévues par le RGPD. L'utilisateur en sera informé préalablement et pourra résilier son compte sans frais ni pénalité dans un délai de 30 jours suivant cette notification.</p>

          {/* 19 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">19. Réclamations et résolution des litiges</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">19.1 Procédure amiable</h3>
          <p>Toute réclamation doit être adressée par écrit à <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a>. Guardiens s'engage à accuser réception sous 7 jours ouvrés et à apporter une réponse motivée dans un délai maximal de 30 jours.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">19.2 Voies de recours</h3>
          <p>En cas de désaccord persistant après la procédure amiable, le consommateur conserve la faculté de saisir&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>la <strong className="text-foreground">plateforme européenne de Règlement en Ligne des Litiges</strong> (RLL), accessible à&nbsp;: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr</a>&nbsp;;</li>
            <li>les <strong className="text-foreground">autorités administratives compétentes</strong>, notamment la DGCCRF via SignalConso (<a href="https://signal.conso.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://signal.conso.gouv.fr</a>)&nbsp;;</li>
            <li>la <strong className="text-foreground">juridiction compétente</strong> conformément à l'article 21.</li>
          </ul>

          {/* 20 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">20. Convention de preuve, nullité partielle</h2>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">20.1 Convention de preuve</h3>
          <p>Conformément à l'article 1368 du Code civil, les enregistrements informatiques (logs de connexion, horodatages, échanges via la messagerie interne, traces d'acceptation des CGU et de paiement) conservés sur les serveurs de Guardiens font foi entre les parties à titre de preuve, sauf preuve contraire apportée par tout moyen.</p>
          <h3 className="font-heading text-lg font-semibold text-foreground pt-2">20.2 Nullité partielle</h3>
          <p>Si une clause des présentes CGU était déclarée nulle ou inapplicable par une décision de justice définitive, les autres clauses demeureraient en vigueur. Les parties s'efforceraient de remplacer la clause invalide par une stipulation équivalente économiquement et juridiquement valide.</p>

          {/* 21 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">21. Droit applicable et juridiction compétente</h2>
          <p>Les présentes CGU sont régies par le droit français.</p>
          <p>Sans préjudice des règles d'ordre public en matière de protection des consommateurs (notamment l'article R.&nbsp;631-3 du Code de la consommation), qui permettent au consommateur de saisir, à son choix, soit l'une des juridictions territorialement compétentes en vertu du Code de procédure civile, soit la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou de la survenance du fait dommageable.</p>

          {/* 22 */}
          <h2 className="font-heading text-xl font-bold text-foreground pt-4">22. Contact</h2>
          <p>Pour toute question relative aux présentes CGU&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Email</strong> : <a href="mailto:contact@guardiens.fr" className="text-primary hover:underline">contact@guardiens.fr</a></li>
            <li><strong className="text-foreground">Adresse</strong> : 22 rue Juiverie, 69005 Lyon, France</li>
          </ul>
          <p>Pour toute question relative à la protection des données personnelles&nbsp;:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-foreground">Email</strong> : <a href="mailto:dpo@guardiens.fr" className="text-primary hover:underline">dpo@guardiens.fr</a></li>
          </ul>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Terms;
