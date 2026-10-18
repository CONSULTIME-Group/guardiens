-- Refonte des guides apprentissage manuel et garde du Bengal, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot26_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot26_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot26_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot26_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('20d86e06-d173-4af2-9ff0-f93fc9ecbad0'::uuid,'038658e2-b34c-485b-b55d-fce5fb46070c'::uuid) ORDER BY id FOR UPDATE;

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
La plateforme met en relation les participants et les porteurs. Leurs déclarations ne constituent pas une validation technique du chantier. Clarifiez les tâches, l’accompagnement, le matériel et les assurances avant de participer.
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
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des projets participatifs","url":"/actualites/chantier-participatif-low-tech-participer-lancer-projet"},{"text":"repères sur leur cadre","url":"/actualites/chantier-participatif-projet-collectif-cadre-legal"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:40:17.140713+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot26_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot26_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot26_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Apprendre la menuiserie, la permaculture ou l’écoconstruction : par où commencer ?',
    excerpt='Cours en ligne, atelier ou projet collectif : choisissez une façon d’apprendre adaptée à votre niveau, avec des attentes claires sur l’encadrement et les frais.',
    meta_title='Menuiserie, permaculture : apprendre gratuitement, où ?',
    meta_description='MOOC gratuits, ateliers partagés et projets participatifs : trouvez comment débuter en menuiserie, permaculture ou écoconstruction et quels frais prévoir.',
    hero_image_alt='Des mains travaillent une pièce de bois au ciseau à bois, au milieu de copeaux.',
    internal_links='[{"text":"guide des projets participatifs","url":"/actualites/chantier-participatif-low-tech-participer-lancer-projet"},{"text":"repères sur leur cadre","url":"/actualites/chantier-participatif-projet-collectif-cadre-legal"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
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
  new_content text := $suite_content_1_20261017$# Faire garder un Bengal : jeux, habitudes et préparation du séjour

**Pour faire garder un Bengal, décrivez d’abord votre chat : ses habitudes de jeu, de présence, d’alimentation et d’accès aux différentes pièces.** Le choix de la garde dépend de son état, de son quotidien et des possibilités du gardien. Une caractéristique de race ne fixe pas à elle seule un nombre d’heures de présence ou une seule solution possible.

