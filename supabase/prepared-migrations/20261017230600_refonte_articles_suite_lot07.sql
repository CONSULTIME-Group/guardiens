-- Refonte des guides Croix-Rousse et Presqu’île, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot07_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot07_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot07_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot07_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('a9ee0ce2-154c-4a68-a9cb-0f0afa3512b2'::uuid,'d8cb308a-3e38-43d7-93bb-3cf01b403cc0'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Garde de chien et de chat à la Croix-Rousse : préparer le séjour

**Pour une garde à la Croix-Rousse, précisez les accès à votre logement, les sorties de votre chien ou les besoins de votre chat, puis vérifiez que le planning du gardien convient.** Sur les pentes comme sur le plateau, l’étage, les escaliers et le parcours quotidien comptent davantage qu’un profil simplement présenté comme « du quartier ».

Des visites, un accueil ailleurs ou le séjour d’une personne chez vous sont possibles selon l’organisation retenue. Ce guide se concentre sur la préparation locale d’une garde à domicile. Les comparatifs [chien à Lyon pendant les vacances](/actualites/ou-faire-garder-chien-lyon-vacances) et [chat à domicile à Lyon](/actualites/garde-chat-domicile-lyon) détaillent les formules et des exemples de tarifs.

**Dans ce guide**

- [Pentes ou plateau : décrire le logement](#logement)
- [Préparer les sorties du chien](#sorties)
- [Transmettre les besoins du chat](#chat)
- [Choisir et accueillir un gardien](#gardien)
- [Budget et contacts à préparer](#budget)
- [Questions fréquentes](#faq)

## <a id="logement"></a>Pentes ou plateau : que faut-il décrire dans l’annonce ?

Les pentes de la Croix-Rousse concernent le 1er arrondissement et le plateau le 4e. Cette distinction situe le séjour ; elle ne permet pas de déduire la taille de l’appartement, la présence d’un ascenseur ou le caractère de l’animal.

| Point à décrire | Question utile | Conséquence pour la garde |
| --- | --- | --- |
| Accès à l’immeuble | Combien de portes et d’étages, avec ou sans ascenseur ? | Vérifier les possibilités du gardien et les déplacements de l’animal. |
| Parcours quotidien | Faut-il emprunter une montée ou des escaliers ? | Préparer un itinéraire compatible avec le chien et la personne. |
| Organisation du logement | Mezzanine, pièces accessibles, fenêtres, cour ou balcon ? | Expliquer les accès autorisés et les limites. |
| Accueil du gardien | Quel couchage et quels équipements sont disponibles ? | Permettre à la personne de séjourner dans les conditions annoncées. |
| Arrivée et départ | Où et quand seront remises les clés ? | Éviter un intervalle sans prise en charge. |

Pour un chien ayant une difficulté de mobilité, ne supposez pas que le gardien pourra le porter. Discutez des contraintes avant de confirmer et demandez conseil au vétérinaire si l’organisation nécessite des gestes particuliers.

Donnez dans l’annonce les informations qui permettent de décider. Les codes d’entrée, l’emplacement des clés et les données personnelles se transmettent en privé.

## <a id="sorties"></a>Comment préparer les promenades à la Croix-Rousse ?

### Un parcours depuis votre adresse

Indiquez les sorties habituelles, leur rôle et les endroits où votre chien est à l’aise. Une boucle qui emprunte la montée Saint-Sébastien ou les escaliers des pentes n’impose pas les mêmes déplacements qu’un trajet depuis le plateau. Préparez une alternative si elle est nécessaire pour l’animal ou le gardien.

Signalez les passages étroits et les situations difficiles que vous connaissez : croisements de chiens, vélos, sorties d’immeuble ou rues très fréquentées. Le gardien doit pouvoir organiser les sorties sans devoir improviser une prise en charge qu’il ne maîtrise pas.

### Des espaces réellement autorisés

Une place ou un jardin ne devient pas un espace de liberté canine parce qu’il est proche. Vérifiez les règles affichées et transmettez un itinéraire autorisé. Ne donnez pas une consigne de lâcher le chien à une heure supposée permise sans avoir vérifié la réglementation du lieu.

Pour situer les espaces correctement, la [fiche municipale du jardin des Chartreux](https://www.lyon.fr/lieu/lieux-danimation/jardin-des-chartreux) le situe au 36 cours Général Giraud, dans le 1er arrondissement. Cette fiche ne suffit pas à établir les conditions d’accès d’un chien. Le [guide des promenades à Lyon](/actualites/parcs-chiens-lyon-guide-complet) complète la préparation, avec vérification sur place des règles en vigueur.

### Des horaires selon votre chien

Précisez quand les sorties et les soins doivent être assurés, puis comparez avec les disponibilités de la personne. Le séjour d’un gardien dans l’appartement ne signifie pas qu’il reste constamment sur place. Il n’existe pas un rythme de promenade propre à tous les chiens de la Croix-Rousse.

## <a id="chat"></a>Que transmettre pour une garde de chat ?

Décrivez les repas, les litières, les interactions acceptées et les cachettes habituelles. Une mezzanine, une cour ou un balcon appellent des consignes précises sur les ouvertures et l’accès. Le gardien ne doit pas décider seul de laisser sortir le chat ou d’ouvrir une fenêtre.

Pour des visites, vérifiez leur fréquence, leur durée et la prise en charge des soins entre les passages. Pour une personne hébergée, discutez de son planning. Le [guide de garde de chat à domicile](/actualites/garde-chat-domicile-house-sitting) aide à préciser les besoins ; le quartier ne permet pas de conclure qu’un chat est sociable, territorial ou habitué à rester seul.

Si vous habitez au bas des pentes ou préparez une garde dans le centre, le [guide de la Presqu’île](/actualites/garde-chat-presquile-lyon) aborde aussi l’arrivée, les accès en voiture et le transport éventuel du chat.

## <a id="gardien"></a>Comment choisir et accueillir la personne ?

Sur Guardiens, vous proposez un logement pendant votre absence, avec les tâches convenues auprès des animaux ou de la maison. Le gardien est hébergé sans rémunération. Il peut venir du quartier ou d’ailleurs ; aucune disponibilité n’est garantie dans un secteur précis.

Échangez sur les dates, les horaires, l’expérience nécessaire et les conditions d’accueil. Consultez les avis lorsqu’il y en a. L’écusson « Identité vérifiée » indique le contrôle d’une pièce d’identité ; il ne certifie pas la compétence ni la fiabilité. Une rencontre peut avoir lieu si les deux le souhaitent, sans durée imposée.

Après confirmation, un accord de garde est proposé, avec signature facultative. Reprenez les consignes dans le guide de la maison et organisez les clés, les contacts et le retour. Le [guide d’accueil du gardien](/actualites/accueillir-gardien-bonnes-pratiques) détaille ce passage de relais.

Vous pouvez commencer votre recherche dès que les dates sont connues. Gardez une autre solution tant que la garde n’est pas confirmée, sans considérer une candidature comme un engagement acquis.

## <a id="budget"></a>Quel budget et quels contacts préparer ?

Pour une prestation payante, demandez un devis à votre adresse et pour vos dates : visites, déplacements, soins et suppléments éventuels. Les tarifs du [guide chat Lyon](/actualites/garde-chat-domicile-lyon) et du [guide chien Lyon](/actualites/ou-faire-garder-chien-lyon-vacances) sont des exemples identifiés, pas des prix spécifiques à la Croix-Rousse.

**Guardiens est actuellement 100 % gratuit pour les propriétaires et les gardiens.** Nourriture, litière, consommables et dépenses convenues restent à organiser séparément du séjour sans rémunération. Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis ; les [conditions actuelles](/tarifs) précisent le modèle.

Préparez le contact du vétérinaire habituel, la possibilité de transport et un relais local qui a accepté ce rôle et peut accéder au logement. Une personne inscrite près de chez vous n’est pas automatiquement un contact de secours. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) aide à prévoir ces situations.

Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting pour développer un réseau de confiance. Vos retours nous aident à améliorer le service.

## <a id="faq"></a>Questions fréquentes sur la garde à la Croix-Rousse

:::faq
### Faut-il un gardien qui habite déjà à la Croix-Rousse ?
Non. Une personne peut venir d’ailleurs pour séjourner chez vous. Vérifiez sa disponibilité, les accès, les horaires et l’expérience utile. Connaître le quartier ne remplace pas ces échanges.

### Que préciser si mon immeuble n’a pas d’ascenseur ?
Indiquez l’étage, les escaliers et les contraintes de déplacement de l’animal. Ne supposez pas que le gardien pourra porter un chien. Vérifiez que les accès conviennent avant de confirmer.

### Le chien peut-il être détaché au jardin des Chartreux ?
Ne le prévoyez pas sans vérifier les règles officielles du lieu et la signalétique. La fiche municipale situe le jardin dans le 1er arrondissement, mais ne donne pas à elle seule une autorisation de liberté canine.

### Puis-je proposer une garde pour un seul chat ?
Oui. Décrivez ses besoins et le logement proposé. Le nombre d’animaux ne suffit pas à déterminer le planning : repas, litière, soins et présence sont à convenir selon votre chat.

### Comment prévoir un relais si le gardien est empêché ?
Identifiez une personne qui accepte de prendre le relais, vérifiez ses disponibilités et organisez son accès au logement. Un remplacement par la plateforme ou un voisin inscrit ne doit pas être supposé immédiat.

### La garde sur Guardiens est-elle gratuite à la Croix-Rousse ?
La plateforme est actuellement 100 % gratuite pour les deux rôles, avec un gardien hébergé sans rémunération. Les dépenses sont à convenir séparément. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::

## Sources et préparation

Informations locales consultées le 17 octobre 2026 : [Ville de Lyon, jardin des Chartreux](https://www.lyon.fr/lieu/lieux-danimation/jardin-des-chartreux). Pour les besoins et les consignes de garde : [RSPCA, organiser la garde pendant les vacances](https://www.rspca.org.uk/adviceandwelfare/pets/general/holiday/leavingyourpet), sans transposer les obligations britanniques au droit français.$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='a9ee0ce2-154c-4a68-a9cb-0f0afa3512b2'::uuid AND slug='garde-animaux-croix-rousse-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/garde-animaux-croix-rousse-lyon' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde de chien et de chat à la Croix-Rousse : préparer le séjour'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Pentes ou plateau : les accès au logement et les parcours de sortie comptent pour la garde. Les points à transmettre avant d’accueillir un gardien à la Croix-Rousse.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de chien et de chat à la Croix-Rousse (Lyon 1er et 4e)'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Faire garder un chien ou un chat à la Croix-Rousse : escaliers, sorties, accès et logement. Préparez une garde adaptée aux pentes ou au plateau.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne promène un chien roux en laisse dans une rue.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"chien à Lyon pendant les vacances","url":"/actualites/ou-faire-garder-chien-lyon-vacances"},{"text":"chat à domicile à Lyon","url":"/actualites/garde-chat-domicile-lyon"},{"text":"guide des promenades à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide de garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide de la Presqu’île","url":"/actualites/garde-chat-presquile-lyon"},{"text":"guide d’accueil du gardien","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 16:10:12.529733+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot07_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot07_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot07_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde de chien et de chat à la Croix-Rousse : préparer le séjour',
    excerpt='Pentes ou plateau : les accès au logement et les parcours de sortie comptent pour la garde. Les points à transmettre avant d’accueillir un gardien à la Croix-Rousse.',
    meta_title='Garde de chien et de chat à la Croix-Rousse (Lyon 1er et 4e)',
    meta_description='Faire garder un chien ou un chat à la Croix-Rousse : escaliers, sorties, accès et logement. Préparez une garde adaptée aux pentes ou au plateau.',
    hero_image_alt='Une personne promène un chien roux en laisse dans une rue.',
    internal_links='[{"text":"chien à Lyon pendant les vacances","url":"/actualites/ou-faire-garder-chien-lyon-vacances"},{"text":"chat à domicile à Lyon","url":"/actualites/garde-chat-domicile-lyon"},{"text":"guide des promenades à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide de garde de chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide de la Presqu’île","url":"/actualites/garde-chat-presquile-lyon"},{"text":"guide d’accueil du gardien","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garde-animaux-croix-rousse-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Garde de chat sur la Presqu’île de Lyon : préparer le séjour

**Pour faire garder votre chat sur la Presqu’île, choisissez une organisation adaptée à ses soins et préparez l’accès au logement.** Visites ou séjour d’un gardien chez vous : précisez les horaires, les clés, les fenêtres autorisées et la solution si la personne ne peut pas intervenir. Son adresse seule ne garantit pas sa disponibilité.

Des Terreaux à Confluence, les logements et les animaux diffèrent. Ce guide traite la préparation du séjour et des accès dans le centre de Lyon. Pour les tarifs et le choix entre visites et personne hébergée, consultez le [guide de garde de chat à domicile à Lyon](/actualites/garde-chat-domicile-lyon).

**Dans ce guide**

- [Choisir selon votre chat et votre logement](#organisation)
- [Préparer l’arrivée et les clés](#acces)
- [Vérifier les accès en voiture](#trajets)
- [Transmettre les soins et les ouvertures autorisées](#consignes)
- [Prévoir le budget et le relais](#budget)
- [Organiser un séjour sur Guardiens](#guardiens)
- [Questions fréquentes](#faq)

## <a id="organisation"></a>Quelle organisation pour votre chat sur la Presqu’île ?

Un chat d’Ainay n’a pas nécessairement les mêmes besoins qu’un autre chat du même immeuble. L’âge, la santé, les habitudes et la façon dont il accepte les interactions doivent guider le choix. Le quartier ne permet pas de conclure qu’il vit sans extérieur ou qu’il tolère mieux une formule de garde.

| Organisation | Ce qu’elle prévoit | Question à poser |
| --- | --- | --- |
| Visites par un proche ou un professionnel | Soins et présence pendant les passages convenus. | Les horaires, la durée et les tâches couvrent-ils les besoins du chat ? |
| Gardien hébergé dans l’appartement | Une personne séjourne chez vous et assure les tâches acceptées. | Quand sera-t-elle présente et quelles sont ses possibilités de soins ? |
| Pension ou accueil extérieur | Le chat séjourne dans un autre lieu. | Les conditions d’accueil et les soins conviennent-ils à votre animal ? |

La [Cats Protection donne des repères pour organiser les vacances](https://www.cats.org.uk/help-and-advice/caring-for-your-cat/home-and-environment/going-on-holiday), dont au moins deux visites quotidiennes pour un chat pris en charge à domicile. Adaptez l’organisation aux besoins individuels ; un traitement ou une situation de santé peuvent demander un avis vétérinaire et une prise en charge différente.

Le séjour à domicile permet au chat de rester dans son environnement. Il ne garantit ni absence de stress ni présence permanente. Demandez comment se déroulera réellement une journée.

## <a id="acces"></a>Comment préparer l’arrivée et les clés ?

### Vérifier toutes les portes

Une clé d’appartement ne suffit pas toujours pour entrer dans l’immeuble. Identifiez les accès nécessaires, l’interphone, l’étage et le fonctionnement de l’ascenseur s’il y en a un. Faites tester les clés ou prévoyez une transmission qui permet d’en vérifier l’usage avant votre départ.

Convenez du moment où commence la prise en charge. Si le gardien arrive après vous, qui s’occupe du chat dans l’intervalle ? Si son train est retardé ou si une porte reste bloquée, qui peut intervenir ? Le contact de relais doit avoir accepté ce rôle et disposer d’un moyen d’accès.

### Organiser une arrivée réaliste

Précisez le quartier et les contraintes utiles dans l’annonce. Après confirmation, transmettez en privé les informations nécessaires pour rejoindre l’appartement. Ne publiez pas de code ni l’emplacement des clés sur la page de l’annonce.

L’arrivée peut s’organiser en personne ou à distance, selon ce que vous convenez. Une rencontre est possible si les deux le souhaitent. Le [guide d’accueil du gardien](/actualites/accueillir-gardien-bonnes-pratiques) explique les points du passage de relais.

## <a id="trajets"></a>Sur la Presqu’île, vérifier aussi les accès en voiture

Si le gardien vient en voiture ou si vous prévoyez un transport du chat, vérifiez l’accès à votre adresse. Une zone à trafic limité concerne une partie du centre de la Presqu’île ; les règles d’une rue piétonne peuvent aussi s’appliquer.

La [page officielle des accès à la Presqu’île](https://mobilites.grandlyon.com/presquile-les-acces) présente le périmètre et les modalités. Consultez-la pour la date du séjour et vérifiez les démarches qui correspondent à la situation du conducteur. Le fait de garder un animal ne doit pas être considéré comme une autorisation automatique d’accès.

Préparez la remise des bagages et des clés sans supposer qu’un véhicule pourra stationner devant la porte. Pour un rendez-vous vétérinaire, identifiez à l’avance la possibilité de transport et le point de prise en charge. Les modalités peuvent évoluer : gardez le lien officiel dans vos informations pratiques plutôt qu’un horaire recopié sans vérification.

## <a id="consignes"></a>Quelles consignes pour le chat et l’appartement ?

### Soins et observations

Laissez les quantités de nourriture, les horaires, la gestion des litières, les cachettes et les interactions acceptées. Le gardien doit savoir comment vérifier que le chat est présent et comment vous transmettre des observations factuelles.

Pour un traitement prescrit, vérifiez les conditions nécessaires et la capacité de la personne à réaliser les gestes, avec le vétérinaire si besoin. Si un changement de santé ou de comportement paraît préoccupant, demandez un avis vétérinaire ; le quartier ou le changement de personne n’en explique pas automatiquement la cause.

### Fenêtres, balcon et cour

Montrez les protections et les ouvertures autorisées. Le fait qu’une fenêtre soit haute ou donne sur une cour ne permet pas d’en déduire qu’elle peut rester ouverte. Expliquez aussi les consignes de fermeture lors des arrivées et départs.

Le gardien doit connaître les règles si le chat a accès à un extérieur. Ne changez pas cette organisation sans en discuter et sans tenir compte des besoins et des conditions de sécurité de l’animal. Le [guide chat à domicile](/actualites/garde-chat-domicile-house-sitting) détaille la préparation générale.

### Conditions d’accueil de la personne

Présentez le couchage, les équipements, les pièces accessibles et les éventuelles contraintes de l’immeuble. Signalez les caméras et leur fonctionnement en respectant sa vie privée. Une personne qui loge chez vous a besoin de conditions de séjour conformes à ce qui a été annoncé.

Pour une garde au nord du centre ou dans les pentes, le [guide de la Croix-Rousse](/actualites/garde-animaux-croix-rousse-lyon) complète les questions d’escaliers et de déplacements.

## <a id="budget"></a>Quel budget et quel relais prévoir ?

Pour des visites, demandez un devis pour votre adresse, vos dates et les soins prévus. Vérifiez les frais de déplacement, les week-ends, le nombre de passages et la durée. Les exemples du [guide chat Lyon](/actualites/garde-chat-domicile-lyon) ne constituent pas un tarif propre à la Presqu’île.

**Guardiens est actuellement 100 % gratuit pour les propriétaires et les gardiens.** Le gardien est hébergé sans rémunération. Nourriture, litière, soins et autres dépenses restent à convenir séparément. Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis ; voir les [conditions actuelles](/tarifs).

Préparez les coordonnées du vétérinaire, la caisse de transport, la personne de relais et les règles de dépenses. Si votre retour est décalé, une prolongation demande l’accord du gardien ; organisez une autre prise en charge s’il ne peut pas rester. Le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) développe ces situations.

## <a id="guardiens"></a>Comment organiser un séjour sur Guardiens ?

Publiez les dates, le logement proposé et les besoins de votre chat. Échangez avec les personnes intéressées sur les horaires, l’expérience utile et les conditions d’accueil. Consultez les avis lorsqu’il y en a. L’écusson « Identité vérifiée » indique le contrôle d’une pièce d’identité, sans certifier les compétences ni la fiabilité.

Après confirmation, un accord de garde est proposé, avec signature facultative. Préparez les consignes et reprenez la [checklist avant le départ](/actualites/checklist-partir-vacances-animaux). La [page house-sitting Lyon](/house-sitting/lyon) présente le séjour à domicile.

Le gardien peut venir d’un autre secteur. Aucune candidature ni réponse dans un délai donné n’est garantie ; commencez dès que vos dates sont connues et prévoyez une autre solution tant que la garde n’est pas confirmée.

Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting pour construire un réseau de confiance. Vos retours nous aident à améliorer le service.

## <a id="faq"></a>Questions fréquentes sur la garde de chat sur la Presqu’île

:::faq
### Un gardien peut-il venir pour un seul chat ?
Oui. Décrivez les besoins du chat, les dates et le logement proposé. Le nombre d’animaux ne détermine pas à lui seul la présence ou les soins nécessaires.

### Le gardien doit-il déjà habiter sur la Presqu’île ?
Non. Il peut venir d’ailleurs pour séjourner chez vous. Vérifiez ses disponibilités, son arrivée et les contraintes du logement. Aucun volume de candidats locaux n’est garanti.

### Peut-il venir en voiture jusqu’à mon appartement ?
Vérifiez l’adresse, le périmètre de la zone à trafic limité, les rues piétonnes et les modalités officielles pour la date du séjour. La garde d’un chat ne vaut pas autorisation automatique d’accès. Préparez une arrivée compatible avec les règles en vigueur.

### Comment remettre les clés si je suis déjà parti ?
Convenez d’un moyen de transmission et d’un accès de secours avec une personne qui a accepté ce rôle. Vérifiez toutes les portes nécessaires et la prise en charge du chat avant l’arrivée. Gardez codes et emplacement des clés hors de l’annonce publique.

### Mon chat timide s’habituera-t-il en quelques jours ?
Aucun délai d’adaptation n’est garanti. Transmettez ses habitudes et les interactions qu’il accepte, sans forcer le contact. Un changement préoccupant de santé ou de comportement demande un avis vétérinaire adapté.

### Le séjour sur Guardiens est-il gratuit ?
La plateforme est actuellement 100 % gratuite pour les deux rôles, avec un gardien hébergé sans rémunération. Les dépenses de l’animal et du séjour restent à convenir. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::

## Sources et vérifications locales

Sources consultées le 17 octobre 2026 : [Métropole de Lyon, accès à la Presqu’île](https://mobilites.grandlyon.com/presquile-les-acces) et [Cats Protection, départ en vacances](https://www.cats.org.uk/help-and-advice/caring-for-your-cat/home-and-environment/going-on-holiday). Les modalités de circulation sont à revérifier pour les dates du séjour ; les recommandations de garde restent à adapter à votre chat.$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='d8cb308a-3e38-43d7-93bb-3cf01b403cc0'::uuid AND slug='garde-chat-presquile-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/garde-chat-presquile-lyon' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde de chat sur la Presqu’île de Lyon : préparer le séjour'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Des Terreaux à Confluence, organisez la garde selon votre chat et votre logement : accès, soins, arrivée, transport et relais pendant votre absence.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de chat Presqu’île (Lyon 1er et 2e) : chez vous'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Garde de chat sur la Presqu’île de Lyon : visites ou séjour, clés, fenêtres et arrivée du gardien. Préparez les soins et les accès avant de partir.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne joue avec un chat sur un fauteuil, près d’une grande fenêtre.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de garde de chat à domicile à Lyon","url":"/actualites/garde-chat-domicile-lyon"},{"text":"guide d’accueil du gardien","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"guide chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide de la Croix-Rousse","url":"/actualites/garde-animaux-croix-rousse-lyon"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"checklist avant le départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"page house-sitting Lyon","url":"/house-sitting/lyon"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:40:12.307489+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot07_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot07_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot07_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde de chat sur la Presqu’île de Lyon : préparer le séjour',
    excerpt='Des Terreaux à Confluence, organisez la garde selon votre chat et votre logement : accès, soins, arrivée, transport et relais pendant votre absence.',
    meta_title='Garde de chat Presqu’île (Lyon 1er et 2e) : chez vous',
    meta_description='Garde de chat sur la Presqu’île de Lyon : visites ou séjour, clés, fenêtres et arrivée du gardien. Préparez les soins et les accès avant de partir.',
    hero_image_alt='Une personne joue avec un chat sur un fauteuil, près d’une grande fenêtre.',
    internal_links='[{"text":"guide de garde de chat à domicile à Lyon","url":"/actualites/garde-chat-domicile-lyon"},{"text":"guide d’accueil du gardien","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"guide chat à domicile","url":"/actualites/garde-chat-domicile-house-sitting"},{"text":"guide de la Croix-Rousse","url":"/actualites/garde-animaux-croix-rousse-lyon"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"checklist avant le départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"page house-sitting Lyon","url":"/house-sitting/lyon"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garde-chat-presquile-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
