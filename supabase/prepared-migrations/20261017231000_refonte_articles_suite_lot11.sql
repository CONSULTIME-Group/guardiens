-- Refonte des guides Aix-les-Bains et gardes domestiques avec animaux de ferme, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot11_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot11_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot11_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot11_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('964c100a-2b1f-4256-9922-73e87e6be01d'::uuid,'1b75e168-4afe-46fc-baa7-573549e4dc15'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Garde de ferme dans les Monts du Lyonnais : animaux, tâches et limites

**Avant de chercher une garde de ferme dans les Monts du Lyonnais, séparez deux besoins : veiller sur un logement avec des animaux et assurer le fonctionnement d’une exploitation agricole.** La gratuité d’une plateforme et l’hébergement d’une personne ne suffisent pas à rendre toute tâche adaptée au house-sitting.

Autour de Saint-Martin-en-Haut, Duerne ou Sainte-Foy-l’Argentière, comme ailleurs, décrivez votre situation exacte : nombre d’animaux, soins, terrain, accès, équipements et tâches. Le nom de la commune ne permet pas de déduire la charge quotidienne ni l’expérience nécessaire.

**Sommaire :** [garde ou remplacement](#cadre), [décrire les tâches](#taches), [vérifier l’expérience](#experience), [accès et logement](#acces), [préparer les imprévus](#imprevus), [conditions et dépenses](#conditions), [questions fréquentes](#faq).

## <a id="cadre"></a>Garde de maison ou remplacement d’un agriculteur ?

Pour une maison avec des animaux détenus à titre privé, un séjour hébergé peut être envisagé si les tâches conviennent à la personne et sont préparées. Ce n’est pas une raison pour lui confier un animal, un engin ou une opération qu’elle ne sait pas gérer.

**Si votre absence implique la continuité d’une activité agricole, contactez un service de remplacement adapté.** Le [Service de Remplacement Rhône](https://servicederemplacement.fr/fr/les-structures-locales/departement/rhone-257) présente un accompagnement avec des salariés pour les absences d’exploitants. Son [annuaire des structures locales](https://servicederemplacement.fr/les-structures-locales) permet de trouver l’interlocuteur du département concerné, notamment côté Loire.

La [MSA, sur l’entraide et le bénévolat](https://www.msa.fr/lfp/dispositifs-entraide-benevolat), distingue l’échange de services entre agriculteurs et le coup de main occasionnel. Elle rappelle que ce dernier ne peut pas occuper un poste nécessaire au fonctionnement d’une exploitation. **Ne présentez pas un remplacement planifié comme un simple séjour gratuit.** Faites préciser le cadre de votre situation par la MSA et les professionnels concernés avant de publier une demande.

Ce guide traite donc la préparation d’une garde domestique avec animaux de ferme. Il ne donne pas de validation générale pour une traite, une production, une récolte, une vente ou le maniement de machines agricoles.

## <a id="taches"></a>Que mettre dans une annonce avec plusieurs espèces ?

N’écrivez pas seulement « quelques animaux faciles ». Pour chaque groupe, indiquez le nombre, les habitudes, les soins prescrits, les gestes attendus et leur fréquence. Ajoutez le temps nécessaire et les tâches qui seront assurées par quelqu’un d’autre.

| Point à décrire | Informations à transmettre | Limite à convenir |
| --- | --- | --- |
| Alimentation et eau | Rations préparées ou consignes individuelles, accès aux réserves et au point d’eau. | Qui intervient si un animal ne mange pas ou si l’approvisionnement ne fonctionne plus ? |
| Enclos et déplacements | Ouvertures, fermetures et manipulations nécessaires, parcours montrés. | Aucune manipulation ou récupération d’animal hors des compétences du gardien. |
| Nettoyage et matériel | Matériel autorisé, effort demandé et gestes expliqués. | Pas de machine ou d’intervention technique confiée par défaut. |
| Santé et contacts | Vétérinaire adapté aux espèces, traitements prescrits et contact de relais. | Le gardien observe et appelle ; il ne diagnostique pas et n’improvise pas de soins. |

Les besoins varient selon les individus et les installations. Ne remplacez pas leurs consignes par une ration type ou une routine générale « pour toutes les chèvres » ou « pour tous les chevaux » trouvée dans un article.

Si chiens et chats vivent aussi sur place, décrivez leurs besoins séparément. Une expérience avec un chien ne prouve pas une expérience avec des équidés ou un troupeau. Le [guide de garde à domicile chien et chat](/actualites/garde-animaux-domicile-chien-chat) complète cette préparation.

## <a id="experience"></a>Comment vérifier que la personne pourra assurer la garde ?

Discutez d’expériences précises : espèces gardées, installations utilisées, gestes réalisés et situations où la personne a demandé de l’aide. Demandez-lui d’expliquer ce qu’elle sait faire et ce qu’elle ne souhaite pas prendre en charge. Des références ou des avis, lorsqu’ils existent, peuvent compléter l’échange.

Ne présumez pas l’existence d’un badge « animaux de ferme » qui certifierait une aptitude. Les informations déclarées dans le profil doivent être discutées. Un écusson d’identité porte sur un document, pas sur les compétences ou la fiabilité du séjour.

Une rencontre peut être proposée **si les deux personnes le souhaitent**. Les gestes retenus doivent être expliqués et compris avant leur exécution ; si les conditions ne permettent pas de préparer la garde correctement, choisissez une autre solution. Personne n’a à accepter une tâche risquée pour obtenir un hébergement. Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) aide à poser ces questions.

## <a id="acces"></a>Le logement et les déplacements font aussi partie de l’accord

Décrivez la chambre, les espaces de vie, le chauffage, l’eau, la connexion et les conditions de repos. Précisez les chemins d’accès, les portails, le stationnement et les trajets vers les commerces ou les soins vétérinaires. Ne réduisez pas tout le territoire à « trente minutes de Lyon ».

Indiquez si une voiture est nécessaire et comment sera organisé un transport d’animal si le vétérinaire le demande. Une personne peut avoir l’expérience des soins sans disposer du véhicule ou du matériel requis. Confirmez séparément ces possibilités.

Le [guide de l’Ouest lyonnais](/actualites/pet-sitting-lyon-ouest-lyonnais) détaille la préparation d’une maison avec terrain.

## <a id="imprevus"></a>Quel relais prévoir en cas de problème ?

Identifiez avant le départ une personne qui a accepté d’intervenir et connaît les animaux ou les installations. Notez le vétérinaire compétent pour les espèces concernées, les modalités de transport et les contacts pour une panne d’eau, de clôture ou d’électricité.

En cas de signe de maladie ou de blessure, demandez un avis vétérinaire et prévenez le propriétaire, sans attendre sa réponse pour appeler. Pour un problème d’installation, mettez-vous en sécurité et contactez le relais ; ne tentez pas une réparation ou une récupération d’animal qui dépasse vos possibilités.

Précisez qui prend les décisions, comment sont réglés les frais et quelles dépenses peuvent être engagées après échange. La présence d’un gardien ne garantit ni la réparation d’une panne ni un remplacement immédiat. Le [guide des imprévus](/actualites/gerer-imprevu-pendant-garde) complète cette organisation.

## <a id="conditions"></a>Qu’est-ce qui est gratuit et que faut-il convenir ?

Guardiens est **actuellement 100 % gratuit pour les propriétaires et les gardiens**. Dans le house-sitting présenté ici, le gardien est hébergé sans rémunération. Cela ne remplace ni le prix d’un service agricole professionnel ni les frais vétérinaires, d’alimentation ou de transport.

Discutez des dépenses et vérifiez les garanties avec les assureurs, en décrivant les tâches et les espèces réelles : la gratuité n’entraîne pas une couverture automatique. Le [repère Service Public sur l’assurance du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509) aide pour le logement ; une activité agricole ou des installations particulières demandent une vérification propre à la situation.

La priorité de Guardiens est de construire le réseau et d’améliorer le service grâce aux retours des membres. Une éventuelle contribution à ses frais d’infrastructure ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis. Consultez les [conditions actuelles](/tarifs).

Après confirmation d’une garde sur la plateforme, un accord est proposé et sa signature est facultative. Il ne transforme pas une tâche agricole en garde domestique. Définissez d’abord un besoin adapté et une solution de relais, puis préparez les consignes avec la [checklist de départ](/actualites/checklist-partir-vacances-animaux).

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on confier une maison avec des poules ou des chèvres à un gardien hébergé ?
Cela peut s’envisager pour une garde domestique si les besoins, les installations, l’expérience et le relais conviennent. Décrivez les tâches réelles ; ne supposez pas que tout animal de ferme est facile à garder.

### Le house-sitting remplace-t-il un exploitant agricole pendant ses congés ?
Il ne faut pas présenter la continuité d’une exploitation comme un simple séjour gratuit. Contactez un service de remplacement et la MSA pour préciser l’organisation et le cadre de votre situation.

### Faut-il une expérience spécifique pour garder des chevaux ?
Discutez des gestes et des installations exacts avec une personne qui sait les gérer. Une expérience avec chiens et chats ne suffit pas à démontrer cette capacité. Les soins et le relais doivent être préparés.

### Un badge du profil garantit-il la compétence pour les animaux de ferme ?
Non. Vérifiez les expériences déclarées et les limites avec la personne. Le contrôle d’identité éventuel porte sur un document et ne certifie pas une compétence animalière.

### Qui intervient si une clôture ou le point d’eau tombe en panne ?
Prévoyez un relais qui a accepté cette mission et un contact technique adapté. Le gardien ne doit pas improviser une intervention dangereuse ou prendre en charge un matériel qu’il ne sait pas utiliser.

### Les dépenses des animaux et les soins vétérinaires sont-ils inclus ?
Non. La gratuité actuelle de Guardiens concerne la plateforme. Alimentation, consommables, transport, interventions et soins sont des dépenses distinctes dont les modalités doivent être convenues.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='964c100a-2b1f-4256-9922-73e87e6be01d'::uuid AND slug='garde-ferme-animaux-monts-du-lyonnais';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/garde-ferme-animaux-monts-du-lyonnais' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde de ferme dans les Monts du Lyonnais : animaux, tâches et limites'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une maison avec des animaux de ferme demande une préparation précise. Le house-sitting ne remplace pas un exploitant agricole : les besoins à distinguer avant de partir.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de ferme Monts du Lyonnais : animaux et maison'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Poules, chèvres ou chevaux dans les Monts du Lyonnais : préparez les soins, les accès et le relais. Distinguez garde de maison et remplacement agricole.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne distribue de la nourriture à des chèvres devant des bâtiments en pierre.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de garde à domicile chien et chat","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide de l’Ouest lyonnais","url":"/actualites/pet-sitting-lyon-ouest-lyonnais"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:10:15.492712+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot11_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot11_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot11_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde de ferme dans les Monts du Lyonnais : animaux, tâches et limites',
    excerpt='Une maison avec des animaux de ferme demande une préparation précise. Le house-sitting ne remplace pas un exploitant agricole : les besoins à distinguer avant de partir.',
    meta_title='Garde de ferme Monts du Lyonnais : animaux et maison',
    meta_description='Poules, chèvres ou chevaux dans les Monts du Lyonnais : préparez les soins, les accès et le relais. Distinguez garde de maison et remplacement agricole.',
    hero_image_alt='Une personne distribue de la nourriture à des chèvres devant des bâtiments en pierre.',
    internal_links='[{"text":"guide de garde à domicile chien et chat","url":"/actualites/garde-animaux-domicile-chien-chat"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"guide de l’Ouest lyonnais","url":"/actualites/pet-sitting-lyon-ouest-lyonnais"},{"text":"guide des imprévus","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"checklist de départ","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garde-ferme-animaux-monts-du-lyonnais' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# House-sitting à Aix-les-Bains : préparer la maison et les animaux

**Pour organiser un house-sitting à Aix-les-Bains, partez des besoins réels du logement et des animaux.** Une adresse près du lac du Bourget ne suffit pas à déterminer les trajets, les sorties ou les tâches. Décrivez vos dates, les accès et les horaires de présence attendus avant de chercher une personne avec qui l’organisation convient.

Le gardien séjourne chez vous pour veiller sur la maison et, s’il y en a, les animaux. Ce séjour peut concerner un appartement comme une maison ; la présence d’animaux n’est pas obligatoire. Des visites ou un autre mode de garde peuvent mieux répondre à certains besoins : le [guide de garde d’animaux en Savoie](/actualites/garde-animaux-savoie-guide) compare les formules et donne un repère de budget.

**Sommaire :** [décrire le séjour](#sejour), [préparer les sorties](#sorties), [maison et jardin](#maison), [choisir le gardien](#choisir), [prix et dépenses](#prix), [avant le départ](#depart), [questions fréquentes](#faq).

## <a id="sejour"></a>Quelles informations donner sur le logement à Aix ?

Présentez le logement disponible pour le gardien, l’endroit où il dormira et les espaces accessibles. Précisez les escaliers, l’ascenseur, le stationnement et les modalités de remise des clés. Pour une maison sur les hauteurs ou une adresse éloignée des commerces, décrivez le trajet réel et les solutions de transport.

N’écrivez pas simplement « tout est proche » : indiquez les déplacements nécessaires pour les courses, les sorties de l’animal et le vétérinaire. Si une voiture est nécessaire, dites-le. Un lieu agréable à visiter n’est pas forcément compatible avec les contraintes d’une personne sans véhicule.

| Point à présenter | Question à régler | Conséquence pour le séjour |
| --- | --- | --- |
| Accès et transport | Peut-on rejoindre le logement et faire les trajets utiles ? | Évite de découvrir une dépendance à la voiture à l’arrivée. |
| Présence et soins | À quels moments les animaux ont-ils besoin de quelqu’un ? | Permet de comparer avec les disponibilités réelles du gardien. |
| Jardin et équipements | Quelles tâches sont prévues et qui assure les interventions techniques ? | Distingue les gestes simples du travail d’un professionnel. |
| Vie sur place | Quelles pièces, connexion et conditions de confort sont proposées ? | Le gardien peut décider si le logement lui convient aussi. |

## <a id="sorties"></a>Chien, lac et promenades : préparer un parcours adapté

Transmettez les parcours habituels de votre chien, ses réactions, sa capacité à marcher et les équipements utilisés. Une promenade au bord du lac ou une sortie vers le Revard n’est pas adaptée à tous les animaux ni à tous les gardiens. Le relief, les conditions météo et la fréquentation comptent autant que la distance.

**Ne supposez pas que toutes les plages du lac autorisent les chiens, même hors saison.** Les règles dépendent du lieu : la [fiche officielle de la plage municipale du Bourget-du-Lac](https://www.aixlesbains-rivieradesalpes.com/equipement/plage-municipale-du-bourget-du-lac-le-bourget-du-lac/) indique par exemple que les animaux ne sont pas acceptés. Vérifiez les panneaux et les informations de la commune pour le parcours choisi, sans étendre la règle d’une plage à toutes les rives.

La baignade ne fait pas partie automatiquement d’une garde au bord du lac. Convenez des sorties autorisées avec le propriétaire et suivez les recommandations vétérinaires propres à l’animal. Par chaleur ou mauvais temps, adaptez le programme ; le [guide des gardes d’été](/actualites/house-sitting-ete-aura-guide) aide à préparer cette organisation.

Pour un chat, décrivez ses habitudes d’accès à l’extérieur, les ouvertures à sécuriser et les soins nécessaires. Ne déduisez pas d’un quartier calme que les sorties peuvent être modifiées sans échange préalable.

## <a id="maison"></a>Jardin, chauffage et équipements : jusqu’où va la garde ?

Listez les tâches avec leur fréquence et le temps nécessaire : courrier, plantes, relevé d’un équipement ou ouverture d’un volet. Montrez ce qui est demandé et laissez un contact pour les opérations techniques. Une présence dans la maison ne garantit pas une surveillance permanente ni la réparation d’une panne.

Pour l’arrosage, indiquez les plantes concernées et les quantités convenues, puis vérifiez les éventuelles restrictions sur [VigiEau](https://vigieau.gouv.fr/) selon l’adresse et l’usage. Prévoyez une personne de relais si un équipement tombe en panne. Pour une propriété rurale avec plusieurs espèces, le [guide des gardes avec animaux de ferme](/actualites/garde-ferme-animaux-monts-du-lyonnais) précise les compétences et les limites à discuter.

## <a id="choisir"></a>Comment choisir une personne avec qui la garde convient ?

Comparez des éléments concrets : expérience avec vos animaux, disponibilité aux horaires utiles, capacité à effectuer les sorties et compréhension des tâches. Demandez des précisions sur les expériences déclarées et consultez les avis lorsqu’ils existent.

L’écusson d’identité correspond à un contrôle de document ; il ne garantit ni une compétence animalière ni la qualité de la garde. L’âge, la situation familiale ou l’origine du gardien ne permettent pas de le déduire non plus.

Une rencontre peut être proposée **si les deux personnes le souhaitent**. Confirmez après avoir échangé sur les conditions du séjour. Aucune disponibilité locale, candidature ou réponse dans un délai donné n’est garantie. Le [guide pour choisir un gardien](/actualites/choisir-gardien-bons-criteres) donne des questions utiles.

## <a id="prix"></a>Le house-sitting est-il gratuit à Aix-les-Bains ?

Guardiens est **actuellement 100 % gratuit pour les propriétaires et les gardiens**. Le gardien est hébergé sans rémunération. Les dépenses du séjour — transport, nourriture des animaux, consommables ou frais convenus — sont distinctes et doivent être discutées.

L’objectif est de développer un réseau de confiance ; les retours des membres aident à améliorer le service. Une éventuelle participation aux frais d’infrastructure ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis. Les [conditions actuelles](/tarifs) restent la référence. Il n’y a pas de supplément « standing » déduit de la localisation dans ce guide.

## <a id="depart"></a>Avant de remettre les clés

Préparez les consignes, les contacts vétérinaires, les moyens de transport et un relais qui a accepté ce rôle. Convenez aussi des nouvelles souhaitées, des dépenses autorisées et du retour. Vérifiez les garanties applicables auprès des assureurs, sans supposer que la gratuité couvre les dommages : [Service Public explique les points d’assurance du home-sitting](https://www.service-public.gouv.fr/particuliers/vosdroits/F21509).

Après confirmation de la garde, un accord est proposé sur Guardiens ; sa signature est facultative. Le [guide de préparation de la maison](/actualites/preparer-maison-avant-garde) et la [checklist avant les vacances](/actualites/checklist-partir-vacances-animaux) aident à réunir les informations sans multiplier les messages au dernier moment.

## <a id="faq"></a>Questions fréquentes

:::faq
### Peut-on faire du house-sitting en appartement à Aix-les-Bains ?
Oui, le principe n’est pas réservé aux villas. Il faut décrire le logement, les conditions de séjour et les tâches, puis vérifier qu’elles conviennent à la personne accueillie.

### Faut-il avoir un chien ou un chat pour confier sa maison ?
Non. Une garde peut concerner la maison et les plantes sans animaux. Décrivez les besoins réels et les horaires attendus, sans promettre une présence permanente.

### Tous les bords du lac du Bourget sont-ils accessibles aux chiens ?
Non, les règles varient selon les sites et les communes. La plage municipale du Bourget-du-Lac indique ne pas accepter les animaux. Vérifiez les informations et la signalisation du parcours envisagé.

### Le gardien doit-il avoir une voiture ?
Cela dépend du logement et des trajets nécessaires. Précisez les accès, les courses et le transport vétérinaire pour que chacun puisse évaluer ses possibilités.

### La garde et les frais vétérinaires sont-ils gratuits ?
La plateforme est actuellement gratuite et le gardien est hébergé sans rémunération. Les dépenses convenues et les soins vétérinaires restent distincts. Discutez de leur règlement avant la garde.

### Comment préparer une garde si personne n’est disponible aux dates souhaitées ?
Gardez une autre solution possible : visites adaptées, proche ou professionnel selon les besoins. Guardiens ne garantit pas qu’une personne répondra ou sera disponible à vos dates.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='1b75e168-4afe-46fc-baa7-573549e4dc15'::uuid AND slug='house-sitting-aix-les-bains';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/house-sitting-aix-les-bains' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting à Aix-les-Bains : préparer la maison et les animaux'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Appartement en centre-ville ou maison près du lac : les questions à régler avant d’accueillir un gardien à Aix-les-Bains pendant votre absence.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting Aix-les-Bains : maison et animaux'
    AND before_row.meta_description IS NOT DISTINCT FROM 'À Aix-les-Bains et autour du lac du Bourget, préparez les accès, les sorties, le jardin et les soins avant d’accueillir un gardien chez vous.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une terrasse aménagée avec des sièges donne sur un lac et des montagnes.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de garde d’animaux en Savoie","url":"/actualites/garde-animaux-savoie-guide"},{"text":"guide des gardes d’été","url":"/actualites/house-sitting-ete-aura-guide"},{"text":"guide des gardes avec animaux de ferme","url":"/actualites/garde-ferme-animaux-monts-du-lyonnais"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"checklist avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:55:11.337771+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot11_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot11_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot11_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting à Aix-les-Bains : préparer la maison et les animaux',
    excerpt='Appartement en centre-ville ou maison près du lac : les questions à régler avant d’accueillir un gardien à Aix-les-Bains pendant votre absence.',
    meta_title='House-sitting Aix-les-Bains : maison et animaux',
    meta_description='À Aix-les-Bains et autour du lac du Bourget, préparez les accès, les sorties, le jardin et les soins avant d’accueillir un gardien chez vous.',
    hero_image_alt='Une terrasse aménagée avec des sièges donne sur un lac et des montagnes.',
    internal_links='[{"text":"guide de garde d’animaux en Savoie","url":"/actualites/garde-animaux-savoie-guide"},{"text":"guide des gardes d’été","url":"/actualites/house-sitting-ete-aura-guide"},{"text":"guide des gardes avec animaux de ferme","url":"/actualites/garde-ferme-animaux-monts-du-lyonnais"},{"text":"guide pour choisir un gardien","url":"/actualites/choisir-gardien-bons-criteres"},{"text":"conditions actuelles","url":"/tarifs"},{"text":"guide de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"checklist avant les vacances","url":"/actualites/checklist-partir-vacances-animaux"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-aix-les-bains' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
