-- Maillage éditorial, lot 02 : deux articles existants. Reprise autorisée le 18/10/2026.
-- Seuls content, internal_links et updated_at changent ; URL, indexabilité et métadonnées conservées.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_maillage_lot02_20261018 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_maillage_lot02_20261018 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_maillage_lot02_20261018 TO service_role;
ALTER TABLE public._backup_articles_maillage_lot02_20261018 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('c5eb7f77-fe14-4b7c-8ad1-a1035bcb663f'::uuid,'4bf0d4b1-701e-4e70-af61-1f619355ce67'::uuid) ORDER BY id FOR UPDATE;

DO $article_0$
DECLARE
  before_row public.articles%ROWTYPE;
  new_content text := $maillage_lot02_0$# Pet-sitting à Lyon : choisir et organiser la garde de vos animaux

**Le pet-sitting à Lyon peut prendre la forme de visites chez vous, d’un accueil dans un autre foyer ou du séjour d’une personne à votre domicile.** Pour choisir, partez des soins à assurer, des horaires et des dates. Le mot « garde » ne dit pas à lui seul où reste l’animal ni combien de temps quelqu’un est présent.

Ce guide vous aide à comparer l’organisation et à préparer vos échanges. La [page house-sitting à Lyon](/house-sitting/lyon) présente plus particulièrement le séjour proposé par Guardiens : une personne loge chez vous, sans rémunération, avec les tâches convenues auprès de la maison et des animaux.

**Dans ce guide**

