-- Refonte des guides Valence et Vénissieux, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot13_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot13_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot13_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot13_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('2198e199-187b-4dd9-91a2-454ecec58234'::uuid,'36521fd1-ec0f-4cc9-802e-e599d625d4ae'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Pet-sitting à Valence : choisir la garde et préparer votre absence

**À Valence, le choix d’une garde commence par votre quotidien : soins, sorties, temps de présence et déplacements.** Pour un chat qui reste chez lui, un chien à sortir ou une maison avec jardin, les besoins ne sont pas interchangeables. Présentez-les avant de comparer les prix ou de proposer un séjour.

Le pet-sitting peut prendre la forme de visites ou d’un accueil dans un autre lieu. Sur Guardiens, le house-sitting consiste à héberger une personne chez vous pour veiller sur la maison et, s’il y en a, les animaux. Les tâches et les horaires sont à convenir ; cela ne signifie pas une présence permanente.

**Repères :** [choisir la formule](#formule), [comprendre le budget](#budget), [préparer sorties et chaleur](#quotidien), [accueillir le gardien](#sejour), [questions fréquentes](#faq).

## <a id="formule"></a>Quelle solution correspond à votre absence ?

Pour choisir entre visites, pension ou gardien hébergé, posez-vous trois questions :

- **De quoi l’animal a-t-il besoin entre deux passages ?** Décrivez repas, sorties, soins prescrits et tolérance habituelle aux absences.
- **Peut-il séjourner ailleurs dans les conditions proposées ?** Demandez les modalités d’accueil et les interactions possibles avec d’autres animaux.
- **Que faut-il prévoir pour le logement ?** Plantes, courrier et équipements ne font pas automatiquement partie d’une garde d’animaux.

Le [guide des solutions de garde à domicile](/actualites/garde-animaux-domicile-chien-chat) compare les formules. Si un animal est malade ou supporte mal les absences, demandez un avis vétérinaire sur l’organisation adaptée plutôt que d’attendre d’une formule qu’elle règle la difficulté.

## <a id="budget"></a>Quel budget prévoir dans le bassin valentinois ?

Un prix de visite ne suffit pas à calculer le séjour. Vérifiez la durée, la fréquence nécessaire, le secteur, les dimanches et les opérations de préparation.

Exemple daté : [Coup d’patte, garde de chats](https://coupd-patte.fr/garde-de-chats/), publie pour **un chat à Portes-lès-Valence** une visite à **16 € du lundi au samedi** et **20 € le dimanche**, avec une **prévisite à 10 € pour un nouveau client** et une **remise de clés en main propre à 5 €**. Tarifs TTC annoncés à partir du 5 janvier 2026, consultés le **17 octobre 2026**. Les options et autres secteurs ont leurs conditions : cet exemple n’est ni un tarif pour toute la Drôme ni une offre supposée disponible à votre adresse.

| À demander dans un devis | Pourquoi cela compte |
| --- | --- |
| Durée, nombre de passages et animaux concernés | Le prix d’une visite ne décrit pas toute la journée. |
| Secteur et déplacements | Valence, Bourg-lès-Valence et une commune plus éloignée peuvent avoir des conditions différentes. |
| Prévisite, clés et suppléments de calendrier | Ces opérations peuvent s’ajouter au prix annoncé. |

Pour un séjour via Guardiens, la plateforme est **actuellement 100 % gratuite pour les propriétaires et les gardiens** ; le gardien est hébergé sans rémunération. Transport, alimentation des animaux, consommables et soins vétérinaires sont distincts et doivent être convenus. La priorité est de construire le réseau et d’améliorer le service avec vos retours. Une éventuelle contribution aux frais d’infrastructure ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis. Les [conditions actuelles](/tarifs) restent la référence.

## <a id="quotidien"></a>Sorties, chaleur et ouvertures : préparer le quotidien

Donnez un parcours habituel adapté à votre chien et indiquez ce qu’il faut éviter : rencontres, traversées ou effort inhabituel. Ne partez pas du principe qu’un gardien connaît les berges, les canaux ou les accès depuis votre logement.

Le [parc Jouvet, présenté par l’office de tourisme](https://www.valence-romans-tourisme.com/fr/catalogue/detail/le-parc-jouvet-150032/), est un point de repère en ville, avec des **horaires qui varient selon la période de l’année**. Vérifiez l’ouverture et les règles affichées pour la sortie prévue, plutôt que d’en faire un parcours accessible à toute heure. Une promenade vers Crussol est un autre trajet, à préparer avec le propriétaire ; un joli point de vue ne garantit pas qu’il convient à l’animal.

En été, précisez les pièces où l’animal peut rester au frais, les ouvertures autorisées et les changements de sorties à prévoir. Adaptez le programme aux conditions du jour et aux besoins individuels ; ne présentez pas le climat comme une garantie de confort. Le [guide des gardes en été](/actualites/house-sitting-ete-aura-guide) aide à préparer ces points.

Pour un chat, expliquez ses habitudes, les accès extérieurs convenus et les ouvertures sécurisées. Pour les plantes, indiquez les gestes et les quantités prévues, avec les restrictions éventuelles à vérifier sur [VigiEau](https://vigieau.gouv.fr/).

## <a id="sejour"></a>Comment préparer le séjour chez vous ?

Décrivez le logement pour le gardien : chambre, pièces accessibles, connexion, chauffage ou gestion de la chaleur, escaliers et stationnement. Indiquez les trajets utiles pour les courses et le vétérinaire, et si un véhicule est nécessaire. Ce sont des conditions de séjour à vérifier des deux côtés.

Pour choisir une personne, discutez de son expérience avec vos animaux et de ses disponibilités réelles. Les [questions du guide de sélection](/actualites/choisir-gardien-bons-criteres) sont plus utiles qu’un profil supposé « chaleureux et posé » parce qu’il habite dans la Drôme. Un écusson d’identité correspond à un contrôle de document, pas à une garantie de compétence ; les avis complètent l’échange lorsqu’ils existent.

Une rencontre peut être proposée **si les deux personnes le souhaitent**. Avant de partir, préparez les prescriptions, le vétérinaire habituel, le service de garde, le transport et un relais qui a accepté ce rôle. Convenez des décisions et dépenses possibles. Si l’animal semble malade, demandez un avis vétérinaire sans attendre que le propriétaire réponde.

Après confirmation sur Guardiens, un accord est proposé et sa signature est facultative. Vérifiez aussi les assurances adaptées à votre situation. La [checklist de départ](/actualites/checklist-partir-vacances-animaux) et le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) complètent l’organisation. Gardez une autre solution possible : aucune candidature ou disponibilité à vos dates n’est garantie.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on faire garder son chat à domicile à Valence ?
Oui, par des visites ou un séjour hébergé selon l’organisation retenue. Définissez les soins et les moments de présence nécessaires avant de choisir la formule.

### Quel prix comparer pour une garde de chat près de Valence ?
Comparez la durée, le nombre de passages, le nombre d’animaux, le secteur et les frais de préparation. Un prix publié pour Portes-lès-Valence, par exemple, ne s’applique pas automatiquement à toute l’agglomération.

### Le parc Jouvet peut-il servir de parcours à toute heure ?
Non : ses horaires varient selon la période. Vérifiez les informations actuelles et la signalisation, puis choisissez un parcours compatible avec les besoins du chien et les horaires de sortie.

### La gratuité de Guardiens inclut-elle les dépenses des animaux ?
Non. La plateforme est actuellement gratuite pour les deux rôles et le gardien est hébergé sans rémunération. Les dépenses convenues et les soins vétérinaires restent distincts.

### Faut-il avoir des animaux pour proposer une garde de maison ?
Non. Décrivez simplement les tâches liées au logement et aux plantes, les accès et les horaires attendus. Le séjour doit convenir à la personne accueillie aussi.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='2198e199-187b-4dd9-91a2-454ecec58234'::uuid AND slug='pet-sitting-valence-drome';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-valence-drome' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Pet-sitting à Valence : choisir la garde et préparer votre absence'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Quelle garde pour votre chien, votre chat et votre maison à Valence ? Des repères de budget et les questions pratiques à régler avant votre départ.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Pet-sitting Valence Drôme (26) : garde d’animaux'
    AND before_row.meta_description IS NOT DISTINCT FROM 'À Valence et dans son agglomération, comparez visites, accueil et gardien hébergé. Budget, chaleur, sorties et consignes pour préparer votre absence.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chat roux est couché sur le rebord d’une fenêtre aux volets bleus, dans une maison en pierre.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des solutions de garde à domicile","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide des gardes en été","url":"/actualites/house-sitting-ete-aura-guide"},{"text":"questions du guide de sélection","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:25:16.951661+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot13_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot13_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot13_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Pet-sitting à Valence : choisir la garde et préparer votre absence',
    excerpt='Quelle garde pour votre chien, votre chat et votre maison à Valence ? Des repères de budget et les questions pratiques à régler avant votre départ.',
    meta_title='Pet-sitting Valence Drôme (26) : garde d’animaux',
    meta_description='À Valence et dans son agglomération, comparez visites, accueil et gardien hébergé. Budget, chaleur, sorties et consignes pour préparer votre absence.',
    hero_image_alt='Un chat roux est couché sur le rebord d’une fenêtre aux volets bleus, dans une maison en pierre.',
    internal_links='[{"text":"guide des solutions de garde à domicile","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide des gardes en été","url":"/actualites/house-sitting-ete-aura-guide"},{"text":"questions du guide de sélection","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-valence-drome' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Pet-sitting à Vénissieux : préparer la garde et les accès au logement

**Pour une garde d’animaux à Vénissieux, les accès au logement comptent autant que la proximité d’un parc.** Qui remet les clés ? Comment entrer dans l’immeuble ? Quels soins et quelles sorties sont nécessaires chaque jour ? Ces détails permettent de choisir entre visites et séjour chez vous.

Sur Guardiens, vous pouvez accueillir une personne dans votre logement pour veiller sur la maison et, s’il y en a, les animaux. Ce house-sitting suppose de discuter des conditions de vie et des horaires de présence. Il ne signifie pas qu’un gardien connaît déjà votre immeuble ou sera disponible à tout moment.

**Sommaire :** [choisir l’organisation](#organisation), [préparer Parilly](#parilly), [transmettre les accès](#acces), [budget et confiance](#confiance), [questions fréquentes](#faq).

## <a id="organisation"></a>Visites ou gardien hébergé : partir des soins nécessaires

Listez les repas, traitements prescrits, sorties et moments de présence dont l’animal a besoin. Pour un chat, précisez les habitudes d’accès à l’extérieur et les ouvertures à préserver. Pour un chien, décrivez les parcours, les équipements et les situations à éviter.

Des visites peuvent répondre à un besoin de passages définis ; un séjour hébergé permet d’organiser une présence dans le logement, avec des horaires convenus. L’accueil dans un autre foyer ou une pension est une autre possibilité à étudier selon l’animal. Aucune formule n’est adaptée à tous les cas.

Le [guide du pet-sitting à Lyon](/actualites/pet-sitting-lyon-guide-complet) compare les formules. Les guides dédiés au [chien pendant les vacances](/actualites/ou-faire-garder-chien-lyon-vacances) et au [chat à domicile](/actualites/garde-chat-domicile-lyon) donnent des repères de budget et de préparation, sans créer un tarif distinct pour chaque quartier.

## <a id="parilly"></a>Promener un chien à Parilly : quelles règles transmettre ?

**Parilly n’est pas un espace où les chiens sont libres partout.** Le [document de la Métropole « Mon chien au parc de Parilly »](https://www.grandlyon.com/fileadmin/user_upload/media/pdf/environnement/parcs/20230502_parcparilly_chien.pdf) distingue les espaces accessibles en laisse, les espaces interdits et les parcs canins dédiés.

| Espace | Repère donné par la Métropole |
| --- | --- |
| Parc, hors espaces interdits | Chiens tenus en laisse et déjections à ramasser. |
| Aires de jeux et plaine des sports | Espaces non autorisés aux chiens. |
| Deux parcs canins dédiés | Côté Vénissieux le long de l’avenue Charles-de-Gaulle ; côté Bron au parc Alpestre. |

Le même document précise les restrictions propres aux chiens catégorisés. Consultez-le avec le [plan et les informations du parc](https://www.grandlyon.com/parc/parc-de-parilly), puis respectez la signalisation sur place. Un espace canin collectif n’est pas une sortie à imposer à tout chien : convenez du parcours et des interactions autorisées avec le propriétaire.

Préparez aussi un itinéraire quotidien compatible avec l’adresse, les horaires et les capacités de l’animal. Le gardien n’a pas à rejoindre Parilly à chaque sortie. Pour les règles et lieux à l’échelle lyonnaise, le [guide des parcs pour chiens](/actualites/parcs-chiens-lyon-guide-complet) complète ces repères.

## <a id="acces"></a>Clés, immeuble et retour : les informations souvent oubliées

Expliquez les portes, badges, interphone, ascenseur et espaces communs. Convenez de la remise et de la restitution des clés, y compris si les horaires de départ et d’arrivée ne coïncident pas. Identifiez une personne de relais qui a accepté d’aider si un accès ne fonctionne plus.

Ne publiez pas de code d’accès ou d’information sensible dans l’annonce publique. Transmettez les consignes utiles à la personne retenue. Pour une visite comme pour un séjour, il faut pouvoir accéder au logement aux moments réellement nécessaires aux animaux.

Décrivez aussi le stationnement et les déplacements vers les courses ou le vétérinaire. Ne supposez ni la disponibilité d’un véhicule ni la connaissance des cliniques du sud lyonnais. Prévoyez le moyen de transport de l’animal et les contacts avant le départ ; le [guide des urgences vétérinaires à Lyon](/actualites/veterinaire-urgence-lyon-guide) donne des coordonnées.

Pour un séjour hébergé, présentez la chambre, les pièces accessibles, la connexion, le confort et les tâches de maison. Le [guide de préparation du logement](/actualites/preparer-maison-avant-garde) aide à réunir ces informations sans les réduire à « quelqu’un passe s’occuper du chat ».

## <a id="confiance"></a>Quel budget et quels critères de confiance ?

Pour une prestation payante, demandez la durée des visites, les tâches incluses, les frais de déplacement, les suppléments et les modalités de remise des clés. Comparez des devis qui répondent aux mêmes besoins. La distance entre le prestataire et votre adresse compte davantage qu’un prix supposé uniforme dans tout le sud lyonnais.

Guardiens est **actuellement 100 % gratuit pour les propriétaires et les gardiens**. Dans le séjour présenté ici, le gardien est hébergé sans rémunération. Les dépenses convenues, le transport et les soins vétérinaires restent distincts. Une éventuelle contribution aux frais de la plateforme ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis. La priorité est de construire le réseau et d’améliorer le service grâce aux retours des membres ; consultez les [conditions actuelles](/tarifs).

Pour choisir une personne, discutez de son expérience, de ses disponibilités et de ses limites. Ni l’adresse dans le quartier ni l’écusson d’identité ne garantissent une compétence. Consultez les avis lorsqu’ils existent et utilisez les [questions du guide de sélection](/actualites/choisir-gardien-bons-criteres).

Une rencontre peut être proposée **si les deux personnes le souhaitent**. Après confirmation, un accord est proposé sur Guardiens ; sa signature est facultative. Vérifiez les assurances adaptées à votre situation et préparez un relais, les décisions et le paiement des dépenses. La [checklist de départ](/actualites/checklist-partir-vacances-animaux) complète l’organisation. Aucune disponibilité ni solution immédiate de remplacement n’est garantie.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on faire garder un chat ou un chien chez soi à Vénissieux ?
Oui, par des passages définis ou un séjour hébergé selon la formule retenue. Les soins, les sorties et les horaires doivent correspondre aux besoins réels de l’animal.

### Les chiens peuvent-ils être détachés dans tout le parc de Parilly ?
Non. La Métropole distingue les promenades en laisse, des espaces interdits et deux parcs canins dédiés. Vérifiez le document officiel et les panneaux pour le lieu choisi.

### Où sont les espaces canins de Parilly ?
Le document de la Métropole indique un espace côté Vénissieux le long de l’avenue Charles-de-Gaulle et un autre côté Bron au parc Alpestre. Consultez le plan et la signalisation avant la sortie.

### Que prévoir si le gardien ne peut pas récupérer les clés à votre départ ?
Convenez à l’avance d’une remise adaptée, avec une personne de relais qui a accepté son rôle si nécessaire. Vérifiez que l’accès fonctionne aux horaires utiles, sans publier les codes dans l’annonce.

### La gratuité de Guardiens vaut-elle pour les deux rôles ?
Oui, la plateforme est actuellement gratuite pour propriétaires et gardiens. Le gardien est hébergé sans rémunération ; les dépenses convenues et les soins vétérinaires sont distincts.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='36521fd1-ec0f-4cc9-802e-e599d625d4ae'::uuid AND slug='pet-sitting-venissieux';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-venissieux' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Pet-sitting à Vénissieux : préparer la garde et les accès au logement'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Clés, immeuble, sorties et soins : les points à préparer pour faire garder votre chien ou votre chat à Vénissieux, avec les règles utiles de Parilly.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Pet-sitting Vénissieux (69200) | Garde d’animaux Sud Lyon'
    AND before_row.meta_description IS NOT DISTINCT FROM 'À Vénissieux, préparez les soins, les clés, les trajets et les sorties à Parilly avant une garde. Visites ou séjour hébergé : les questions à poser.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne accroupie près d’un chien et d’un chat se trouve dans l’entrée d’un appartement.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide du pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"chien pendant les vacances","url":"/actualites/ou-faire-garder-chien-lyon-vacances"},{"text":"chat à domicile","url":"/actualites/garde-chat-domicile-lyon"},{"text":"guide des parcs pour chiens","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide des urgences vétérinaires à Lyon","url":"/actualites/veterinaire-urgence-lyon-guide"},{"text":"guide de préparation du logement","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"questions du guide de sélection","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:25:17.765522+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot13_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot13_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot13_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Pet-sitting à Vénissieux : préparer la garde et les accès au logement',
    excerpt='Clés, immeuble, sorties et soins : les points à préparer pour faire garder votre chien ou votre chat à Vénissieux, avec les règles utiles de Parilly.',
    meta_title='Pet-sitting Vénissieux (69200) | Garde d’animaux Sud Lyon',
    meta_description='À Vénissieux, préparez les soins, les clés, les trajets et les sorties à Parilly avant une garde. Visites ou séjour hébergé : les questions à poser.',
    hero_image_alt='Une personne accroupie près d’un chien et d’un chat se trouve dans l’entrée d’un appartement.',
    internal_links='[{"text":"guide du pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"chien pendant les vacances","url":"/actualites/ou-faire-garder-chien-lyon-vacances"},{"text":"chat à domicile","url":"/actualites/garde-chat-domicile-lyon"},{"text":"guide des parcs pour chiens","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide des urgences vétérinaires à Lyon","url":"/actualites/veterinaire-urgence-lyon-guide"},{"text":"guide de préparation du logement","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"questions du guide de sélection","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-venissieux' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
