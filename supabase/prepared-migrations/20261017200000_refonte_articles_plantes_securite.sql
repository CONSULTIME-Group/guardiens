-- Refonte des guides plantes et sécurité, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_plantes_securite_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_plantes_securite_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_plantes_securite_20261017 TO service_role;
ALTER TABLE public._backup_articles_plantes_securite_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('338ce11e-7ec3-44bc-b20e-1e9c4a84cb77'::uuid,'1acc66ba-0223-465c-8dd4-1230443610e2'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $plantes_securite_content_0_20261017$# Arroser ses plantes pendant les vacances : quelle solution choisir ?

**Pour arroser vos plantes pendant les vacances, choisissez entre un dispositif adapté et des passages convenus avec quelqu’un.** Avant de décider, repérez les besoins de chaque plante, la taille des pots, leur exposition et les conditions prévues pendant votre absence. Une réserve d’eau ne garantit pas la même autonomie dans tous les logements.

Si vous souhaitez aussi une présence dans la maison, vous pouvez accueillir un gardien qui y séjourne et assure les soins courants convenus, avec ou sans animaux. Sur Guardiens, le gardien est hébergé sans rémunération et **la plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens**. Pour quelques pots seulement, des passages peuvent suffire : le séjour de garde n’est pas une obligation.

Avec Elisa, nous avons créé Guardiens après cinq ans de garde de maisons et d’animaux. Ce guide aide à choisir une organisation pour vos plantes et à transmettre des consignes compréhensibles à la personne qui prend le relais.

À parcourir : [évaluer les besoins](#besoins), [comparer les dispositifs](#dispositifs), [préparer les plantes](#preparation), [balcon et terrasse](#balcon), [organiser les passages](#relais), [laisser une fiche](#consignes), [prévoir un imprévu](#imprevus) et [questions fréquentes](#faq).

## <a id="besoins"></a>Combien de temps les plantes peuvent-elles rester sans arrosage ?

Il n’y a pas de moyenne assez fiable pour décider à votre place. Une plante dans un petit pot exposé au soleil et une autre dans une pièce plus fraîche ne perdent pas l’eau au même rythme. La saison, le substrat, le drainage et l’état de la plante comptent aussi.

La [Royal Horticultural Society, association horticole britannique, distingue notamment les besoins des plantes d’intérieur et ceux des cactus et succulentes](https://www.rhs.org.uk/plants/types/houseplants/holiday-care), qui tolèrent généralement des périodes plus longues sans eau. Cela ne permet pas de promettre trois semaines d’autonomie à toutes les plantes de ce groupe.

Observez votre arrosage habituel avant le départ : quels pots demandent une attention fréquente dans les conditions actuelles ? Lesquels doivent sécher entre deux apports ? Identifiez les plantes dont vous connaissez mal les besoins, puis faites préciser leurs soins par une pépinière ou un spécialiste. Cette petite liste est plus utile qu’un classement « trois jours, dix jours, un mois ».

## <a id="dispositifs"></a>Mèche, réserve d’eau ou goutte-à-goutte : que comparer ?

Le bon dispositif est celui qui convient à vos plantes et que vous avez pu essayer. Le tableau sert à préparer cet essai ; il ne classe pas les solutions par fiabilité universelle.

| Solution | À examiner pour | Ce qu’il faut vérifier avant le départ |
| --- | --- | --- |
| Mèche ou tapis capillaire | Un apport depuis une réserve pour des pots compatibles | Contact avec le substrat, tenue de la mèche et niveau de la réserve |
| Pot à réserve d’eau | Une plante déjà installée dans ce type de contenant | Compatibilité de la plante et fonctionnement habituel du pot |
| Cône ou oya pour pot | Un dispositif dont les conditions d’utilisation correspondent à votre pot | Notice, dimensions, installation et consommation réellement observée |
| Bouteille retournée | Un montage à essayer sur le pot concerné | Écoulement effectif, stabilité et éventuelle fuite |
| Goutte-à-goutte programmé | Plusieurs pots ou zones à alimenter | Couverture, réglages, raccords et alimentation du modèle choisi |

La RHS décrit les [mèches et tapis capillaires pour les plantes d’intérieur](https://www.rhs.org.uk/plants/types/houseplants/holiday-care). Elle signale aussi leurs limites : réserve qui se vide, mèche qui se déplace et apport d’eau mal adapté. Un système à réserve ne convient pas à toutes les plantes ; évitez de rempoter uniquement pour une courte absence sans avoir pu tester le résultat.

Pour le [goutte-à-goutte et les systèmes programmés](https://www.rhs.org.uk/garden-jobs/garden-watering-methods), les réglages et la couverture doivent correspondre aux besoins des zones desservies. Tous les modèles n’ont pas les mêmes raccordements ni les mêmes fonctions. Suivez leur notice et regardez le résultat sur chaque pot, pas seulement le déclenchement du programmateur.

**Testez l’installation assez tôt pour pouvoir la corriger.** Repérez le niveau de la réserve au début et à la fin de l’essai, l’état du substrat et les écoulements éventuels. Une observation par temps frais ne prouve pas que le montage couvrira une période plus chaude. Si l’essai ne vous permet pas de conclure, prévoyez un contrôle par une personne disponible.

## <a id="preparation"></a>Que préparer dans la maison avant de partir ?

Gardez les plantes dans un emplacement adapté, avec la lumière dont elles ont besoin. Les déplacer à l’abri d’un soleil direct intense peut être utile selon les espèces ; les enfermer dans une pièce noire n’est pas une solution générale. La [RHS explique comment adapter lumière, température et arrosage aux plantes d’intérieur](https://www.rhs.org.uk/plants/types/houseplants/growing-guide).

Arrosez celles qui en ont besoin, en laissant l’excédent s’évacuer selon leur mode de culture. Ne mettez pas tous les pots dans une bassine pleine d’eau par précaution. Évitez aussi de tailler systématiquement fleurs et boutons sans tenir compte de l’espèce.

Préparez un endroit simple pour le matériel : arrosoir, récipient de mesure et fiche des plantes. Si un dispositif comporte une réserve, montrez comment la contrôler et la remplir. Protégez les surfaces qui pourraient être mouillées et vérifiez qu’un écoulement ne puisse pas endommager un meuble ou le logement.

## <a id="balcon"></a>Que change un balcon ou une terrasse ?

À l’extérieur, l’exposition et le vent ajoutent des contraintes. La [RHS conseille de vérifier l’humidité des pots avant d’arroser](https://www.rhs.org.uk/container-gardening/how-to-water-containers) : une petite pluie ne suffit pas nécessairement à humidifier tout le substrat. Le matériau et le volume du pot influencent aussi la rétention d’eau.

Ne divisez pas mécaniquement par deux une prétendue durée d’autonomie intérieure. Présentez plutôt les pots exposés et la méthode de contrôle à la personne qui passe. Pour les végétaux lourds, suspendus ou difficiles d’accès, organisez les soins sans demander de manipulation risquée.

En France, consultez les restrictions applicables à votre adresse et à votre usage sur [VigiEau](https://vigieau.gouv.fr/). Un programmateur ou un goutte-à-goutte n’accorde pas, à lui seul, une dérogation. Pour le potager et les autres extérieurs, notre guide sur [l’entretien du jardin pendant une absence](/actualites/entretenir-jardin-pendant-absence) aide à définir l’ensemble des tâches.

## <a id="relais"></a>Quand organiser des passages ou un gardien sur place ?

Envisagez un relais si certaines plantes demandent un suivi que le dispositif testé ne couvre pas, si la réserve devra être remplie ou si vous voulez pouvoir adapter les consignes pendant le séjour. Une absence longue rend cette organisation utile à examiner, sans imposer le même seuil à tous les logements.

Pour des passages, convenez des jours, des clés, de ce qui doit être vérifié et de la marche à suivre si la personne est indisponible. Si vous confiez les pots à quelqu’un d’autre, vérifiez aussi qu’il dispose de la place et des conditions nécessaires pour les accueillir.

Le house-sitting peut convenir lorsque vous souhaitez que quelqu’un vive dans la maison et s’occupe aussi des autres besoins convenus : courrier, jardin ou animaux s’il y en a. Notre guide sur la [garde de maison sans animaux](/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal) explique cette possibilité. La présence n’implique ni une surveillance permanente ni la garantie de sauver une plante en difficulté.

Présentez le nombre de pots, les accès et le temps à prévoir dans votre [annonce de garde](/actualites/rediger-bonne-annonce-house-sitting). Échangez sur les tâches et les disponibilités avant de confirmer ; une rencontre est possible si les deux le souhaitent. Convenez séparément du matériel et des dépenses éventuelles. La publication ne garantit pas une candidature.

## <a id="consignes"></a>Quelle fiche laisser à la personne qui arrose ?

Numérotez les pots ou prenez une photo de chaque groupe. Pour chacun, indiquez l’emplacement, la façon de vérifier le besoin, la quantité adaptée que vous avez déterminée et les précautions particulières. Une fréquence peut servir de repère de contrôle, sans devenir une obligation d’arroser même si la plante n’en a pas besoin.

**Exemple fictif à compléter pour vos plantes :**

> Pot A, près du canapé : vérifier le substrat selon la méthode montrée. Arroser seulement si nécessaire, avec la quantité indiquée sur la fiche. Pot B, sur l’étagère : ne pas ajouter d’eau sans me contacter pendant cette garde. Réserve C : contrôler le niveau et me prévenir si elle se vide plus vite que lors de l’essai. Arrosoir et récipient de mesure dans la cuisine.

Ajoutez votre contact et les situations à signaler. Une feuille jaune ou tombante ne suffit pas à poser un diagnostic certain de manque ou d’excès d’eau : demandez une photo et des informations sur le substrat avant de modifier les consignes. Les accès détaillés se transmettent en privé à la personne retenue.

## <a id="imprevus"></a>Que prévoir en cas de panne, de fuite ou de retour retardé ?

Convenez de la personne à joindre et des achats qui nécessitent votre accord. Si vous avez prévu un relais, vérifiez qu’il accepte ce rôle et qu’il sait comment accéder au matériel. Une réserve renversée ou un tuyau débranché demande une réponse adaptée à la situation, sans réparation improvisée.

Si votre absence se prolonge, confirmez que les passages ou le séjour pourront continuer. Guardiens ne garantit pas un remplacement immédiat. Pour la préparation globale du logement, poursuivez avec [les précautions à prendre pendant une absence prolongée](/actualites/securiser-maison-absence-prolongee) et le guide pour [préparer sa maison avant une garde](/actualites/preparer-maison-avant-garde).

Notre priorité est de construire le réseau et d’améliorer le service avec vos retours. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Les conditions à jour figurent sur la page [tarifs](/tarifs).

## <a id="faq"></a>Questions fréquentes sur l’arrosage pendant les vacances

:::faq
### Comment arroser ses plantes quand on part deux semaines ?

Repérez leurs besoins, puis choisissez un dispositif testé ou des passages adaptés. La durée seule ne permet pas de garantir qu’une réserve suffira : tenez compte des pots, de la saison et des conditions du logement.

### Une bouteille retournée suffit-elle pour les vacances ?

Ne comptez pas sur un montage que vous n’avez pas essayé sur le pot concerné. Vérifiez l’écoulement, la stabilité et la réserve réellement consommée ; prévoyez une autre organisation si le résultat est incertain.

### Peut-on laisser les plantes dans une bassine d’eau ?

Ce n’est pas une solution générale. Les besoins et le mode de culture diffèrent ; un apport permanent ne convient pas à toutes les plantes. Choisissez une méthode adaptée et testez-la avant le départ.

### Faut-il arroser davantage avant de partir ?

Arrosez selon les besoins, sans saturer tous les pots par précaution. Vérifiez le drainage et l’absence d’écoulement dommageable. Un arrosage supplémentaire ne remplace pas l’organisation des soins pendant le séjour.

### Peut-on demander une garde de maison uniquement pour les plantes ?

Oui, avec un logement habitable et des tâches acceptées, même sans animaux. Si quelques passages suffisent, cette solution peut être plus adaptée qu’un séjour complet. La plateforme Guardiens est actuellement gratuite pour les deux rôles ; les dépenses se conviennent séparément.

### Que faire si une plante jaunit pendant mon absence ?

Demandez une photo et des précisions sur son état et son substrat. La couleur d’une feuille ne permet pas, à elle seule, d’identifier la cause. Évitez de demander un apport d’eau systématique sans comprendre la situation.
:::$plantes_securite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='338ce11e-7ec3-44bc-b20e-1e9c4a84cb77'::uuid AND slug='arroser-plantes-pendant-vacances-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/arroser-plantes-pendant-vacances-guide' THEN
    RAISE EXCEPTION 'Guide plantes-sécurité 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Arroser ses plantes pendant les vacances : quelle solution choisir ?'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Plantes d’intérieur ou balcon : comparez les dispositifs d’arrosage et les passages, puis préparez le relais selon les besoins de chaque pot.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Arroser ses plantes pendant les vacances : solutions'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Mèches, réserves d’eau, goutte-à-goutte ou passages : choisissez comment arroser vos plantes pendant les vacances et préparez des consignes adaptées.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une main verse de l’eau avec un arrosoir blanc sur une plante verte.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"l’entretien du jardin pendant une absence","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"les précautions à prendre pendant une absence prolongée","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"préparer sa maison avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:25:17.872505+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide plantes-sécurité 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_plantes_securite_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide plantes-sécurité 0 différente';
  END IF;
  INSERT INTO public._backup_articles_plantes_securite_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_plantes_securite_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Arroser ses plantes pendant les vacances : quelle solution choisir ?',
    excerpt='Plantes d’intérieur ou balcon : comparez les dispositifs d’arrosage et les passages, puis préparez le relais selon les besoins de chaque pot.',
    meta_title='Arroser ses plantes pendant les vacances : solutions',
    meta_description='Mèches, réserves d’eau, goutte-à-goutte ou passages : choisissez comment arroser vos plantes pendant les vacances et préparez des consignes adaptées.',
    hero_image_alt='Une main verse de l’eau avec un arrosoir blanc sur une plante verte.',
    internal_links='[{"text":"l’entretien du jardin pendant une absence","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"annonce de garde","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"les précautions à prendre pendant une absence prolongée","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"préparer sa maison avant une garde","url":"/actualites/preparer-maison-avant-garde"},{"text":"tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='arroser-plantes-pendant-vacances-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte plantes-sécurité 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $plantes_securite_content_1_20261017$# Sécuriser sa maison pendant une absence prolongée

**Pour préparer la sécurité de votre maison pendant une absence prolongée, combinez des accès correctement fermés, les précautions de votre assurance et une organisation pour recevoir les alertes et y donner suite.** Prévoyez aussi le courrier, les équipements du logement et les contacts utiles. Faire habiter la maison par un gardien peut répondre à un besoin de présence et d’entretien, sans garantir l’absence de cambriolage ou de sinistre.

Le choix dépend de votre logement et de ce que vous souhaitez confier : maison vide avec passages, prestation spécialisée ou gardien hébergé. Sur Guardiens, ce dernier séjourne chez vous et assure les tâches convenues, avec ou sans animaux. Il n’est pas rémunéré et **la plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens**.

Avec Elisa, nous avons créé ce réseau après cinq ans de garde de maisons et d’animaux. Ce guide aide à préparer le départ et les responsabilités de chacun, sans présenter la garde comme une assurance ou un service de sécurité professionnel.

Dans ce guide : [vérifications de départ](#depart), [assurance](#assurance), [équipements](#equipements), [relais](#relais), [Opération Tranquillité Vacances](#otv), [gardien sur place](#gardien), [alerte et imprévu](#imprevus) et [questions fréquentes](#faq).

## <a id="depart"></a>Quelles vérifications faire avant un départ long ?

Commencez par les accès : portes, fenêtres, dépendances et dispositifs de fermeture. Faites corriger ce qui fonctionne mal avant de partir. Rangez les clés, documents et biens sensibles dans les conditions prévues pour votre logement. Les [conseils de prévention du ministère de l’Intérieur](https://www.masecurite.interieur.gouv.fr/fr/fiches-pratiques/habitation/partir-en-vacances-en-toute-securite-otv) portent notamment sur les fermetures, les objets de valeur, le courrier et la discrétion sur les réseaux sociaux.

Organisez la relève ou le suivi du courrier et des livraisons. Confiez les clés nécessaires à une personne qui a accepté ce rôle et convenez de leur restitution. Une pelouse haute ou des volets fermés ne permettent pas de calculer votre risque personnel ; il n’existe pas ici de classement fiable des signes qui rendraient une maison « cible » après un nombre précis de jours.

Préparez aussi les installations selon leur notice et les conseils des professionnels qui les suivent. La décision de couper une alimentation, de maintenir le chauffage ou de laisser fonctionner un appareil dépend de l’installation et de l’occupation prévue. Si quelqu’un habite la maison, ses besoins doivent être pris en compte. Pour les extérieurs, utilisez le guide pour [confier l’entretien du jardin](/actualites/entretenir-jardin-pendant-absence) et celui sur [l’arrosage des plantes pendant les vacances](/actualites/arroser-plantes-pendant-vacances-guide).

## <a id="assurance"></a>Que demander à son assureur pour une absence prolongée ?

Lisez les conditions de votre contrat avant le départ : durée d’inhabitation, définition de l’occupation, protections à utiliser et éventuelles précautions concernant le gel ou l’eau. **Il n’existe pas un délai de trente, soixante ou quatre-vingt-dix jours valable pour tous les contrats.**

[France Assureurs rappelle que des contrats prévoient une suspension de la garantie vol au-delà d’une période d’inhabitation](https://www.franceassureurs.fr/lassurance-protege-finance-et-emploie/lassurance-protege/lassurance-en-pratique-pour-les-particuliers/sejour-etranger-assurances-et-assistance). Demandez à votre assureur comment votre situation sera traitée : absence complète, passages ponctuels ou séjour d’une personne autorisée. Ne supposez pas que quelques visites suffisent à interrompre le décompte prévu par votre contrat.

Posez des questions concrètes : quelles fermetures utiliser ? Quels justificatifs conserver ? Faut-il déclarer la durée ou l’accueil d’un gardien, et selon quelle procédure ? Demandez une réponse écrite adaptée à votre cas. Un simple courriel envoyé sans confirmation ne prouve pas que vos garanties ont été étendues.

Les [conditions de la garantie vol](https://www.franceassureurs.fr/lassurance-protege-finance-et-emploie/lassurance-protege/lassurance-en-pratique-pour-les-particuliers/assurance-multirisques-habitation-la-garantie-vol/) peuvent imposer l’utilisation des moyens de protection existants. Ne laissez donc pas un accès moins protégé dans le seul but de donner une impression de présence. Les volets se gèrent en fonction des consignes applicables au logement, de l’occupation réelle et du contrat.

## <a id="equipements"></a>Alarme, caméra ou simulateur : quel rôle leur donner ?

Ces équipements n’assurent pas tous la même fonction. Vérifiez ce que votre installation fait réellement et qui doit agir après une notification. Évitez de choisir un produit sur une promesse générale de « protection totale ».

| Équipement | Fonction à vérifier | Organisation nécessaire |
| --- | --- | --- |
| Fermetures et protections des accès | Bon fonctionnement et conformité aux exigences du contrat | Réparation ou adaptation avant le départ si nécessaire |
| Alarme | Détection, destinataires des alertes, fonctionnement du modèle installé | Procédure et contacts ; engagements du prestataire si vous en avez un |
| Caméra connectée | Zone filmée et accès aux images | Respect de la vie privée, information des personnes et réponse aux alertes |
| Programmation d’éclairage | Fonctionnement et compatibilité avec l’installation | Usage adapté, sans en déduire une garantie de dissuasion |
| Capteur technique | Ce qu’il détecte, comment et à qui il signale un problème | Personne joignable et procédure adaptée à l’alerte |

Testez les notifications avec les personnes concernées, les piles ou alimentations et les accès utiles. Si le fonctionnement dépend du réseau, prévoyez ce qu’il se passe en cas de coupure. La détection d’un problème, sa transmission et l’intervention éventuelle sont trois étapes différentes.

Pour les caméras, la [CNIL rappelle le respect de la vie privée et les limites du cadrage à domicile](https://www.cnil.fr/fr/la-videosurveillance-videoprotection-chez-soi) : un particulier ne peut pas filmer la voie publique ni surveiller ses voisins. Si un gardien vient vivre chez vous, informez-le avant confirmation des dispositifs, des zones filmées et de leur fonctionnement. Ne transformez pas le suivi de la maison en observation de sa vie privée ; préservez les espaces intimes.

## <a id="relais"></a>Comment organiser des passages et un relais local ?

Définissez ce qui doit être fait : relever le courrier, contrôler un point précis, arroser certaines plantes ou vous signaler une anomalie visible. Indiquez les dates, la fréquence et les limites des visites. Un voisin qui rend service n’est pas automatiquement disponible à toute heure.

Vérifiez que la personne accepte de recevoir les alertes prévues, sait comment vous joindre et dispose des accès nécessaires. Donnez les coordonnées de l’assistance de votre contrat et des professionnels habituels. Convenez de qui peut autoriser une intervention ou une dépense si vous êtes injoignable.

Une fiche courte peut prendre cette forme, **exemple fictif à adapter** :

> Pendant mon absence, les passages convenus couvrent le courrier et les vérifications indiquées sur la fiche privée. En cas d’anomalie, me contacter ; si je ne réponds pas, joindre le relais qui a accepté d’être disponible selon les modalités prévues. Les contacts des professionnels et les autorisations de dépenses sont précisés séparément. Aucune intervention technique ou mise en danger n’est demandée.

Conservez l’adresse détaillée, les codes et l’emplacement des clés dans les échanges privés avec les personnes retenues. Dans une annonce publique de garde, présentez le besoin et les dates utiles à la candidature, sans ajouter un itinéraire d’accès au logement ni annoncer vos déplacements personnels en détail.

## <a id="otv"></a>À quoi sert l’Opération Tranquillité Vacances ?

En France, l’[Opération Tranquillité Vacances](https://www.masecurite.interieur.gouv.fr/fr/demarches-en-ligne/operation-tranquillite-vacances) permet de demander des patrouilles de police ou de gendarmerie pendant une absence. Les conditions diffèrent selon la zone et le type de résidence ; consultez la démarche officielle pour les délais et les modalités adaptés à votre adresse.

Ces passages ne constituent pas une présence permanente et n’assurent pas l’arrosage, la garde des animaux ou l’entretien de l’intérieur. Si quelqu’un doit séjourner chez vous ou si l’occupation change, expliquez la situation au service compétent et vérifiez la démarche à suivre. Ne présentez pas un logement occupé comme vide.

## <a id="gardien"></a>Qu’apporte un gardien hébergé dans la maison ?

Le house-sitting permet de convenir d’un séjour pendant lequel une personne habite chez vous et assure les tâches acceptées. Elle peut relever le courrier, suivre les plantes et vous prévenir d’une anomalie qu’elle observe. Cela ne garantit pas qu’elle détectera immédiatement tout problème ni qu’aucun dommage ne surviendra.

Vous pouvez proposer cette [garde de maison sans animaux](/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal). Le logement doit être habitable et les tâches annoncées clairement. Les sorties, les nuits sur place et les nouvelles à donner se conviennent avant confirmation ; le gardien ne doit pas être présenté comme un agent de sécurité ou un service d’intervention.

Pour [choisir un gardien](/actualites/choisir-gardien-bons-criteres), échangez sur ses disponibilités et son expérience des tâches prévues. Une rencontre est possible si les deux le souhaitent. Un contrôle d’identité ne vaut pas garantie de compétences ou de fiabilité, et la publication ne garantit pas une candidature.

Vérifiez les assurances et les responsabilités des deux personnes avec les assureurs concernés ; [Service Public explique les précautions propres au home sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509). Consignez les conditions de la garde par écrit. La gratuité de Guardiens concerne la plateforme : fournitures, consommations et dépenses éventuelles du séjour se conviennent séparément.

Notre priorité est de créer le réseau et d’améliorer le service avec vos retours. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Retrouvez les conditions à jour sur la page [tarifs](/tarifs).

## <a id="imprevus"></a>Que prévoir en cas d’alerte ou de retour retardé ?

Donnez à chaque personne une consigne adaptée à son rôle : vous informer, joindre l’assistance ou appeler le professionnel prévu. Personne ne doit entrer dans une situation dangereuse ou essayer d’interpeller un intrus. En France, les [consignes officielles en cas de cambriolage](https://www.masecurite.interieur.gouv.fr/fr/fiches-pratiques/habitation/cambriolage-reagir-limiter-risques) indiquent d’appeler le 17 ; transmettez ce lien et les contacts utiles à votre relais.

Pour une fuite ou une panne, suivez la procédure adaptée à l’installation et à la situation. Ne promettez pas qu’une observation rapide évitera toute dégradation ou limitera le coût à une simple réparation.

Si votre retour est retardé, vérifiez les disponibilités de la personne qui passe ou qui séjourne chez vous et prévoyez une autre solution si nécessaire. Guardiens ne garantit pas un remplacement immédiat. Pour transmettre les accès, le matériel et les consignes quotidiennes, poursuivez avec le guide pour [préparer sa maison avant une garde](/actualites/preparer-maison-avant-garde).

## <a id="faq"></a>Questions fréquentes sur une maison laissée pendant une absence

:::faq
### Peut-on laisser une maison vide plusieurs mois ?

L’organisation dépend du logement, de ses installations et du contrat d’assurance. Vérifiez les conditions d’inhabitation, les protections exigées et les contrôles nécessaires, puis prévoyez des contacts et un relais adaptés. Il n’existe pas une durée universelle sans précaution.

### Faut-il fermer les volets pendant les vacances ?

Suivez les exigences de votre contrat et les consignes propres au logement. Ne réduisez pas la protection d’un accès pour simuler une présence. Si quelqu’un séjourne chez vous, convenez de leur usage selon l’occupation réelle.

### Une alarme ou une caméra suffit-elle ?

Vérifiez les fonctions de votre installation et la réponse prévue aux alertes. Une notification ne garantit ni une intervention ni l’absence de dommage. Les équipements se préparent avec les autres précautions du logement et le respect de la vie privée.

### Des passages interrompent-ils la durée d’inhabitation de l’assurance ?

Ne le supposez pas. Demandez à l’assureur comment votre contrat définit l’occupation et traite les visites ou le séjour d’un gardien. Faites préciser par écrit les conditions applicables à votre situation.

### L’Opération Tranquillité Vacances remplace-t-elle un gardien ?

Non. Elle permet de demander des patrouilles selon les conditions du service. Elle ne couvre pas les soins des animaux, les plantes ou l’entretien intérieur. Vérifiez la démarche si une personne doit occuper le logement.

### Un gardien garantit-il la sécurité de ma maison ?

Non. Il assure la présence et les tâches convenues, sans garantie contre un cambriolage ou un sinistre. Le house-sitting ne remplace pas les précautions du logement, les assurances ni une prestation de sécurité professionnelle.
:::$plantes_securite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='1acc66ba-0223-465c-8dd4-1230443610e2'::uuid AND slug='securiser-maison-absence-prolongee';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/securiser-maison-absence-prolongee' THEN
    RAISE EXCEPTION 'Guide plantes-sécurité 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Sécuriser sa maison pendant une absence prolongée'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Accès, assurance, courrier et personne à joindre : les vérifications utiles avant de laisser sa maison vide ou de la confier à un gardien.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Sécuriser sa maison pendant une absence prolongée'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Absence prolongée : vérifiez accès, assurance, alertes et relais local. Comparez maison vide et gardien sur place, sans confondre présence et sécurité garantie.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une lampe éclaire une porte en bois sur une façade.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"confier l’entretien du jardin","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"l’arrosage des plantes pendant les vacances","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"tarifs","url":"/tarifs"},{"text":"préparer sa maison avant une garde","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:25:10.87243+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide plantes-sécurité 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_plantes_securite_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide plantes-sécurité 1 différente';
  END IF;
  INSERT INTO public._backup_articles_plantes_securite_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_plantes_securite_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Sécuriser sa maison pendant une absence prolongée',
    excerpt='Accès, assurance, courrier et personne à joindre : les vérifications utiles avant de laisser sa maison vide ou de la confier à un gardien.',
    meta_title='Sécuriser sa maison pendant une absence prolongée',
    meta_description='Absence prolongée : vérifiez accès, assurance, alertes et relais local. Comparez maison vide et gardien sur place, sans confondre présence et sécurité garantie.',
    hero_image_alt='Une lampe éclaire une porte en bois sur une façade.',
    internal_links='[{"text":"confier l’entretien du jardin","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"l’arrosage des plantes pendant les vacances","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"tarifs","url":"/tarifs"},{"text":"préparer sa maison avant une garde","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='securiser-maison-absence-prolongee' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte plantes-sécurité 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