Le [LOOF décrit le Bengal](https://loof.asso.fr/les-races-de-chat/bengal) comme un chat actif et curieux, issu d’une sélection de chats proches de l’humain. Ce repère ne permet pas de prédire le comportement de chaque individu ni de le présenter comme automatiquement difficile ou destructeur.

**Préparer la garde :** [choisir l’organisation](#organisation), [transmettre les habitudes](#habitudes), [préparer les jeux et les accès](#jeux), [réagir à un changement](#sante), [présenter le besoin sur Guardiens](#annonce), [questions fréquentes](#faq).

## <a id="organisation"></a>Garde à domicile, visites ou autre accueil : comment décider ?

Le maintien au domicile peut aider à conserver des repères connus : pièces, couchages, odeurs et routines. Comparez néanmoins les solutions selon votre chat et les personnes qui peuvent réellement assurer ses besoins. Le domicile n’est pas une obligation déduite de la race, et un simple passage n’est pas automatiquement suffisant pour tous les séjours.

Discutez de la durée d’absence, des interactions habituelles, des repas, des soins et des besoins d’observation. Pour un chaton, un chat âgé ou un animal suivi pour sa santé, demandez au vétérinaire quelle organisation convient. Le [guide de garde de chat à domicile](/actualites/garde-chat-domicile-house-sitting) aide à examiner ces questions.

Le gardien doit préciser sa présence possible, y compris ses horaires de travail et ses sorties. Définissez ensemble un rythme de présence réalisable à partir des besoins de votre animal, de ses interactions habituelles et des soins éventuels.

## <a id="habitudes"></a>Quelles consignes transmettre avant le départ ?

| Sujet | Informations utiles au gardien |
| --- | --- |
| Repas | Aliments habituels, quantités et horaires convenus, rangement et consignes prescrites éventuelles. |
| Eau et litière | Points d’eau utilisés, entretien des équipements et habitudes d’élimination. |
| Présence | Moments d’interaction habituels et absences compatibles avec l’organisation choisie. |
| Accès | Pièces autorisées, ouvertures, espaces en hauteur et conditions d’accès extérieur convenues. |
| Santé | Traitement prescrit à expliquer, habitudes à observer, coordonnées vétérinaires et organisation des frais. |
| Contact | Manière d’approcher le chat, jeux appréciés et situations où il souhaite rester tranquille. |

Conservez son alimentation habituelle sauf consigne vétérinaire ou accord adapté. Ne prévoyez pas de changer la nourriture, d’introduire un équipement ou de tester un nouveau soin pour faciliter la garde sans en discuter.

Une fontaine peut faire partie de ses habitudes ; elle n’est pas nécessairement adaptée à tous les Bengals parce qu’ils seraient supposés aimer l’eau courante. Montrez plutôt les points d’eau existants et leur entretien. Préparez les informations d’identification et les contacts utiles, sans les publier dans l’annonce publique.

## <a id="jeux"></a>Comment organiser les jeux et les espaces ?

Demandez quels jeux le chat connaît, comment ils se déroulent et comment il montre qu’il veut arrêter. [Cats Protection recommande des occasions régulières de jeu](https://www.cats.org.uk/help-and-advice/cat-behaviour/cats-and-play), avec des jouets adaptés et des séquences pouvant être courtes. Adaptez leur durée et leur intensité à votre chat, en conservant des routines que le gardien pourra réellement tenir.

Montrez les zones de repos, les cachettes et les endroits en hauteur déjà accessibles. Vérifiez les portes, fenêtres et espaces extérieurs avec le propriétaire : une étiquette de race ne suffit ni à autoriser une sortie ni à considérer un balcon comme sécurisé.

Vérifiez l’état des jouets. Rangez après usage ceux qui peuvent être avalés, déchirés ou dans lesquels le chat peut s’emmêler, selon leur utilisation prévue. Utilisez les jeux pour interagir, sans forcer le contact ou pousser un chat inquiet à sortir de sa cachette. Une personne nouvelle doit aussi pouvoir lui laisser le choix de s’approcher.

## <a id="sante"></a>Quand demander un avis vétérinaire pendant la garde ?

Faites préciser le comportement habituel du chat avant le départ. Pendant le séjour, notez les changements observés : repas moins pris, boisson différente, cachette plus fréquente, élimination inhabituelle ou autre signe qui vous inquiète. Décrivez les faits et le moment où vous les avez remarqués.

[Cats Protection conseille d’appeler le vétérinaire devant un changement soudain des habitudes alimentaires ou de boisson](https://www.cats.org.uk/help-and-advice/caring-for-your-cat/diet/feeding). Le [guide sur les chats qui se cachent](https://www.cats.org.uk/help-and-advice/cat-behaviour/cats-hiding) rappelle aussi que des difficultés de santé peuvent être en cause. Ne supposez pas que le stress explique tout et n’attendez pas un délai fixe de vingt-quatre heures pour demander conseil.

Prévenez le propriétaire et demandez l’avis vétérinaire adapté à la situation, sans attendre sa réponse si l’état inquiète. Préparez avant le départ le vétérinaire habituel, la solution hors horaires, les informations médicales utiles et le financement des soins. Ne modifiez pas un traitement et ne donnez pas de médicament de votre initiative.

## <a id="annonce"></a>Comment présenter la garde de votre Bengal sur Guardiens ?

Décrivez les dates, le logement et les besoins concrets : présence, jeux connus, accès, alimentation et soins éventuels. Demandez une expérience en lien avec les tâches, pas seulement une personne qui « adore les Bengals ». Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à préparer les échanges.

Sur Guardiens, un gardien séjourne dans le logement **sans rémunération** pour les tâches convenues. La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens** ; transport et dépenses convenues restent distincts. Les [conditions tarifaires](/tarifs) précisent le fonctionnement. Aucune réponse ou disponibilité n’est garantie.

Une rencontre peut être organisée **si les deux personnes le souhaitent**. Le contrôle d’un document d’identité ne certifie pas une compétence avec votre chat ; les avis, lorsqu’ils existent, complètent les échanges. Après confirmation, un accord de garde est proposé à signature facultative ; préparez le guide de la maison lorsqu’il est disponible et la passation des habitudes.

## <a id="faq"></a>Questions fréquentes

:::faq
### Le Bengal est-il forcément difficile à garder ?
Non, il faut examiner le chat et ses habitudes plutôt que conclure à partir de la race. Son activité, son état de santé et les tâches convenues doivent correspondre aux possibilités du gardien.

### Combien d’heures faut-il rester avec un Bengal ?
Un nombre universel ne garantit pas une organisation adaptée. Définissez la présence selon les besoins et habitudes de votre chat, les soins éventuels et les possibilités du gardien, avec un avis vétérinaire lorsque nécessaire.

### Comment organiser les jeux pendant la garde ?
Il vaut mieux transmettre ses jeux habituels et adapter les séquences au chat. Des interactions régulières peuvent être courtes ; respectez son rythme et ses signes d’arrêt.

### La garde à domicile est-elle la seule solution possible ?
Elle peut aider à conserver des repères, mais comparez les options selon le chat, les besoins et les personnes disponibles. La race ne rend pas une solution automatiquement indispensable pour tous les individus.

### Que faire si mon Bengal mange moins pendant la garde ?
Le gardien décrit le changement, prévient le propriétaire et demande un avis vétérinaire adapté. Il ne doit pas supposer que le stress explique tout ni attendre un délai fixe avant de solliciter cet avis.

### Une fontaine à eau est-elle obligatoire ?
Non, elle dépend des habitudes et besoins de votre chat. Transmettez les points d’eau utilisés et leur entretien ; n’introduisez pas un nouvel équipement pendant la garde sans en discuter.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='038658e2-b34c-485b-b55d-fce5fb46070c'::uuid AND slug='bengal-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/bengal-guide-race' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder un Bengal : jeux, habitudes et préparation du séjour'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Transmettez les jeux, les routines et les accès habituels de votre Bengal pour choisir une présence et une organisation adaptées à votre chat.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Bengal : habitudes, jeux et choix du gardien'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre Bengal : habitudes de jeu, accès, alimentation, présence et consignes. Choisissez une organisation adaptée à votre chat.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chat à la robe tachetée est couché sur un canapé dans un salon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:55:16.362508+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot26_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot26_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot26_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder un Bengal : jeux, habitudes et préparation du séjour',
    excerpt='Transmettez les jeux, les routines et les accès habituels de votre Bengal pour choisir une présence et une organisation adaptées à votre chat.',
    meta_title='Garde du Bengal : habitudes, jeux et choix du gardien',
    meta_description='Préparez la garde de votre Bengal : habitudes de jeu, accès, alimentation, présence et consignes. Choisissez une organisation adaptée à votre chat.',
    hero_image_alt='Un chat à la robe tachetée est couché sur un canapé dans un salon.',
    internal_links='[{"text":"guide de garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='bengal-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
