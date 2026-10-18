-- Refonte des guides technologie-coherence, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot39_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot39_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot39_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot39_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('20d86e06-d173-4af2-9ff0-f93fc9ecbad0'::uuid,'dfb2cc62-5272-40e1-ac4b-18e055e4ddc6'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Apprendre la menuiserie, la permaculture ou l’écoconstruction : par où commencer ?

**Vous pouvez découvrir des savoir-faire manuels avec des cours en ligne gratuits, puis chercher une pratique adaptée à votre niveau dans un atelier ou un projet collectif.** Le coût et l’encadrement varient selon le lieu. Participer à un chantier ne garantit pas de maîtriser un outil ou une technique en quelques jours.

Le bon point de départ est une question précise : comprendre la conception d’un jardin, apprendre à réparer un meuble ou découvrir un matériau. Cela vous aidera à choisir le cours ou l’atelier utile, puis à définir ce que vous souhaitez pratiquer.

**Repères :** [comparer les formats](#formats), [commencer par le bois](#bois), [découvrir la permaculture](#permaculture), [comprendre l’écoconstruction](#construction), [choisir un projet](#projet), [prévoir les frais](#frais), [questions fréquentes](#faq).

## <a id="formats"></a>Quel format choisir pour débuter ?

| Format | Ce qu’il peut apporter et ce qu’il faut vérifier |
| --- | --- |
| Cours en ligne ouvert | Vocabulaire, principes et études de cas ; vérifiez l’accès, les dates et les conditions de l’attestation éventuelle. |
| Atelier partagé ou associatif | Pratique sur un besoin défini ; renseignez-vous sur l’accompagnement, les prérequis et les règles d’utilisation du matériel. |
| Jardin partagé | Observation et pratique collective ; demandez le fonctionnement, les engagements et les frais éventuels. |
| Projet participatif | Échange de temps et de savoir-faire autour d’un projet ; clarifiez les tâches, la transmission et les conditions sur place. |

Ces formats se complètent. Un cours peut aider à comprendre ce qu’on vous montre en atelier ; une pratique accompagnée permet de poser des questions sur un geste. Ni un tutoriel ni une participation ponctuelle ne valent automatiquement qualification pour exécuter des travaux techniques.

## <a id="bois"></a>Comment commencer en menuiserie ou en réparation de meubles ?

Cherchez un atelier bois, un lieu partagé ou une association qui précise l’accueil des débutants. Décrivez votre objectif et demandez quelle activité correspond à votre niveau. La présence de machines dans un lieu ne signifie pas qu’elles sont accessibles sans initiation ou supervision.

Pour réparer un objet, le [réseau Repair Café](https://www.repaircafe.org/fr/visiter/) permet de rechercher un rendez-vous local. Vérifiez quels objets sont acceptés, les compétences présentes, les horaires et les conditions de participation. Il s’agit d’apprendre avec des personnes qui aident à réparer ; une réparation réussie ou la disponibilité de chaque spécialité ne sont pas garanties.

Commencez par un objectif limité et faites expliquer le matériel dans le cadre de l’atelier. La charpente, les machines de coupe et les interventions sur un ouvrage demandent un niveau et un encadrement à déterminer avec des personnes compétentes. Ne déduisez pas d’un week-end de participation que vous pourrez ensuite intervenir seul sur tout projet en bois.

## <a id="permaculture"></a>Où découvrir la permaculture gratuitement ?

Le [MOOC Conception en Permaculture de l’Université des Colibris](https://colibris-universite.org/formation/mooc-conception-en-permaculture-2) est présenté comme gratuit, ouvert à tous et accessible à son rythme. Son programme porte sur une méthode de conception : observation, principes, étude et esquisse d’un projet. La permaculture ne se résume donc pas à réaliser une butte ou ajouter du paillage.

Pour la pratique, renseignez-vous auprès des jardins partagés et associations de votre commune. Demandez comment rejoindre le collectif, à quel rythme participer et quelles activités sont proposées pendant la saison. Un calendrier conseillé doit rester compatible avec le lieu, le climat et le projet réel, pas suivre une règle identique pour tous les jardins.

Sur un projet participatif, faites préciser ce que vous pourrez observer ou apprendre et ce que le porteur attend de vous. Une expérience dans un jardin ne signifie pas automatiquement que l’on sait concevoir ou conduire toute une production agricole.

## <a id="construction"></a>Comment découvrir l’écoconstruction sans confondre initiation et qualification ?

[MOOC Bâtiment Durable](https://www.mooc-batiment-durable.fr/fr/) propose des formations sur la construction et la rénovation. Sa [FAQ](https://www.mooc-batiment-durable.fr/fr/annexe/faq/) précise l’accès gratuit aux MOOC ; les périodes d’ouverture et les conditions des cours sont à vérifier dans le catalogue. Une formation en ligne donne des repères, mais ne remplace pas l’évaluation technique d’un ouvrage ou les qualifications nécessaires à certains actes.

Pour la paille, le [réseau régional de construction paille](https://auvergnerhonealpes.constructionpaille.fr/formations/) distingue formations professionnelles, initiations pour particuliers et chantiers participatifs, avec des modalités d’encadrement variables. Consultez le programme et le tarif de chaque proposition : une liste de formations ne signifie pas qu’elles sont toutes gratuites.

Les mêmes questions comptent pour la terre, la chaux ou la pierre sèche : quel geste est enseigné, par qui, dans quel cadre et avec quel suivi ? Le temps nécessaire dépend de la technique et du projet. Un ouvrage structurel, un équipement technique ou un travail en hauteur ne s’improvise pas à partir d’une initiation.

## <a id="projet"></a>Quelles questions poser avant de participer à un projet Guardiens ?

Les activités proposées sur Guardiens doivent aussi respecter les [CGU](/cgu) : construction, démolition, toiture, travail en hauteur, interventions électriques, de gaz ou de chauffage, élagage et abattage sont notamment exclus de ce cadre. Une ressource de formation extérieure sur ces techniques ne signifie pas qu’un projet correspondant est admissible sur la plateforme. Vérifiez l’activité avant de proposer ou de rejoindre un projet.

Les projets permettent un échange de temps et de savoir-faire entre particuliers. La présentation distingue **« Ce qu’il faut savoir faire »** et **« Ce que vous transmettez »**. Lisez les deux : une annonce accueillant les débutants doit tout de même expliquer les tâches et l’accompagnement prévu.

Demandez les horaires, les gestes envisagés, la personne présente pour les expliquer et le matériel fourni. Clarifiez aussi les assurances et ce qui se passe si une tâche dépasse vos possibilités. Vous restez libre de refuser une activité que vous ne pouvez pas assurer.

Le porteur déclare notamment être responsable du lieu, destinataire du projet, présent pendant sa durée, et avoir vérifié sa couverture auprès de l’assureur. Le cadre prévoit l’absence d’échange d’argent et un lieu non destiné à la location ou à une activité commerciale. Ces déclarations ne constituent pas une validation technique du chantier par Guardiens.

Le [guide des projets participatifs](/actualites/chantier-participatif-low-tech-participer-lancer-projet) et les [repères sur leur cadre](/actualites/chantier-participatif-projet-collectif-cadre-legal) complètent les questions à discuter. Ne supposez ni un projet disponible près de chez vous ni une place acceptée avant l’échange.

## <a id="frais"></a>Quels frais prévoir si l’apprentissage est gratuit ?

Prévoyez le trajet, les dépenses personnelles et les équipements demandés. Pour un atelier extérieur à Guardiens, une adhésion, des consommables ou une participation peuvent être prévus : vérifiez auprès de l’organisateur avant de vous déplacer.

Sur Guardiens, la plateforme est **actuellement 100 % gratuite pour les deux rôles**, selon les [conditions tarifaires](/tarifs). Un projet participatif se mène sans paiement entre les personnes. Couchage et repas dépendent de ce qui est proposé et convenu ; ils ne sont pas automatiquement inclus. Vérifiez les couvertures d’assurance adaptées avec les assureurs concernés.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on commencer la menuiserie gratuitement ?
Des ressources en ligne permettent de découvrir les bases. Pour pratiquer, demandez les conditions d’un atelier ou d’une association : encadrement, matériel, prérequis et frais éventuels. Le coût n’est pas identique partout.

### Où trouver une introduction gratuite à la permaculture ?
L’Université des Colibris présente son MOOC Conception en Permaculture comme gratuit et ouvert à tous, à suivre à son rythme. Consultez sa page pour le programme et les modalités d’accès actuelles.

### Les formations en écoconstruction sont-elles toutes gratuites ?
Non, il faut distinguer les MOOC gratuits des ateliers, stages et formations professionnelles dont les conditions varient. Lisez le programme, le tarif et les prérequis de chaque proposition.

### Un chantier participatif suffit-il pour maîtriser une technique ?
Il peut apporter une pratique et des explications, sans garantir une maîtrise en un temps donné. Le niveau d’encadrement et les tâches doivent correspondre à vos possibilités ; une participation ne vaut pas qualification automatique.

### Un projet Guardiens comprend-il le repas et le couchage ?
Cela dépend de l’annonce et de l’accord avec le porteur. Vérifiez les conditions avant de confirmer votre venue. Le cadre du projet prévoit un échange de temps et de savoir-faire sans paiement entre les personnes.

### Guardiens garantit-il l’encadrement technique d’un projet ?
La plateforme met en relation les participants et les porteurs. Leurs déclarations ne constituent pas une validation technique du chantier. Clarifiez les tâches, l’accompagnement, le matériel et les assurances avant de participer. Les activités doivent aussi respecter les exclusions des CGU, notamment construction et travail en hauteur.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='20d86e06-d173-4af2-9ff0-f93fc9ecbad0'::uuid AND slug='apprendre-menuiserie-permaculture-ecoconstruction-gratuitement';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Apprendre la menuiserie, la permaculture ou l’écoconstruction : par où commencer ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Cours en ligne, atelier ou projet collectif : choisissez une façon d’apprendre adaptée à votre niveau, avec des attentes claires sur l’encadrement et les frais.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Menuiserie, permaculture : apprendre gratuitement, où ?'
    AND before_row.meta_description IS NOT DISTINCT FROM 'MOOC gratuits, ateliers partagés et projets participatifs : trouvez comment débuter en menuiserie, permaculture ou écoconstruction et quels frais prévoir.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Des mains travaillent une pièce de bois au ciseau à bois, au milieu de copeaux.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"CGU","url":"/cgu"},{"text":"guide des projets participatifs","url":"/actualites/chantier-participatif-low-tech-participer-lancer-projet"},{"text":"repères sur leur cadre","url":"/actualites/chantier-participatif-projet-collectif-cadre-legal"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-18 01:18:52.746831+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot39_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot39_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot39_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Apprendre la menuiserie, la permaculture ou l’écoconstruction : par où commencer ?',
    excerpt='Cours en ligne, atelier ou projet collectif : choisissez une façon d’apprendre adaptée à votre niveau, avec des attentes claires sur l’encadrement et les frais.',
    meta_title='Menuiserie, permaculture : apprendre gratuitement, où ?',
    meta_description='MOOC gratuits, ateliers partagés et projets participatifs : trouvez comment débuter en menuiserie, permaculture ou écoconstruction et quels frais prévoir.',
    hero_image_alt='Des mains travaillent une pièce de bois au ciseau à bois, au milieu de copeaux.',
    internal_links='[{"text":"CGU","url":"/cgu"},{"text":"guide des projets participatifs","url":"/actualites/chantier-participatif-low-tech-participer-lancer-projet"},{"text":"repères sur leur cadre","url":"/actualites/chantier-participatif-projet-collectif-cadre-legal"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='apprendre-menuiserie-permaculture-ecoconstruction-gratuitement' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# La technologie peut-elle recréer du lien près de chez soi ?

**Une application peut aider à découvrir un besoin et à entrer en contact ; la confiance se construit ensuite dans les conditions de l’échange.** Arroser des plantes, récupérer une commande ou faire garder une maison donnent une raison concrète de se parler, sans garantir une rencontre, une amitié ou une aide disponible.

Après cinq ans de pratique du house-sitting, nous avons voulu développer Guardiens autour de cette idée : permettre à des personnes qui ne se connaissent pas encore de préparer un échange utile. La garde de maison reste au cœur du projet, avec l’envie de créer un réseau où chacun puisse aussi demander ou donner un coup de main.

*Montage illustratif : l’écran et la scène ne représentent pas une demande réelle.*

**Repères :** [comprendre le rôle de l’outil](#outil), [distinguer solitude et isolement](#etude), [passer à un échange](#echange), [préparer une garde de maison](#maison), [choisir un parcours](#parcours), [questions fréquentes](#faq).

## <a id="outil"></a>Qu’est-ce qu’une application peut faciliter ?

Elle peut rendre visible une demande, présenter des informations sur une personne et permettre une discussion avant de s’engager. Ce sont des moyens de préparer un contact. Ils ne disent pas à votre place si la tâche convient, si les disponibilités sont compatibles ou si vous souhaitez poursuivre.

La proximité aide parfois à limiter un déplacement ou à renouveler un échange. Elle ne suffit pas à garantir la disponibilité : une personne à quelques rues peut ne pas pouvoir venir au bon moment, ou ne pas avoir les compétences nécessaires. Une mise en relation utile doit laisser chacun libre de le dire.

De la même façon, un profil ou une messagerie ne remplace pas l’organisation pratique. Avant une aide au domicile, il faut discuter du créneau, des personnes présentes, des accès, du matériel et des limites. Les détails qui permettent de comprendre la tâche comptent davantage qu’une promesse générale de convivialité.

## <a id="etude"></a>Que disent les recherches sur les liens de proximité ?

L’[étude Solitudes 2025 du CRÉDOC et du CERLIS pour la Fondation de France](https://www.credoc.fr/download/pdf/Sou/Sou2026-5061.pdf) distingue l’isolement relationnel du sentiment de solitude : dans son enquête de juillet 2025, 11 % des personnes sont en situation d’isolement et 24 % déclarent se sentir seules souvent ou presque tous les jours. Le volet quantitatif porte sur 3 000 personnes de 15 ans et plus en France.

Ces deux indicateurs décrivent des réalités différentes. Ils ne mesurent pas un effet des applications, et ne permettent pas d’affirmer qu’un service rendu fera disparaître la solitude. L’étude examine notamment la place du voisinage et des associations ; elle invite à considérer plusieurs cadres de lien, selon les personnes et les territoires.

Pour nous, cela donne une raison de travailler sur les occasions d’échange, sans faire de la plateforme une réponse unique. Une association, un collectif de quartier ou une relation déjà existante peuvent aussi être des points d’appui.

## <a id="echange"></a>Comment passer d’un contact à un coup de main ?

Commencez par une tâche délimitée que l’autre peut comprendre et accepter librement. Demander une aide pour quelques plantations n’engage pas la personne à entretenir votre jardin toute l’année. Proposer un savoir-faire n’oblige pas à intervenir sur tout ce qui ressemble à cette compétence.

| L’outil peut aider à… | Ce qui reste à convenir entre les personnes |
| --- | --- |
| Découvrir un besoin | Vérifier la tâche et la disponibilité réelle. |
| Présenter un savoir-faire | Expliquer l’expérience, le matériel et les limites. |
| Lire un profil | Poser ses questions et évaluer les conditions de l’échange. |
| Échanger avant de commencer | Confirmer les accès, le créneau, les frais et le relais éventuel. |
| Laisser un retour après un échange | Rester factuel et préserver les informations privées. |

Un contrôle de document d’identité, lorsqu’un profil l’affiche, vérifie un document : il ne certifie pas une compétence ou une fiabilité. Les avis, lorsqu’ils existent, éclairent des échanges passés et ne garantissent pas le prochain. Une rencontre préalable est possible **si vous le souhaitez tous les deux**.

Les [conseils pour demander un coup de main](/actualites/oser-demander-coup-de-main-pres-de-chez-soi) et le [guide pour proposer son aide à sa mesure](/actualites/se-sentir-utile-pres-de-chez-soi) aident à commencer. Vous pouvez choisir une autre organisation ou refuser si les conditions ne vous conviennent pas.

## <a id="maison"></a>Pourquoi la garde de maison demande-t-elle un nouvel échange ?

Confier sa maison pendant une absence engage davantage qu’un premier coup de main. Il faut décrire la présence attendue, les clés, le courrier, le jardin et les animaux éventuels. Une personne déjà rencontrée peut connaître le lieu sans pouvoir assurer tous les besoins d’une garde.

Sur Guardiens, un gardien est hébergé pendant la garde **sans rémunération**, selon les conditions convenues. Une maison peut être gardée avec ou sans animaux. Une garde ne garantit pas une présence permanente, la prévention de tout incident ou un remplacement.

Avant de confirmer, échangez sur l’expérience de la personne et les gestes nécessaires. Préparez les consignes, les contacts et un relais joignable, puis vérifiez les assurances avec votre assureur. L’accord de garde intervient après confirmation et sa signature est facultative. Les [critères de choix d’un gardien](/actualites/choisir-gardien-bons-criteres) et les [préparatifs de la maison](/actualites/preparer-maison-avant-garde) détaillent ces étapes.

Cette préparation est ce qui donne du sens au réseau de confiance que nous souhaitons construire : permettre un choix éclairé et des engagements compréhensibles, plutôt que supposer la confiance acquise dès l’inscription.

## <a id="parcours"></a>Par où commencer sur Guardiens ?

Vous pouvez consulter les [besoins d’entraide](/petites-missions), présenter vos [savoir-faire dans votre profil](/profile?section=savoir-faire) ou préparer une [annonce pour faire garder votre maison](/sits/create). Le [guide du fonctionnement de Guardiens](/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers) explique ces démarches.

Les projets de partage de savoir-faire suivent aussi un cadre précis : consultez le [guide des projets participatifs](/actualites/chantier-participatif-low-tech-participer-lancer-projet) et les [CGU](/cgu) avant d’envisager une activité. Le mot « participatif » ne rend pas admissibles les tâches exclues, comme la construction ou le travail en hauteur.

La plateforme est **actuellement 100 % gratuite**, selon les [conditions tarifaires](/tarifs). La priorité est de développer ce réseau et d’améliorer le service avec les retours des personnes qui l’utilisent. L’entraide se fait sans rémunération ; les achats, déplacements et autres dépenses restent distincts. Un retour honnête sur ce qui fonctionne ou manque est utile, sans obligation d’avis positif.

Vous n’avez pas à vous engager dans tous ces parcours. Commencez par celui qui correspond à votre besoin et à ce que vous pouvez réellement assurer.

## <a id="faq"></a>Questions fréquentes

:::faq
### Une application suffit-elle à créer la confiance ?
Elle peut faciliter la découverte d’un besoin et le contact. La confiance dépend ensuite des informations, des conditions convenues et des échanges vécus ; elle n’est pas garantie par l’inscription ou un profil.

### Un document contrôlé garantit-il une personne fiable ?
Non. Il s’agit du contrôle d’un document, pas d’une certification de compétence ou de fiabilité. Les avis, lorsqu’ils existent, complètent la discussion sans garantir le prochain échange.

### Faut-il rencontrer la personne avant chaque aide ?
Une rencontre préalable est possible si vous le souhaitez tous les deux. Quel que soit le choix, confirmez la tâche, le créneau, les accès, le matériel et les limites avant de commencer.

### Peut-on faire garder sa maison sans avoir d’animaux ?
Oui, la garde peut porter sur une maison avec ou sans animaux. Décrivez les dates, la présence et les tâches nécessaires, puis vérifiez ce que le gardien peut réellement assurer.

### Les chiffres sur la solitude prouvent-ils l’efficacité de Guardiens ?
Non. L’étude citée décrit l’isolement, la solitude et les réseaux de sociabilité en France. Elle ne mesure pas un effet de la plateforme ou un résultat pour ses membres.

### Est-ce gratuit et que peut-on donner en retour ?
La plateforme est actuellement gratuite et l’entraide se fait sans rémunération ; un gardien est hébergé pendant la garde sans rémunération. Les dépenses restent distinctes. Un retour honnête sur le service aide à l’améliorer, sans avis positif exigé.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='dfb2cc62-5272-40e1-ac4b-18e055e4ddc6'::uuid AND slug='technologie-recreer-lien-pres-de-chez-soi';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'La technologie peut-elle recréer du lien près de chez soi ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Trouver une personne est un début. Décrire le besoin, choisir librement l’échange et préparer les conditions permet ensuite de passer à une aide concrète.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Technologie et lien social : passer à l’entraide locale'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Une application peut faciliter un échange, sans fabriquer la confiance : découvrez comment passer d’un besoin local à l’entraide ou à la garde de maison.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Montage avec une personne utilisant un téléphone, un écran Guardiens et une personne déplaçant un pot.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"conseils pour demander un coup de main","url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi"},{"text":"guide pour proposer son aide à sa mesure","url":"/actualites/se-sentir-utile-pres-de-chez-soi"},{"text":"critères de choix d’un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"préparatifs de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"besoins d’entraide","url":"/petites-missions"},{"text":"savoir-faire dans votre profil","url":"/profile?section=savoir-faire"},{"text":"annonce pour faire garder votre maison","url":"/sits/create"},{"text":"guide du fonctionnement de Guardiens","url":"/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers"},{"text":"guide des projets participatifs","url":"/actualites/chantier-participatif-low-tech-participer-lancer-projet"},{"text":"CGU","url":"/cgu"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:25:17.0624+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot39_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot39_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot39_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='La technologie peut-elle recréer du lien près de chez soi ?',
    excerpt='Trouver une personne est un début. Décrire le besoin, choisir librement l’échange et préparer les conditions permet ensuite de passer à une aide concrète.',
    meta_title='Technologie et lien social : passer à l’entraide locale',
    meta_description='Une application peut faciliter un échange, sans fabriquer la confiance : découvrez comment passer d’un besoin local à l’entraide ou à la garde de maison.',
    hero_image_alt='Montage avec une personne utilisant un téléphone, un écran Guardiens et une personne déplaçant un pot.',
    internal_links='[{"text":"conseils pour demander un coup de main","url":"/actualites/oser-demander-coup-de-main-pres-de-chez-soi"},{"text":"guide pour proposer son aide à sa mesure","url":"/actualites/se-sentir-utile-pres-de-chez-soi"},{"text":"critères de choix d’un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"préparatifs de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"besoins d’entraide","url":"/petites-missions"},{"text":"savoir-faire dans votre profil","url":"/profile?section=savoir-faire"},{"text":"annonce pour faire garder votre maison","url":"/sits/create"},{"text":"guide du fonctionnement de Guardiens","url":"/actualites/comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers"},{"text":"guide des projets participatifs","url":"/actualites/chantier-participatif-low-tech-participer-lancer-projet"},{"text":"CGU","url":"/cgu"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='technologie-recreer-lien-pres-de-chez-soi' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
