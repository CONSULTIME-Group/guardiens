-- Refonte éditoriale autorisée par Jérémie le 17/10/2026 : choix du gardien et maison sans animaux.
-- Canonique, auteur, couverture, date de publication et indexabilité conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_confiance_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_confiance_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_confiance_20261017 TO service_role;
ALTER TABLE public._backup_articles_confiance_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('32a5c3d1-d4a8-40d1-ac2b-657f4bcb3ab2'::uuid,'174464d9-0f57-4d88-8e21-118bc7a8e0ce'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $confiance_content_0_20261017$# Choisir un gardien de maison : les critères à vérifier

Pour choisir un gardien, commencez par vérifier ses disponibilités sur toutes vos dates, son expérience avec les tâches prévues et sa façon d’organiser ses journées. Les avis et la vérification d’identité apportent des informations complémentaires. **Votre décision doit surtout reposer sur un accord clair : ce dont la maison et les animaux ont besoin, et ce que la personne peut réellement assurer.**

Sur Guardiens, vous publiez votre annonce, échangez avec les personnes intéressées et choisissez à qui confier vos clés. Le gardien est hébergé chez vous en échange des tâches convenues, sans rémunération. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.**

**Dans ce guide**

- [Définir les besoins avant de comparer les candidats](#besoins)
- [Les informations à chercher dans un profil](#profil)
- [Lire les avis et comprendre les indicateurs](#avis)
- [Les questions à poser pendant l’échange](#echanges)
- [Ce qu’il faut confirmer avant de choisir](#organisation)
- [Si aucun candidat ne correspond](#decision)
- [Les questions fréquentes](#faq)

## <a id="besoins"></a>Avant de choisir, de quelle garde avez-vous besoin ?

Une même personne peut être très à l’aise avec des plantes et du courrier, mais ne pas pouvoir assurer les sorties d’un chien ou un traitement à heures fixes. Écrivez d’abord ce que votre garde demande :

- les dates de présence nécessaires, avec les horaires de départ et de retour ;
- les tâches quotidiennes et leur durée approximative ;
- les repas, sorties, soins et comportements particuliers des animaux, s’il y en a ;
- les périodes où une présence est nécessaire et les absences possibles du gardien ;
- les déplacements et les conditions d’accès au logement.

Une annonce précise permet à chacun de voir si la garde lui convient. Le [guide pour rédiger une annonce de house-sitting](/actualites/rediger-bonne-annonce-house-sitting) vous aide à présenter ces informations. Si vous cherchez seulement quelqu’un pour la maison, consultez aussi le guide de la [garde de maison sans animaux](/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal).

## <a id="profil"></a>Quels critères regarder dans le profil d’un gardien ?

Cherchez des éléments qui correspondent à votre situation, plutôt qu’un profil parfait sur tous les points.

| Critère | Ce qui vous aide à décider | La question à préciser |
| --- | --- | --- |
| Disponibilités | La personne peut couvrir les dates annoncées. | À quelle heure arrive-t-elle et repart-elle ? |
| Expérience | Elle décrit des tâches ou des animaux comparables aux vôtres. | Qu’a-t-elle déjà assuré elle-même ? |
| Organisation | Son emploi du temps est compatible avec le quotidien prévu. | Combien de temps sera-t-elle absente du logement ? |
| Déplacements | Elle peut rejoindre la maison et réaliser les trajets convenus. | Avec quel moyen de transport ? |
| Communication | Ses réponses traitent les points concrets de votre annonce. | Comment donnerez-vous des nouvelles pendant la garde ? |
| Conditions de séjour | Le logement et les règles lui conviennent. | Vient-elle seule, accompagnée ou avec un animal ? |

**Le statut professionnel ne donne pas les horaires de présence.** Un télétravailleur peut avoir des réunions ou des déplacements ; une personne qui travaille à l’extérieur peut avoir une organisation compatible avec votre garde. Demandez le planning réel, sans le déduire de l’âge, de la profession ou de la longueur de la biographie.

La proximité peut faciliter une remise des clés ou des échanges avant le départ. Elle ne permet pas de conclure que la personne sera disponible en cas d’imprévu. Si elle vient de loin, discutez du trajet et de l’arrivée ; si elle habite près de chez vous, confirmez tout autant ses disponibilités.

## <a id="avis"></a>Comment lire les avis et comprendre la vérification d’identité ?

### Lire les retours dans leur contexte

Regardez ce que les avis racontent : durée de la garde, tâches assurées, soins, communication et état du logement au retour. Un retour sur un week-end avec des plantes ne répond pas à toutes les questions d’une garde d’un mois avec plusieurs animaux.

Le nombre d’avis et la note donnent un repère, mais ne suffisent pas à comparer deux personnes. Une petite différence de moyenne ne constitue pas un classement fiable à elle seule. Les écussons attribués par d’autres membres complètent ces retours ; ils ne remplacent pas un échange sur votre besoin.

### Un gardien sans avis peut-il convenir ?

L’absence d’avis peut simplement correspondre à un début sur la plateforme. Demandez quelles gardes ou tâches la personne a déjà réalisées, y compris ailleurs, et ce qu’elle connaît de votre situation. Si elle propose des références, examinez-les avec son accord et celui des personnes concernées.

Pour une tâche nouvelle ou délicate, faites préciser ce que le candidat sait faire et ce qu’il ne peut pas prendre en charge. Vous pouvez décider de poursuivre les échanges ou de chercher quelqu’un dont l’expérience correspond davantage à votre besoin.

### Que signifie « Identité vérifiée » sur Guardiens ?

Cet indicateur signale qu’une vérification d’identité a été validée. Il ne certifie ni les compétences de garde, ni la disponibilité, ni la qualité d’un futur séjour. Vérifiez donc aussi l’expérience, les avis éventuels et les conditions de la garde. N’en déduisez pas que tous les profils ont déjà obtenu cet indicateur.

## <a id="echanges"></a>Quelles questions poser avant de confier ses clés ?

Un premier échange sert à confronter votre annonce au quotidien de la personne. Voici des questions à adapter :

1. **« Comment pensez-vous organiser vos journées pendant la garde ? »** Reprenez les repas, sorties et moments de présence attendus.
2. **« Avez-vous déjà assuré ces tâches ? »** Pour un soin, précisez le geste et les horaires avec les consignes du vétérinaire ; demandez si la personne accepte et sait le réaliser.
3. **« Qui séjournera dans le logement ? »** Confirmez les accompagnants, les couchages et les éventuels animaux du gardien.
4. **« Comment se passeront votre arrivée et votre départ ? »** Vérifiez le transport, la remise des clés et les horaires.
5. **« Comment souhaitez-vous donner et recevoir des nouvelles ? »** Convenez d’un rythme raisonnable et d’un canal principal.
6. **« Que ferons-nous si l’un de nous doit modifier ses dates ? »** Distinguez ce qui peut être adapté de ce qui nécessite un relais.

Pour les animaux, décrivez aussi les difficultés connues : peur, réactions en promenade, cohabitation ou soins particuliers. La [RSPCA, association de protection animale](https://www.rspca.org.uk/adviceandwelfare/pets/general/holiday/leavingyourpet), souligne notamment l’intérêt de consignes claires, des coordonnées du vétérinaire et d’informations sur les besoins de l’animal. Une bonne entente lors d’un échange ne dispense pas de transmettre ces informations.

Vous pouvez vous décider après la messagerie ou un appel. **Une rencontre est possible si vous le souhaitez tous les deux.** Elle permet de montrer le logement et d’observer un premier contact avec les animaux ; elle ne prédit pas à elle seule le déroulement de toute la garde.

## <a id="organisation"></a>Que confirmer avant de choisir définitivement ?

Récapitulez par écrit les points sur lesquels vous vous êtes entendus : dates, présence, tâches, accès au logement, soins acceptés et dépenses. Si un point reste flou, posez la question avant de confirmer.

- **Pour la maison :** espaces accessibles, couchage, équipements utiles et tâches prévues. Transmettez les codes et les informations d’accès dans un cadre privé, pas dans l’annonce publique.
- **Pour les frais :** nourriture et soins des animaux, fournitures et éventuels achats ou déplacements convenus entre vous.
- **Pour les imprévus :** coordonnées utiles et personne locale qui a accepté d’aider si nécessaire. Aucun remplacement en urgence n’est garanti par Guardiens.
- **Pour les assurances :** décrivez l’échange aux assureurs concernés et demandez quelles garanties s’appliquent à votre situation. Le [guide juridique du house-sitting en France](/actualites/house-sitting-cadre-juridique-france) aide à préparer ces questions dans le cadre français.

Après votre choix, le [guide pour accueillir son gardien](/actualites/accueillir-gardien-bonnes-pratiques) et la [préparation de la maison avant une garde](/actualites/preparer-maison-avant-garde) prennent le relais. Pour plusieurs semaines, le [guide des gardes longues](/actualites/vacances-longues-garde-animal-2-semaines) détaille l’organisation jusqu’au retour.

Guardiens est né des cinq années de garde de maisons et d’animaux de Jérémie et Elisa. Notre priorité est de construire un réseau de confiance et d’améliorer le service avec vos retours. L’accès est actuellement 100 % gratuit pour les deux rôles. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Les conditions à jour sont sur la page [tarifs](/tarifs).

## <a id="decision"></a>Que faire si aucun candidat ne correspond à votre besoin ?

Vous n’avez pas à choisir uniquement parce que le départ approche. Clarifiez les points de l’annonce qui ont suscité des questions : horaires, transport, tâches ou conditions de logement. Indiquez votre éventuelle souplesse sur les dates, puis poursuivez les échanges.

Si une contrainte essentielle reste incompatible avec les disponibilités des candidats, cherchez une autre organisation avec un proche ou un professionnel disponible. Le nombre de réponses à une annonce et la possibilité de trouver un gardien pour vos dates ne sont pas garantis.

Si vous utilisez la plateforme, [dites-nous ce qui vous a aidé à choisir et ce qui vous a manqué](/contact). Ces retours servent à améliorer les profils et les échanges.

## <a id="faq"></a>Questions fréquentes pour choisir son gardien

### Comment savoir si un gardien est fiable ?

Croisez ses disponibilités, son expérience, les avis éventuels et ses réponses à votre annonce. Vérifiez que vous êtes d’accord sur les tâches et les horaires. Aucun indicateur isolé ne garantit une garde réussie.

### Faut-il écarter un profil sans avis ?

Pas automatiquement. Demandez une expérience concrète avec les tâches prévues et discutez des conditions du séjour. Vous pouvez aussi examiner les références proposées avec les accords nécessaires. Décidez ensuite si vous disposez d’assez d’éléments pour confier votre logement.

### Faut-il rencontrer le gardien avant de confirmer ?

Une rencontre est possible si vous le souhaitez tous les deux. Vous pouvez également échanger par messagerie ou en appel vidéo. Dans tous les cas, confirmez les dates, les tâches et les conditions avant le départ.

### Un gardien à proximité est-il plus sûr ?

La proximité peut simplifier les échanges et les trajets. Elle ne garantit ni la fiabilité ni une disponibilité de secours. Vérifiez l’organisation réelle de la personne, quelle que soit la distance.

### Combien de candidatures faut-il comparer ?

Il n’existe pas de nombre obligatoire. Retenez les profils qui correspondent à vos dates et à vos besoins, puis échangez pour clarifier les points essentiels. Si une seule personne répond, appliquez les mêmes critères de choix.

*Source consultée le 17 octobre 2026 : [RSPCA, préparer la garde d’un animal](https://www.rspca.org.uk/adviceandwelfare/pets/general/holiday/leavingyourpet), en anglais. Les conseils pratiques cités ne transposent pas les règles britanniques à la France. Le fonctionnement décrit pour Guardiens porte sur la mise en relation et les informations visibles sur les profils.*$confiance_content_0_20261017$;
BEGIN
  SELECT * INTO before_row FROM public.articles WHERE id='32a5c3d1-d4a8-40d1-ac2b-657f4bcb3ab2'::uuid AND slug='choisir-gardien-bons-criteres' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guide confiance 0 introuvable'; END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Choisir un gardien de maison : les critères à vérifier'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Le bon gardien est celui avec qui vous pouvez convenir d’une garde adaptée à votre quotidien. Voici comment examiner un profil, lire les avis et poser les bonnes questions.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Choisir un gardien de maison : les bons critères'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Disponibilités, expérience, avis, identité et questions à poser : comment choisir un gardien pour votre maison et vos animaux avant de confier vos clés.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux personnes se serrent la main, avec un chien à leurs côtés'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide pour rédiger une annonce de house-sitting","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"guide juridique du house-sitting en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"guide pour accueillir son gardien","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"préparation de la maison avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des gardes longues","url":"/actualites/vacances-longues-garde-animal-2-semaines"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-14 13:59:17.121368+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide confiance 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_confiance_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide confiance 0 différente';
  END IF;
  INSERT INTO public._backup_articles_confiance_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_confiance_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Choisir un gardien de maison : les critères à vérifier',
    excerpt='Le bon gardien est celui avec qui vous pouvez convenir d’une garde adaptée à votre quotidien. Voici comment examiner un profil, lire les avis et poser les bonnes questions.',
    meta_title='Choisir un gardien de maison : les bons critères',
    meta_description='Disponibilités, expérience, avis, identité et questions à poser : comment choisir un gardien pour votre maison et vos animaux avant de confier vos clés.',
    hero_image_alt='Deux personnes se serrent la main, avec un chien à leurs côtés',
    internal_links='[{"text":"guide pour rédiger une annonce de house-sitting","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"guide juridique du house-sitting en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"guide pour accueillir son gardien","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"préparation de la maison avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des gardes longues","url":"/actualites/vacances-longues-garde-animal-2-semaines"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='choisir-gardien-bons-criteres' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte confiance 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $confiance_content_1_20261017$# Faire garder sa maison sans animaux : comment ça marche ?

**Oui, vous pouvez faire garder votre maison sans avoir d’animaux.** Avec le house-sitting, une personne séjourne chez vous pendant votre absence, en échange de l’hébergement et des tâches convenues : arroser les plantes, relever le courrier ou simplement habiter le logement. Vous choisissez ensemble la présence attendue et ce qui doit être fait.

Sur Guardiens, vous pouvez publier une annonce sans animal, présenter votre logement et échanger avec les personnes intéressées. Le gardien n’est pas rémunéré. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Les fournitures et les éventuels frais de la garde restent à préciser entre vous.

**Dans ce guide**

- [Ce que peut faire un gardien sans animaux à garder](#taches)
- [Choisir entre un séjour et de simples passages](#solutions)
- [Les conditions d’hébergement et les dépenses](#conditions)
- [Comment présenter votre annonce](#annonce)
- [Comment choisir la personne](#gardien)
- [Comment préparer le départ et le retour](#organisation)
- [Les questions fréquentes](#faq)

## <a id="taches"></a>Que fait un gardien dans une maison sans animaux ?

Il séjourne dans votre logement et assure les tâches que vous avez définies ensemble. Le bon point de départ est votre quotidien : ce qui demande réellement de l’attention pendant vos dates d’absence.

| Besoin | Ce qui peut être convenu | Ce qu’il faut montrer ou préciser |
| --- | --- | --- |
| Plantes en pot | Arroser selon vos consignes. | Emplacements, quantités et fréquence pour chaque plante. |
| Jardin ou potager | Quelques gestes d’entretien définis ensemble. | Temps nécessaire, matériel et tâches que la personne accepte. |
| Courrier et livraisons | Relever la boîte et réceptionner ce qui a été prévu. | Fréquence, accès et emplacement où déposer le courrier. |
| Vie du logement | Ouvrir ou fermer les volets, aérer selon vos consignes, sortir les poubelles. | Fonctionnement des équipements et jours de collecte. |
| Présence sur place | Habiter la maison pendant les dates convenues. | Nuits sur place et absences possibles du gardien. |

Une tâche simple pour vous peut être nouvelle pour quelqu’un d’autre : montrez comment fonctionne l’arrosage ou un équipement particulier. Convenez de ce qui est réalisable, avec le matériel disponible. Des travaux, un dépannage ou un entretien technique demandent une organisation adaptée, éventuellement avec un professionnel.

Le house-sitting repose sur un échange d’hébergement et de tâches. **Le gardien n’assure pas une surveillance permanente ni une protection garantie contre les sinistres ou les intrusions.** Si vous cherchez à comprendre le principe de cet échange, le [guide du house-sitting](/actualites/c-est-quoi-le-house-sitting) en détaille le fonctionnement.

## <a id="solutions"></a>Un gardien sur place ou des passages : quelle solution choisir ?

Si quelques plantes demandent un arrosage ponctuel, un proche ou un prestataire qui passe peut répondre à votre besoin. Si vous souhaitez que quelqu’un séjourne dans la maison pendant votre absence, une garde avec hébergement correspond davantage à cette organisation.

| Votre besoin | Une piste à examiner | Ce qu’il faut confirmer |
| --- | --- | --- |
| Quelques tâches à intervalles définis | Un proche ou un prestataire qui passe. | Fréquence, trajets et accès au logement. |
| Logement habité pendant l’absence | Un gardien hébergé chez vous. | Disponibilité, nuits sur place et conditions du séjour. |
| Jardin demandant un entretien important | Une organisation spécifique ou un professionnel. | Compétences nécessaires, temps de travail et devis éventuel. |
| Besoin technique ou de sécurité particulier | Un professionnel du domaine concerné. | Nature de la prestation et garanties réellement proposées. |

Guardiens propose la mise en relation pour une garde avec hébergement. Décrivez la présence dont vous avez besoin, sans supposer que la personne restera toute la journée à la maison. Notre guide pour [faire garder sa maison pendant son absence](/actualites/confier-sa-maison-absence-risques) présente d’autres questions à examiner selon votre situation.

## <a id="conditions"></a>Que prévoir pour l’hébergement, les frais et l’assurance ?

### Un logement où la personne peut séjourner

Présentez le couchage, les pièces accessibles, la cuisine, les sanitaires et les équipements utiles. Indiquez les conditions de stationnement et les transports. Si la personne envisage de télétravailler, discutez de la connexion et de l’espace disponible.

Précisez aussi qui viendra : une personne seule, un couple, des accompagnants ou un animal du gardien. Ces conditions se discutent avant de confirmer la garde. Un appartement ou une résidence secondaire peut accueillir ce type d’échange si le logement, les tâches et les conditions conviennent aux deux personnes.

### Les dépenses restent à mettre au clair

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement 100 % gratuite pour les deux rôles. Cela ne supprime pas les dépenses de la maison : produits nécessaires, fournitures de jardin ou achat exceptionnel convenu à l’avance. Précisez aussi les déplacements, les repas et l’usage éventuel d’un véhicule, sans laisser ces points implicites.

Derrière Guardiens, il y a Jérémie et Elisa : nous avons créé la plateforme après cinq ans de garde de maisons et d’animaux. Notre priorité est de construire un réseau de confiance et d’améliorer le service avec vos retours. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Les conditions à jour sont sur la page [tarifs](/tarifs).

### Une couverture d’assurance à vérifier pour votre situation

Expliquez l’échange à votre assureur habitation : dates, personne hébergée et tâches prévues. Demandez quelles garanties et précautions s’appliquent ; le gardien vérifie de son côté sa couverture pour le séjour.

[France Assureurs](https://www.franceassureurs.fr/lassurance-protege-finance-et-emploie/lassurance-protege/lassurance-en-pratique-pour-les-particuliers/sejour-etranger-assurances-et-assistance) rappelle que les contrats peuvent prévoir une clause d’inhabitation et des mesures de prévention pendant une absence. Ne déduisez pas que la présence d’un gardien suffit automatiquement à satisfaire toutes les conditions de votre contrat.

Si le logement est loué ou si le séjour est long, vérifiez les conditions applicables avant de confirmer. Le [guide juridique du house-sitting en France](/actualites/house-sitting-cadre-juridique-france) aide à préparer vos questions dans le cadre français ; les règles peuvent différer ailleurs.

## <a id="annonce"></a>Comment publier une annonce de garde sans animaux ?

Sur Guardiens, présentez votre logement, vos dates et les tâches à assurer. Vous pouvez publier sans renseigner d’animal. Complétez les informations demandées dans votre profil et votre annonce, notamment les photos du logement, pour que les personnes intéressées comprennent ce que vous proposez.

Un exemple de formulation, à adapter à votre situation :

> Nous partons deux semaines et cherchons quelqu’un pour séjourner dans notre appartement. Il n’y a pas d’animaux à garder : nous souhaitons surtout un arrosage des plantes et un relevé du courrier. Nous préciserons ensemble le temps de présence et la remise des clés.

Ajoutez les éléments qui permettront au gardien de se projeter : quartier, transports, couchage, équipements et éventuelles contraintes. Pour le jardin, décrivez les gestes et le temps nécessaire plutôt que d’écrire seulement « un peu d’entretien ».

Gardez l’adresse précise, les codes et les informations d’accès pour les échanges privés nécessaires à l’organisation. Le [guide pour rédiger une bonne annonce](/actualites/rediger-bonne-annonce-house-sitting) détaille les informations utiles à la présentation publique.

## <a id="gardien"></a>Comment choisir un gardien pour une maison sans animaux ?

Cherchez une personne disponible sur vos dates, dont le projet de séjour est compatible avec les tâches et la présence attendues. Les avis éventuels peuvent vous renseigner sur la communication ou le soin apporté au logement. Un badge d’identité porte sur l’identité ; il ne garantit pas la qualité de la garde.

Discutez des horaires, des trajets et de l’expérience avec les tâches prévues. Une rencontre est possible si vous le souhaitez tous les deux. Notre guide pour [choisir son gardien de maison](/actualites/choisir-gardien-bons-criteres) aide à comparer les profils et à préparer cet échange.

N’annoncez pas la garde comme confirmée avant d’avoir obtenu l’accord de la personne sur les dates et les conditions. Si personne ne correspond à votre besoin, gardez une autre piste avec un proche ou un professionnel : aucune candidature ni aucun remplacement en urgence ne sont garantis.

## <a id="organisation"></a>Que préparer avant le départ et le retour ?

Rassemblez les consignes dans une fiche que le gardien pourra consulter pendant le séjour :

- tâches convenues, fréquence et matériel nécessaire ;
- clés testées, accès autorisés et fonctionnement des équipements utiles ;
- coordonnées pour vous joindre et personne locale qui a accepté d’aider en cas de besoin ;
- dépenses autorisées et façon de transmettre les justificatifs ;
- horaires du retour et restitution des clés.

Sur Guardiens, le guide de la maison peut centraliser ces informations. Le [guide de préparation du logement](/actualites/preparer-maison-avant-garde) permet d’approfondir chaque point.

Convenez aussi du rythme des nouvelles et de ce qui doit être signalé : équipement qui ne fonctionne plus, accès bloqué ou changement de dates, par exemple. Si le gardien doit partir plus tôt ou si votre retour est retardé, contactez le relais et confirmez qui peut effectivement prendre la suite.

Au retour, faites un point sur la maison, les tâches et les éventuels achats. Si vous essayez la plateforme, [dites-nous ce qui a bien fonctionné et ce qui manque](/contact) : vos retours nous aident à améliorer les prochaines gardes.

## <a id="faq"></a>Questions fréquentes sur le house-sitting sans animaux

### Peut-on publier une annonce sur Guardiens sans chien ni chat ?

Oui. Vous pouvez proposer une garde de maison sans animaux, avec un hébergement et les tâches convenues. Décrivez votre logement, les dates et ce qui demande de l’attention pendant votre absence.

### Peut-on faire garder un appartement ou une résidence secondaire ?

Oui, si vous pouvez y accueillir la personne et si les conditions conviennent aux deux parties. Précisez le couchage, les accès, les équipements et les tâches. Vérifiez aussi les conditions de votre logement et de vos assurances.

### Le gardien reste-t-il dans la maison toute la journée ?

Le temps de présence se convient avant la garde. Séjourner chez vous ne signifie pas être disponible en permanence. Expliquez les moments où une présence est nécessaire et demandez les absences prévues.

### La garde est-elle gratuite même sans animaux ?

Sur Guardiens, l’échange se fait sans rémunération et la plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens. Les dépenses de la maison et les éventuels frais convenus entre vous restent à prévoir.

### Le gardien peut-il venir avec son propre animal ?

Discutez-en avant de confirmer. Vous décidez des conditions d’accueil dans votre logement ; la présence d’un animal du gardien n’est pas implicite dans l’accord de garde.

*Source consultée le 17 octobre 2026 : [France Assureurs, séjour à l’étranger, assurances et assistance](https://www.franceassureurs.fr/lassurance-protege-finance-et-emploie/lassurance-protege/lassurance-en-pratique-pour-les-particuliers/sejour-etranger-assurances-et-assistance), section sur l’habitation. Les conditions de chaque contrat restent à confirmer avec l’assureur concerné.*$confiance_content_1_20261017$;
BEGIN
  SELECT * INTO before_row FROM public.articles WHERE id='174464d9-0f57-4d88-8e21-118bc7a8e0ce'::uuid AND slug='garder-une-maison-ce-n-est-pas-garder-un-animal' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Guide confiance 1 introuvable'; END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder sa maison sans animaux : comment ça marche ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Vous partez et souhaitez confier votre logement, même sans chien ni chat ? Voici ce qu’un gardien hébergé peut faire, les conditions à convenir et les informations à mettre dans l’annonce.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House sitting sans animaux : ce que fait le gardien'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Faire garder une maison sans animaux : présence sur place, plantes, courrier, dépenses et choix du gardien. Comment préparer et publier votre annonce.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux fenêtres aux volets fermés sur une façade'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"faire garder sa maison pendant son absence","url":"/actualites/confier-sa-maison-absence-risques"},{"text":"guide juridique du house-sitting en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"guide pour rédiger une bonne annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"choisir son gardien de maison","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide de préparation du logement","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:10:17.547494+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide confiance 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_confiance_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide confiance 1 différente';
  END IF;
  INSERT INTO public._backup_articles_confiance_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_confiance_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder sa maison sans animaux : comment ça marche ?',
    excerpt='Vous partez et souhaitez confier votre logement, même sans chien ni chat ? Voici ce qu’un gardien hébergé peut faire, les conditions à convenir et les informations à mettre dans l’annonce.',
    meta_title='House sitting sans animaux : ce que fait le gardien',
    meta_description='Faire garder une maison sans animaux : présence sur place, plantes, courrier, dépenses et choix du gardien. Comment préparer et publier votre annonce.',
    hero_image_alt='Deux fenêtres aux volets fermés sur une façade',
    internal_links='[{"text":"guide du house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"faire garder sa maison pendant son absence","url":"/actualites/confier-sa-maison-absence-risques"},{"text":"guide juridique du house-sitting en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"guide pour rédiger une bonne annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"choisir son gardien de maison","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide de préparation du logement","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garder-une-maison-ce-n-est-pas-garder-un-animal' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte confiance 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;
COMMIT;
