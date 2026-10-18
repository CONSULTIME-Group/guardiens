-- Refonte des guides Bergers allemand et australien, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot27_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot27_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot27_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot27_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('78b9688a-138d-40ac-9907-608c85d07740'::uuid,'6304afb0-b22b-43c4-aab6-88ff7f8cb45c'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Faire garder un Berger allemand : habitudes, sorties et passation

**Pour faire garder votre Berger allemand, décrivez d’abord ce que la personne devra réellement assurer : promenades, présence, repas, accès au logement et situations à anticiper.** Le nom de la race ne permet pas de savoir comment votre chien accueille un inconnu, marche en laisse ou vit une absence.

Le choix repose sur la compatibilité entre ses habitudes et les possibilités du gardien. Pour un chien puissant, demandez notamment comment la personne gère les sorties et vérifiez ensemble l’utilisation du matériel habituel. Une expérience avec un autre grand chien ne suffit pas à connaître le vôtre.

**Dans ce guide :** [choisir une garde](#choix), [accueillir le gardien](#accueil), [préparer les sorties](#sorties), [transmettre les repas et la santé](#sante), [rédiger les consignes](#consignes), [questions fréquentes](#faq).

## <a id="choix"></a>Quelle garde choisir pour votre Berger allemand ?

Comparez les solutions à partir du quotidien de votre chien. Une personne qui séjourne chez vous conserve le cadre de vie, mais sa présence doit correspondre aux besoins convenus. Des visites ponctuelles, un accueil ailleurs ou une pension ont d’autres conditions de surveillance et d’organisation.

| Point à discuter | Ce que le gardien doit pouvoir préciser |
| --- | --- |
| Promenades | Sa capacité à tenir le chien, utiliser son équipement et suivre les itinéraires convenus. |
| Présence | Ses sorties personnelles et leur compatibilité avec les absences déjà vécues par votre chien. |
| Accueil et visiteurs | La façon d’entrer, de recevoir une livraison et de gérer les passages prévus. |
| Mobilité ou soins connus | Les gestes et contraintes qu’il accepte, après explication des consignes existantes. |
| Imprévu | Les contacts et le relais qui auront été organisés avant votre départ. |

Le jardin ne dispense pas de discuter des sorties, et l’appartement ne permet pas de conclure que la garde sera impossible. Escaliers, accès, environnement et routine comptent davantage qu’une catégorie de logement. Le [comparatif des solutions de garde de chien](/actualites/garde-chien-faire-garder-son-chien) aide à poser ces questions.

## <a id="accueil"></a>Comment préparer l’arrivée d’une nouvelle personne ?

Décrivez des situations observées : aboiements à la porte, besoin de distance, accueil plus facile à l’extérieur, présence d’enfants ou d’autres animaux. Si le chien a déjà pincé, mordu ou tenté de s’échapper, dites-le avant d’envisager le séjour. Ces informations servent à choisir une organisation adaptée, pas à donner une étiquette au chien.

Une rencontre peut être organisée **si vous la souhaitez tous les deux**. Elle permet de présenter les lieux et, lorsque cela convient au chien et aux personnes, de montrer les gestes du quotidien. Elle ne garantit pas le comportement pendant toute la garde. Si les échanges ne permettent pas de vérifier un point essentiel, ne confirmez pas le séjour avant de l’avoir clarifié.

Précisez comment ouvrir la porte et le portail, où se trouvent les clés et ce qui est prévu pendant les livraisons. Le gardien ne doit pas découvrir à son arrivée un artisan attendu ou un accès que le chien peut franchir. Évitez d’imposer le contact : demandez au propriétaire la manière habituelle de laisser le chien approcher.

Si certaines situations restent difficiles à gérer, consultez le [guide pour préparer la garde d’un chien réactif](/actualites/chien-reactif-agressif-garde-solutions). La garde ne doit pas servir d’essai improvisé pour modifier son comportement ou ses règles d’éducation.

## <a id="sorties"></a>Quelles consignes laisser pour les promenades ?

Notez les horaires et durées habituels, mais aussi le rythme, les pauses, les réactions aux croisements et les trajets à éviter. Montrez le harnais ou collier, la laisse et les fermetures. Si un équipement particulier est utilisé, expliquez son usage et vérifiez que le gardien peut le manipuler correctement.

Il n’existe pas de durée d’exercice valable pour tous les Bergers allemands. Âge, état de santé, habitudes et recommandations du vétérinaire peuvent changer l’organisation. Une garde n’est pas le moment de remplacer les promenades habituelles par des sprints, des sauts ou de nouveaux exercices pour « fatiguer la race ».

Prévoyez un itinéraire plus simple si les conditions changent : chaleur, sol glissant, circulation ou travaux. Pour un chien ayant des difficultés de mobilité, transmettez les aménagements et recommandations déjà convenus avec le vétérinaire. Ne fixez pas un âge à partir duquel tous les chiens devraient suivre les mêmes restrictions.

Demandez aussi quels mots ou gestes sont connus et quelles activités calmes font déjà partie du quotidien. Le gardien peut suivre ces habitudes sans devoir apprendre de nouvelles commandes au chien pendant votre absence.

## <a id="sante"></a>Repas, mobilité et santé : que transmettre ?

Laissez l’alimentation habituelle, les quantités, horaires et consignes de distribution. Précisez les friandises autorisées, les éventuelles restrictions et où se trouve le stock. Pour les traitements, fournissez l’ordonnance et les instructions du vétérinaire ; le gardien ne doit pas choisir lui-même un médicament ou modifier une prescription.

Indiquez les difficultés connues : se lever, monter un escalier, entrer dans une voiture ou supporter certaines manipulations. Décrivez ce que le chien fait habituellement et ce qui constituerait un changement. Une boiterie ou une perte d’appétit nouvelle ne doit pas être considérée comme normale parce que la race y serait supposée sujette.

**Un ventre qui se distend avec des tentatives répétées de vomir sans résultat, de l’agitation ou un malaise exige un avis vétérinaire immédiat.** Le [Manuel vétérinaire Merck, section sur la dilatation de l’estomac](https://www.merckvetmanual.com/dog-owners/digestive-disorders-of-dogs/disorders-of-the-stomach-and-intestines-in-dogs) décrit cette urgence, à laquelle les grands chiens à poitrine profonde peuvent être exposés. Ne cherchez pas à établir un diagnostic ou à traiter vous-même avant d’appeler.

Laissez les coordonnées du vétérinaire et le moyen de joindre le service de garde. En cas de signe inquiétant, le gardien contacte un vétérinaire et vous prévient ; il n’attend pas votre réponse pour demander un avis urgent. Les [repères pour gérer un imprévu pendant une garde](/actualites/gerer-imprevu-pendant-garde) permettent de préparer les contacts, le transport et le relais.

## <a id="consignes"></a>Que mettre dans l’annonce et la fiche de passation ?

Dans l’annonce, précisez les dates, le lieu, le nombre d’animaux, les sorties, la présence attendue et les contraintes importantes. Remplacez « chien facile, gardien expérimenté souhaité » par des faits : type de promenade, croisements difficiles, accès par escalier, soins à assurer ou véhicule nécessaire.

Avant le départ, rassemblez le matériel, les consignes détaillées, les contacts et la procédure convenue si le séjour doit être interrompu. Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à discuter des expériences et limites de chacun. Un contrôle de document d’identité, lorsqu’il est affiché, ne certifie pas une compétence canine.

Sur Guardiens, le gardien séjourne dans le logement et réalise les tâches convenues **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens**, selon les [conditions tarifaires](/tarifs). Les dépenses liées au séjour doivent être discutées à part. Aucun candidat ou délai de réponse n’est garanti. L’accord proposé après confirmation reste à signature facultative ; la préparation des consignes compte quel que soit ce choix.

## <a id="faq"></a>Questions fréquentes

:::faq
### Un Berger allemand peut-il être gardé par une nouvelle personne ?
Cela dépend du chien, de ses réactions et de l’organisation proposée. Décrivez les situations observées et échangez sur les sorties, l’accueil et les limites du gardien avant de confirmer.

### Faut-il obligatoirement une maison avec jardin ?
Non, ce critère seul ne suffit pas à choisir une garde. Vérifiez les habitudes du chien, les accès, les promenades et la présence réellement prévue dans le logement concerné.

### Combien de temps le gardien doit-il le promener ?
Transmettez le programme habituel et les recommandations du vétérinaire lorsqu’il y en a. Une durée minimale identique pour tous les chiens de la race ne permet pas d’organiser une garde adaptée.

### La rencontre avant la garde est-elle obligatoire sur Guardiens ?
Elle peut être organisée si les deux personnes le souhaitent. Elle aide à préparer la passation, sans garantir le comportement du chien ; les points essentiels doivent être clarifiés avant confirmation.

### Quels signes justifient de contacter rapidement un vétérinaire ?
Tout changement inquiétant mérite un avis. Une distension du ventre avec des tentatives de vomissement infructueuses ou un malaise appelle un contact vétérinaire immédiat, sans attendre le retour du propriétaire.

### La garde sur Guardiens est-elle payante ?
La plateforme est actuellement gratuite pour les deux rôles. Le gardien est hébergé sans rémunération pour les tâches convenues ; alimentation, transport et autres dépenses sont à clarifier séparément.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='78b9688a-138d-40ac-9907-608c85d07740'::uuid AND slug='berger-allemand-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/berger-allemand-guide-race' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder un Berger allemand : habitudes, sorties et passation'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Préparez une garde adaptée à votre Berger allemand : maniement en promenade, visiteurs, habitudes et consignes vétérinaires, sans règle identique pour tous.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Berger allemand : préparer les consignes'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Sorties, accueil du gardien, repas et santé : préparez la garde de votre Berger allemand avec des consignes adaptées à votre chien et à votre logement.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Berger allemand, illustration du guide de garde.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"comparatif des solutions de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide pour préparer la garde d’un chien réactif","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"repères pour gérer un imprévu pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:40:12.317424+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot27_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot27_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot27_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder un Berger allemand : habitudes, sorties et passation',
    excerpt='Préparez une garde adaptée à votre Berger allemand : maniement en promenade, visiteurs, habitudes et consignes vétérinaires, sans règle identique pour tous.',
    meta_title='Garde du Berger allemand : préparer les consignes',
    meta_description='Sorties, accueil du gardien, repas et santé : préparez la garde de votre Berger allemand avec des consignes adaptées à votre chien et à votre logement.',
    hero_image_alt='Berger allemand, illustration du guide de garde.',
    internal_links='[{"text":"comparatif des solutions de garde de chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide pour préparer la garde d’un chien réactif","url":"/actualites/chien-reactif-agressif-garde-solutions"},{"text":"repères pour gérer un imprévu pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='berger-allemand-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Faire garder un Berger australien : activité, repos et consignes de santé

**Une garde de Berger australien se prépare autour de sa routine réelle : sorties, activités connues, repos et absences déjà vécues.** Il ne suffit pas de trouver quelqu’un qui aime marcher, ni de promettre un nombre d’heures de sport identique pour tous les chiens.

Pour choisir une personne, décrivez une journée ordinaire et les situations qui demandent de l’attention. La garde doit être compatible avec les possibilités du gardien, les habitudes du chien et, lorsqu’il y en a, ses consignes vétérinaires.

**À préparer :** [le bon cadre de garde](#cadre), [l’activité et le repos](#routine), [les temps d’absence](#absence), [les informations de santé](#sante), [la passation](#passation), [questions fréquentes](#faq).

## <a id="cadre"></a>Comment choisir une garde adaptée à votre Aussie ?

Partez des tâches, pas d’un portrait de race : les promenades se font-elles dans un quartier fréquenté, sur un trajet calme, avec un chien qui tire ou qui réagit aux vélos ? La personne devra-t-elle donner un traitement, gérer plusieurs animaux ou prévoir du temps en journée ?

Demandez au gardien ce qu’il sait faire et ce qu’il ne souhaite pas assurer. « J’ai déjà eu un chien » ne répond pas à toutes ces questions. Une expérience racontée avec précision est plus utile qu’une simple affirmation d’aisance avec les races actives.

Comparez garde à domicile, visites, accueil ailleurs et pension selon les besoins de votre chien. Rester dans son logement conserve un cadre connu, mais n’assure pas à lui seul une présence suffisante. À l’inverse, un jardin ou une destination de montagne ne garantit pas qu’un séjour conviendra. Le [guide des solutions pour faire garder son chien](/actualites/garde-chien-faire-garder-son-chien) présente les différences à discuter.

## <a id="routine"></a>Comment équilibrer sorties, activités et repos ?

Décrivez le programme déjà suivi : promenades, jeux, exercices connus, moments calmes et lieux de repos. Précisez ce que le chien apprécie, ce qu’il évite et les signes qui conduisent habituellement à écourter une activité.

| Élément de routine | Informations à transmettre |
| --- | --- |
| Promenades | Horaires habituels, rythme, itinéraires, matériel et réactions aux croisements. |
| Jeux | Activités déjà connues, objets utilisés et manière de les terminer. |
| Repos | Endroits habituels, moments calmes et consignes pour ne pas déranger le chien. |
| Adaptations | Recommandations du vétérinaire, mobilité, météo et solution de sortie plus simple. |

Une garde n’est pas un programme d’entraînement. N’imposez pas des sprints, de la nage ou de l’agility improvisée parce que le chien est un Berger australien. Le gardien suit les habitudes compatibles avec les conditions du séjour ; il n’a pas à apprendre de nouveaux exercices pour atteindre un quota.

Le jardin reste un espace à sécuriser et à surveiller selon ce qui a été convenu. Il ne remplace pas automatiquement les sorties ou les échanges avec le chien. En cas de chaleur ou de changement de conditions, adaptez l’activité et demandez conseil au vétérinaire si un besoin de santé particulier le justifie.

## <a id="absence"></a>Combien de temps peut-il rester seul pendant la garde ?

Il n’existe pas de nombre d’heures valable pour tous les Aussies. Indiquez les absences déjà vécues, leur contexte et les réactions observées : agitation au départ, vocalisations, difficulté à se poser ou comportement inhabituel au retour. N’en déduisez pas vous-même un diagnostic.

Demandez quelles sorties personnelles le gardien envisage. Une personne hébergée chez vous ne promet pas une présence permanente. Si les absences prévues dépassent ce que vous pouvez raisonnablement organiser pour votre chien, cherchez une autre organisation avant de confirmer.

Ne laissez pas au gardien la tâche de « l’habituer » soudainement à rester seul. Si ce point pose déjà problème, faites-le évaluer avant le départ et transmettez les recommandations professionnelles existantes. Le [guide de garde des animaux difficiles](/actualites/gerer-animaux-difficiles-garde) aide à décrire les situations et à décider si le séjour est adapté.

## <a id="sante"></a>MDR1, traitements et crises : quelles informations laisser ?

Le [Club Français des Bergers Australiens](https://cfba.fr/maladies-hereditaires-depistage-adn/) présente une sensibilité à certains médicaments liée à une mutation du gène MDR1. Cela ne permet pas de déduire le statut de votre chien à partir de sa race ou de son apparence.

**Si un résultat de test existe, transmettez-le avec le dossier et les ordonnances.** S’il n’est pas connu, indiquez-le. Le gardien doit donner ces informations au vétérinaire consulté ; il ne choisit pas un médicament à partir d’une liste trouvée en ligne et ne modifie pas un traitement prescrit. Faites préciser avant le départ tout geste qu’il devra réellement assurer et vérifiez qu’il l’accepte.

Si votre chien a des antécédents de crises, demandez au vétérinaire des instructions écrites adaptées à sa situation, avec les conditions de recours au service de garde. Ne créez pas vous-même un protocole ou un délai d’attente à partir de la durée d’une crise précédente.

**Si le chien convulse, contactez un vétérinaire pour être guidé et faire évaluer l’urgence**, même si vous n’avez pas encore pu joindre le propriétaire. Le [service VetoAdom Alpin](https://www.vetoadom-alpin.com/urgence-veterinaire.php) cite les convulsions parmi les situations à soumettre au vétérinaire régulateur. Un article de garde ne permet pas de conclure qu’une crise est sans urgence parce qu’elle semble courte.

Pour toute autre difficulté connue, laissez les consignes existantes, les contacts, les moyens de transport et la façon de vous prévenir. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) sert à organiser ces relais, sans remplacer l’avis vétérinaire.

## <a id="passation"></a>Que préparer avant le départ ?

Présentez dans l’annonce les dates, le lieu, les animaux, les sorties, la présence attendue et les contraintes qui peuvent déterminer le choix du gardien. Gardez les détails de santé et les documents pour les échanges utiles à l’organisation du séjour, sans exposer publiquement des informations personnelles inutiles.

Préparez ensuite la routine écrite, le matériel de promenade, l’alimentation, les consignes de traitement s’il y en a, les contacts et le relais accepté. Une rencontre peut être organisée si vous la souhaitez tous les deux. Elle sert à montrer les lieux et gestes importants ; elle ne certifie pas que tout se passera de la même façon pendant votre absence.

Le [guide de préparation de la maison](/actualites/preparer-maison-avant-garde) complète la passation : accès, fermetures, consignes pratiques et moyens de contact. Un contrôle de document d’identité sur un profil ne constitue pas une validation de compétence avec les chiens ou de capacité à réaliser un soin.

Sur Guardiens, le gardien séjourne dans le logement et assure les tâches convenues **sans rémunération**. La plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens**, selon les [conditions tarifaires](/tarifs). Les dépenses sont à discuter séparément, sans candidat ni réponse garantis. L’accord proposé après confirmation reste à signature facultative.

## <a id="faq"></a>Questions fréquentes

:::faq
### Faut-il deux heures de sport par jour à tout Berger australien ?
Un quota identique ne permet pas d’organiser une garde adaptée. Transmettez les activités habituelles, les temps calmes, l’état de santé et les recommandations du vétérinaire lorsqu’il y en a.

### Un jardin suffit-il pour faire garder un Berger australien ?
Le jardin ne remplace pas automatiquement les sorties et la présence convenues. Vérifiez aussi les accès, la sécurité du lieu et la capacité du gardien à suivre la routine réelle de votre chien.

### Peut-il rester seul pendant le séjour ?
Discutez des absences déjà vécues et des réactions observées, puis comparez-les aux sorties prévues du gardien. Être hébergé sur place n’implique pas une présence permanente.

### Que transmettre concernant le test MDR1 ?
Le résultat s’il existe, ou l’indication que le statut n’est pas connu, ainsi que les ordonnances. Le vétérinaire interprète ces informations ; le gardien ne choisit ni ne modifie un médicament de sa propre initiative.

### Une crise courte peut-elle attendre le retour du propriétaire ?
Le gardien contacte un vétérinaire pour être guidé si le chien convulse et informe le propriétaire. Il suit les instructions vétérinaires existantes lorsqu’il y en a, sans s’appuyer sur une règle générale de durée pour décider d’attendre.

### Comment présenter les besoins dans une annonce Guardiens ?
Décrivez les sorties, la présence et les contraintes importantes avec des faits. La plateforme est actuellement gratuite pour les deux rôles ; le gardien est hébergé sans rémunération et aucune candidature n’est garantie.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='6304afb0-b22b-43c4-aab6-88ff7f8cb45c'::uuid AND slug='berger-australien-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/berger-australien-guide-race' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder un Berger australien : activité, repos et consignes de santé'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Activités habituelles, temps de repos, absences et informations de santé : les questions utiles pour choisir et préparer la garde de votre Berger australien.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde du Berger australien : activité, repos et MDR1'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre Berger australien : routine, solitude, sorties et informations MDR1 à transmettre, sans quota d’exercice ni avis médical improvisé.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Berger australien, illustration du guide de garde.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des solutions pour faire garder son chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide de garde des animaux difficiles","url":"/actualites/gerer-animaux-difficiles-garde"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 16:10:12.537032+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot27_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot27_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot27_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder un Berger australien : activité, repos et consignes de santé',
    excerpt='Activités habituelles, temps de repos, absences et informations de santé : les questions utiles pour choisir et préparer la garde de votre Berger australien.',
    meta_title='Garde du Berger australien : activité, repos et MDR1',
    meta_description='Préparez la garde de votre Berger australien : routine, solitude, sorties et informations MDR1 à transmettre, sans quota d’exercice ni avis médical improvisé.',
    hero_image_alt='Berger australien, illustration du guide de garde.',
    internal_links='[{"text":"guide des solutions pour faire garder son chien","url":"/actualites/garde-chien-faire-garder-son-chien"},{"text":"guide de garde des animaux difficiles","url":"/actualites/gerer-animaux-difficiles-garde"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='berger-australien-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
