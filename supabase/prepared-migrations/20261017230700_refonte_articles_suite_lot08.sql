-- Refonte des guides guide Lyon et Ouest lyonnais, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et couvertures sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot08_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot08_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot08_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot08_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('c5eb7f77-fe14-4b7c-8ad1-a1035bcb663f'::uuid,'11a43ec4-f19f-42c2-a280-23968fe37fad'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Pet-sitting à Lyon : choisir et organiser la garde de vos animaux

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

Ressources consultées le 17 octobre 2026 : [règlement TCL unifié](https://www.tcl.fr/a-propos/reglement-du-reseau-tcl-unifie), pour le transport, et [Service Public, assurance du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509), pour les garanties à vérifier auprès de l’assureur avant le séjour.$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='c5eb7f77-fe14-4b7c-8ad1-a1035bcb663f'::uuid AND slug='pet-sitting-lyon-guide-complet';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-lyon-guide-complet' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Pet-sitting à Lyon : choisir et organiser la garde de vos animaux'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Vous cherchez une garde d’animaux à Lyon ? Ce guide vous oriente entre visites, accueil et séjour à domicile, puis vers les conseils utiles à votre situation.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Pet sitting à Lyon : visites, accueil et garde à domicile'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Pet-sitting à Lyon : choisissez entre visites, accueil et gardien hébergé. Comparez les soins, le budget, les trajets et les questions avant de confirmer.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien brun est couché dans un salon, près d’une table basse.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page house-sitting à Lyon","url":"/house-sitting/lyon"},{"text":"guide chien à Lyon pendant les vacances","url":"/actualites/ou-faire-garder-chien-lyon-vacances"},{"text":"guide des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"guide chat à domicile à Lyon","url":"/actualites/garde-chat-domicile-lyon"},{"text":"guide des huit situations de garde","url":"/actualites/s-absenter-avec-animal-guide-solutions-2026"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"Croix-Rousse","url":"/actualites/garde-animaux-croix-rousse-lyon"},{"text":"Presqu’île","url":"/actualites/garde-chat-presquile-lyon"},{"text":"guide Ouest lyonnais","url":"/actualites/pet-sitting-lyon-ouest-lyonnais"},{"text":"guide des promenades à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide de choix du gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"checklist avant le départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"guide du profil gardien","url":"/actualites/creer-profil-gardien-attractif"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:10:15.481422+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot08_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot08_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot08_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Pet-sitting à Lyon : choisir et organiser la garde de vos animaux',
    excerpt='Vous cherchez une garde d’animaux à Lyon ? Ce guide vous oriente entre visites, accueil et séjour à domicile, puis vers les conseils utiles à votre situation.',
    meta_title='Pet sitting à Lyon : visites, accueil et garde à domicile',
    meta_description='Pet-sitting à Lyon : choisissez entre visites, accueil et gardien hébergé. Comparez les soins, le budget, les trajets et les questions avant de confirmer.',
    hero_image_alt='Un chien brun est couché dans un salon, près d’une table basse.',
    internal_links='[{"text":"page house-sitting à Lyon","url":"/house-sitting/lyon"},{"text":"guide chien à Lyon pendant les vacances","url":"/actualites/ou-faire-garder-chien-lyon-vacances"},{"text":"guide des alternatives à la pension","url":"/actualites/pension-chien-alternatives-guide"},{"text":"guide chat à domicile à Lyon","url":"/actualites/garde-chat-domicile-lyon"},{"text":"guide des huit situations de garde","url":"/actualites/s-absenter-avec-animal-guide-solutions-2026"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"Croix-Rousse","url":"/actualites/garde-animaux-croix-rousse-lyon"},{"text":"Presqu’île","url":"/actualites/garde-chat-presquile-lyon"},{"text":"guide Ouest lyonnais","url":"/actualites/pet-sitting-lyon-ouest-lyonnais"},{"text":"guide des promenades à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide de choix du gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"checklist avant le départ","url":"/actualites/checklist-partir-vacances-animaux"},{"text":"guide du profil gardien","url":"/actualites/creer-profil-gardien-attractif"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-lyon-guide-complet' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# House-sitting dans l’Ouest lyonnais : préparer la maison et les animaux

**Pour faire garder une maison dans l’Ouest lyonnais, décrivez les tâches à assurer, les accès et les besoins des animaux, puis vérifiez les disponibilités et les déplacements du gardien.** À Écully, Tassin-la-Demi-Lune, Francheville ou dans les Monts d’Or, l’organisation dépend de votre adresse et de vos équipements, pas d’un profil type de propriétaire ou de gardien.

Le house-sitting permet à une personne de séjourner chez vous et d’assurer les tâches convenues. Une présence dans la maison peut permettre de signaler une anomalie ; elle ne garantit pas l’absence de cambriolage ni une surveillance permanente. Le [guide pour confier sa maison](/actualites/confier-sa-maison-absence-risques) compare les solutions et les précautions générales.

**Dans ce guide**

- [Définir les tâches du séjour](#taches)
- [Organiser les accès et les déplacements](#acces)
- [Préparer les animaux et les sorties](#animaux)
- [Clarifier jardin, piscine et équipements](#equipements)
- [Choisir le gardien et convenir des dépenses](#accord)
- [Questions fréquentes](#faq)

## <a id="taches"></a>Que demandez-vous réellement au gardien ?

Commencez par une liste de tâches, avec leur fréquence et le temps nécessaire. « Veiller sur la maison » ne dit pas si vous attendez des soins aux animaux, quelques arrosages ou le suivi d’un équipement.

| Besoin | À décrire | À convenir avant confirmation |
| --- | --- | --- |
| Animaux | Sorties, alimentation, litières et soins prescrits. | Horaires, expérience utile et relais. |
| Plantes et jardin | Zones, quantités, fréquence et matériel. | Tâches acceptées et adaptation aux restrictions d’eau. |
| Maison | Courrier, accès, ventilation et équipements utiles. | Ce qui est attendu et les pièces disponibles. |
| Piscine ou installation technique | Fonctionnement et observations demandées, si concerné. | Limites des gestes acceptés et contact professionnel. |
| Imprévu | Contacts, accès de secours et dépenses possibles. | Qui décide, qui intervient et comment transmettre les faits. |

Distinguez les tâches nécessaires de celles qui peuvent attendre. Une présence dans le logement ne transforme pas la personne en jardinier, technicien de piscine ou agent de sécurité. Faites intervenir un professionnel pour ce qui demande une compétence que le gardien ne possède pas.

Une maison sans animaux peut aussi être confiée, à condition de décrire les besoins et les conditions du séjour.

## <a id="acces"></a>Comment organiser l’arrivée et les déplacements ?

### Rejoindre le logement

Indiquez les contraintes utiles : accès piéton, pente ou escaliers, possibilité de stationner, arrivée tardive et distance réelle jusqu’aux services dont la personne aura besoin. Pour les transports, vérifiez le trajet aux jours et horaires du séjour. Il serait trompeur de conclure que tout l’Ouest lyonnais exige une voiture ou qu’aucune desserte n’existe.

Si un véhicule est nécessaire pour une tâche ou le transport d’un animal, expliquez pourquoi et discutez des conditions. Ne supposez pas que la personne possède une voiture adaptée ou qu’elle utilisera automatiquement la vôtre.

### Entrer dans la maison

Faites tester les clés et le portail. Expliquez les accès nécessaires, la fermeture et la conduite à tenir si un équipement ne fonctionne pas. Organisez une solution de secours utilisable par une personne qui a accepté ce rôle.

Les codes, les clés et les informations de sécurité se transmettent en privé. Dans l’annonce publique, décrivez les contraintes qui permettent de décider sans dévoiler les moyens d’accès.

### Pouvoir vivre sur place

Présentez le couchage, les équipements, le chauffage, les espaces accessibles et la connexion si elle est nécessaire au séjour. Si vous proposez un cadre de télétravail, vérifiez ce qui est effectivement disponible plutôt que de déduire une connexion ou une couverture mobile de la commune.

Télétravailler ne signifie pas être disponible pour les animaux toute la journée. Les contraintes de présence doivent rester compatibles avec les engagements de la personne.

## <a id="animaux"></a>Préparer les animaux et les sorties dans votre secteur

Le besoin de votre chien ne se déduit ni de sa race ni du fait qu’il vive en maison. Décrivez les sorties, les périodes seul, les croisements difficiles et les consignes. Un jardin ne remplace pas automatiquement les sorties prévues.

Transmettez un parcours adapté depuis votre adresse et vérifiez les règles des lieux empruntés. Un chemin connu du propriétaire peut être moins simple pour une personne qui découvre le secteur. Prévoyez ce qu’il faut faire si le parcours habituel n’est pas praticable.

Pour un chat, expliquez repas, litières, cachettes, ouvertures et accès extérieurs autorisés. Pour plusieurs animaux, précisez les espaces et la cohabitation. Le [guide de pet-sitting à Lyon](/actualites/pet-sitting-lyon-guide-complet) oriente vers les conseils chien, chat et séjours particuliers.

Un traitement demande des consignes prescrites et une personne capable de réaliser les gestes nécessaires, avec l’avis du vétérinaire si besoin. Préparez aussi ses coordonnées, le transport et un contact de relais. Le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) aide à organiser cette continuité.

## <a id="equipements"></a>Jardin, piscine et équipements : où fixer les limites ?

### Arrosage et restrictions

Montrez les zones à arroser, le matériel et les quantités utiles. Écrivez un programme compréhensible, avec ce qui peut être adapté selon la météo et l’état des plantes. Le [guide d’entretien du jardin pendant une absence](/actualites/entretenir-jardin-pendant-absence) développe la préparation.

Avant et pendant le séjour, vérifiez sur [VigiEau](https://vigieau.gouv.fr/) les restrictions applicables à votre adresse et à votre usage de l’eau. Un programme d’arrosage automatique ne dispense pas de respecter les mesures en vigueur. Ne confiez pas au gardien une consigne incompatible avec les règles locales.

### Piscine et installations techniques

Si la maison comporte une piscine, distinguez observation, entretien prévu et intervention technique. Transmettez les instructions nécessaires et le contact du professionnel habituel. Le gardien doit savoir ce qu’il accepte et quand demander une intervention.

Pour un portail, une alarme ou une installation de chauffage, montrez les opérations utiles au séjour et les consignes du fabricant. Ne demandez pas une réparation ou une manipulation que la personne ne maîtrise pas. Précisez qui peut autoriser une dépense.

### Surveillance et vie privée

Convenez de ce qu’il faut signaler et de la façon de vous joindre. Les photos et les nouvelles se discutent ; elles ne constituent pas une surveillance permanente. Informez la personne des caméras et de leur fonctionnement, en respectant sa vie privée.

La [CNIL explique les précautions relatives aux caméras chez soi](https://www.cnil.fr/fr/la-videosurveillance-videoprotection-chez-soi). Le gardien doit aussi pouvoir habiter les lieux dans les conditions annoncées.

## <a id="accord"></a>Comment choisir le gardien et clarifier les dépenses ?

Comparez les disponibilités, l’expérience utile, les déplacements et les horaires. L’âge, l’activité professionnelle ou le lieu de résidence ne suffisent pas à établir la capacité d’une personne à assurer la garde. Consultez les avis lorsqu’il y en a ; l’écusson « Identité vérifiée » indique le contrôle d’une pièce, sans certifier la compétence ni la fiabilité.

Sur Guardiens, vous publiez les dates, le logement et les besoins, puis échangez avec les personnes intéressées par un séjour chez vous. Une rencontre est possible si les deux le souhaitent. Après confirmation, un accord de garde est proposé, avec signature facultative. Le [guide d’accueil](/actualites/accueillir-gardien-bonnes-pratiques) aide à transmettre les consignes.

Vérifiez les garanties du logement et les assurances utiles auprès de l’assureur ; [Service Public détaille les vérifications du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509). Convenez aussi des fournitures, des dépenses autorisées, des justificatifs et du remboursement.

**La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Le gardien est hébergé sans rémunération ; les dépenses de la maison et des animaux restent à organiser séparément. Une participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis. Consultez les [conditions actuelles](/tarifs).

Jérémie et Elisa ont créé Guardiens après cinq ans de house-sitting pour construire un réseau de confiance. Vos retours aident à améliorer le service. La disponibilité dépend des personnes et des dates : une annonce ne garantit ni candidature ni remplacement immédiat.

## <a id="faq"></a>Questions fréquentes sur le house-sitting dans l’Ouest lyonnais

:::faq
### Le gardien doit-il obligatoirement avoir une voiture ?
Cela dépend de l’adresse, des horaires, des déplacements et des besoins des animaux. Vérifiez les trajets réels et expliquez les contraintes avant de confirmer. La commune ne permet pas de conclure qu’un véhicule est toujours indispensable ou inutile.

### Peut-il s’occuper du jardin ou de la piscine ?
Uniquement pour les tâches qu’il comprend et accepte de réaliser. Décrivez la fréquence, le matériel, les consignes et les limites. Une réparation ou une opération technique peut demander un professionnel.

### Puis-je faire garder une maison sans animaux ?
Oui. Le séjour peut concerner la maison, les plantes et les tâches convenues. Décrivez les besoins et proposez des conditions d’accueil adaptées, sans transformer l’hébergement en travaux implicites.

### Le house-sitting protège-t-il contre les cambriolages ?
Une présence peut permettre de remarquer et signaler une anomalie. Elle ne garantit pas l’absence de cambriolage et ne remplace pas une prestation professionnelle de sécurité. Vérifiez les accès, l’assurance et les consignes de la maison.

### Que faire si les restrictions d’eau changent pendant le séjour ?
Vérifiez les mesures applicables sur VigiEau pour votre adresse et le type d’eau utilisé. Adaptez ensemble les consignes en respectant ces mesures. Le gardien doit savoir qui joindre pour clarifier l’organisation.

### Guardiens est-il gratuit dans l’Ouest lyonnais ?
La plateforme est actuellement 100 % gratuite pour les deux rôles, avec un gardien hébergé sans rémunération. Les dépenses restent à convenir. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis.
:::

## Sources pour préparer le séjour

Sources consultées le 17 octobre 2026 : [VigiEau](https://vigieau.gouv.fr/), pour les mesures à l’adresse et à l’usage concernés ; [CNIL](https://www.cnil.fr/fr/la-videosurveillance-videoprotection-chez-soi), pour la vie privée ; [Service Public](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509), pour l’assurance du home-sitting. Les règles applicables sont à vérifier pour vos dates et votre situation.$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='11a43ec4-f19f-42c2-a280-23968fe37fad'::uuid AND slug='pet-sitting-lyon-ouest-lyonnais';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-lyon-ouest-lyonnais' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting dans l’Ouest lyonnais : préparer la maison et les animaux'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Faire garder une maison dans l’Ouest lyonnais : définir les tâches, les déplacements et les conditions d’accueil pour un séjour compatible avec les besoins de chacun.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting Ouest Lyonnais : maison et animaux'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Écully, Tassin, Francheville ou Monts d’Or : préparez les accès, les animaux, le jardin et les équipements avant d’accueillir un gardien chez vous.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une maison en pierre est visible derrière un portail.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide pour confier sa maison","url":"/actualites/confier-sa-maison-absence-risques"},{"text":"guide de pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide d’entretien du jardin pendant une absence","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"guide d’accueil","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:25:17.852884+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot08_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot08_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot08_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting dans l’Ouest lyonnais : préparer la maison et les animaux',
    excerpt='Faire garder une maison dans l’Ouest lyonnais : définir les tâches, les déplacements et les conditions d’accueil pour un séjour compatible avec les besoins de chacun.',
    meta_title='House-sitting Ouest Lyonnais : maison et animaux',
    meta_description='Écully, Tassin, Francheville ou Monts d’Or : préparez les accès, les animaux, le jardin et les équipements avant d’accueillir un gardien chez vous.',
    hero_image_alt='Une maison en pierre est visible derrière un portail.',
    internal_links='[{"text":"guide pour confier sa maison","url":"/actualites/confier-sa-maison-absence-risques"},{"text":"guide de pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"guide d’entretien du jardin pendant une absence","url":"/actualites/entretenir-jardin-pendant-absence"},{"text":"guide d’accueil","url":"/actualites/accueillir-gardien-bonnes-pratiques"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-lyon-ouest-lyonnais' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
