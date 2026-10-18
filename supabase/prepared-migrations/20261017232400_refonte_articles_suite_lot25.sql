-- Refonte des guides première garde rurale et chiffres de l’abandon, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot25_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot25_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot25_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot25_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('2e274e04-2033-4adc-a2e7-fb57a90fdb30'::uuid,'ddc0342e-f690-426e-a6af-bf1a4d72e86b'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Abandon d’animaux en France : comprendre les chiffres et chercher de l’aide

**Les données sur l’abandon d’animaux en France ne mesurent pas toutes la même chose.** Un animal recueilli par un refuge, un abandon direct et une sortie de fourrière correspondent à des situations et des périmètres différents. Pour lire un chiffre, il faut préciser la source, l’année et ce qui est compté.

Vous cherchez une solution pour votre animal aujourd’hui ? Vous pouvez aller directement aux [pistes d’aide](#solutions). Une difficulté temporaire, des soins coûteux ou une séparation définitive demandent des démarches différentes.

**Repères :** [les chiffres et leurs limites](#chiffres), [la saisonnalité](#ete), [les motifs déclarés](#causes), [les pistes d’aide](#solutions), [le cadre légal](#loi), [la place d’une garde temporaire](#garde), [questions fréquentes](#faq).

## <a id="chiffres"></a>Combien d’animaux sont abandonnés en France ?

Il faut distinguer plusieurs indicateurs, sans les additionner ni en déduire une évolution directe.

| Source et période | Chiffre publié et périmètre |
| --- | --- |
| Rapport d’activité SPA 2025 | **42 373 animaux recueillis** dans les refuges et Maisons SPA : activité de ce réseau, pas total national. |
| Étude SPA–Fondation Affinity publiée en 2025, données 2024 | Plus de **108 000 chiens et chats pris en charge hors fourrière** dans l’échantillon, **117 000 avec les fourrières** ; recensement non exhaustif. |
| Analyse de la Chaire bien-être animal de VetAgro Sup à partir du CNR BEA, données 2021 | **206 907 chiens et chats**, selon les catégories d’identification et de prise en charge retenues ; ce n’est pas un comptage de seuls abandons directs. |

Sources : [rapport SPA 2025, p. 22–23](https://www.la-spa.fr/medias/2026/06/Rapport-dactivite-2025.pdf), [étude SPA–Affinity, p. 6–7 et 14](https://www.la-spa.fr/app/uploads/2025/09/SPA_Abandon_Etude_FR_Web.pdf), [analyse de VetAgro Sup](https://chaire-bea.vetagro-sup.fr/labandon-concerne-100-000-animaux-de-compagnie-chaque-annee-avec-un-pic-pendant-lete-vrai-ou-faux/).

La SPA distingue notamment **42 % d’abandons directs en refuge** et **53 % de sorties de fourrière** parmi ses recueils de 2025. Une sortie de fourrière ne raconte pas, à elle seule, pourquoi l’animal s’est retrouvé sans son propriétaire. De même, appeler un animal « abandonné » dans une étude ne signifie pas qu’un abandon pénal a été constaté pour chaque cas.

Comparer ces trois nombres comme s’ils formaient une série annuelle serait trompeur : années, espèces, sources et définitions diffèrent. La baisse d’un nombre d’accueils ne prouve pas non plus, à elle seule, une baisse du besoin de places.

## <a id="ete"></a>Y a-t-il davantage d’abandons pendant l’été ?

L’étude SPA–Affinity observe une stabilité relative des prises en charge canines et une saisonnalité plus marquée pour les chats. Son **rapport de 3,5 entre juillet et février concerne les chats accueillis en fourrière dans l’échantillon**, pas tous les refuges. Le graphique repose sur 65 associations et 20 fourrières pour les chiens, 93 et 12 pour les chats. Le rôle de la reproduction féline est discuté dans le rapport.

VetAgro Sup souligne aussi que le nombre de **60 000 abandons estivaux** souvent cité n’a pas été confirmé par le rapport du CNR BEA étudié. Cela ne permet ni d’attribuer chaque accueil d’été à un départ en vacances, ni d’exclure toute difficulté de garde. Une saison de prise en charge et une cause individuelle sont deux informations différentes.

## <a id="causes"></a>Quels motifs sont déclarés lors d’un abandon direct ?

Le tableau suivant reprend les graphiques de l’étude SPA–Affinity, **p. 17 et 20**, après vérification visuelle des intitulés. Il concerne les motifs d’**abandons directs**, pas l’origine de tous les animaux recueillis.

| Motif principal déclaré | Chiens | Chats |
| --- | --- | --- |
| Incapacité physique du propriétaire, dont décès ou EHPAD | 28 % | 26 % |
| Rupture de vie : divorce, perte d’emploi, déménagement | 24 % | 27 % |
| Problèmes de comportement | 18 % | 4 % |
| Difficultés financières | 9 % | 6 % |
| Portées non désirées | 7 % | 15 % |
| Allergies | 5 % | 12 % |
| Animal jugé trop contraignant | 4 % | 2 % |
| Animal malade ou âgé | 3 % | 4 % |
| Autre | 2 % | 3 % |

Ces réponses sont déclaratives : 309 structures pour les chiens et 538 pour les chats, motif principal retenu et arrondis. Une catégorie ne décrit pas toute l’histoire d’une personne ou d’un animal. **L’absence d’une catégorie « vacances » ne mesure pas une fréquence nulle de ce motif.**

## <a id="solutions"></a>Vous ne pouvez plus vous occuper de votre animal : vers qui vous tourner ?

Commencez par préciser la difficulté et sa durée, pour chercher une solution adaptée.

- **Absence temporaire ou hospitalisation :** sollicitez un proche ou un relais qui accepte les tâches, les dates et l’accès au logement. Si cela ne suffit pas, contactez des structures de garde ou associations locales pour connaître leurs possibilités réelles. Le [guide de garde pendant une hospitalisation](/actualites/faire-garder-animal-pendant-hospitalisation) aide à préparer les informations et les contacts.
- **Difficulté à financer les soins :** parlez-en à votre vétérinaire. [Vétérinaires Pour Tous](https://veterinairespourtous.fr/particulier/) prévoit un dossier d’éligibilité puis une demande du vétérinaire pour le devis ; l’aide dépend des conditions, plafonds et moyens disponibles. L’orientation par un service social n’est pas présentée comme l’unique voie de demande. En urgence, n’attendez pas l’accord financier pour consulter et expliquer vos moyens.
- **Besoin de soins solidaires :** le rapport SPA 2025 mentionne douze dispensaires pour les animaux de personnes démunies. Demandez au dispensaire concerné ses conditions d’accueil et de rendez-vous ; ne supposez pas une admission automatique.
- **Séparation définitive envisagée :** contactez une association ou un refuge en amont, exposez honnêtement la situation et les besoins de l’animal. Vérifiez qu’une prise en charge est acceptée : envoyer une demande ne réserve pas une place.

Si vous trouvez un animal errant, suivez les [démarches de Service Public pour un chien ou un chat trouvé](https://www.service-public.gouv.fr/particuliers/vosdroits/F32338), plutôt que de supposer qu’il a été volontairement abandonné ou de le céder vous-même.

## <a id="loi"></a>Abandon et cession : quels repères juridiques ?

[Service Public rappelle les sanctions de l’abandon](https://www.service-public.gouv.fr/particuliers/vosdroits/F31859) : trois ans d’emprisonnement et 45 000 euros d’amende, quatre ans et 60 000 euros en cas de risque de mort immédiat ou imminent connu, cinq ans et 75 000 euros si l’abandon entraîne la mort. Des peines complémentaires peuvent s’ajouter.

Confier ou céder un animal dans les règles demande une organisation et des documents. Pour donner un chien ou un chat, la [fiche officielle sur les cessions entre particuliers](https://www.service-public.gouv.fr/particuliers/vosdroits/F34329) précise notamment l’identification, les documents et le certificat d’engagement signé au moins sept jours avant la cession. Vérifiez les conditions de votre situation et de l’espèce, sans traiter une remise improvisée comme une démarche suffisante.

Une garde temporaire ne transfère pas automatiquement la propriété de l’animal. Si le projet devient une séparation définitive, organisez la démarche adaptée avec les personnes ou structures compétentes.

## <a id="garde"></a>Quelle place pour une garde entre particuliers ?

Le house-sitting peut être une possibilité lors d’une absence temporaire, si quelqu’un peut séjourner dans le logement et assurer les besoins convenus. Il ne répond pas à toutes les difficultés sociales, financières, de santé ou de comportement. Les données présentées ici ne mesurent pas un nombre d’abandons évités par une plateforme de garde.

Sur Guardiens, un gardien est hébergé **sans rémunération** pour veiller sur la maison et les éventuels animaux. La plateforme est **actuellement 100 % gratuite pour les deux rôles**, avec des dépenses de séjour distinctes ; voir les [conditions tarifaires](/tarifs). Aucun candidat, délai de réponse ou remplacement n’est garanti. Le réseau de gardiens d’urgence reste un projet à venir.

Si vous envisagez cette solution, préparez les tâches, les contacts, un relais accepté et les dépenses. Vous pouvez organiser une rencontre si les deux personnes le souhaitent. L’[organisation d’une garde pendant une hospitalisation](/actualites/faire-garder-animal-pendant-hospitalisation) détaille la préparation, sans promettre de dépannage immédiat.

## <a id="faq"></a>Questions fréquentes

:::faq
### Les animaux recueillis par la SPA représentent-ils tous les abandons en France ?
Non. Ce chiffre décrit les accueils du réseau indiqué pour une année donnée. Il comprend différentes origines et ne constitue pas un total national de seuls abandons directs.

### Peut-on comparer directement les nombres de 2021, 2024 et 2025 ?
Pas comme une évolution annuelle unique : les périmètres, espèces, définitions et méthodes diffèrent. Il faut conserver ces précisions avec chaque chiffre.

### Les chiffres prouvent-ils que les vacances causent tous les abandons estivaux ?
Non. Une saisonnalité d’accueil ne démontre pas la cause de chaque situation. L’absence d’une catégorie dans un questionnaire ne démontre pas non plus qu’un motif n’existe jamais.

### Peut-on demander une aide de Vétérinaires Pour Tous directement ?
Le parcours actuel prévoit la création d’un dossier avec justificatifs sur leur plateforme, puis une demande du vétérinaire pour le devis si l’éligibilité est validée. Conditions, plafonds et ressources s’appliquent ; l’accord n’est pas garanti.

### Un refuge doit-il accepter immédiatement mon animal ?
Une prise en charge doit être discutée et acceptée. Contactez la structure en amont et décrivez la situation ; ne supposez pas une place disponible parce qu’une demande a été envoyée.

### Une garde temporaire peut-elle remplacer une cession définitive ?
Ce sont des projets différents. La garde organise une absence avec des tâches et une durée convenues ; une séparation définitive doit suivre les démarches adaptées. Ne présentez pas un besoin permanent comme une simple absence temporaire.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='2e274e04-2033-4adc-a2e7-fb57a90fdb30'::uuid AND slug='abandon-animaux-france-chiffres-causes';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Abandon d’animaux en France : comprendre les chiffres et chercher de l’aide'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Les chiffres changent selon l’année, les espèces et les structures comptées. Voici comment les lire, puis les démarches à envisager si vous rencontrez une difficulté.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Abandon d’animaux en France : chiffres, causes et aides'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Quels chiffres sur l’abandon d’animaux en France ? Distinguez recueils et abandons directs, comprenez les études et trouvez des pistes d’aide adaptées.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chat tigré est assis dans une rue, devant des marches.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de garde pendant une hospitalisation","url":"/actualites/faire-garder-animal-pendant-hospitalisation"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 13:10:17.452614+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot25_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot25_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot25_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Abandon d’animaux en France : comprendre les chiffres et chercher de l’aide',
    excerpt='Les chiffres changent selon l’année, les espèces et les structures comptées. Voici comment les lire, puis les démarches à envisager si vous rencontrez une difficulté.',
    meta_title='Abandon d’animaux en France : chiffres, causes et aides',
    meta_description='Quels chiffres sur l’abandon d’animaux en France ? Distinguez recueils et abandons directs, comprenez les études et trouvez des pistes d’aide adaptées.',
    hero_image_alt='Un chat tigré est assis dans une rue, devant des marches.',
    internal_links='[{"text":"guide de garde pendant une hospitalisation","url":"/actualites/faire-garder-animal-pendant-hospitalisation"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='abandon-animaux-france-chiffres-causes' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Première garde en Auvergne : préparer un séjour à la campagne

**Pour une première garde en Auvergne, partez des besoins du logement et des éventuels animaux, puis vérifiez comment vous pourrez les assurer sur place.** Une maison à la campagne peut demander une organisation différente de votre quotidien : accès, courses, connexion, présence ou contacts à joindre.

Ce guide propose des questions à poser avant de confirmer. Il ne présume ni une maison isolée pour chaque annonce, ni des animaux faciles à garder parce qu’ils vivent à la campagne. Sur Guardiens, le gardien est hébergé **sans rémunération** ; la plateforme est **actuellement gratuite pour les deux rôles**, selon les [conditions tarifaires](/tarifs). Trajet et dépenses convenues restent distincts.

**Avant de choisir :** [vérifier les accès](#acces), [comprendre les tâches](#taches), [préparer le logement](#logement), [organiser le relais](#relais), [confirmer et passer les consignes](#passation), [questions fréquentes](#faq).

## <a id="acces"></a>Pouvez-vous rejoindre le logement et vous déplacer pendant le séjour ?

Demandez l’itinéraire jusqu’au logement, le lieu de stationnement et l’état du dernier accès. Une distance sur la carte ne donne pas le temps réel nécessaire pour les courses ou le vétérinaire. Vérifiez les transports disponibles pour vos dates si vous ne venez pas avec un véhicule.

Si un véhicule du propriétaire est proposé, clarifiez l’autorisation de l’utiliser, l’assurance et les dépenses. Ne comptez pas dessus avant cet accord. Pour un télétravail prévu, demandez les conditions de connexion et une solution compatible avec vos besoins, sans déduire une qualité de réseau du nom de la commune.

Avant de partir et pendant le séjour, consultez les informations utiles à votre trajet et la [Vigilance de Météo-France](https://vigilance.meteofrance.fr/fr). Suivez les consignes des autorités si les conditions changent ; une habitude du propriétaire ne remplace pas les informations du moment.

## <a id="taches"></a>Quels animaux et quelles tâches allez-vous réellement prendre en charge ?

Lisez l’annonce puis demandez une description concrète des routines : alimentation, sorties, entretien des espaces et soins éventuels. Le nombre d’animaux ne suffit pas à mesurer la difficulté ; leur état, leurs habitudes et les gestes nécessaires comptent aussi.

| Sujet à clarifier | Question utile |
| --- | --- |
| Chien | Comment se déroulent les sorties et quelles situations sont difficiles à gérer ? |
| Chat | Quelles habitudes d’accès extérieur sont convenues et quand signaler un changement ? |
| Autres animaux | Quels gestes ai-je déjà pratiqués et quelles explications me faut-il ? |
| Jardin et logement | Quels gestes courants sont prévus, avec quel matériel ? |
| Présence | Quelles absences en journée sont compatibles avec ces besoins ? |

La race, le lieu de vie ou l’espace disponible ne garantissent pas une adaptation facile à un nouveau gardien. Décrivez votre expérience réelle et refusez les gestes que vous ne pouvez pas assurer. Le [guide de garde d’une propriété avec animaux](/actualites/garde-ferme-animaux-monts-du-lyonnais) aide à distinguer les tâches courantes d’un remplacement professionnel agricole ou de travaux techniques.

Ne considérez pas une cachette prolongée, une baisse d’appétit ou une boiterie comme automatiquement normale pendant une garde. Signalez les changements observés et demandez un avis vétérinaire si l’état inquiète, sans attendre une réponse du propriétaire pour solliciter cet avis.

## <a id="logement"></a>Quelles consignes pour les équipements et les espaces ?

Faites expliquer le chauffage, les accès, les fermetures et les équipements que vous utiliserez. Demandez où se trouvent les informations et qui contacter si quelque chose ne fonctionne plus. Un séjour de garde ne vaut pas accord pour réparer une installation ou utiliser un matériel que vous ne maîtrisez pas.

Pour les animaux, faites préciser les limites des espaces accessibles, les portes ou portails à maintenir fermés et les promenades connues. Un grand terrain n’est pas forcément clôturé. Ne supposez pas qu’un animal habitué aux lieux pourra sortir sans les conditions convenues avec le propriétaire.

## <a id="relais"></a>Qui peut aider si vous rencontrez un imprévu ?

Préparez les coordonnées du propriétaire, d’un contact local qui a accepté d’intervenir et du vétérinaire, avec une solution hors horaires. Vérifiez l’adresse du logement et les informations utiles pour expliquer votre situation. Convenez des dépenses et du financement des soins avant le départ.

Si vous ne pouvez plus assurer la garde ou si votre transport est retardé, prévenez et coordonnez une solution effective. Un message ne confirme pas à lui seul l’arrivée d’un remplaçant. Le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) aide à préparer ce relais.

## <a id="passation"></a>Comment décider et préparer l’arrivée ?

Confirmez quand les dates, les tâches et les conditions du séjour sont claires et compatibles avec vos moyens. Une rencontre est possible **si les deux personnes le souhaitent**. Le contrôle d’un document d’identité et les avis éventuels sont des informations parmi d’autres ; ils ne garantissent pas une compétence pour chaque maison.

Après confirmation, un accord de garde est proposé sur Guardiens, à signature facultative. Le guide de la maison complète les consignes lorsqu’il est disponible. Convenez d’une passation pour les clés, les habitudes et les contacts, puis du rythme des nouvelles et du retour. Les [conseils de première garde](/actualites/reussir-premiere-garde-house-sitting) détaillent ces étapes.

Les annonces disponibles évoluent. Aucune destination ni première candidature ne garantit un séjour ; gardez une solution de transport et d’hébergement de repli avant d’engager vos frais.

## <a id="faq"></a>Questions fréquentes

:::faq
### Faut-il une voiture pour garder une maison en Auvergne ?
Cela dépend du logement, de ses accès et des besoins pendant la garde. Vérifiez les trajets pour les courses, les sorties et le vétérinaire. Un véhicule proposé doit faire l’objet d’un accord et d’une vérification d’assurance.

### Les animaux de campagne sont-ils plus faciles à garder ?
Le lieu de vie ne garantit pas une adaptation facile. Renseignez-vous sur les habitudes, les soins et les situations difficiles, puis vérifiez votre capacité à assurer les tâches de cette garde.

### Peut-on visiter la région pendant le séjour ?
Vos sorties doivent être compatibles avec la présence et les tâches convenues. Décrivez votre organisation avant de confirmer ; un grand terrain ne dispense pas automatiquement des sorties ou des soins nécessaires.

### Que préparer si le logement est isolé ?
Vérifiez les accès, les communications, les équipements utiles et les contacts, dont un relais local accepté et le vétérinaire. Les conditions réelles de chaque logement doivent être discutées.

### Comment choisir une première garde adaptée ?
Rapprochez les besoins de l’annonce de votre expérience, de votre présence possible et de votre mobilité. Posez les questions encore ouvertes avant de confirmer, sans supposer qu’une garde courte sera forcément simple.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='ddc0342e-f690-426e-a6af-bf1a4d72e86b'::uuid AND slug='temoignage-premiere-garde-auvergne';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/temoignage-premiere-garde-auvergne' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Première garde en Auvergne : préparer un séjour à la campagne'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Maison de village ou logement plus isolé : vérifiez les accès et les responsabilités réelles avant de choisir votre première garde en Auvergne.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Première garde en Auvergne : préparer son séjour'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Une première garde à la campagne en Auvergne se prépare : accès, animaux, présence, équipements et relais local. Les questions à poser avant de confirmer.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien roux marche dans un jardin devant une maison en pierre, avec des montagnes à l’arrière-plan.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide de garde d’une propriété avec animaux","url":"/actualites/garde-ferme-animaux-monts-du-lyonnais"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"conseils de première garde","url":"/actualites/reussir-premiere-garde-house-sitting"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:40:12.574579+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot25_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot25_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot25_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Première garde en Auvergne : préparer un séjour à la campagne',
    excerpt='Maison de village ou logement plus isolé : vérifiez les accès et les responsabilités réelles avant de choisir votre première garde en Auvergne.',
    meta_title='Première garde en Auvergne : préparer son séjour',
    meta_description='Une première garde à la campagne en Auvergne se prépare : accès, animaux, présence, équipements et relais local. Les questions à poser avant de confirmer.',
    hero_image_alt='Un chien roux marche dans un jardin devant une maison en pierre, avec des montagnes à l’arrière-plan.',
    internal_links='[{"text":"conditions tarifaires","url":"/tarifs"},{"text":"guide de garde d’une propriété avec animaux","url":"/actualites/garde-ferme-animaux-monts-du-lyonnais"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"conseils de première garde","url":"/actualites/reussir-premiere-garde-house-sitting"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='temoignage-premiere-garde-auvergne' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
