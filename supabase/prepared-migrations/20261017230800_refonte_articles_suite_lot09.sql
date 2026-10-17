-- Refonte des guides choix d’une garde en France et préparation estivale, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot09_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot09_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot09_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot09_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('4bf0d4b1-701e-4e70-af61-1f619355ce67'::uuid,'5597f4d2-e24e-49a9-9f0e-87b1779c123d'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# House-sitting en France : choisir une garde adaptée au logement

**Un house-sitting convient lorsque les besoins de la maison et des animaux correspondent aux disponibilités et aux compétences de la personne accueillie.** Avant de confirmer, vérifiez les accès, les horaires de présence, les tâches et les conditions de séjour. Une belle photo ou un emplacement recherché ne permet pas de décider à leur place.

En France, un appartement, une maison avec jardin ou un logement plus éloigné des services peuvent demander des organisations différentes. Ce guide aide à comparer une garde concrète. Pour découvrir le principe du séjour en échange de tâches convenues, consultez [ce qu’est le house-sitting](/actualites/c-est-quoi-le-house-sitting).

**Dans ce guide**

- [Vérifier la compatibilité du séjour](#compatibilite)
- [Adapter la préparation au logement](#logement)
- [Les questions à poser des deux côtés](#questions)
- [Clarifier les dates, l’assurance et les dépenses](#cadre)
- [Confirmer ou revoir l’organisation](#decision)
- [Questions fréquentes](#faq)

## <a id="compatibilite"></a>Comment vérifier qu’un séjour est compatible ?

| Point à comparer | Ce que le propriétaire décrit | Ce que le gardien doit pouvoir confirmer |
| --- | --- | --- |
| Présence | Soins, sorties et moments où une présence est nécessaire. | Planning réel et autres engagements pendant le séjour. |
| Accès | Portes, étage, trajet et éventuelles contraintes de mobilité. | Possibilité d’arriver et de vivre sur place dans ces conditions. |
| Animaux | Besoins de chacun, cohabitation et gestes prescrits. | Expérience utile et capacité à assurer les tâches. |
| Équipements | Jardin, chauffage, portail ou autre installation concernée. | Opérations comprises et acceptées, avec des limites claires. |
| Accueil | Couchage, espaces, équipements et personnes autorisées. | Conditions de séjour comprises et compatibles avec ses besoins. |
| Imprévu | Contacts, accès de secours et relais accepté. | Façon de prévenir et de demander une aide adaptée. |

Habiter chez vous ne signifie pas rester sur place en permanence. Indiquez les contraintes de présence dès l’annonce et discutez-en avant la confirmation. Un emploi du temps souple ou le télétravail ne prouvent pas à eux seuls que les soins seront possibles.

Une maison sans animaux peut aussi être confiée : plantes, présence dans le logement et tâches convenues doivent alors être décrites avec la même précision.

## <a id="logement"></a>Qu’est-ce que le type de logement change ?

### Un appartement ou une maison de ville

Vérifiez les accès à l’immeuble, les clés, l’étage et les équipements effectivement disponibles. Pour un chien, transmettez des parcours autorisés et les difficultés connues de croisement. Pour un chat, expliquez les fenêtres, les cachettes et les espaces accessibles.

Si vous habitez en ville, précisez aussi l’arrivée, les bagages et les possibilités de stationnement lorsqu’elles sont utiles. Le gardien peut venir d’ailleurs ; une proximité supposée ne remplace pas la préparation du trajet.

### Une maison avec un jardin ou plusieurs installations

Décomposez les tâches : quelques pots à arroser ne demandent pas la même organisation qu’un jardin entretenu quotidiennement. Une piscine ou un système technique appelle des instructions et un contact professionnel pour les opérations qui dépassent les gestes acceptés.

Le [guide de préparation de la maison](/actualites/preparer-maison-avant-garde) aide à transmettre le fonctionnement du logement. Le gardien doit aussi disposer des conditions d’accueil annoncées, et pas seulement d’une liste de tâches.

### Un logement éloigné des services ou soumis à des accès particuliers

Vérifiez le trajet aux jours et horaires du séjour, l’accès aux courses, le transport d’un animal et la personne pouvant intervenir en cas d’empêchement. Décrivez les contraintes de réseau ou de connexion que vous connaissez, sans supposer une couverture suffisante.

Pour un accès de montagne ou une période hivernale, prévoyez l’organisation adaptée aux conditions réelles. Le [guide des gardes en hiver et en montagne](/actualites/house-sitting-hiver-montagne-savoie) développe ces vérifications. Ni la commune ni l’altitude ne permettent de déduire toutes les possibilités du séjour.

## <a id="questions"></a>Quelles questions poser avant de choisir ?

### Côté propriétaire

Demandez quelles dates la personne peut couvrir, quand elle prévoit de s’absenter, quelle expérience elle a des tâches et qui l’accompagnera éventuellement. Donnez une description honnête du logement et des soins. Un besoin difficile à exposer ne doit pas être découvert le jour de l’arrivée.

Consultez les avis lorsqu’il y en a. L’écusson « Identité vérifiée » indique le contrôle d’une pièce d’identité ; il ne certifie pas les compétences ni la fiabilité. Le [guide de choix du gardien](/actualites/choisir-gardien-bons-criteres) propose des questions plus détaillées.

### Côté gardien

Demandez les horaires indispensables, les gestes attendus, les conditions d’accueil et les solutions de relais. Signalez les tâches que vous ne savez pas assurer ou les contraintes qui ne conviennent pas à votre emploi du temps. Une personne peut refuser un séjour pour ces raisons, même si le logement lui plaît.

Si un traitement est nécessaire, vérifiez avec le propriétaire et le vétérinaire les conditions de réalisation et votre capacité à suivre les consignes prescrites. Le [guide pour débuter comme home-sitter](/actualites/comment-devenir-home-sitter-france-guide-debutant) développe cette préparation.

Une rencontre peut avoir lieu si les deux le souhaitent. Son format et sa durée se conviennent ensemble ; elle ne constitue pas à elle seule une preuve de compatibilité.

## <a id="cadre"></a>Dates, assurance et dépenses : que faut-il clarifier ?

Confirmez le début et la fin de la prise en charge, la remise des clés et la solution si l’arrivée ou le retour sont décalés. Une prolongation demande l’accord du gardien. Pour une absence à l’étranger, préparez les horaires de contact et un relais avec le [guide destiné aux propriétaires expatriés](/actualites/expat-proprietaire-faire-garder-maison-etranger).

Vérifiez les garanties applicables auprès de l’assureur. [Service Public présente les précautions d’assurance du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509), ainsi que l’autorisation écrite du bailleur pour un locataire. L’inscription sur une plateforme ou le nom donné au séjour ne vaut pas couverture automatique. Le [guide du cadre juridique en France](/actualites/house-sitting-cadre-juridique-france) permet d’approfondir.

Sur Guardiens, un accord de garde est proposé après confirmation, avec signature facultative. Précisez les tâches, les personnes accueillies et les dépenses : fournitures, frais autorisés, justificatifs et remboursement.

**Guardiens est actuellement 100 % gratuit pour les propriétaires et les gardiens.** Le séjour repose sur l’hébergement sans rémunération. Les dépenses de la maison et des animaux restent à organiser séparément. Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis ; voir les [conditions actuelles](/tarifs).

## <a id="decision"></a>Confirmer la garde ou revoir l’organisation ?

Un point essentiel reste incompatible ? Vous pouvez adapter les horaires, confier une tâche à un professionnel ou chercher une autre solution. Une candidature ne vous oblige pas à accepter un séjour qui ne couvre pas les soins nécessaires.

**Exemple fictif :** le gardien peut dormir dans la maison, mais s’absente aux heures d’un traitement prescrit. La présence de nuit ne résout pas ce besoin. Il faut préparer une prise en charge compatible, avec l’avis du vétérinaire si nécessaire, avant de confirmer.

Quand la garde est confirmée, le [guide d’accueil](/actualites/accueillir-gardien-bonnes-pratiques) et la [checklist de départ](/actualites/checklist-partir-vacances-animaux) aident à transmettre les consignes. Pour la saison chaude, le [guide house-sitting en été](/actualites/house-sitting-ete-aura-guide) complète les points de chaleur, d’eau et de jardin.

Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting pour développer un réseau de confiance. Vos retours aident à améliorer le service. La disponibilité dépend des personnes et des dates ; aucune candidature ni solution de remplacement n’est garantie.

## <a id="faq"></a>Questions fréquentes sur le house-sitting en France

:::faq
### Peut-on proposer un house-sitting sans animaux ?
Oui. Décrivez les besoins du logement, des plantes et les tâches convenues. Le gardien doit disposer de conditions d’accueil adaptées et comprendre ce qui est attendu pendant le séjour.

### Une maison isolée exige-t-elle toujours une voiture ?
Vérifiez les trajets réels pour les dates et les besoins du séjour : arrivée, courses, animaux et relais. Expliquez les contraintes avant de confirmer. Le seul type de logement ne suffit pas à décider.

### Le gardien peut-il s’absenter pendant la journée ?
Habiter dans le logement ne signifie pas une présence permanente. Les horaires doivent être compatibles avec les sorties, les soins et les tâches indispensables. Discutez du planning avant toute confirmation.

### Peut-on accueillir un couple ou une personne accompagnée ?
Clarifiez dès les échanges quelles personnes seront présentes et les conditions d’accueil. Le propriétaire doit accepter cette organisation. Ne supposez pas qu’une candidature autorise automatiquement d’autres occupants.

### L’accord proposé par Guardiens remplace-t-il l’assurance ?
Non. L’accord aide à définir les engagements ; il est proposé après confirmation, avec signature facultative. Les garanties applicables doivent être vérifiées séparément auprès de l’assureur.

### Le house-sitting sur Guardiens est-il gratuit ?
La plateforme est actuellement 100 % gratuite pour les deux rôles, avec un gardien hébergé sans rémunération. Les dépenses restent à convenir. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='4bf0d4b1-701e-4e70-af61-1f619355ce67'::uuid AND slug='house-sitting-auvergne-rhone-alpes';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/house-sitting-auvergne-rhone-alpes' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting en France : choisir une garde adaptée au logement'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Avant de confirmer un house-sitting, comparez les besoins du logement et des animaux avec les possibilités réelles du gardien. Les questions qui aident à décider.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting en France : choisir une garde adaptée'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Appartement, maison ou logement isolé : vérifiez les accès, les horaires, les soins et les équipements pour organiser un house-sitting adapté en France.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une maison éclairée au crépuscule, avec un jardin au premier plan.'
    AND before_row.cover_image_url IS NOT DISTINCT FROM 'https://guardiens.fr/images/landing/annonce-maison-jardin.webp'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"ce qu’est le house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des gardes en hiver et en montagne","url":"/actualites/house-sitting-hiver-montagne-savoie"},{"text":"guide de choix du gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide pour débuter comme home-sitter","url":"/actualites/comment-devenir-home-sitter-france-guide-debutant"},{"text":"guide destiné aux propriétaires expatriés","url":"/actualites/expat-proprietaire-faire-garder-maison-etranger"},{"text":"guide du cadre juridique en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide d’accueil","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"guide house-sitting en été","url":"/actualites/house-sitting-ete-aura-guide"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:25:17.764462+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot09_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot09_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot09_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting en France : choisir une garde adaptée au logement',
    excerpt='Avant de confirmer un house-sitting, comparez les besoins du logement et des animaux avec les possibilités réelles du gardien. Les questions qui aident à décider.',
    meta_title='House-sitting en France : choisir une garde adaptée',
    meta_description='Appartement, maison ou logement isolé : vérifiez les accès, les horaires, les soins et les équipements pour organiser un house-sitting adapté en France.',
    hero_image_alt='Une maison éclairée au crépuscule, avec un jardin au premier plan.',
    cover_image_url='https://guardiens.fr/images/landing/annonce-maison-jardin.webp',
    internal_links='[{"text":"ce qu’est le house-sitting","url":"/actualites/c-est-quoi-le-house-sitting"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des gardes en hiver et en montagne","url":"/actualites/house-sitting-hiver-montagne-savoie"},{"text":"guide de choix du gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide pour débuter comme home-sitter","url":"/actualites/comment-devenir-home-sitter-france-guide-debutant"},{"text":"guide destiné aux propriétaires expatriés","url":"/actualites/expat-proprietaire-faire-garder-maison-etranger"},{"text":"guide du cadre juridique en France","url":"/actualites/house-sitting-cadre-juridique-france"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide d’accueil","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"guide house-sitting en été","url":"/actualites/house-sitting-ete-aura-guide"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-auvergne-rhone-alpes' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# House-sitting en été : préparer les animaux et la maison

**Pour préparer un house-sitting en été, convenez des soins, des conditions de confort dans le logement et des tâches liées au jardin ou aux équipements.** Vérifiez que le gardien peut assurer les horaires nécessaires et sait qui contacter si la météo, une panne ou votre date de retour modifient l’organisation.

Le séjour d’une personne chez vous ne garantit ni une présence permanente ni l’absence d’imprévu. Ce guide porte sur la préparation estivale. Pour vérifier plus largement la compatibilité du logement et du séjour, consultez le [guide pratique du house-sitting en France](/actualites/house-sitting-auvergne-rhone-alpes).

**Dans ce guide**

- [Préparer les animaux face à la chaleur](#animaux)
- [Expliquer le fonctionnement du logement](#maison)
- [Organiser jardin, eau et équipements](#jardin)
- [Convenir du planning et du relais](#planning)
- [La checklist avant le départ](#checklist)
- [Questions fréquentes](#faq)

## <a id="animaux"></a>Animaux et chaleur : que faut-il prévoir avant le séjour ?

Le [ministère de l’Agriculture rappelle les précautions en période de chaleur](https://agriculture.gouv.fr/professionnels-particuliers-les-precautions-prendre-en-cas-de-vague-de-chaleur) : un lieu abrité du soleil et bien aéré, de l’eau propre à disposition, des jeux et promenades aux heures les moins chaudes, et aucun animal laissé seul dans une voiture.

Appliquez ces repères à votre logement et aux besoins de chaque animal. Montrez les endroits disponibles pour se reposer, les points d’eau et le matériel utile. Pour les sorties du chien, adaptez le parcours et l’horaire aux conditions réelles plutôt que d’imposer « avant 8 h » ou « après 20 h » partout en France.

Si votre animal a un traitement, une difficulté connue ou des besoins particuliers, préparez l’organisation avec le vétérinaire. Vérifiez la capacité du gardien à suivre les consignes prescrites. Le [guide de bien-être pendant l’absence](/actualites/bien-etre-animal-pendant-absence) aide à transmettre ces besoins sans déduire un diagnostic du comportement.

Si un animal paraît malade, en détresse ou affecté par la chaleur pendant la garde, contactez rapidement un vétérinaire et suivez ses consignes, sans attendre une réponse du propriétaire pour demander cet avis. Préparez ses coordonnées et la possibilité de transport avant le départ.

## <a id="maison"></a>Quelles consignes pour la maison en été ?

### Un fonctionnement expliqué et testé

Montrez les volets, les ouvertures autorisées et les appareils disponibles. Vérifiez le fonctionnement des équipements que vous annoncez, ainsi que les consignes nécessaires à leur utilisation. Le gardien ne doit pas découvrir une panne ou une restriction d’accès le premier jour.

Si vous proposez un ventilateur ou une climatisation, expliquez leur utilisation et les limites connues. Un appareil à disposition ne suffit pas à conclure que les conditions conviennent à tous les animaux. Si le logement ne permet pas l’accueil prévu, revoyez l’organisation avant de confirmer.

### Les ouvertures et la vie sur place

Précisez les fenêtres, la cour, le balcon et les accès extérieurs autorisés pour les animaux. Ventiler le logement ne doit pas conduire à improviser une ouverture incompatible avec ces consignes.

Présentez aussi les conditions de séjour de la personne accueillie : couchage, espaces, équipements et contraintes du logement. Signalez les caméras et respectez sa vie privée. Le [guide de préparation de la maison](/actualites/preparer-maison-avant-garde) développe ces informations.

### Une vigilance adaptée au lieu et aux dates

Consultez les [informations de vigilance de Météo-France](https://vigilance.meteofrance.fr/fr) pour le lieu et la période, et préparez la manière de suivre les consignes locales. Il n’est pas utile d’attribuer une température nocturne ou un risque identique à toute une ville ou un département.

Le gardien doit savoir qui joindre si une situation impose de changer les sorties, l’entretien ou les conditions du séjour. Le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) aide à préparer les interlocuteurs et le relais.

## <a id="jardin"></a>Jardin, arrosage, piscine : quelles tâches confier ?

| Besoin | Préparation avant le départ | Limite à clarifier |
| --- | --- | --- |
| Plantes | Repérer les pots, les besoins, le matériel et les quantités utiles. | Fréquence comprise et compatible avec le planning. |
| Jardin ou potager | Décrire les zones et un programme adaptable aux conditions. | Tâches acceptées, temps nécessaire et restrictions d’eau. |
| Arrosage automatique | Tester, expliquer les commandes utiles et signaler les problèmes connus. | Qui décide d’une modification et qui intervient en cas de panne. |
| Piscine, si concerné | Transmettre les consignes et les observations demandées. | Gestes acceptés et contact professionnel pour les opérations techniques. |

Vérifiez sur [VigiEau](https://vigieau.gouv.fr/) les mesures applicables à votre adresse et à votre usage de l’eau. Les consignes doivent pouvoir évoluer si les restrictions changent ; un automatisme ne dispense pas de cette vérification.

Ne demandez pas au gardien de réparer une installation ou de réaliser une manipulation qu’il ne maîtrise pas. Définissez les tâches et les dépenses autorisées. Le [guide d’entretien du jardin pendant l’absence](/actualites/entretenir-jardin-pendant-absence) et le [guide d’arrosage des plantes](/actualites/arroser-plantes-pendant-vacances-guide) permettent d’aller dans le détail.

## <a id="planning"></a>Comment convenir du planning d’été et du relais ?

### Chercher avec des informations précises

Commencez dès que vos dates sont connues. Décrivez le logement, les animaux, les soins, les tâches et les contraintes de présence. L’été ne garantit pas davantage de candidats ni une confirmation plus facile. La disponibilité dépend des personnes, du lieu et des dates.

Échangez sur les horaires réels, les autres engagements et les personnes accompagnantes. Une rencontre est possible si les deux le souhaitent. Consultez les avis lorsqu’il y en a ; l’écusson « Identité vérifiée » indique le contrôle d’une pièce d’identité, sans certifier compétence ni fiabilité.

### Préparer l’arrivée et le retour

Confirmez le début de la prise en charge et vérifiez les clés. Si le gardien arrive après votre départ, organisez l’intervalle. Si votre retour est décalé, une prolongation demande son accord ; prévoyez une autre prise en charge s’il ne peut pas rester.

Préparez un contact joignable pendant vos vacances et un relais qui a accepté ce rôle et peut accéder au logement. Après confirmation sur Guardiens, un accord de garde est proposé, avec signature facultative. Le [guide d’accueil](/actualites/accueillir-gardien-bonnes-pratiques) détaille le passage de relais.

### Clarifier les dépenses

**Guardiens est actuellement 100 % gratuit pour les propriétaires et les gardiens.** Le gardien est hébergé sans rémunération. Nourriture des animaux, consommables, frais de santé et autres dépenses convenues restent à prévoir séparément.

Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis. Retrouvez les [conditions actuelles](/tarifs). Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting pour construire un réseau de confiance ; vos retours aident à améliorer le service.

## <a id="checklist"></a>La checklist estivale avant le départ

- [ ] Horaires et soins de chaque animal compatibles avec le planning du gardien.
- [ ] Eau, lieux de repos et parcours de sortie préparés pour les conditions attendues.
- [ ] Ouvertures autorisées, volets et équipements expliqués et testés.
- [ ] Tâches du jardin comprises, matériel disponible et restrictions d’eau vérifiées.
- [ ] Limites des gestes techniques et contacts professionnels convenus.
- [ ] Clés utilisables et éventuel intervalle avant l’arrivée organisé.
- [ ] Vétérinaire, transport, contact joignable et relais préparés.
- [ ] Fournitures, dépenses et retour clarifiés.

Reprenez aussi la [checklist générale de garde avant les vacances](/actualites/checklist-partir-vacances-animaux). Si un besoin essentiel reste sans solution, clarifiez-le avant de partir : une liste cochée ne remplace pas une prise en charge confirmée.

## <a id="faq"></a>Questions fréquentes sur le house-sitting en été

:::faq
### Quand publier une annonce pour les vacances d’été ?
Dès que vos dates sont connues, avec le logement, les besoins et les contraintes de présence. Aucun délai ne garantit une candidature ou une confirmation. Préparez une autre solution tant que la garde n’est pas confirmée.

### Le gardien doit-il rester à la maison toute la journée ?
Le séjour ne signifie pas une présence permanente. Convenez d’un planning compatible avec les soins, les sorties et les tâches nécessaires. Les horaires réels comptent davantage qu’un statut de télétravailleur ou une disponibilité générale.

### Faut-il promener le chien avant 8 h et après 20 h ?
Il n’existe pas un horaire valable pour tous les lieux et toutes les journées. Le ministère recommande les heures les moins chaudes. Adaptez les sorties aux conditions locales et aux besoins du chien, avec les consignes du vétérinaire si nécessaire.

### Peut-on confier le jardin au gardien ?
Décrivez les tâches, la fréquence, le matériel et le temps nécessaire. Le gardien doit les comprendre et les accepter. Vérifiez les restrictions d’eau à l’adresse concernée et prévoyez comment adapter les consignes.

### Que faire si la chaleur ou une panne rend le séjour difficile ?
Préparez les contacts et le relais avant le départ, puis revoyez l’organisation avec le gardien selon la situation. Un animal paraissant malade ou en détresse demande rapidement un avis vétérinaire. Aucun remplacement immédiat par la plateforme n’est garanti.

### La garde d’été sur Guardiens est-elle gratuite ?
La plateforme est actuellement 100 % gratuite pour les deux rôles, avec un gardien hébergé sans rémunération. Les dépenses restent à convenir. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::

## Sources pour préparer le séjour

Ressources consultées le 17 octobre 2026 : [ministère de l’Agriculture, précautions en période de chaleur](https://agriculture.gouv.fr/professionnels-particuliers-les-precautions-prendre-en-cas-de-vague-de-chaleur), [Météo-France, vigilance](https://vigilance.meteofrance.fr/fr) et [VigiEau](https://vigieau.gouv.fr/). Les conditions et mesures locales sont à vérifier pour les dates du séjour.$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='5597f4d2-e24e-49a9-9f0e-87b1779c123d'::uuid AND slug='house-sitting-ete-aura-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/house-sitting-ete-aura-guide' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting en été : préparer les animaux et la maison'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Chaleur, jardin, équipements et retour de vacances : les points à convenir avec le gardien avant un séjour d’été, selon votre logement et vos animaux.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting été : préparer son départ en vacances'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Avant un house-sitting en été, préparez les animaux, les pièces fraîches, les sorties, l’arrosage et le relais. Une checklist pour organiser votre départ.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien se trouve sur une terrasse devant une maison et des pots de fleurs.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide pratique du house-sitting en France","url":"/actualites/house-sitting-auvergne-rhone-alpes"},{"text":"guide de bien-être pendant l’absence","url":"/actualites/bien-etre-animal-pendant-absence"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide d’entretien du jardin pendant l’absence","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"guide d’arrosage des plantes","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"guide d’accueil","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"checklist générale de garde avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:25:10.84301+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot09_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot09_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot09_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting en été : préparer les animaux et la maison',
    excerpt='Chaleur, jardin, équipements et retour de vacances : les points à convenir avec le gardien avant un séjour d’été, selon votre logement et vos animaux.',
    meta_title='House-sitting été : préparer son départ en vacances',
    meta_description='Avant un house-sitting en été, préparez les animaux, les pièces fraîches, les sorties, l’arrosage et le relais. Une checklist pour organiser votre départ.',
    hero_image_alt='Un chien se trouve sur une terrasse devant une maison et des pots de fleurs.',
    internal_links='[{"text":"guide pratique du house-sitting en France","url":"/actualites/house-sitting-auvergne-rhone-alpes"},{"text":"guide de bien-être pendant l’absence","url":"/actualites/bien-etre-animal-pendant-absence"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide d’entretien du jardin pendant l’absence","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"guide d’arrosage des plantes","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"guide d’accueil","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"checklist générale de garde avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-ete-aura-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
