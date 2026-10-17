-- Refonte des guides arrosage à Annecy et Grenoble, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot15_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot15_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot15_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot15_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('e9ffc11c-1435-4664-9835-d13d50f0a1ba'::uuid,'aff2d4ad-2426-48bc-9bd2-f681fe6fec94'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Arrosage pendant les vacances à Annecy : trouver un relais pour vos plantes

**Pour faire arroser vos plantes pendant une absence à Annecy, précisez les passages nécessaires et l’accès au logement avant de chercher quelqu’un.** Un voisin, un proche, un professionnel ou une personne rencontrée via l’entraide peut être un relais. L’essentiel est que les gestes, les dates et la remise des clés soient compris et acceptés.

Sur Guardiens, vous pouvez publier un besoin d’arrosage près de chez vous. Il s’agit alors de passages convenus, sans hébergement. Si vous souhaitez aussi confier la maison pour un séjour, le [house-sitting en Haute-Savoie](/actualites/house-sitting-haute-savoie-annecy-megeve) répond à un autre besoin.

**Repères :** [choisir un relais](#relais), [préparer les consignes](#consignes), [organiser les clés](#acces), [vérifier les restrictions d’eau](#eau), [publier une demande](#demande), [questions fréquentes](#faq).

## <a id="relais"></a>À qui confier l’arrosage à Annecy ?

Commencez par une personne qui peut réellement assurer les passages aux dates prévues. La proximité aide, mais elle ne remplace pas la disponibilité ni des consignes claires.

| Solution | Ce qu’il faut convenir |
| --- | --- |
| Voisin ou proche | Dates, gestes attendus et solution si un passage devient impossible. |
| Entraide entre particuliers | Besoin précis, échanges avant de confier les clés et conditions convenues ensemble. |
| Professionnel | Prestation, durée des visites, déplacement, accès et prix total sur devis. |
| Gardien hébergé | Séjour et tâches plus larges à organiser, si vous souhaitez confier le logement. |

Pour quelques plantes, une aide de passage peut suffire à votre organisation. Un jardin important ou des gestes techniques demandent d’autres moyens : décrivez la réalité avant de choisir. Aucune réponse ni disponibilité n’est garantie sur la plateforme ; prévoyez une autre possibilité avant de partir.

## <a id="consignes"></a>Quelles consignes laisser pour chaque plante ?

Évitez « un peu d’eau partout ». Préparez une fiche simple : emplacement ou photo du pot, besoin habituel, quantité mesurée avec le récipient laissé sur place, geste à faire et situation dans laquelle vous contacter. Faites une démonstration lorsque c’est utile et convenu.

Le bon rythme dépend des plantes et de leurs conditions réelles. Cet article ne prescrit donc pas un passage quotidien, hebdomadaire ou une même quantité pour tous les pots. Si vous ne connaissez pas les besoins d’une plante, renseignez-vous avant votre départ auprès d’une personne compétente plutôt que de laisser le relais improviser.

Le [guide d’arrosage pendant les vacances](/actualites/arroser-plantes-pendant-vacances-guide) aide à préparer les solutions matérielles. Testez tout dispositif envisagé avant de vous absenter et transmettez sa notice ; sa présence ne dispense pas de convenir de ce qui doit être vérifié.

## <a id="acces"></a>Balcon, immeuble et clés : éviter le passage impossible

À Annecy comme dans les communes voisines, donnez un secteur assez précis pour discuter du trajet. Le centre d’Annecy, Seynod, Annecy-le-Vieux ou une autre commune ne représentent pas le même déplacement depuis l’adresse du relais. Ne publiez pas vos codes d’entrée ni l’endroit où se trouvent les clés.

Réglez ensemble les points suivants :

- entrée de l’immeuble, étage, ascenseur et portes nécessaires pour rejoindre les plantes ;
- remise et restitution des clés, avec un moyen de vous joindre ;
- point d’eau et matériel accessibles, sans manipulation technique imprévue ;
- accès au balcon et fermeture du logement après le passage ;
- personne de remplacement qui a accepté ce rôle si le relais se désiste.

Convenez aussi du petit message attendu après une visite et de ce qu’il faut faire en cas de fuite ou d’accès bloqué. Ne demandez pas une intervention sur une installation que la personne ne sait pas utiliser.

## <a id="eau"></a>Quelles restrictions d’arrosage vérifier autour d’Annecy ?

Les horaires d’un ancien épisode de sécheresse ne valent pas pour tout séjour. Avant le départ, consultez [VigiEau](https://vigieau.gouv.fr/) à l’adresse du logement, en sélectionnant le profil et le type d’eau utilisés, puis transmettez les consignes applicables au relais. Convenez de qui revérifiera la situation pendant l’absence.

Le [Grand Annecy présente les enjeux de préservation de la ressource en eau](https://www.grandannecy.fr/mon-quotidien/preserve-mon-environnement/leau/preserver-la-ressource-en-eau). Pour une règle d’arrosage en vigueur, utilisez toutefois les mesures correspondant à votre adresse et à votre usage. Une vue sur le lac n’indique pas ce qui est autorisé au robinet.

## <a id="demande"></a>Comment présenter votre besoin sur Guardiens ?

Indiquez le secteur, les dates, le nombre de pots ou les espaces concernés, le temps de passage estimé d’après vos gestes habituels et les conditions d’accès. Distinguez l’arrosage du jardinage : tonte, taille, traitements ou manutention ne sont pas implicitement inclus.

L’entraide fonctionne sans paiement : un merci, un café ou un coup de main lorsque ce sera votre tour, à voir ensemble. La plateforme est **actuellement 100 % gratuite**. Notre priorité est de construire ce réseau et de l’améliorer avec vos retours. Une éventuelle contribution aux frais d’infrastructure ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis ; consultez les [conditions actuelles](/tarifs).

Échangez avant de confier l’accès. Un écusson d’identité correspond à un contrôle de document, pas à une garantie de compétence ou de fiabilité. Une rencontre peut être proposée **si les deux personnes le souhaitent**. Si vous avez aussi des animaux, préparez une organisation de garde adaptée à leurs besoins : une visite d’arrosage ne la définit pas à elle seule.

## <a id="faq"></a>Questions fréquentes

:::faq
### Qui peut arroser mes plantes pendant mes vacances à Annecy ?
Un proche, un voisin, un professionnel ou une personne d’un réseau d’entraide, selon les disponibilités et les gestes nécessaires. Confirmez les passages et prévoyez un relais accepté avant de partir.

### Faut-il héberger la personne qui vient arroser ?
Non pour des passages d’entraide. Le house-sitting est un séjour hébergé à organiser séparément si vous souhaitez confier le logement et d’autres tâches.

### Quel rythme d’arrosage demander ?
Celui qui correspond à vos plantes et à leurs conditions réelles. Préparez des consignes individualisées et vérifiez les restrictions applicables ; un rythme unique ne convient pas à tous les pots.

### Puis-je laisser les codes d’entrée dans mon annonce ?
Gardez les informations d’accès pour vos échanges avec la personne retenue. L’annonce peut décrire l’étage, l’ascenseur et le trajet sans rendre publics les codes ni l’emplacement des clés.

### La demande d’arrosage est-elle gratuite ?
La plateforme est actuellement gratuite et l’entraide fonctionne sans paiement. Les conditions pratiques et le coup de main en retour se voient ensemble ; aucune disponibilité n’est garantie.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='e9ffc11c-1435-4664-9835-d13d50f0a1ba'::uuid AND slug='arroser-plantes-vacances-annecy';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/arroser-plantes-vacances-annecy' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Arrosage pendant les vacances à Annecy : trouver un relais pour vos plantes'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Quelques pots sur un balcon ou des plantes dans l’appartement : organisez les passages et les accès avant de demander un coup de main à Annecy.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Arroser ses plantes pendant les vacances à Annecy'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Qui peut arroser vos plantes à Annecy pendant les vacances ? Préparez les passages, les clés et les consignes, puis cherchez un coup de main près de chez vous.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne arrose des plantes fleuries sur un balcon, avec un lac et des montagnes à l’arrière-plan.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"house-sitting en Haute-Savoie","url":"/actualites/house-sitting-haute-savoie-annecy-megeve"},{"text":"guide d’arrosage pendant les vacances","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:25:10.840436+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot15_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot15_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot15_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Arrosage pendant les vacances à Annecy : trouver un relais pour vos plantes',
    excerpt='Quelques pots sur un balcon ou des plantes dans l’appartement : organisez les passages et les accès avant de demander un coup de main à Annecy.',
    meta_title='Arroser ses plantes pendant les vacances à Annecy',
    meta_description='Qui peut arroser vos plantes à Annecy pendant les vacances ? Préparez les passages, les clés et les consignes, puis cherchez un coup de main près de chez vous.',
    hero_image_alt='Une personne arrose des plantes fleuries sur un balcon, avec un lac et des montagnes à l’arrière-plan.',
    internal_links='[{"text":"house-sitting en Haute-Savoie","url":"/actualites/house-sitting-haute-savoie-annecy-megeve"},{"text":"guide d’arrosage pendant les vacances","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='arroser-plantes-vacances-annecy' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Arroser ses plantes pendant les vacances à Grenoble : préparer les passages

**Vous partez de Grenoble et cherchez quelqu’un pour arroser vos plantes ? Préparez un relais capable de suivre des consignes simples et de vous signaler un problème.** Un calendrier posé une fois ne décrit pas à lui seul les besoins de chaque pot, les conditions du logement ni les restrictions d’usage de l’eau.

Pour des passages sans hébergement, Guardiens permet de publier une demande d’entraide près de chez vous. Si votre absence demande aussi une personne sur place pour la maison ou les animaux, consultez plutôt le [guide de garde à Grenoble et en Chartreuse](/actualites/pet-sitting-grenoble-chartreuse). Les responsabilités sont différentes.

**Repères :** [définir les passages](#passages), [préparer une fiche utile](#fiche), [vérifier l’eau et les installations](#eau), [trouver un relais](#relais), [prévoir un changement](#changement), [questions fréquentes](#faq).

## <a id="passages"></a>Que faut-il prévoir avant de chercher quelqu’un ?

Faites le tour des plantes intérieures, du balcon et du jardin éventuel. Indiquez ce qui doit être fait et ce qui reste hors de la demande. Arroser quelques pots, entretenir un potager et tailler une haie ne représentent ni le même temps ni les mêmes compétences.

Pour chaque espace, préparez vos consignes habituelles et ce qui peut conduire à les ajuster. Une pièce exposée, un balcon abrité et un jardin n’ont pas les mêmes conditions. Le nom de Grenoble ne suffit pas à déduire un besoin d’arrosage : évitez une fréquence standard valable pour toute la ville.

Si les besoins d’une plante vous sont inconnus, faites-les préciser avant le départ auprès d’une personne compétente. Le [guide général d’arrosage pendant les vacances](/actualites/arroser-plantes-pendant-vacances-guide) complète la préparation des dispositifs et des passages ; il ne remplace pas vos indications pour chaque plante.

## <a id="fiche"></a>Une fiche qui permet d’agir sans deviner

Laissez une liste courte, placée près du matériel, avec des photos si plusieurs pots se ressemblent. Le relais doit savoir reconnaître la plante concernée et comprendre ce que vous avez convenu.

| Information | Exemple de précision à préparer |
| --- | --- |
| Identification | Photo du pot et emplacement dans le logement. |
| Geste habituel | Quantité mesurée avec le récipient disponible et consigne propre à la plante. |
| Matériel | Point d’eau, arrosoir, notice et réglage du dispositif déjà testé. |
| Suivi | Message après le passage, observation à vous signaler et personne à joindre. |

Montrez le fonctionnement d’un programmateur si la personne doit le vérifier. Ne lui demandez pas de diagnostiquer une plante malade ou de modifier une installation qu’elle ne connaît pas. Si les conditions changent, elle doit pouvoir vous contacter et suivre les nouvelles consignes convenues, dans le respect des restrictions.

## <a id="eau"></a>Eau, fuite et restrictions : quoi vérifier à Grenoble ?

Avant de partir, contrôlez votre matériel et réglez une fuite connue. La [Métropole de Grenoble recommande de repérer et réparer les fuites pour réduire la consommation](https://www.grenoblealpesmetropole.fr/98-reduire-ma-consommation-d-eau.htm). Un relais venu arroser n’est pas automatiquement chargé d’une réparation.

Pour les usages autorisés, consultez [VigiEau](https://vigieau.gouv.fr/) à l’adresse exacte du logement : le profil, la ressource utilisée et l’usage comptent. Ne recopiez pas des horaires trouvés dans un article d’un été précédent. Transmettez l’information applicable et prévoyez une nouvelle vérification si les mesures évoluent pendant votre absence.

Indiquez le robinet utilisé et la marche à suivre en cas de problème, avec le contact approprié. L’existence d’un système automatique ne garantit ni son bon fonctionnement ni l’autorisation d’arroser sans vérifier les règles.

## <a id="relais"></a>Comment chercher une aide près de chez vous ?

Demandez d’abord à un proche ou à un voisin disponible. Vous pouvez aussi chercher un professionnel, avec prestation et devis, ou publier un besoin d’entraide sur Guardiens. Donnez un secteur assez précis pour discuter du déplacement : une adresse à Grenoble, Échirolles ou Meylan ne représente pas le même trajet pour chaque personne.

Présentez les dates, les tâches, le temps estimé d’après votre routine et les contraintes d’accès. Ne publiez pas vos codes ni l’emplacement des clés. Avant le départ, convenez de leur remise et de leur restitution, de l’entrée dans l’immeuble et de la fermeture après chaque visite.

Sur Guardiens, l’entraide s’organise **sans paiement**, avec un merci, un café ou un coup de main en retour à voir ensemble. La plateforme est **actuellement 100 % gratuite**. Nous souhaitons d’abord construire le réseau et améliorer le service avec vos retours. Une contribution aux frais d’infrastructure ne pourrait intervenir **avant le second semestre 2027**, avec trente jours de préavis. Les [conditions actuelles](/tarifs) restent la référence.

Échangez sur l’expérience utile à votre demande, sans déduire une compétence d’un écusson d’identité. Une rencontre est possible **si les deux personnes le souhaitent**. Aucune réponse à vos dates n’est garantie : gardez une autre solution en préparation.

## <a id="changement"></a>Si le séjour se prolonge ou si un passage devient impossible

Décidez avant le départ qui prévenir et qui pourrait prendre le relais, avec l’accord de cette personne. Une absence prolongée doit être confirmée avec les personnes concernées ; elle ne prolonge pas automatiquement leur disponibilité.

Gardez les consignes à jour et convenez du suivi réellement souhaité. Un message peut signaler une fuite, un accès bloqué ou un dispositif arrêté sans demander au relais de tout résoudre. Si personne ne peut assurer les passages, cherchez une autre organisation plutôt que de compter sur un remplacement immédiat par la plateforme.

Si des animaux restent au logement, organisez leurs soins et la présence nécessaire séparément. Un passage prévu pour les plantes ne suffit pas à décider de leur garde.

## <a id="faq"></a>Questions fréquentes

:::faq
### Comment trouver quelqu’un pour arroser à Grenoble ?
Sollicitez un proche, un voisin, un professionnel ou l’entraide locale. Précisez vos dates, les tâches et les accès avant de confirmer les passages.

### Faut-il demander un arrosage quotidien en été ?
Pas par principe. Les consignes dépendent des plantes, de leurs conditions et des restrictions en vigueur. Faites préciser leurs besoins avant le départ plutôt que d’appliquer un rythme à tous les pots.

### Un arrosage automatique suffit-il pendant toute l’absence ?
Cela dépend du dispositif et de votre organisation. Testez-le, laissez sa notice et convenez des vérifications nécessaires ainsi que d’un contact en cas d’arrêt ou de fuite.

### Comment connaître les restrictions d’eau applicables à mon logement ?
Consultez VigiEau à l’adresse exacte en renseignant votre profil et le type d’eau utilisé. Vérifiez les mesures pour l’usage concerné et prévoyez de les reconsulter si la situation évolue.

### Peut-on demander seulement l’arrosage, sans héberger ?
Oui : une demande d’entraide peut porter sur des passages. Un séjour de house-sitting doit être organisé séparément si vous souhaitez confier la maison.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='aff2d4ad-2426-48bc-9bd2-f681fe6fec94'::uuid AND slug='arroser-plantes-vacances-grenoble';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS TRUE
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/arroser-plantes-vacances-grenoble' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Arroser ses plantes pendant les vacances à Grenoble : préparer les passages'
    AND before_row.excerpt IS NOT DISTINCT FROM 'À Grenoble, préparez un relais d’arrosage avec des consignes par plante, les accès utiles et une organisation adaptable pendant votre absence.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Arroser ses plantes pendant les vacances à Grenoble'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Arrosage pendant les vacances à Grenoble : organisez les passages, adaptez les consignes aux plantes et vérifiez les restrictions d’eau avant de partir.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne arrose une plante dans un appartement ouvert sur un balcon, avec des montagnes à l’arrière-plan.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide de garde à Grenoble et en Chartreuse","url":"/actualites/pet-sitting-grenoble-chartreuse"},{"text":"guide général d’arrosage pendant les vacances","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-12 15:55:11.350425+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot15_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot15_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot15_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Arroser ses plantes pendant les vacances à Grenoble : préparer les passages',
    excerpt='À Grenoble, préparez un relais d’arrosage avec des consignes par plante, les accès utiles et une organisation adaptable pendant votre absence.',
    meta_title='Arroser ses plantes pendant les vacances à Grenoble',
    meta_description='Arrosage pendant les vacances à Grenoble : organisez les passages, adaptez les consignes aux plantes et vérifiez les restrictions d’eau avant de partir.',
    hero_image_alt='Une personne arrose une plante dans un appartement ouvert sur un balcon, avec des montagnes à l’arrière-plan.',
    internal_links='[{"text":"guide de garde à Grenoble et en Chartreuse","url":"/actualites/pet-sitting-grenoble-chartreuse"},{"text":"guide général d’arrosage pendant les vacances","url":"/actualites/arroser-plantes-pendant-vacances-guide"},{"text":"conditions actuelles","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='arroser-plantes-vacances-grenoble' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
