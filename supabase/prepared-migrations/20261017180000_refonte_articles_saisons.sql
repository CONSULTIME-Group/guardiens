-- Refonte des guides fêtes et week-end, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_saisons_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_saisons_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_saisons_20261017 TO service_role;
ALTER TABLE public._backup_articles_saisons_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('c97538a6-2f6b-436d-a34e-6df589a62315'::uuid,'809eceed-88ac-4846-9f61-052d74530567'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $saisons_content_0_20261017$# Faire garder sa maison et ses animaux à Noël

Vous partez pour Noël ou le Nouvel An et cherchez quelqu’un pour la maison ? Avec le house sitting, **un gardien séjourne chez vous et assure les tâches convenues**, notamment les soins du quotidien de vos animaux. Avant de choisir, vérifiez surtout les dates couvertes, la présence pendant les réveillons et les besoins particuliers de votre chien ou de votre chat.

Sur Guardiens, vous publiez votre annonce et échangez avec les personnes intéressées. Le gardien est hébergé sans rémunération. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Une garde sans animaux est aussi possible, pour les besoins de la maison.

**Dans ce guide**

- [Choisir l’organisation adaptée aux fêtes](#particulier)
- [Quand publier et confirmer la garde](#calendrier)
- [Ce que l’annonce doit préciser](#annonce)
- [Pétards, décorations et contacts vétérinaires](#securite)
- [Adapter les consignes au logement](#regions)
- [Accueil du gardien et dépenses](#remercier)
- [La checklist avant de partir](#checklist)
- [Les questions fréquentes](#faq)

## <a id="particulier"></a>Quelle garde choisir pour Noël et le Nouvel An ?

Commencez par le quotidien à couvrir, plutôt que par l’idée qu’une solution convient à tous les animaux. Une personne hébergée chez vous peut assurer les nuits et les moments de présence convenus. Des visites ponctuelles, un proche ou une pension peuvent correspondre à d’autres besoins.

| Votre besoin | Organisation à examiner | Point à confirmer |
| --- | --- | --- |
| Des nuits sur place avec les animaux | Gardien hébergé dans votre logement. | Présence réelle les 24 et 31 décembre, si ces dates sont concernées. |
| Des passages définis dans la journée | Proche disponible ou professionnel de visites. | Fréquence, tâches et compatibilité avec les besoins de l’animal. |
| Un animal accueilli ailleurs | Proche, famille d’accueil ou pension adaptée. | Conditions d’accueil et besoins particuliers. |

Le logement doit permettre au gardien de séjourner dans de bonnes conditions. Décrivez aussi les tâches : nourrir les animaux, les sortir, entretenir la litière, arroser quelques plantes ou relever le courrier. Ne supposez pas qu’être hébergé signifie rester à la maison en permanence.

Si votre absence ne dure que deux ou trois nuits, consultez aussi le guide de la [garde de maison pour un week-end](/actualites/house-sitting-week-end-court-sejour-aura).

## <a id="calendrier"></a>Quand publier son annonce pour les fêtes ?

**Dès que vos dates et votre besoin sont suffisamment définis.** Pour un départ fin décembre, préparer l’annonce en octobre ou en novembre laisse du temps pour échanger et organiser la transmission. C’est un conseil d’organisation, pas une échéance obligatoire ni une garantie de trouver un gardien.

Vous arrivez plus tard dans vos préparatifs ? Présentez les dates exactes et la souplesse que vous avez réellement. Vérifiez en parallèle une autre possibilité de garde si le départ approche. Le nombre de personnes disponibles dépend notamment du lieu, des dates et des tâches ; une annonce ne garantit pas une réponse à temps.

Avant de confirmer, reprenez ensemble l’arrivée, les horaires de départ et de retour, le trajet du gardien et les nuits couvertes. Une rencontre est possible **si vous le souhaitez tous les deux**. Elle ne remplace pas les consignes et l’accord sur le séjour.

## <a id="annonce"></a>Que préciser dans une annonce de garde à Noël ?

Votre annonce doit permettre de comprendre ce qui change pendant cette période :

- les dates et les nuits à couvrir, avec les horaires à confirmer ;
- les habitudes des animaux et leurs réactions connues aux bruits ;
- les moments où une présence est nécessaire et les absences possibles du gardien ;
- les personnes qui pourront passer chez vous et les visites éventuellement autorisées ;
- les conditions d’accès, le besoin d’un véhicule et les équipements disponibles ;
- les tâches de la maison, même s’il n’y a pas d’animaux.

Un exemple fictif, à adapter :

> Nous cherchons quelqu’un pour séjourner chez nous du 23 décembre au 2 janvier, avec notre chien et notre chat. Nous souhaitons une présence chaque nuit et pendant la soirée du 31, car notre chien a peur des pétards. Nous préciserons ensemble les sorties possibles en journée, les visites et les horaires de transmission. Nous fournirons la nourriture et le matériel des animaux.

N’annoncez pas une présence indispensable le soir du réveillon après avoir retenu quelqu’un qui prévoyait de sortir. Le [guide pour rédiger son annonce](/actualites/rediger-bonne-annonce-house-sitting) vous aide à présenter ces attentes sans faire une liste de contraintes hors contexte.

## <a id="securite"></a>Quelles précautions prévoir pour les animaux pendant les fêtes ?

### Si votre animal a peur des pétards

Décrivez ses réactions connues et préparez avec le gardien un endroit calme où il peut se retirer. La [RSPCA conseille notamment d’anticiper les promenades, de sécuriser les accès et de réduire les bruits et éclairs perçus à l’intérieur](https://www.rspca.org.uk/adviceandwelfare/fireworks/pets). Les consignes doivent être adaptées à votre animal ; ne forcez pas un animal effrayé à sortir de sa cachette.

Si sa peur est importante, demandez conseil au vétérinaire avant le départ et transmettez ses instructions. Le gardien n’a pas à improviser un médicament ou un dosage. Convenez explicitement de la présence nécessaire les soirs concernés.

### Aliments et décorations

Rangez les chocolats, cadeaux contenant de la nourriture et décorations que l’animal pourrait atteindre. La [fiche de la RSPCA sur les risques de Noël](https://www.rspca.org.uk/adviceandwelfare/seasonal/christmas) rappelle notamment les dangers liés à certains aliments, plantes et objets avalés. Montrez ce qui reste accessible et les pièces à fermer. En cas d’ingestion suspecte, contactez rapidement un vétérinaire, sans attendre l’apparition de symptômes ni improviser un traitement.

### Des contacts utilisables pendant les fêtes

Vérifiez auprès de votre clinique habituelle comment joindre un vétérinaire en dehors de ses horaires, notamment les jours fériés. Laissez ces informations au gardien, avec votre numéro et celui d’un relais qui a accepté d’aider. Une liste de contacts n’implique pas que tous seront disponibles : confirmez l’organisation avant de partir.

## <a id="regions"></a>Quelles consignes adapter à votre logement ?

Le bon repère est votre maison et son environnement. Dans un secteur froid, expliquez les réglages convenus du chauffage et l’accès en cas de neige ou de verglas. Pour un équipement particulier, montrez les gestes acceptés et indiquez le contact compétent ; ne confiez pas une intervention technique à une personne qui ne sait pas la réaliser.

En ville, précisez les accès, le stationnement et les bruits ou événements connus autour du logement. À la campagne, expliquez les trajets utiles et les conditions d’accès. Ces situations ne permettent pas de déduire qu’un quartier sera calme ou qu’un gardien sera disponible en permanence.

Le guide du [house sitting en hiver à la montagne](/actualites/house-sitting-hiver-montagne-savoie) complète les questions propres à ce type de séjour. Si vous partez plusieurs semaines, le [guide des gardes longues](/actualites/vacances-longues-garde-animal-2-semaines) aborde l’organisation dans la durée.

## <a id="remercier"></a>Quel accueil prévoir et quelles dépenses clarifier ?

Préparez le couchage, le linge et les espaces convenus. Dites ce qui peut être utilisé dans la cuisine et discutez à l’avance des invités, des accompagnants et des éventuelles nuitées. Un petit mot ou une attention peuvent faire plaisir ; cadeau et repas de réveillon restent facultatifs.

La gratuité de Guardiens est distincte des dépenses du séjour : nourriture et matériel des animaux, achats convenus, déplacements, repas ou véhicule sont à préciser entre vous. Gardez aussi des modalités claires pour une dépense imprévue.

Nous avons créé Guardiens avec Elisa après cinq ans de garde de maisons et d’animaux. Notre priorité est de construire ce réseau de confiance avec vos retours. Une contribution aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Les conditions à jour figurent sur la page [tarifs](/tarifs).

## <a id="checklist"></a>La checklist avant le départ pour Noël

- Confirmer les dates, les nuits et la présence prévue pendant les réveillons.
- Reprendre les besoins des animaux et les consignes du vétérinaire, s’il y en a.
- Préparer les accès, les équipements et les fournitures nécessaires.
- Ranger aliments et décorations qui présentent un risque pour vos animaux.
- Vérifier les contacts vétérinaires et le relais local.
- Convenir des nouvelles, des dépenses et des visites autorisées.
- Prévoir qui prend la suite si votre retour est retardé.

Le gardien n’est pas automatiquement disponible pour prolonger son séjour. N’organisez pas un intervalle sans personne pour s’occuper des animaux : prévoyez une transmission et un relais adaptés. La [checklist de préparation de la maison](/actualites/preparer-maison-avant-garde) aide à rassembler toutes les consignes.

## <a id="faq"></a>Questions fréquentes sur la garde à Noël

:::faq
### Comment faire garder son chien à Noël ?

Définissez les dates, les sorties, les nuits et la présence nécessaire, notamment en cas de peur des pétards. Vous pouvez publier une annonce pour un gardien hébergé chez vous, ou examiner un proche, des visites ou un accueil ailleurs selon les besoins du chien.

### Quand publier son annonce de garde pour les fêtes ?

Dès que votre besoin et vos dates sont définis. Anticiper laisse du temps pour échanger et préparer la garde, mais aucun délai ne garantit de trouver quelqu’un. Si le départ approche, préparez aussi une autre solution.

### Combien coûte une garde de maison à Noël sur Guardiens ?

Le gardien est hébergé sans rémunération et la plateforme est actuellement 100 % gratuite pour les deux rôles. Les fournitures, les dépenses personnelles et les achats éventuels restent à convenir séparément.

### Le gardien peut-il sortir ou recevoir pour le réveillon ?

Cela se décide avant la garde. Précisez les horaires de présence indispensables et les conditions de visite ou d’hébergement des invités. Vérifiez que l’organisation convient aux deux personnes et aux besoins des animaux.

### Que faire si mon animal a peur des feux d’artifice ?

Préparez un endroit calme, des accès sécurisés et des consignes adaptées à ses réactions. Parlez-en au vétérinaire avant le départ si sa peur est importante. Le gardien doit connaître la marche à suivre et les moments où une présence est nécessaire.

### Que prévoir si la garde ne couvre pas toute mon absence ?

Organisez un relais qui a accepté de prendre la suite, avec les accès et les consignes nécessaires. Guardiens ne garantit pas un remplacement immédiat. Une garde partielle ne suffit pas si elle laisse sans réponse les besoins des animaux pendant le reste de l’absence.
:::$saisons_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='c97538a6-2f6b-436d-a34e-6df589a62315'::uuid AND slug='house-sitting-noel-fetes-fin-annee';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/house-sitting-noel-fetes-fin-annee' THEN
    RAISE EXCEPTION 'Guide saisonnier 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder sa maison et ses animaux à Noël'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Pour partir pendant les fêtes, précisez les dates à couvrir, la présence attendue et les besoins de vos animaux. Voici comment organiser la garde, réveillons compris.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde d''animaux à Noël : un home sitter pendant les fêtes'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Noël et Nouvel An : préparez la garde de votre maison et de vos animaux. Dates, réveillons, pétards, frais et relais : les points à convenir avant de partir.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne avec un chien dans un salon décoré pour Noël'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"garde de maison pour un week-end","url":"/actualites/house-sitting-week-end-court-sejour-aura"},{"text":"guide pour rédiger son annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"house sitting en hiver à la montagne","url":"/actualites/house-sitting-hiver-montagne-savoie"},{"text":"guide des gardes longues","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"tarifs","url":"/tarifs"},{"text":"checklist de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:40:12.313533+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide saisonnier 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_saisons_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide saisonnier 0 différente';
  END IF;
  INSERT INTO public._backup_articles_saisons_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_saisons_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder sa maison et ses animaux à Noël',
    excerpt='Pour partir pendant les fêtes, précisez les dates à couvrir, la présence attendue et les besoins de vos animaux. Voici comment organiser la garde, réveillons compris.',
    meta_title='Garde d''animaux à Noël : un home sitter pendant les fêtes',
    meta_description='Noël et Nouvel An : préparez la garde de votre maison et de vos animaux. Dates, réveillons, pétards, frais et relais : les points à convenir avant de partir.',
    hero_image_alt='Une personne avec un chien dans un salon décoré pour Noël',
    internal_links='[{"text":"garde de maison pour un week-end","url":"/actualites/house-sitting-week-end-court-sejour-aura"},{"text":"guide pour rédiger son annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"house sitting en hiver à la montagne","url":"/actualites/house-sitting-hiver-montagne-savoie"},{"text":"guide des gardes longues","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"tarifs","url":"/tarifs"},{"text":"checklist de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-noel-fetes-fin-annee' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte saisonnière 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $saisons_content_1_20261017$# Faire garder sa maison un week-end : organiser une garde courte

Pour faire garder votre maison un week-end, commencez par **les horaires à couvrir et les besoins qui ne peuvent pas attendre votre retour** : repas, sorties, soins, nuits sur place ou tâches de la maison. Une personne qui séjourne chez vous peut assurer cette présence ; des passages ponctuels peuvent convenir à d’autres situations.

Sur Guardiens, vous publiez une annonce pour un gardien hébergé chez vous, avec ou sans animaux. Le gardien n’est pas rémunéré. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Même pour deux nuits, vérifiez que les tâches, le logement et les conditions conviennent aux deux personnes.

**Dans ce guide**

- [Choisir entre séjour sur place et passages](#solution)
- [Préciser les dates et les horaires](#dates)
- [Choisir le gardien pour une garde courte](#gardien)
- [Présenter son annonce de week-end](#annonce)
- [Préparer les clés, les consignes et les dépenses](#organisation)
- [Prévoir les nouvelles et les imprévus](#imprevus)
- [Les questions fréquentes](#faq)

## <a id="solution"></a>Faut-il un gardien sur place pour deux ou trois jours ?

La durée ne suffit pas à trancher. Regardez ce qui doit être fait pendant votre absence et les moments où une personne doit être présente.

| Votre besoin | Solution à examiner | À vérifier avant de choisir |
| --- | --- | --- |
| Nuits sur place et tâches réparties dans la journée | Gardien hébergé dans votre logement. | Présence attendue, absences possibles et couchage. |
| Interventions à des horaires définis | Proche ou professionnel de visites. | Fréquence, trajet et tâches compatibles avec ces passages. |
| Animal accueilli hors de chez vous | Proche, famille d’accueil ou pension adaptée. | Conditions d’accueil et besoins de l’animal. |

Si le besoin est seulement de relever le courrier ou d’arroser quelques plantes, demandez-vous si un séjour sur place est nécessaire. À l’inverse, des repas, des sorties ou un soin ne deviennent pas facultatifs parce que vous partez peu de temps. Pour des besoins particuliers, faites préciser l’organisation adaptée par votre vétérinaire.

La garde sans animaux est possible si la maison et les tâches justifient le séjour et conviennent au gardien. Le guide [faire garder sa maison sans animaux](/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal) détaille cet échange.

## <a id="dates"></a>Quels horaires couvrir du vendredi au dimanche ?

« Du vendredi au dimanche » ne dit pas qui assure la promenade du vendredi midi ou le repas du dimanche soir. Donnez les dates dans l’annonce et confirmez les horaires pendant vos échanges.

Un exemple fictif :

> Nous partons vendredi à 14 h et pensons revenir dimanche à 20 h. Il faut couvrir les sorties et les repas pendant cette période, ainsi que les deux nuits. Nous conviendrons de l’arrivée du gardien et de la remise des clés pour éviter un intervalle sans prise en charge.

Une arrivée la veille ou un départ le lundi ne se présument pas : demandez si cela convient et si le logement est disponible. Si vous annoncez une souplesse, dites précisément sur quoi elle porte.

Publiez dès que ces éléments sont suffisamment définis. Il n’existe pas de délai qui garantisse de trouver un gardien pour le week-end ou un pont. Si le départ approche, vérifiez aussi la disponibilité d’un proche ou d’une solution professionnelle adaptée.

## <a id="gardien"></a>Comment choisir un gardien pour une garde courte ?

Cherchez une personne dont **les disponibilités et l’expérience correspondent aux tâches**. Demandez comment elle compte organiser ses journées, rejoindre le logement et assurer les horaires nécessaires. Être étudiant, retraité ou télétravailleur ne permet pas de déduire ses disponibilités ni sa fiabilité.

La proximité peut simplifier le trajet et la remise des clés. Elle ne garantit pas que la personne sera présente en journée ou disponible pour un remplacement. Une personne qui vient de plus loin peut aussi convenir si le transport et les horaires sont réalistes.

Si vous connaissez déjà le gardien, confirmez tout de même les dates et ce qui a changé : traitement, nouvel animal, équipement ou habitudes. Une expérience d’entraide ensemble ne prouve pas à elle seule que la personne peut prendre en charge votre garde.

Une rencontre préalable est possible **si vous le souhaitez tous les deux**. Organisez dans tous les cas une transmission compréhensible des accès et des consignes, avec vous ou un relais selon la situation. Le guide pour [choisir un gardien de maison](/actualites/choisir-gardien-bons-criteres) aide à préparer vos questions.

## <a id="annonce"></a>Que mettre dans une annonce pour un week-end ?

Présentez le séjour avec les informations qui permettent de se décider :

- commune, dates et horaires à confirmer ;
- logement proposé, couchage et équipements disponibles ;
- animaux concernés, habitudes, sorties et besoins particuliers ;
- présence attendue, nuits sur place et absences possibles ;
- tâches de la maison et du jardin, avec leur durée approximative ;
- conditions d’accès, accompagnants et éventuel animal du gardien.

Ajoutez des photos récentes du logement et des animaux, s’il y en a. Un court séjour doit être compréhensible sans embellir la maison ni minimiser les tâches. Le [guide de rédaction d’une annonce](/actualites/rediger-bonne-annonce-house-sitting) propose un modèle à adapter.

Pour un week-end pendant les fêtes, notre guide de la [garde de maison à Noël et au Nouvel An](/actualites/house-sitting-noel-fetes-fin-annee) complète les questions de réveillon, de visites et de présence auprès des animaux.

## <a id="organisation"></a>Que préparer même pour deux nuits ?

Une fiche courte suffit si elle contient les informations utiles : accès, routine, équipements, contacts et marche à suivre en cas de problème. Le [guide de préparation de la maison](/actualites/preparer-maison-avant-garde) propose une checklist et une fiche à copier.

Préparez la nourriture, le matériel et les consignes de soins prescrits, s’il y en a. Vérifiez que le gardien accepte les gestes nécessaires et sait les réaliser. La [RSPCA rappelle l’importance de consignes claires et des contacts du vétérinaire pour confier son animal](https://www.rspca.org.uk/adviceandwelfare/pets/general/holiday/leavingyourpet) ; cette préparation reste utile quelle que soit la durée du séjour.

Pour les animaux identifiés en France, vérifiez vos coordonnées dans le fichier national. [I-CAD explique comment les mettre à jour](https://www.i-cad.fr/articles/mise_a_jour_coordonnees), afin de pouvoir vous joindre si l’animal est retrouvé après une perte. Laissez les informations utiles au gardien en privé, sans les ajouter à l’annonce publique.

Testez les clés et expliquez les équipements nécessaires. Préparez un couchage, du linge et les espaces convenus. Les codes, l’adresse précise et le contact du relais se transmettent dans vos échanges privés.

Clarifiez enfin les dépenses : fournitures des animaux, achats convenus, déplacements, repas ou véhicule. La gratuité de la plateforme ne signifie pas que toutes les dépenses du séjour sont prises en charge. Vérifiez aussi les assurances adaptées à votre situation et fixez les conditions de la garde par écrit.

## <a id="imprevus"></a>Comment prendre des nouvelles et prévoir un retard ?

Convenez d’un rythme de nouvelles qui vous convient : par exemple un message à l’arrivée et un point dans la journée. Ce sont des modalités à décider ensemble, pas une fréquence imposée ou une preuve automatique que tout va bien. Les situations qui demandent un appel ne doivent pas attendre le prochain message prévu.

Laissez un moyen de vous joindre, les coordonnées vétérinaires utiles et un relais local qui a accepté d’aider. Vérifiez que le gardien sait qui appeler si vous êtes indisponible et comment les dépenses urgentes seront gérées.

Si votre train est annulé ou votre retour retardé, le gardien n’est pas automatiquement libre de rester. Prévoyez qui prend la suite et comment transmettre les clés. Guardiens ne garantit pas un remplaçant immédiat.

Avec Elisa, nous avons créé la plateforme après cinq ans de garde de maisons et d’animaux. Notre priorité est de construire le réseau et d’améliorer le service avec vos retours. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Les conditions à jour sont sur la page [tarifs](/tarifs).

## <a id="faq"></a>Questions fréquentes sur les gardes de week-end

:::faq
### Comment faire garder son chien pour un week-end ?

Listez les repas, les sorties, les nuits et les moments de présence nécessaires. Un gardien hébergé chez vous peut convenir ; comparez avec des visites ou un accueil ailleurs selon les besoins du chien et les disponibilités réelles.

### Peut-on proposer une garde de maison pour deux nuits ?

Oui. Indiquez les dates, les tâches et le logement proposé, puis vérifiez que l’organisation convient aux deux personnes. Une courte durée ne garantit pas de recevoir des candidatures.

### Faut-il obligatoirement rencontrer le gardien avant le week-end ?

Non. Une rencontre est possible si vous le souhaitez tous les deux. Il faut surtout organiser une transmission claire des accès et des gestes nécessaires, avec un relais si besoin, et vérifier les compétences avant de confirmer les tâches délicates.

### La garde d’un week-end est-elle gratuite sur Guardiens ?

La plateforme est actuellement 100 % gratuite pour les deux rôles et le gardien est hébergé sans rémunération. Les fournitures et les dépenses éventuelles du séjour se conviennent séparément.

### Que faire si personne ne peut couvrir tout le week-end ?

Vérifiez une autre organisation avec un proche disponible ou un professionnel adapté. Une garde partielle nécessite un relais pour les horaires restants ; ne confirmez pas des dates qui laissent sans réponse les besoins des animaux.
:::$saisons_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='809eceed-88ac-4846-9f61-052d74530567'::uuid AND slug='house-sitting-week-end-court-sejour-aura';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/house-sitting-week-end-court-sejour-aura' THEN
    RAISE EXCEPTION 'Guide saisonnier 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder sa maison un week-end : organiser une garde courte'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une garde courte se prépare avec des horaires précis et des consignes utiles. Voici comment organiser deux ou trois nuits d’absence, avec ou sans animaux.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de maison pour un week-end : comment s’organiser'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Deux ou trois nuits d’absence : choisissez une garde adaptée à votre maison et à vos animaux. Horaires, clés, présence, dépenses et relais pour un week-end.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien à côté d’un sac de voyage, près d’une porte vitrée'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"faire garder sa maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"choisir un gardien de maison","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide de rédaction d’une annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"garde de maison à Noël et au Nouvel An","url":"/actualites/house-sitting-noel-fetes-fin-annee"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:10:21.205074+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide saisonnier 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_saisons_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide saisonnier 1 différente';
  END IF;
  INSERT INTO public._backup_articles_saisons_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_saisons_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder sa maison un week-end : organiser une garde courte',
    excerpt='Une garde courte se prépare avec des horaires précis et des consignes utiles. Voici comment organiser deux ou trois nuits d’absence, avec ou sans animaux.',
    meta_title='Garde de maison pour un week-end : comment s’organiser',
    meta_description='Deux ou trois nuits d’absence : choisissez une garde adaptée à votre maison et à vos animaux. Horaires, clés, présence, dépenses et relais pour un week-end.',
    hero_image_alt='Un chien à côté d’un sac de voyage, près d’une porte vitrée',
    internal_links='[{"text":"faire garder sa maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"choisir un gardien de maison","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide de rédaction d’une annonce","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"garde de maison à Noël et au Nouvel An","url":"/actualites/house-sitting-noel-fetes-fin-annee"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-week-end-court-sejour-aura' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte saisonnière 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
