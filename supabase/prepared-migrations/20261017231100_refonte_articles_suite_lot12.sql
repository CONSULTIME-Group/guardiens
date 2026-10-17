-- Refonte des guides Grenoble-Chartreuse et Saint-Étienne-Loire, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot12_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot12_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot12_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot12_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('7f939b51-cfbb-4496-a318-cd1bfffda2db'::uuid,'323a53b1-e156-4326-a8d8-4bb8bbbb29f6'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Pet-sitting à Grenoble et en Chartreuse : choisir une garde adaptée

**À Grenoble comme en Chartreuse, la bonne formule dépend des soins, des horaires et des déplacements nécessaires.** Des visites, un accueil chez un professionnel ou un gardien hébergé chez vous ne prévoient pas la même organisation. Commencez par ces besoins plutôt que par la promesse de grandes randonnées pour votre chien.

Sur Guardiens, le house-sitting consiste à accueillir une personne dans votre logement pour veiller sur la maison et, s’il y en a, les animaux. Il peut convenir si les conditions du séjour et les tâches correspondent aux possibilités réelles du gardien. Il ne garantit pas une présence continue ni une personne disponible aux dates souhaitées.

**Sommaire :** [comparer les formules](#formules), [prix et conditions](#budget), [sorties en Chartreuse](#sorties), [accès et maison](#logement), [choisir et préparer](#preparer), [questions fréquentes](#faq).

## <a id="formules"></a>Visites, pension ou séjour chez vous ?

Écrivez d’abord les repas, sorties, traitements prescrits et moments où l’animal a besoin de quelqu’un. Puis comparez les possibilités de garde. Un passage ne vaut pas une journée de présence ; une pension ne couvre pas l’entretien de la maison.

| Formule | Organisation à prévoir | Question à poser |
| --- | --- | --- |
| Visites à domicile | Passages, soins et sorties définis à l’avance. | Leur fréquence et leur durée suffisent-elles à cet animal ? |
| Accueil chez un proche ou un professionnel | Déplacement et adaptation dans un autre lieu. | Le logement, les autres animaux et les conditions d’accueil conviennent-ils ? |
| Gardien hébergé chez vous | Séjour dans votre logement avec tâches et horaires convenus. | La personne peut-elle assurer les soins et vivre sur place dans ces conditions ? |

Le [guide de garde à domicile chien et chat](/actualites/garde-animaux-domicile-chien-chat) détaille ces différences. Pour un animal qui supporte mal les absences ou dont le comportement change, demandez un avis adapté plutôt que de supposer qu’une formule résoudra la difficulté.

## <a id="budget"></a>Quel budget prévoir à Grenoble ?

Demandez un devis selon les dates, le nombre d’animaux, les passages et les déplacements. Vérifiez les suppléments et les conditions d’admission avant de multiplier un prix journalier par la durée du séjour.

Un exemple montre pourquoi ces conditions comptent : [Sam’Balade, à Grenoble et La Tronche](https://www.sambalade.com/), affiche **30 € pour 24 heures de pension**, mais précise que cette pension est **réservée aux chiens participant déjà aux balades**. Tarif consulté le **17 octobre 2026**. Ce montant n’est donc pas une offre ponctuelle ouverte à tout chien, ni une moyenne du marché. Il sert ici de repère publié ; les conditions et disponibilités doivent être confirmées directement.

Guardiens est **actuellement 100 % gratuit pour les propriétaires et les gardiens**. Le gardien est hébergé sans rémunération. Transport, alimentation des animaux, consommables et soins vétérinaires restent des dépenses distinctes à convenir.

La priorité est de développer le réseau et d’améliorer le service avec les retours des membres. Une éventuelle contribution aux frais de la plateforme ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis. Consultez les [conditions actuelles](/tarifs).

## <a id="sorties"></a>Les sorties ne sont pas toutes accessibles aux chiens

Transmettez les parcours habituels de votre animal, son endurance, ses réactions et les équipements utilisés. Le gardien doit savoir ce qui est nécessaire au quotidien ; une randonnée en montagne n’est pas une obligation du séjour.

**La réserve naturelle des Hauts de Chartreuse interdit les chiens de compagnie, même tenus en laisse.** Le [Parc de Chartreuse présente la règle de la réserve](https://www.parc-chartreuse.net/reserve-naturelle-des-hauts-de-chartreuse/reglementation-mode-demploi/) et précise les [autres secteurs et périodes réglementés pour les chiens](https://www.parc-chartreuse.net/decouvrir-la-chartreuse/la-chartreuse-en-partage/les-chiens/). Ne généralisez ni cette interdiction à tout le massif, ni l’autorisation d’un chemin à tous les itinéraires.

En ville, proposez un parcours connu et adapté aux réactions de l’animal, à la circulation et aux autres usagers. Pour une sortie nouvelle, vérifiez les accès et la signalisation du site. Le [guide des parcs et balades à Grenoble](/actualites/parcs-balades-chiens-grenoble-guide) complète la préparation d’un itinéraire.

Par forte chaleur, mauvais temps ou difficulté de déplacement, revoyez le programme avec le propriétaire. La présence d’un lac ou d’un sentier ombragé ne suffit pas à garantir une sortie adaptée. Le [guide des gardes d’été](/actualites/house-sitting-ete-aura-guide) aide à anticiper ces changements.

## <a id="logement"></a>Grenoble, vallée ou logement en montagne : préciser les accès

Décrivez l’adresse et les contraintes de trajet : escaliers, ascenseur, stationnement, route privée ou accès au logement. Ne déduisez pas de la proximité d’un massif qu’il est accessible en vingt minutes, en toute saison ou sans voiture.

Indiquez les déplacements utiles pour les courses, les sorties et le vétérinaire. Si un véhicule est nécessaire, convenez aussi de son usage et des possibilités de transport d’un animal. Un profil local ne garantit pas que la personne connaît ces trajets.

Pour la maison, détaillez les pièces accessibles, le couchage, la connexion, le chauffage et les tâches simples attendues. L’[arrosage pendant les vacances à Grenoble](/actualites/arroser-plantes-vacances-grenoble) doit être préparé selon les plantes et les conditions du moment ; une panne ou une opération technique demande un relais identifié.

## <a id="preparer"></a>Comment choisir et préparer le séjour ?

Discutez d’expérience avec vos animaux, de disponibilité et de limites. Consultez les avis lorsqu’ils existent, sans transformer une identité contrôlée en garantie de compétence. Ni une profession ni le goût pour la montagne ne prouvent la capacité à assurer les soins.

Une rencontre peut être proposée **si les deux personnes le souhaitent**. Confirmez après avoir échangé sur le logement, les horaires et les tâches. Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à préparer ces questions.

Avant le départ, réunissez les prescriptions, le vétérinaire habituel, un service de garde et un relais qui a accepté d’intervenir. Le [guide des urgences vétérinaires à Grenoble](/actualites/veterinaire-urgence-grenoble-isere) fournit des contacts ; il ne remplace pas l’évaluation du professionnel. Vérifiez aussi les garanties d’assurance applicables à votre situation et les modalités de dépenses.

Après confirmation sur Guardiens, un accord est proposé ; sa signature est facultative. Utilisez la [checklist de départ](/actualites/checklist-partir-vacances-animaux) pour les consignes, le retour et les solutions en cas d’imprévu. Gardez une autre possibilité de garde si personne ne peut répondre à vos dates.

## <a id="faq"></a>Questions fréquentes

:::faq
### Quelle différence entre pet-sitting et house-sitting à Grenoble ?
Le pet-sitting désigne différentes formes de garde d’animaux. Le house-sitting présenté sur Guardiens est un séjour chez le propriétaire pour veiller sur le logement et, s’il y en a, les animaux, selon les conditions convenues.

### Combien coûte une garde d’animaux à Grenoble ?
Le montant dépend de la formule et des besoins. Demandez les prestations incluses et les conditions d’admission. Le prix publié d’un établissement ne constitue pas une moyenne du marché. Guardiens est actuellement gratuit, avec hébergement du gardien sans rémunération et dépenses distinctes.

### Peut-on emmener un chien dans toute la Chartreuse ?
Non. Les chiens de compagnie sont interdits dans la réserve des Hauts de Chartreuse, même en laisse, et d’autres secteurs ou périodes ont leurs règles. Vérifiez l’itinéraire précis avant de partir.

### Le gardien doit-il emmener le chien en randonnée ?
Non. Convenez des sorties nécessaires selon les habitudes de l’animal et les possibilités du gardien. Le logement près de la montagne ne crée pas une obligation de randonnée.

### Un logement sans animaux peut-il être confié à un gardien ?
Oui. Décrivez les tâches pour la maison et les plantes ainsi que les horaires attendus. Vérifiez que le séjour convient aux deux personnes, sans promettre une présence permanente.

### Qui appeler si l’animal semble malade pendant la garde ?
Contactez le vétérinaire habituel ou le service de garde du secteur et prévenez le propriétaire. Ne retardez pas la demande d’avis médical parce que le propriétaire ne répond pas.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='7f939b51-cfbb-4496-a318-cd1bfffda2db'::uuid AND slug='pet-sitting-grenoble-chartreuse';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-grenoble-chartreuse' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Pet-sitting à Grenoble et en Chartreuse : choisir une garde adaptée'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Garde en ville ou séjour en Chartreuse : comparez les formules, les horaires et les trajets à partir des besoins de vos animaux et de votre logement.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Pet-sitting Grenoble & Chartreuse : guide local'
    AND before_row.meta_description IS NOT DISTINCT FROM 'À Grenoble et en Chartreuse, comparez visites, pension et gardien hébergé. Prix daté, accès, soins et sorties à préparer avant votre absence.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne tient un chien en laisse et un sac de transport contenant un chat, à l’extérieur.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de garde à domicile chien et chat","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide des parcs et balades à Grenoble","url":"/actualites/parcs-balades-chiens-grenoble-guide"},{"text":"guide des gardes d’été","url":"/actualites/house-sitting-ete-aura-guide"},{"text":"arrosage pendant les vacances à Grenoble","url":"/actualites/arroser-plantes-vacances-grenoble"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide des urgences vétérinaires à Grenoble","url":"/actualites/veterinaire-urgence-grenoble-isere"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:55:16.674511+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot12_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot12_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot12_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Pet-sitting à Grenoble et en Chartreuse : choisir une garde adaptée',
    excerpt='Garde en ville ou séjour en Chartreuse : comparez les formules, les horaires et les trajets à partir des besoins de vos animaux et de votre logement.',
    meta_title='Pet-sitting Grenoble & Chartreuse : guide local',
    meta_description='À Grenoble et en Chartreuse, comparez visites, pension et gardien hébergé. Prix daté, accès, soins et sorties à préparer avant votre absence.',
    hero_image_alt='Une personne tient un chien en laisse et un sac de transport contenant un chat, à l’extérieur.',
    internal_links='[{"text":"guide de garde à domicile chien et chat","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide des parcs et balades à Grenoble","url":"/actualites/parcs-balades-chiens-grenoble-guide"},{"text":"guide des gardes d’été","url":"/actualites/house-sitting-ete-aura-guide"},{"text":"arrosage pendant les vacances à Grenoble","url":"/actualites/arroser-plantes-vacances-grenoble"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide des urgences vétérinaires à Grenoble","url":"/actualites/veterinaire-urgence-grenoble-isere"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-grenoble-chartreuse' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Pet-sitting à Saint-Étienne : organiser la garde de vos animaux

**Pour faire garder un chien ou un chat à Saint-Étienne, comparez d’abord les soins et les horaires nécessaires avec les possibilités de chaque formule.** Des visites, un accueil dans un autre foyer et un séjour chez vous répondent à des besoins différents. La proximité seule ne garantit pas que l’organisation conviendra.

Guardiens permet d’accueillir un gardien dans votre logement pour veiller sur la maison et, s’il y en a, les animaux. Le séjour est à préparer avec la personne intéressée : présence attendue, sorties, tâches et conditions de vie sur place. Aucune candidature ou disponibilité immédiate n’est garantie.

**Sommaire :** [choisir une formule](#formules), [budget et gratuité](#budget), [sorties et déplacements](#sorties), [confiance et préparation](#confiance), [départ et relais](#depart), [questions fréquentes](#faq).

## <a id="formules"></a>Quelle garde choisir pour votre animal ?

Présentez ses habitudes et ses besoins : repas, sorties, moments de présence, traitements prescrits et réactions connues. Pour plusieurs animaux, précisez qui mange quoi, les interactions possibles et les espaces à préserver.

| Formule | Ce qui est organisé | Point à vérifier |
| --- | --- | --- |
| Visites à domicile | Passages et tâches définis, avec sorties si convenues. | Fréquence, durée et besoins entre deux visites. |
| Accueil chez un proche ou un professionnel | Séjour de l’animal dans un autre lieu. | Conditions d’admission, cohabitation et disponibilité. |
| Gardien hébergé chez vous | Séjour dans le logement, soins et tâches discutés. | Horaires réels et compatibilité du logement pour le gardien. |

Le [guide des solutions de garde à domicile](/actualites/garde-animaux-domicile-chien-chat) précise ces différences. Un animal très jeune, malade ou qui tolère mal les absences peut demander une organisation particulière, à discuter avec le vétérinaire. N’attendez pas d’une formule qu’elle résolve à elle seule un problème de santé ou de comportement.

## <a id="budget"></a>Quel prix pour un pet-sitter à Saint-Étienne ?

Demandez le contenu exact de la prestation : durée de visite, nombre de sorties, jours concernés et frais de déplacement. Les prix ne se comparent utilement qu’avec leurs conditions.

À titre d’exemple, [Canislupa, tarifs à Saint-Étienne](https://canislupa.fr/tarifs/), affiche **15 € pour une balade individuelle ou visite de 30 minutes**, **20 € pour une heure**, et un **supplément de 0,50 €/km au-delà de 10 km autour de Saint-Étienne**. Tarifs consultés le **17 octobre 2026** : ils appartiennent à ce prestataire, ne constituent pas une moyenne et sont à confirmer pour votre adresse et vos dates.

Pour un projet de séjour hébergé, Guardiens est **actuellement 100 % gratuit pour les propriétaires et les gardiens**. Le gardien est accueilli sans rémunération. Nourriture des animaux, transport, consommables et soins vétérinaires restent distincts et doivent être convenus.

L’objectif est de développer le réseau et d’améliorer le service grâce aux retours des membres. Une éventuelle contribution aux frais d’infrastructure ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis. Les [conditions actuelles](/tarifs) restent la référence.

## <a id="sorties"></a>Préparer les sorties en ville et vers le Pilat

Donnez les parcours habituels, les équipements et les situations à éviter pour votre chien. Un parc proche ne garantit pas qu’une promenade sera sans difficulté ; fréquentation, autres animaux et accès comptent. Indiquez ce qui convient à cet animal, plutôt qu’une liste de lieux que le gardien devrait tous visiter.

Pour une sortie dans le Pilat, l’[office de tourisme recommande de garder le chien sous surveillance et de privilégier la laisse](https://www.pilat-tourisme.fr/pratique/informations-utiles/foire-aux-questions). Consultez aussi la signalisation et les règles du site précis. Un parc naturel régional n’est pas un espace sans contraintes, ni une obligation de randonnée pendant la garde.

Les informations du [Parc du Pilat sur le partage des espaces](https://www.parc-naturel-pilat.fr/comprendre-le-territoire/territoire-vivant/tous-responsables/) aident à préparer un parcours, notamment en présence de troupeaux. Convenez des sorties autorisées, du transport et d’une solution plus courte si les conditions changent. Ne fixez pas un trajet universel de vingt minutes depuis toute la ville.

Pour un logement dans le Forez ou la vallée du Gier, décrivez les déplacements nécessaires vers les courses, les soins et les sorties. Précisez si une voiture est nécessaire. Le véhicule du gardien et la possibilité de transporter un animal ne doivent pas être supposés.

## <a id="confiance"></a>Comment choisir une personne et préparer le logement ?

Échangez sur l’expérience avec vos animaux, les horaires et les tâches. Demandez des exemples concrets et consultez les avis lorsqu’ils existent. Les qualités d’une personne ne se déduisent pas de son quartier, de ses études ou de son ancienneté dans la ville. Un écusson d’identité porte sur le contrôle d’un document, pas sur la compétence ou la qualité du séjour.

Une rencontre peut être proposée **si les deux personnes le souhaitent**. Lisez les [questions pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) avant de confirmer. Si les besoins dépassent les possibilités de la personne, cherchez une autre organisation.

Décrivez aussi les conditions d’hébergement : chambre, pièces accessibles, connexion, chauffage et accès au logement. Les tâches de maison doivent être limitées et expliquées ; un gardien n’est pas automatiquement disponible pour une réparation technique. Le [guide de préparation de la maison](/actualites/preparer-maison-avant-garde) aide à réunir ces informations. Un logement sans animaux peut aussi faire l’objet d’une garde.

## <a id="depart"></a>Que transmettre avant de partir ?

Préparez les consignes des animaux, les prescriptions, le vétérinaire habituel et le service de garde du secteur. Prévoyez les moyens de transport et un relais qui a accepté ce rôle. Convenez des contacts, des nouvelles souhaitées, des décisions et du règlement des dépenses.

Si l’animal paraît malade ou blessé, le gardien doit demander un avis vétérinaire puis prévenir le propriétaire, sans attendre sa réponse pour appeler. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) précise la coordination et les limites : aucun remplacement immédiat n’est garanti.

Vérifiez les assurances adaptées à votre logement et aux tâches convenues. [Service Public décrit les points de vigilance du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509) ; l’inscription sur une plateforme gratuite ne crée pas une couverture automatique.

Après confirmation de la garde sur Guardiens, un accord est proposé et sa signature est facultative. La [checklist de départ](/actualites/checklist-partir-vacances-animaux) complète les consignes pour l’arrivée, le séjour et le retour.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on faire garder son animal chez soi à Saint-Étienne ?
Oui, par des visites ou un séjour hébergé selon la formule choisie. Définissez les tâches, la durée des passages ou les horaires de présence, et vérifiez qu’ils suffisent à votre animal.

### Quel est le prix d’une visite de pet-sitting dans la Loire ?
Il dépend du prestataire, de la durée et des déplacements. Canislupa affiche par exemple 15 € pour 30 minutes et 20 € pour une heure à Saint-Étienne, avec un supplément kilométrique selon son secteur. Ce sont des prix publiés à confirmer, pas une moyenne départementale.

### Le house-sitting est-il gratuit pour les gardiens aussi ?
Guardiens est actuellement gratuit pour les deux rôles. Le gardien est hébergé sans rémunération ; les dépenses convenues et les soins vétérinaires restent distincts.

### Le gardien doit-il emmener le chien dans le Pilat ?
Non. Les sorties se décident selon les habitudes de l’animal, les possibilités du gardien et les règles des lieux. Une randonnée n’est pas une obligation liée à la localisation du logement.

### Un gardien habitant Saint-Étienne connaît-il forcément les besoins de mon animal ?
Non. Il faut échanger sur cet animal, ses soins et ses réactions. Une adresse locale ou un contrôle d’identité ne garantit pas une expérience adaptée.

### Que faire si personne ne répond pour les dates prévues ?
Gardez une autre solution possible selon les besoins : proche, visites ou professionnel. La plateforme ne garantit pas une candidature ni une disponibilité immédiate.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='323a53b1-e156-4326-a8d8-4bb8bbbb29f6'::uuid AND slug='pet-sitting-saint-etienne-loire';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-saint-etienne-loire' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Pet-sitting à Saint-Étienne : organiser la garde de vos animaux'
    AND before_row.excerpt IS NOT DISTINCT FROM 'À Saint-Étienne, dans le Forez ou la vallée du Gier, préparez la garde à partir des soins, des horaires et des accès nécessaires à vos animaux.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Pet-sitting Saint-Étienne & Loire | Guardiens'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Garde d’animaux à Saint-Étienne et dans la Loire : visites, accueil ou gardien hébergé. Prix daté, sorties et préparation du séjour chez vous.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne assise dans un salon tient un jouet près d’un chien et d’un chat roux.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide des solutions de garde à domicile","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"questions pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 14:55:16.603359+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot12_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot12_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot12_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Pet-sitting à Saint-Étienne : organiser la garde de vos animaux',
    excerpt='À Saint-Étienne, dans le Forez ou la vallée du Gier, préparez la garde à partir des soins, des horaires et des accès nécessaires à vos animaux.',
    meta_title='Pet-sitting Saint-Étienne & Loire | Guardiens',
    meta_description='Garde d’animaux à Saint-Étienne et dans la Loire : visites, accueil ou gardien hébergé. Prix daté, sorties et préparation du séjour chez vous.',
    hero_image_alt='Une personne assise dans un salon tient un jouet près d’un chien et d’un chat roux.',
    internal_links='[{"text":"guide des solutions de garde à domicile","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"questions pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-saint-etienne-loire' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