- [Distinguer les formules](#formules)
- [Choisir le guide adapté à votre animal](#besoins)
- [Comparer le budget](#budget)
- [Préparer les trajets et les accès](#lyon)
- [Échanger, confirmer et transmettre les consignes](#organisation)
- [Questions fréquentes](#faq)

## <a id="formules"></a>Visites, accueil ou séjour : que compare-t-on ?

| Formule | Lieu de vie de l’animal | Ce qui doit être précisé |
| --- | --- | --- |
| Visites ou promenades | Votre logement entre les interventions. | Horaires, durée, soins et organisation entre les passages. |
| Accueil chez une personne | Un autre foyer. | Occupants, animaux présents, espaces, sorties et absences de la personne. |
| Pension | Une structure d’accueil. | Hébergement, prise en charge, conditions d’admission et contrat. |
| Gardien hébergé | Votre domicile, partagé avec une personne pendant le séjour. | Planning, logement proposé, tâches et limites acceptées. |

Un proche peut aussi vous aider, selon ce qu’il accepte et les dates qu’il peut couvrir. Dans tous les cas, confirmez qui sera responsable des tâches, y compris les week-ends, le jour du départ et celui du retour.

Le séjour d’un gardien ne signifie pas une présence permanente. Une prestation payante ne garantit pas non plus un nombre d’heures de présence que le devis ne prévoit pas. Demandez une description concrète de la journée et de la nuit.

## <a id="besoins"></a>Quel guide consulter selon votre situation ?

### Vous faites garder un chien

Précisez les sorties, les périodes seul, les rencontres difficiles, les soins et les équipements. Notre [guide chien à Lyon pendant les vacances](/actualites/ou-faire-garder-chien-lyon-vacances) compare les options et un exemple de budget local. Le [guide des alternatives à la pension](/actualites/pension-chien-alternatives-guide) aide à examiner les conditions de chaque formule.

### Vous faites garder un chat

Décrivez les repas, les litières, les soins, les interactions et les ouvertures autorisées. Le [guide chat à domicile à Lyon](/actualites/garde-chat-domicile-lyon) détaille visites, séjour et exemples de tarifs. L’organisation doit correspondre à l’animal ; l’adresse ou la race ne permet pas de conclure à ses besoins.

### Vous avez plusieurs animaux ou une absence particulière

Décrivez les besoins de chacun, les espaces partagés et la capacité de la personne à prendre en charge l’ensemble. Pour une absence longue, répétée ou imprévue, le [guide des huit situations de garde](/actualites/s-absenter-avec-animal-guide-solutions-2026) oriente vers les points à préparer.

Pour un traitement ou une difficulté de santé, demandez au vétérinaire quelles conditions sont nécessaires, puis vérifiez que la personne peut assurer les gestes prévus. Un badge ou une présentation de profil ne remplace pas cette vérification.

## <a id="budget"></a>Comment comparer le prix d’une garde à Lyon ?

Demandez un total pour vos dates et votre adresse. Un prix à la visite, à la journée ou à la nuit ne couvre pas forcément les mêmes services. Vérifiez les soins, les déplacements, les frais de plateforme, les suppléments et les conditions d’annulation.

Les guides [chien Lyon](/actualites/ou-faire-garder-chien-lyon-vacances) et [chat Lyon](/actualites/garde-chat-domicile-lyon) présentent des exemples directs de prestataires, datés et identifiés. Ces exemples ne constituent pas une moyenne ni une preuve de qualité d’un établissement.

**Guardiens est actuellement 100 % gratuit pour les propriétaires et les gardiens.** Le gardien est hébergé dans votre logement sans rémunération. L’alimentation, la litière, les soins et les autres dépenses convenues restent à prévoir séparément. Cette formule demande de proposer un logement adapté au séjour.

Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis. Les [conditions actuelles](/tarifs) expliquent le modèle. Notre priorité est de construire le réseau ; les retours des membres nous aident à améliorer le service.

## <a id="lyon"></a>À Lyon, préparer les accès, les sorties et les trajets

### Les contraintes du logement

Indiquez l’étage, l’ascenseur s’il existe, les portes à franchir et les conditions d’accueil. Organisez des clés utilisables et un relais qui peut accéder au logement. Les codes et l’emplacement des clés se transmettent en privé.

Les guides [Croix-Rousse](/actualites/garde-animaux-croix-rousse-lyon) et [Presqu’île](/actualites/garde-chat-presquile-lyon) développent les escaliers, les parcours et l’arrivée dans le centre. Pour une maison, le [guide Ouest lyonnais](/actualites/pet-sitting-lyon-ouest-lyonnais) précise l’entretien, les équipements et les déplacements.

Votre logement se trouve dans une commune voisine ? Les guides de [garde à Villeurbanne](/actualites/pet-sitting-villeurbanne) et de [garde à Vénissieux](/actualites/pet-sitting-venissieux) abordent les accès et l’organisation du séjour. Pour préparer les sorties ou un séjour en périphérie, le guide des [villes autour de Lyon avec un chien](/actualites/meilleures-villes-vivre-chien-autour-lyon) apporte d’autres repères à vérifier selon votre adresse.

### Les sorties du chien

Transmettez des parcours adaptés à votre chien et autorisés. Un espace vert ou une berge ne signifie pas que le chien peut y être détaché. Le [guide des promenades à Lyon](/actualites/parcs-chiens-lyon-guide-complet) aide à préparer les sorties ; vérifiez les règles affichées sur place.

### Le transport d’un animal sur le réseau TCL

Le [règlement TCL unifié, rubrique 5](https://www.tcl.fr/a-propos/reglement-du-reseau-tcl-unifie), distingue les petits animaux dans un contenant fermé conforme et les chiens de plus de 6 kg admis sous conditions sur les lignes régulières : laisse, muselière, attestation de transport et documents prévus. Les chiens classés dangereux sont exclus de ce dispositif. Vérifiez les conditions du service emprunté avant le trajet, notamment pour les services ayant leurs règles spécifiques.

La carte d’identification et l’attestation concernent l’animal et les accompagnateurs prévus. Organisez ces éléments avant la garde si un déplacement en transports est nécessaire. Vérifiez aussi le trajet vers le vétérinaire, sans supposer qu’un animal pourra emprunter n’importe quel service.

## <a id="organisation"></a>Comment choisir une personne et confirmer la garde ?

Décrivez les besoins, les dates et les contraintes avant de comparer les profils. Posez des questions sur l’expérience utile, les horaires, les autres engagements et la façon de réagir si une tâche devient impossible. Une personne doit pouvoir refuser une prise en charge qu’elle ne sait pas assurer.

Consultez les avis lorsqu’il y en a. L’écusson « Identité vérifiée » indique le contrôle d’une pièce d’identité ; il ne certifie pas la compétence ni la fiabilité. Le [guide de choix du gardien](/actualites/choisir-gardien-bons-criteres) aide à préparer ces échanges.

Sur Guardiens, vous publiez le séjour et échangez avec les personnes intéressées. Une rencontre est possible si les deux le souhaitent. Après confirmation, un accord de garde est proposé, avec signature facultative. Préparez les consignes, les contacts, les dépenses et le relais avec la [checklist avant le départ](/actualites/checklist-partir-vacances-animaux).

La disponibilité dépend des personnes et des dates. Aucun arrondissement ne garantit une candidature ; un gardien peut aussi venir d’ailleurs pour séjourner chez vous. Gardez une autre solution tant que la garde n’est pas confirmée. Si le besoin est immédiat, contactez d’abord une personne ou un professionnel qui peut réellement intervenir.

Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting pour développer ce réseau de confiance. Vous souhaitez aussi accueillir des séjours comme gardien ? Le [guide du profil gardien](/actualites/creer-profil-gardien-attractif) explique comment présenter votre expérience et vos disponibilités.

## <a id="faq"></a>Questions fréquentes sur le pet-sitting à Lyon

:::faq
### Quelle différence entre pet-sitting et house-sitting ?
Pet-sitting désigne la garde d’animaux, avec des modalités à préciser. Dans le house-sitting proposé par Guardiens, le gardien séjourne dans le logement confié et assure les tâches convenues. Des visites ou un accueil chez la personne sont d’autres organisations.

### Puis-je utiliser Guardiens pour un séjour avec plusieurs animaux ?
Décrivez chaque animal, les soins et les contraintes du logement. Vérifiez que la personne peut prendre en charge l’ensemble aux horaires nécessaires. Le nombre d’animaux ne garantit ni candidature ni compatibilité.

### Les chiens sont-ils interdits dans le métro lyonnais ?
Le règlement TCL prévoit un dispositif pour les chiens de plus de 6 kg sur les lignes régulières, sous conditions dont laisse, muselière et attestation, hors chiens classés dangereux. Vérifiez le règlement et le service avant le trajet ; les petits animaux transportés en contenant conforme relèvent d’autres conditions.

### Quel quartier choisir pour trouver un gardien ?
Partez du logement et des besoins, puis échangez sur les dates et les accès. Un gardien peut venir d’un autre quartier ou d’une autre ville. La localisation ne suffit pas à établir sa disponibilité ni ses compétences.

### Que faire si mon animal a besoin d’une prise en charge urgente ?
Contactez une personne ou un professionnel qui peut effectivement intervenir. Si l’animal paraît malade ou blessé, demandez un avis vétérinaire. Une recherche sur une plateforme ne garantit pas de réponse ou de remplacement immédiat.

### Le pet-sitting à Lyon est-il gratuit ?
Les prestataires fixent leurs tarifs. Guardiens est actuellement 100 % gratuit pour les deux rôles, avec un gardien hébergé sans rémunération. Les dépenses restent à convenir. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::

## Sources et informations pratiques

Ressources consultées le 17 octobre 2026 : [règlement TCL unifié](https://www.tcl.fr/a-propos/reglement-du-reseau-tcl-unifie), pour le transport, et [Service Public, assurance du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509), pour les garanties à vérifier auprès de l’assureur avant le séjour.$maillage_lot02_0$;
  new_links jsonb := '[{"url":"/house-sitting/lyon","text":"page house-sitting à Lyon"},{"url":"/actualites/ou-faire-garder-chien-lyon-vacances","text":"guide chien à Lyon pendant les vacances"},{"url":"/actualites/pension-chien-alternatives-guide","text":"guide des alternatives à la pension"},{"url":"/actualites/garde-chat-domicile-lyon","text":"guide chat à domicile à Lyon"},{"url":"/actualites/s-absenter-avec-animal-guide-solutions-2026","text":"guide des huit situations de garde"},{"url":"/tarifs","text":"conditions actuelles"},{"url":"/actualites/garde-animaux-croix-rousse-lyon","text":"Croix-Rousse"},{"url":"/actualites/garde-chat-presquile-lyon","text":"Presqu’île"},{"url":"/actualites/pet-sitting-lyon-ouest-lyonnais","text":"guide Ouest lyonnais"},{"url":"/actualites/parcs-chiens-lyon-guide-complet","text":"guide des promenades à Lyon"},{"url":"/actualites/choisir-gardien-bons-criteres","text":"guide de choix du gardien"},{"url":"/actualites/checklist-partir-vacances-animaux","text":"checklist avant le départ"},{"url":"/actualites/creer-profil-gardien-attractif","text":"guide du profil gardien"},{"text":"garde à Villeurbanne","url":"/actualites/pet-sitting-villeurbanne"},{"text":"garde à Vénissieux","url":"/actualites/pet-sitting-venissieux"},{"text":"villes autour de Lyon avec un chien","url":"/actualites/meilleures-villes-vivre-chien-autour-lyon"}]'::jsonb;
  affected integer;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='c5eb7f77-fe14-4b7c-8ad1-a1035bcb663f'::uuid AND slug='pet-sitting-lyon-guide-complet';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-lyon-guide-complet' THEN
    RAISE EXCEPTION 'Lot 02 article 0: état éditorial inattendu';
  END IF;
  IF before_row.content = new_content AND before_row.internal_links IS NOT DISTINCT FROM new_links THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-17T22:26:36.102042+00:00'::timestamptz
    OR md5(before_row.content) IS DISTINCT FROM '6e4048988160c460926f697d8c5dbccd' THEN
    RAISE EXCEPTION 'Lot 02 article 0: version concurrente';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot02_20261018 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Lot 02 article 0: sauvegarde différente';
  END IF;
  INSERT INTO public._backup_articles_maillage_lot02_20261018 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot02_20261018 z WHERE z.id=x.id);
  UPDATE public.articles SET content=new_content, internal_links=new_links, updated_at=now()
    WHERE id=before_row.id AND slug=before_row.slug AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Lot 02 article 0: écriture incomplète'; END IF;
END;
$article_0$;

DO $article_1$
DECLARE
  before_row public.articles%ROWTYPE;
  new_content text := $maillage_lot02_1$# House-sitting en France : choisir une garde adaptée au logement

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

Pour des exemples d’organisation en ville et dans les environs, consultez les guides de [garde à Saint-Étienne et dans la Loire](/actualites/pet-sitting-saint-etienne-loire), de [garde à Valence et dans la Drôme](/actualites/pet-sitting-valence-drome) et de [garde à Clermont-Ferrand](/actualites/pet-sitting-clermont-ferrand). Ils complètent ces questions générales par des points à vérifier sur les accès, le logement et les déplacements.

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

Si la difficulté dépasse une absence temporaire, notre guide sur les [chiffres de l’abandon d’animaux et les pistes d’aide](/actualites/abandon-animaux-france-chiffres-causes) distingue les situations et les relais à envisager. Une garde temporaire ne résout pas toutes les difficultés durables.

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
:::$maillage_lot02_1$;
  new_links jsonb := '[{"url":"/actualites/c-est-quoi-le-house-sitting","text":"ce qu’est le house-sitting"},{"url":"/actualites/preparer-maison-avant-garde","text":"guide de préparation de la maison"},{"url":"/actualites/house-sitting-hiver-montagne-savoie","text":"guide des gardes en hiver et en montagne"},{"url":"/actualites/choisir-gardien-bons-criteres","text":"guide de choix du gardien"},{"url":"/actualites/comment-devenir-home-sitter-france-guide-debutant","text":"guide pour débuter comme home-sitter"},{"url":"/actualites/expat-proprietaire-faire-garder-maison-etranger","text":"guide destiné aux propriétaires expatriés"},{"url":"/actualites/house-sitting-cadre-juridique-france","text":"guide du cadre juridique en France"},{"url":"/tarifs","text":"conditions actuelles"},{"url":"/actualites/accueillir-gardien-bonnes-pratiques","text":"guide d’accueil"},{"url":"/actualites/checklist-partir-vacances-animaux","text":"checklist de départ"},{"url":"/actualites/house-sitting-ete-aura-guide","text":"guide house-sitting en été"},{"text":"garde à Saint-Étienne et dans la Loire","url":"/actualites/pet-sitting-saint-etienne-loire"},{"text":"garde à Valence et dans la Drôme","url":"/actualites/pet-sitting-valence-drome"},{"text":"garde à Clermont-Ferrand","url":"/actualites/pet-sitting-clermont-ferrand"},{"text":"chiffres de l’abandon d’animaux et les pistes d’aide","url":"/actualites/abandon-animaux-france-chiffres-causes"}]'::jsonb;
  affected integer;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='4bf0d4b1-701e-4e70-af61-1f619355ce67'::uuid AND slug='house-sitting-auvergne-rhone-alpes';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM false
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/house-sitting-auvergne-rhone-alpes' THEN
    RAISE EXCEPTION 'Lot 02 article 1: état éditorial inattendu';
  END IF;
  IF before_row.content = new_content AND before_row.internal_links IS NOT DISTINCT FROM new_links THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-17T22:39:54.700778+00:00'::timestamptz
    OR md5(before_row.content) IS DISTINCT FROM 'bb9d9b547a1c80bff51fdf2975c35bd5' THEN
    RAISE EXCEPTION 'Lot 02 article 1: version concurrente';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot02_20261018 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Lot 02 article 1: sauvegarde différente';
  END IF;
  INSERT INTO public._backup_articles_maillage_lot02_20261018 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_maillage_lot02_20261018 z WHERE z.id=x.id);
  UPDATE public.articles SET content=new_content, internal_links=new_links, updated_at=now()
    WHERE id=before_row.id AND slug=before_row.slug AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Lot 02 article 1: écriture incomplète'; END IF;
END;
$article_1$;

COMMIT;
