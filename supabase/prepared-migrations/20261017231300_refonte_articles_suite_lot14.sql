-- Refonte des guides Villeurbanne et house-sitting en télétravail, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot14_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot14_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot14_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot14_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('f2aae657-e99d-413d-af5a-befe600252ac'::uuid,'3049c31e-f0df-4918-bf42-823790f5c994'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# House-sitting et télétravail : préparer son séjour à Lyon

**Télétravailler pendant un house-sitting peut s’envisager si le travail, les besoins des animaux et les conditions du logement sont compatibles.** Commencez par comparer vos contraintes avec celles du séjour. Être dans la maison ne signifie pas pouvoir interrompre une réunion, assurer une sortie à toute heure ou rester présent en permanence.

Le propriétaire et le gardien ont intérêt à parler du programme concret avant de confirmer. Une annonce agréable ou la mention « fibre » ne suffit pas à décider ; une profession ou un statut de télétravailleur ne garantit pas non plus une compétence animalière.

**Sommaire :** [vérifier la présence](#presence), [valider le lieu de travail](#travail), [connexion et espace](#logement), [prévoir les imprévus](#imprevus), [conditions du séjour](#conditions), [questions fréquentes](#faq).

## <a id="presence"></a>Vos horaires permettent-ils d’assurer les soins convenus ?

Demandez le programme habituel des animaux : repas, sorties, traitements prescrits, interactions et moments de présence nécessaires. Présentez vos propres contraintes sans promettre une souplesse que votre travail ne permet pas.

| Situation à discuter | Question concrète | Décision avant confirmation |
| --- | --- | --- |
| Réunions ou plages de concentration | Pouvez-vous vous interrompre aux moments utiles à l’animal ? | Adapter l’organisation ou choisir un autre séjour. |
| Déplacement professionnel ou journée hors du logement | Qui assure les tâches pendant votre absence ? | Prévoir un relais accepté, sans supposer que l’animal peut attendre. |
| Animal qui tolère mal les absences | Quels besoins et quel accompagnement sont déjà connus ? | Vérifier avec le propriétaire et le vétérinaire si le séjour convient. |
| Horaires décalés | Les soins et les conditions de repos restent-ils compatibles ? | En parler avant de s’engager, sans dérégler les soins de l’animal. |

Vous n’avez pas à promettre une présence vingt heures sur vingt-quatre ni à inventer un nombre d’heures pendant lequel tout animal pourrait rester seul. Le [guide des situations difficiles pendant une garde](/actualites/gerer-animaux-difficiles-garde) aide à reconnaître ses limites et à demander de l’aide. Un séjour n’est pas l’occasion d’improviser un programme de rééducation.

## <a id="travail"></a>Le logement est-il un lieu de télétravail autorisé ?

Si vous êtes salarié du secteur privé, vérifiez les lieux prévus par votre accord, votre charte ou l’autorisation de votre employeur. [Service Public explique que le télétravail peut s’exercer dans les lieux définis par ces règles ou autorisés par l’employeur](https://www.service-public.gouv.fr/particuliers/vosdroits/F13851). Un séjour chez un particulier ne vaut pas automatiquement autorisation professionnelle.

Pour toute activité, vérifiez aussi vos exigences de confidentialité, de matériel et d’assurance. N’attendez pas l’arrivée pour découvrir qu’un lieu, une connexion ou une pièce partagée ne convient pas à votre travail. Ces vérifications professionnelles sont distinctes de l’accord entre propriétaire et gardien.

## <a id="logement"></a>Connexion, bureau et calme : que demander avant d’arriver ?

Demandez quel espace est réellement utilisable, avec table, siège, prises, éclairage et conditions de calme. Précisez si vous devez passer des appels, à quels moments le logement peut être occupé par d’autres personnes et quels espaces restent privés.

Pour la connexion, l’[outil « Ma connexion internet » de l’Arcep](https://www.arcep.fr/nos-sujets/ma-connexion-internet.html) renseigne les technologies et débits proposés à une adresse. Complétez ce repère par une vérification de la connexion effectivement utilisée, depuis la pièce prévue pour travailler. L’éligibilité de l’immeuble ne remplace pas cette vérification pratique.

Convenez de l’accès au réseau, de la possibilité d’un branchement filaire si nécessaire et d’une solution en cas de coupure. Un lieu de travail extérieur ne constitue un relais que si les absences correspondantes conviennent aussi aux animaux. Les identifiants professionnels et les documents de travail n’ont pas à être partagés avec le propriétaire.

À Lyon comme à Villeurbanne ou dans une maison de l’Ouest lyonnais, décrivez l’adresse et le logement réels plutôt que de déduire une bonne connexion, un bureau ou le calme du nom du quartier. Le [guide de préparation du logement](/actualites/preparer-maison-avant-garde) aide le propriétaire à présenter ce qui est disponible.

## <a id="imprevus"></a>Que faire si le travail ou les besoins de l’animal changent ?

Prévoyez un contact de relais qui a accepté d’aider, les moyens de transport et le vétérinaire habituel. Convenez des décisions et du paiement des dépenses. La plateforme ne garantit pas qu’un autre gardien pourra immédiatement prendre la suite si une réunion ou un déplacement vous empêche d’assurer la garde.

Si les besoins de l’animal dépassent vos possibilités, contactez rapidement le propriétaire pour revoir l’organisation. En cas de problème de santé, demandez un avis vétérinaire sans attendre sa réponse. Ne laissez pas un animal sans prise en charge et ne poursuivez pas une tâche risquée pour maintenir le planning initial.

Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) complète cette préparation. Votre présence dans la maison ne garantit ni l’absence d’incident ni une protection particulière contre un cambriolage. Les horaires et les tâches doivent rester réalistes.

## <a id="conditions"></a>Quelles conditions convenir pour le séjour ?

Sur Guardiens, le gardien est hébergé sans rémunération pour veiller sur la maison et, s’il y en a, les animaux. **La plateforme est actuellement 100 % gratuite pour les deux rôles.** Dépenses du séjour, transport, alimentation des animaux et frais vétérinaires sont distincts et doivent être convenus.

La priorité est de développer le réseau et d’améliorer le service avec les retours des membres. Une éventuelle contribution aux frais d’infrastructure ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis. Consultez les [conditions actuelles](/tarifs).

Une rencontre peut être proposée **si les deux personnes le souhaitent**. Après confirmation de la garde, un accord est proposé ; sa signature est facultative. Décrivez honnêtement votre expérience, vos horaires et vos limites dans votre [profil de gardien](/actualites/creer-profil-gardien-attractif), puis vérifiez chaque annonce. Aucune disponibilité, candidature acceptée ou attribution de séjour n’est garantie.

Si vous êtes propriétaire, le [guide de rédaction d’annonce](/actualites/rediger-bonne-annonce-house-sitting) aide à préciser les conditions de présence et les équipements. Pour les formules de garde elles-mêmes, consultez le [guide du pet-sitting à Lyon](/actualites/pet-sitting-lyon-guide-complet).

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on télétravailler pendant une garde de maison ?
Cela peut s’envisager si les besoins des animaux, les horaires et le logement conviennent, et si votre cadre professionnel autorise le lieu choisi. Vérifiez ces points avant de confirmer.

### Un gardien en télétravail est-il disponible toute la journée ?
Pas nécessairement. Réunions, concentration et déplacements peuvent limiter sa disponibilité. Convenez des tâches et des moments où une présence active est nécessaire.

### La mention fibre suffit-elle pour accepter un séjour ?
Non. Vérifiez la connexion effectivement utilisable dans l’espace de travail, le matériel disponible et une possibilité de relais en cas de coupure, compatible avec les soins.

### Un salarié peut-il travailler depuis n’importe quel logement de house-sitting ?
Il doit vérifier les lieux autorisés par son accord, sa charte ou son employeur. L’accord avec le propriétaire du logement ne remplace pas les règles de son activité professionnelle.

### Que faire si une réunion empêche une sortie ou un soin prévu ?
Le problème doit être anticipé avec le propriétaire et un relais qui a accepté d’intervenir. Si l’organisation ne permet pas d’assurer les besoins, adaptez-la ou choisissez un autre séjour. Ne supposez pas un remplacement immédiat par la plateforme.

### Le gardien est-il rémunéré pour rester en télétravail dans la maison ?
Non. Dans le house-sitting présenté sur Guardiens, il est hébergé sans rémunération. La plateforme est actuellement gratuite et les dépenses convenues restent distinctes de cet hébergement.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='f2aae657-e99d-413d-af5a-befe600252ac'::uuid AND slug='boom-pet-sitting-lyon-2026';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/boom-pet-sitting-lyon-2026' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting et télétravail : préparer son séjour à Lyon'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Avant d’accepter un house-sitting en télétravail, discutez des soins, de vos horaires, de la connexion et des conditions du logement. Une préparation utile aux deux personnes.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting et télétravail à Lyon : les conditions'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Télétravailler pendant une garde à Lyon : vérifiez les horaires des animaux, le lieu de travail autorisé, la connexion et le logement avant de confirmer.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien est couché sur un tapis dans un salon avec un canapé et une table basse.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des situations difficiles pendant une garde","url":"/actualites/gerer-animaux-difficiles-garde"},{"text":"guide de préparation du logement","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de rédaction d’annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"guide du pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 16:10:12.548246+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot14_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot14_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot14_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting et télétravail : préparer son séjour à Lyon',
    excerpt='Avant d’accepter un house-sitting en télétravail, discutez des soins, de vos horaires, de la connexion et des conditions du logement. Une préparation utile aux deux personnes.',
    meta_title='House-sitting et télétravail à Lyon : les conditions',
    meta_description='Télétravailler pendant une garde à Lyon : vérifiez les horaires des animaux, le lieu de travail autorisé, la connexion et le logement avant de confirmer.',
    hero_image_alt='Un chien est couché sur un tapis dans un salon avec un canapé et une table basse.',
    internal_links='[{"text":"guide des situations difficiles pendant une garde","url":"/actualites/gerer-animaux-difficiles-garde"},{"text":"guide de préparation du logement","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de rédaction d’annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"guide du pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='boom-pet-sitting-lyon-2026' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Garde d’animaux à Villeurbanne : organiser visites, sorties et séjour

**Pour faire garder un animal à Villeurbanne, vérifiez comment les soins et les sorties s’intègrent dans la journée de la personne.** Habiter près des Gratte-Ciel, de Charpennes ou de Cusset ne suffit pas à garantir qu’elle pourra venir aux moments utiles ou séjourner chez vous dans de bonnes conditions.

Des visites définies, l’accueil dans un autre lieu et un gardien hébergé sont des organisations différentes. Le house-sitting proposé sur Guardiens consiste à accueillir une personne dans votre logement pour veiller sur la maison et, s’il y en a, les animaux. La présence attendue et les tâches sont à convenir ; le séjour peut aussi concerner un logement sans animaux.

**Sommaire :** [choisir l’organisation](#organisation), [préparer les promenades](#promenades), [trajets et logement](#trajets), [budget et choix du gardien](#choisir), [questions fréquentes](#faq).

## <a id="organisation"></a>Visites ou séjour hébergé : partir du programme réel

Décrivez les repas, les traitements prescrits, les sorties et les moments de présence nécessaires. Pour plusieurs animaux, distinguez leurs habitudes et les espaces accessibles. Une visite annoncée à un certain prix ne décrit ni toute la journée de l’animal ni l’entretien du logement.

| Besoin à présenter | Question à régler avant confirmation |
| --- | --- |
| Soins aux heures utiles | La personne peut-elle réellement être disponible à ces moments ? |
| Sorties du chien | Quel parcours, quelle durée habituelle et quels équipements sont prévus ? |
| Séjour du gardien | Peut-il vivre et se reposer dans le logement proposé ? |
| Maison et plantes | Quelles tâches sont incluses et quel relais assure les interventions techniques ? |

Le [guide du pet-sitting à Lyon](/actualites/pet-sitting-lyon-guide-complet) compare les formules et renvoie vers les guides chien et chat. Pour un animal malade ou qui tolère difficilement les absences, discutez de l’organisation avec le vétérinaire plutôt que de supposer qu’un séjour réglera la difficulté.

## <a id="promenades"></a>Où préparer une promenade avec un chien à Villeurbanne ?

**Ne transformez pas tous les parcs du quartier en lieux de promenade autorisés.** La [fiche municipale « Mon chien en ville »](https://www.villeurbanne.fr/fiches-pratiques/cabinet-du-maire/mon-chien-en-ville) distingue les canisites, les espaces de liberté et les parcs accessibles en laisse. Elle indique notamment **la Feyssine, au 12 avenue Monin**, et **le parc Nathalie Gautier, au 4 rue Galilée**, pour les chiens tenus en laisse.

Les espaces de liberté dédiés ont un autre usage et ne conviennent pas automatiquement à tous les animaux. Consultez la fiche et la signalisation pour le lieu envisagé ; ne généralisez pas la règle d’un espace à tous les jardins. La Doua ou un quartier piéton ne constituent pas non plus, à eux seuls, une garantie de parcours autorisé et adapté.

Donnez au gardien le trajet habituel de votre chien, les réactions à connaître et les interactions à éviter. Le [guide des parcs pour chiens dans la métropole](/actualites/parcs-chiens-lyon-guide-complet) complète ces repères. Une sortie nouvelle se discute avec le propriétaire selon les possibilités de l’animal et du gardien.

## <a id="trajets"></a>Quels trajets et quelles conditions de logement préciser ?

Pour des visites, vérifiez l’accès au logement aux horaires utiles et le temps nécessaire entre deux engagements. Pour un séjour hébergé, présentez les conditions de vie : chambre, pièces accessibles, connexion, chauffage et éventuelles contraintes de bruit ou d’accès.

Décrivez les étages, l’ascenseur, les portes et la remise des clés. Indiquez les déplacements vers les courses et le vétérinaire, et les solutions de transport de l’animal. La proximité du réseau TCL ne prouve pas qu’un trajet convient à toute espèce : consultez le [règlement du réseau unifié](https://www.tcl.fr/a-propos/reglement-du-reseau-tcl-unifie) pour l’animal et le service utilisés, puis prévoyez une autre possibilité si nécessaire.

Pour un chat, expliquez les ouvertures autorisées, les protections et les habitudes de sortie. Ne déduisez pas de la taille ou de l’époque d’une résidence que les balcons sont sûrs ou les cours calmes. Le [guide de garde de chat à domicile](/actualites/garde-chat-domicile-house-sitting) aide à décrire ces besoins.

## <a id="choisir"></a>Quel budget et comment choisir une personne ?

Pour une prestation payante, comparez durée, fréquence, déplacements, suppléments et remise des clés. Demandez un devis pour les mêmes besoins ; un tarif affiché ne garantit pas une disponibilité à votre adresse.

Guardiens est **actuellement 100 % gratuit pour les propriétaires et les gardiens**. Le gardien est hébergé sans rémunération. Les dépenses convenues, le transport et les soins vétérinaires sont distincts. La priorité est de développer le réseau et d’améliorer le service avec les retours des membres. Une éventuelle contribution aux frais de la plateforme ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis. Consultez les [conditions actuelles](/tarifs).

Discutez de l’expérience, des horaires et des limites de la personne. Un avis, lorsqu’il existe, peut compléter l’échange ; le contrôle d’identité porte sur un document et ne certifie pas une compétence. Être étudiant, retraité ou en télétravail n’indique pas en soi la disponibilité nécessaire. Le [guide du house-sitting et du télétravail](/actualites/boom-pet-sitting-lyon-2026) détaille les questions propres à cette dernière organisation.

Une rencontre peut être proposée **si les deux personnes le souhaitent**. Avant le départ, préparez vétérinaire, prescriptions, transport, dépenses et relais qui a accepté d’intervenir. Si l’animal semble malade, demandez un avis vétérinaire sans attendre une réponse du propriétaire. Utilisez la [checklist de départ](/actualites/checklist-partir-vacances-animaux) et vérifiez les assurances adaptées à votre situation.

Après confirmation, un accord est proposé sur Guardiens ; sa signature est facultative. Gardez une autre solution possible : aucune candidature, présence permanente ou disponibilité immédiate de remplacement n’est garantie.

## <a id="faq"></a>Questions fréquentes

:::faq
### Quelle différence entre une visite et un gardien hébergé à Villeurbanne ?
Une visite correspond à un passage défini. Un gardien hébergé séjourne dans le logement, avec des soins et des horaires de présence convenus. Les besoins de l’animal et les conditions du séjour doivent guider le choix.

### Peut-on détacher un chien dans tout le parc de la Feyssine ?
La fiche municipale indique la Feyssine parmi les parcs accessibles aux chiens tenus en laisse. Les espaces de liberté dédiés sont distincts. Consultez les informations de la Ville et la signalisation du lieu.

### Tous les parcs de Villeurbanne sont-ils accessibles aux chiens ?
Non. La Ville distingue les usages et les lieux autorisés. Vérifiez le site précis avant de proposer un parcours au gardien, sans supposer qu’un espace vert est automatiquement accessible.

### La proximité de TCL suffit-elle pour un transport vétérinaire ?
Non. Vérifiez le trajet, les règles applicables à l’animal et au service, et la possibilité de se déplacer au moment nécessaire. Prévoyez une autre solution si les transports ne conviennent pas.

### Guardiens est-il gratuit pour les propriétaires et les gardiens ?
La plateforme est actuellement gratuite pour les deux rôles et le gardien est hébergé sans rémunération. Les dépenses convenues et les soins vétérinaires restent distincts.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='3049c31e-f0df-4918-bf42-823790f5c994'::uuid AND slug='pet-sitting-villeurbanne';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-villeurbanne' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde d’animaux à Villeurbanne : organiser visites, sorties et séjour'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Visites ou gardien hébergé à Villeurbanne : les points à vérifier pour les soins, les déplacements et les promenades, selon votre logement et vos animaux.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Pet-sitting Villeurbanne (69100) : Gratte-Ciel'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Gratte-Ciel, Charpennes ou Cusset : préparez les soins, les trajets et les sorties autorisées avant une garde d’animaux ou un séjour chez vous à Villeurbanne.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne promène un chien roux en laisse dans une rue bordée d’immeubles.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide du pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"guide des parcs pour chiens dans la métropole","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide de garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide du house-sitting et du télétravail","url":"/actualites/boom-pet-sitting-lyon-2026"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:55:11.122551+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot14_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot14_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot14_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde d’animaux à Villeurbanne : organiser visites, sorties et séjour',
    excerpt='Visites ou gardien hébergé à Villeurbanne : les points à vérifier pour les soins, les déplacements et les promenades, selon votre logement et vos animaux.',
    meta_title='Pet-sitting Villeurbanne (69100) : Gratte-Ciel',
    meta_description='Gratte-Ciel, Charpennes ou Cusset : préparez les soins, les trajets et les sorties autorisées avant une garde d’animaux ou un séjour chez vous à Villeurbanne.',
    hero_image_alt='Une personne promène un chien roux en laisse dans une rue bordée d’immeubles.',
    internal_links='[{"text":"guide du pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"guide des parcs pour chiens dans la métropole","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide de garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide du house-sitting et du télétravail","url":"/actualites/boom-pet-sitting-lyon-2026"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-villeurbanne' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
