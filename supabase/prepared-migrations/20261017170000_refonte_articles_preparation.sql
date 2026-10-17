-- Refonte des guides annonce et préparation, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_preparation_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_preparation_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_preparation_20261017 TO service_role;
ALTER TABLE public._backup_articles_preparation_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('fa36743d-99b5-49e5-a4a9-bb11d5cc49b2'::uuid,'4af7e670-0be8-4eec-8402-42015b31a346'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $preparation_content_0_20261017$# Préparer sa maison avant une garde : checklist et consignes

Avant de confier votre maison, préparez **des accès testés, un espace où le gardien peut s’installer, les consignes du quotidien et un relais qui a accepté d’aider**. Rassemblez les informations importantes dans une fiche courte, accessible pendant le séjour. Vous éviterez que tout repose sur une conversation à la veille du départ.

Cette checklist concerne une personne qui séjourne chez vous, avec ou sans animaux à garder. Si vous cherchez encore quelqu’un, commencez par [rédiger votre annonce de house sitting](/actualites/rediger-bonne-annonce-house-sitting). Sur Guardiens, la plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens ; les dépenses éventuelles de la garde se conviennent séparément.

**Dans ce guide**

- [La checklist avant le départ](#checklist)
- [Le guide de la maison et les espaces privés](#guide-maison)
- [Les consignes pour les animaux](#animaux)
- [La remise des clés et l’arrivée](#remise-cles)
- [Les dépenses et le plan en cas d’imprévu](#imprevus)
- [Une fiche de consignes à copier](#fiche)
- [Les questions fréquentes](#faq)

## <a id="checklist"></a>La checklist avant de confier sa maison

Reprenez cette liste avec la personne retenue et adaptez-la aux tâches convenues. Les réparations ou vérifications techniques nécessaires restent à organiser avant le séjour.

| À préparer | Vérification concrète | À transmettre en privé |
| --- | --- | --- |
| Dates et présence | Confirmer arrivée, départ et absences possibles. | Horaires et organisation du relais. |
| Clés et accès | Tester porte, portail et procédure d’alarme. | Adresse, codes et accès au double des clés. |
| Espace de séjour | Préparer chambre, linge, rangement et pièces accessibles. | Usages convenus et espaces personnels. |
| Maison et jardin | Repérer les équipements et les gestes attendus. | Notices utiles et consignes d’arrosage. |
| Animaux, s’il y en a | Prévoir nourriture, matériel et besoins particuliers. | Routine, documents utiles et consignes de soins. |
| Contacts et dépenses | Confirmer un relais et la marche à suivre. | Numéros, personnes à appeler et achats autorisés. |
| Retour | Prévoir la fin du séjour et un éventuel retard. | Remise des clés et personne qui prend la suite. |

**Préparer ne signifie pas tout retirer de la maison.** Libérez les espaces convenus et rangez ce qui reste personnel : documents, objets de valeur, médicaments et informations de connexion. Signalez clairement les pièces ou équipements qui ne sont pas à disposition.

## <a id="guide-maison"></a>Que mettre dans le guide de la maison ?

Commencez par ce qui sert dès l’arrivée : entrer, fermer, utiliser les pièces prévues et trouver les contacts. Une page de repères et quelques notices ciblées sont plus faciles à consulter qu’un document où chaque détail a la même importance.

Indiquez notamment :

- où se trouvent l’arrivée d’eau, le tableau électrique et les notices ;
- comment utiliser normalement le chauffage, la cuisine et les équipements convenus ;
- comment gérer les déchets, le courrier et les livraisons ;
- quelles plantes arroser, avec quelle fréquence et quelle quantité indicative ;
- qui peut intervenir si un équipement ne fonctionne plus.

Montrez les repères utiles sans demander au gardien une intervention technique qu’il ne sait pas réaliser. Pour une piscine, un poêle ou un équipement particulier, précisez les gestes acceptés et le contact compétent pour le reste.

### Caméras, codes et vie privée

Transmettez les codes dans un échange privé et vérifiez que la personne retrouve la consigne nécessaire. Si un accès temporaire est disponible, prévoyez sa durée et son retrait après le séjour.

Annoncez les caméras présentes, leur emplacement et leur fonctionnement avant de confirmer la garde. La [CNIL rappelle que la vidéosurveillance chez soi doit respecter la vie privée des personnes filmées](https://www.cnil.fr/fr/la-videosurveillance-videoprotection-chez-soi). Pour les espaces de vie du gardien, convenez d’une organisation qui préserve son intimité ; une caméra destinée à observer un animal ne dispense pas de cette précaution. Demandez conseil si votre dispositif soulève un doute.

### Assurance et accord de garde

Décrivez le séjour à votre assureur et demandez quelles garanties s’appliquent, y compris aux dommages causés par la personne hébergée. Le gardien vérifie aussi sa responsabilité civile pour cette situation. La fiche [Service Public sur l’assurance du home sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509) rappelle ces vérifications et l’intérêt d’un écrit précisant les responsabilités.

Fixez les dates, les tâches, les conditions de séjour et les dépenses dans votre accord. Une fiche de consignes facilite le quotidien ; elle ne remplace ni cet accord ni la vérification des assurances. Le [guide du cadre juridique en France](/actualites/house-sitting-cadre-juridique-france) complète ces questions ; les règles peuvent différer à l’étranger.

## <a id="animaux"></a>Quelles consignes laisser pour les animaux ?

Pour chaque animal, notez les repas, les quantités, les sorties, les accès autorisés et les habitudes à conserver. « Une mesure de cette tasse » est plus clair qu’« un peu de croquettes ». Préparez les fournitures nécessaires pour toute la période, avec une marge adaptée, et indiquez comment en acheter si le séjour se prolonge.

Ajoutez les comportements à connaître : peur d’un bruit, réactions en promenade, porte à surveiller ou difficulté de cohabitation. Montrez le matériel et expliquez les gestes habituels, sans faire découvrir au dernier moment un besoin important absent de l’annonce.

Pour un traitement prescrit, laissez l’ordonnance et les consignes du vétérinaire. Confirmez que le gardien accepte cette responsabilité et sait réaliser le geste. Il ne doit pas improviser un dosage ou modifier le traitement. Un besoin qui dépasse ses compétences demande une autre organisation.

La [checklist de la RSPCA pour confier son animal](https://www.rspca.org.uk/adviceandwelfare/pets/general/holiday/leavingyourpet) insiste sur la routine, les instructions, le matériel et les contacts vétérinaires. Notez votre clinique habituelle et la façon de joindre un service hors horaires d’ouverture. La conduite à tenir en cas de problème doit être trouvable rapidement.

Sans animaux, remplacez cette partie par les consignes réellement utiles à la maison. Le guide de la [garde de maison sans animaux](/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal) aide à définir ce qui peut être convenu.

## <a id="remise-cles"></a>Comment organiser la remise des clés et l’arrivée ?

Confirmez les horaires, le moyen d’arriver et la personne qui transmet les accès. **Une rencontre préalable est possible si vous le souhaitez tous les deux.** La transmission pratique peut aussi être organisée avec un relais qui connaît le logement, accompagnée de consignes écrites et d’un échange à distance.

Quand vous faites le tour des lieux, suivez une journée ordinaire : entrer, préparer un repas, s’occuper des animaux, sortir et fermer. Faites tester les clés et les équipements essentiels par la personne qui les utilisera. Si un chien est concerné et que vous êtes sur place ensemble, vous pouvez montrer sa promenade habituelle.

Vérifiez le couchage, le linge et les rangements. Précisez les usages de la cuisine et des produits disponibles, ainsi que les visites éventuelles d’un jardinier ou d’un proche. Si un véhicule est prêté, clarifiez son usage et sa couverture avant le départ.

Si vous êtes déjà loin, assurez-vous que le relais peut réellement remettre les clés et répondre aux premières questions. Une adresse envoyée par message ne suffit pas à organiser l’arrivée.

## <a id="imprevus"></a>Quel plan prévoir si vous êtes injoignable ou retardé ?

Choisissez un contact local qui a accepté ce rôle, connaît les besoins et peut accéder au logement selon l’organisation convenue. Confirmez ses disponibilités pendant la garde. Gardez son numéro dans la fiche ; ne comptez pas sur un voisin qui n’a pas été prévenu.

Précisez votre canal principal, un autre moyen de vous joindre et les périodes d’indisponibilité connues, notamment les vols ou le décalage horaire. Convenez d’un rythme de nouvelles et des situations où il faut appeler directement.

Pour les dépenses, indiquez ce que vous fournissez, les achats qui peuvent être nécessaires et les modalités de paiement ou de remboursement avec justificatifs. Parlez aussi de la conduite à tenir si vous ne répondez pas. Pour un problème de santé animale, appelez le vétérinaire afin de suivre ses instructions ; un budget convenu n’est pas une raison de retarder cet appel.

Si votre retour est retardé, le gardien n’est pas automatiquement disponible plus longtemps. Prévoyez qui prend la suite et comment transmettre les clés. Guardiens ne garantit pas un remplacement immédiat. Pour plusieurs semaines d’absence, le [guide des gardes longues](/actualites/vacances-longues-garde-animal-2-semaines) détaille l’organisation dans la durée.

## <a id="fiche"></a>Une fiche de consignes à copier et compléter

Ce modèle est à adapter et à transmettre **en privé**, une fois la garde confirmée. Testez avec le gardien qu’il retrouve les informations et peut ouvrir les documents utiles.

> **Notre garde — du [date] au [date]**
>
> **Nous joindre :** [canal principal, numéro et périodes d’indisponibilité].
>
> **Relais convenu :** [nom, numéro, disponibilité et accès au logement].
>
> **Arrivée et départ :** [horaires, personne présente, remise et retour des clés].
>
> **Maison :** [accès transmis séparément, eau, électricité, équipements, espaces accessibles et notices].
>
> **À faire chaque jour :** [repas, sorties, courrier ou autres tâches convenues].
>
> **À faire à certaines dates :** [plantes, entretien ou approvisionnement].
>
> **Animaux, si concernés :** [routine par animal, particularités et consignes du vétérinaire].
>
> **En cas de problème :** [contacts compétents, service vétérinaire hors horaires et ordre des appels].
>
> **Dépenses et retour retardé :** [modalités convenues, justificatifs et personne qui prend la suite].

Gardez une version à jour et une copie accessible si la connexion ne fonctionne pas. Pour le séjour suivant, revérifiez les numéros, les horaires et les consignes au lieu de reprendre la fiche sans la relire.

## <a id="faq"></a>Questions fréquentes avant une garde de maison

### Faut-il vider sa maison avant l’arrivée du gardien ?

Non. Préparez les espaces convenus, rangez vos affaires personnelles et expliquez les limites d’accès. Le logement doit pouvoir être utilisé dans les conditions annoncées.

### Faut-il couper l’eau et l’électricité ?

Ne reprenez pas automatiquement les consignes d’une maison vide : une personne va y séjourner. Vérifiez les exigences de votre assurance et les besoins du logement, puis expliquez les réglages retenus et les équipements qui doivent rester en service.

### Peut-on transmettre les consignes sans rencontre préalable ?

Oui, si vous organisez une transmission compréhensible des accès et des gestes nécessaires. Utilisez des consignes écrites, un échange à distance et, selon le besoin, un relais qui connaît le logement. Les tâches délicates demandent de vérifier les compétences avant de confirmer.

### Que faire si l’on oublie une information après le départ ?

Envoyez une consigne écrite précise et vérifiez qu’elle a été reçue. Si un accès ou du matériel manque, faites intervenir le relais selon l’organisation convenue.

### Qui paie les fournitures et les imprévus ?

Mettez-vous d’accord avant la garde sur les fournitures, les achats autorisés et les remboursements. La plateforme Guardiens est actuellement 100 % gratuite pour les deux rôles. Une contribution à ses frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec 30 jours de préavis ; consultez les conditions à jour sur la page [tarifs](/tarifs).$preparation_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='fa36743d-99b5-49e5-a4a9-bb11d5cc49b2'::uuid AND slug='preparer-maison-avant-garde';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/preparer-maison-avant-garde' THEN
    RAISE EXCEPTION 'Guide préparation 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Préparer sa maison avant une garde : checklist et consignes'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Des accès qui fonctionnent, un logement prêt et des consignes faciles à retrouver : préparez la garde avec cette checklist et une fiche de transmission à adapter.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Préparer sa maison avant une garde : la checklist'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Clés, animaux, logement, contacts et imprévus : la checklist avant une garde de maison, avec une fiche de consignes à adapter pour votre gardien.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une pièce de vie avec un canapé, une cheminée et une cuisine ouverte'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"rédiger votre annonce de house sitting","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"guide du cadre juridique en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"guide des gardes longues","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"tarifs","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:10:21.072285+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide préparation 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_preparation_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide préparation 0 différente';
  END IF;
  INSERT INTO public._backup_articles_preparation_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_preparation_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Préparer sa maison avant une garde : checklist et consignes',
    excerpt='Des accès qui fonctionnent, un logement prêt et des consignes faciles à retrouver : préparez la garde avec cette checklist et une fiche de transmission à adapter.',
    meta_title='Préparer sa maison avant une garde : la checklist',
    meta_description='Clés, animaux, logement, contacts et imprévus : la checklist avant une garde de maison, avec une fiche de consignes à adapter pour votre gardien.',
    hero_image_alt='Une pièce de vie avec un canapé, une cheminée et une cuisine ouverte',
    internal_links='[{"text":"rédiger votre annonce de house sitting","url":"/actualites/rediger-bonne-annonce-house-sitting"},{"text":"guide du cadre juridique en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"garde de maison sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"guide des gardes longues","url":"/actualites/vacances-longues-garde-animal-2-semaines"},{"text":"tarifs","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='preparer-maison-avant-garde' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte préparation 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $preparation_content_1_20261017$# Rédiger une annonce de house sitting : conseils et exemple

Pour rédiger une annonce de house sitting, indiquez **où se trouve le logement, les dates de la garde, les tâches à assurer et la présence attendue**. Ajoutez des photos récentes et décrivez le quotidien tel qu’il est. Le but est que la personne puisse se demander : « Est-ce que je peux assurer cette garde, et est-ce que ce séjour me convient ? »

Sur Guardiens, un gardien séjourne chez vous en échange de l’hébergement et des tâches convenues, sans rémunération. Vous pouvez publier pour votre maison et vos animaux, ou pour la maison seule. **La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.**

**Dans ce guide**

- [Écrire un titre précis](#titre)
- [Présenter les informations utiles](#description)
- [Choisir les photos et protéger sa vie privée](#photos)
- [Un exemple d’annonce à adapter](#exemple)
- [Publier sur Guardiens](#publication)
- [Si l’annonce reçoit peu de réponses](#ameliorer)
- [Les questions fréquentes](#faq)

## <a id="titre"></a>Quel titre donner à une annonce de house sitting ?

Faites apparaître le besoin principal et le lieu. Les dates se renseignent dans le formulaire ; le titre peut préciser un élément qui aide à comprendre le séjour.

Par exemple :

- « Un chat à garder dans notre appartement à Nantes » ;
- « Maison, potager et deux poules près de Chambéry » ;
- « Garde de maison sans animaux à La Rochelle ».

Ces titres sont des exemples, pas des annonces réelles. Évitez d’accumuler les adjectifs ou d’annoncer un séjour « sans contrainte » si vous attendez des passages à heures fixes. Un appartement simple peut convenir à quelqu’un : dites ce qu’il offre et ce qu’il demande.

## <a id="description"></a>Que faut-il préciser dans la description ?

Commencez par quelques phrases naturelles sur votre besoin, puis donnez les informations qui permettent de s’organiser. Vous n’avez pas besoin de raconter le motif personnel de votre absence en détail.

| Sujet | Information utile | Exemple de précision |
| --- | --- | --- |
| Dates | Toute la période à couvrir et la souplesse éventuelle. | Une arrivée la veille est possible ; le retour est prévu le dimanche soir. |
| Logement | Couchage, pièces accessibles, cuisine et équipements. | Une chambre, une connexion internet et un espace de travail. |
| Animaux, s’il y en a | Nombre, habitudes, sorties et besoins particuliers. | Deux promenades par jour ; un soin prescrit à expliquer avant de confirmer. |
| Présence | Nuits sur place et absences possibles en journée. | Présence chaque nuit ; durée des sorties à convenir selon les animaux. |
| Maison et jardin | Gestes attendus et temps approximatif. | Quelques pots à arroser, avec des consignes écrites. |
| Accès | Transports, stationnement et besoin réel d’un véhicule. | Courses à plusieurs kilomètres ; voiture personnelle nécessaire. |

Pour un animal, racontez aussi ce qui peut compliquer la garde : réactions en promenade, fugues connues, cohabitation ou soins. « Très gentil » ne suffit pas à décrire son quotidien. Ces informations permettent de discuter de l’expérience nécessaire sans découvrir les contraintes après l’arrivée.

La présence mérite une formulation concrète. « Quelqu’un de présent » peut signifier des choses très différentes. Indiquez les moments où la maison ou les animaux demandent de l’attention ; échangez ensuite sur l’emploi du temps réel du candidat. Une activité en télétravail ne garantit pas à elle seule la disponibilité.

Précisez enfin les conditions de séjour : accompagnants, enfants ou animal du gardien, tabac, espaces personnels et usages particuliers. Expliquez les contraintes simplement. Pour une maison seule, le guide de la [garde sans animaux](/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal) aide à définir les tâches.

## <a id="photos"></a>Quelles photos montrer, et quelles informations garder privées ?

Montrez le lieu où la personne séjournera : pièce de vie, chambre proposée, cuisine, extérieur s’il est accessible. Ajoutez des photos des animaux concernés. Choisissez des images claires et récentes, qui correspondent à ce qui sera disponible pendant la garde.

**Une photo d’animal n’est pas une condition pour publier une garde de maison sans animaux.** Le formulaire demande notamment une photo pour présenter le logement ou votre galerie ; les règles affichées au moment de publier restent le repère.

Avant d’ajouter vos images, regardez ce qu’on distingue en arrière-plan : courrier lisible, documents, écran, plaque d’immatriculation ou personne qui n’a pas accepté d’apparaître. Retirez les éléments qui n’ont pas à être publics.

La commune, le secteur et les conditions d’accès suffisent pour comprendre le séjour. Transmettez l’adresse précise, les codes, l’emplacement du double des clés et les contacts privés dans vos échanges avec la personne retenue. Si le logement comporte des caméras, parlez-en avant de confirmer ; le guide de [préparation de la maison](/actualites/preparer-maison-avant-garde) aborde ce point.

## <a id="exemple"></a>Exemple d’annonce de garde de maison à adapter

Voici un modèle fictif. Remplacez chaque détail par votre situation et supprimez ce qui ne s’applique pas.

> **Un chat et quelques plantes dans notre appartement à Nantes**
>
> Nous cherchons une personne pour séjourner chez nous du 10 au 24 juillet. Une arrivée la veille est possible pour transmettre les consignes ; les horaires seront à confirmer ensemble.
>
> Notre chat reste à l’intérieur. Il faut lui donner ses repas matin et soir, renouveler l’eau et entretenir sa litière. Il n’a pas de traitement actuellement. Nous expliquerons ses habitudes pendant nos échanges. Nous souhaitons une présence chaque nuit et discuterons des absences possibles en journée.
>
> Vous disposerez d’une chambre, de la cuisine et d’une connexion internet. Les commerces et les transports sont accessibles à pied. Il y a aussi quelques plantes à arroser selon une fiche que nous laisserons.
>
> Nous préciserons ensemble les conditions de séjour, les personnes présentes et les nouvelles à donner. Nous fournissons la nourriture et le matériel du chat. Les autres dépenses éventuelles seront convenues avant la garde.

Sans animaux, remplacez le paragraphe correspondant par les besoins réels de la maison : courrier, arrosage, présence et équipements. Ne gardez pas une longue liste de tâches par défaut.

## <a id="publication"></a>Comment publier cette annonce sur Guardiens ?

Présentez votre logement et vos dates dans le formulaire, puis décrivez votre besoin et vos attentes. Complétez les informations demandées et les photos. Relisez l’annonce du point de vue d’une personne qui ne connaît ni votre maison ni votre secteur.

Une fois l’annonce publiée, échangez avec les personnes intéressées. Le guide pour [choisir un gardien de maison](/actualites/choisir-gardien-bons-criteres) vous aide à comparer leurs disponibilités, leur expérience et les conditions du séjour. Une rencontre est possible **si vous le souhaitez tous les deux**.

La gratuité de la plateforme ne supprime pas les dépenses de la garde : fournitures pour les animaux, achats convenus, déplacements, repas ou usage d’un véhicule sont à clarifier entre vous. Derrière Guardiens, il y a Jérémie et Elisa : après cinq ans de garde de maisons et d’animaux, nous voulons construire ce réseau avec vos retours. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Retrouvez les conditions à jour sur la page [tarifs](/tarifs).

## <a id="ameliorer"></a>Que revoir si votre annonce reçoit peu de réponses ?

Une annonce claire facilite la compréhension ; elle ne garantit ni un nombre de candidatures ni un délai. Les dates, le lieu, les tâches et les disponibilités des membres comptent aussi.

Vérifiez d’abord les points qui empêchent de se projeter : couchage non décrit, photos manquantes, besoin d’un véhicule oublié, horaires de présence ambigus ou dates incohérentes. Faites relire l’annonce par une personne qui ne connaît pas votre quotidien. Demandez-lui ce qu’elle devrait encore vous demander pour se décider.

Si vous avez une souplesse réelle sur l’arrivée ou le départ, indiquez-la. Décrivez les contraintes honnêtement. Si le départ approche, prévoyez en parallèle un proche disponible ou une solution professionnelle adaptée : Guardiens ne garantit pas qu’un gardien pourra être trouvé à temps.

## <a id="faq"></a>Questions fréquentes sur les annonces de house sitting

### Peut-on publier sans animaux à garder ?

Oui. Décrivez la maison, le logement proposé, la présence attendue et les tâches convenues, par exemple l’arrosage ou le courrier. Il n’est pas nécessaire d’ajouter un animal fictif.

### Faut-il tout expliquer dans l’annonce ?

Expliquez ce qui permet de comprendre et d’accepter le séjour. Les accès précis, les coordonnées privées et les consignes détaillées se transmettent ensuite. Un besoin particulier de soin ou de présence doit toutefois être annoncé avant de choisir la personne.

### Quand publier son annonce ?

Dès que vos dates et votre besoin sont suffisamment définis pour être présentés. Gardez du temps pour échanger, confirmer l’organisation et préparer un relais. Aucun délai ne garantit de trouver un gardien.

### Comment décrire les frais ?

Séparez les fournitures nécessaires à la garde des dépenses personnelles du séjour. Indiquez ce que vous fournissez et ce qui reste à convenir. Évitez la formule « tout compris » si elle ne correspond pas à un accord précis.

### Que faire après avoir retenu un gardien ?

Confirmez les dates, les tâches et les conditions de séjour, puis préparez les clés et les consignes. Notre [checklist avant une garde](/actualites/preparer-maison-avant-garde#checklist) aide à organiser cette transmission.$preparation_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='4af7e670-0be8-4eec-8402-42015b31a346'::uuid AND slug='rediger-bonne-annonce-house-sitting';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/rediger-bonne-annonce-house-sitting' THEN
    RAISE EXCEPTION 'Guide préparation 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Rédiger une annonce de house sitting : conseils et exemple'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une bonne annonce permet de comprendre votre besoin avant de vous contacter. Voici les informations utiles, les photos à choisir et un exemple à adapter à votre garde.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Annonce de house sitting : conseils et modèle à adapter'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Titre, dates, logement, animaux et présence attendue : rédigez une annonce de house sitting claire avec notre exemple à adapter, avec ou sans animaux.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne regarde un appareil photo, assise à une table dans une pièce lumineuse'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"garde sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"choisir un gardien de maison","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"tarifs","url":"/tarifs"},{"text":"checklist avant une garde","url":"/actualites/preparer-maison-avant-garde#checklist"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:25:11.29846+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide préparation 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_preparation_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide préparation 1 différente';
  END IF;
  INSERT INTO public._backup_articles_preparation_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_preparation_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Rédiger une annonce de house sitting : conseils et exemple',
    excerpt='Une bonne annonce permet de comprendre votre besoin avant de vous contacter. Voici les informations utiles, les photos à choisir et un exemple à adapter à votre garde.',
    meta_title='Annonce de house sitting : conseils et modèle à adapter',
    meta_description='Titre, dates, logement, animaux et présence attendue : rédigez une annonce de house sitting claire avec notre exemple à adapter, avec ou sans animaux.',
    hero_image_alt='Une personne regarde un appareil photo, assise à une table dans une pièce lumineuse',
    internal_links='[{"text":"garde sans animaux","url":"/actualites/garder-une-maison-ce-n-est-pas-garder-un-animal"},{"text":"préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"choisir un gardien de maison","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"tarifs","url":"/tarifs"},{"text":"checklist avant une garde","url":"/actualites/preparer-maison-avant-garde#checklist"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='rediger-bonne-annonce-house-sitting' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte préparation 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
