-- Refonte des guides anciennes checklists de préparation de la maison, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot54_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot54_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot54_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot54_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('eb952a26-cf7a-4ac4-aa7d-b50ff9f11ff8'::uuid,'b57f3a0e-a94c-4105-86d5-dfdcde75c6ed'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Préparer sa maison avant une garde : les premiers points à réunir

**Pour préparer une maison avant une garde, réunissez les informations que la personne doit réellement connaître : accès, routines, tâches et contacts.** La [checklist actuelle de préparation de la maison](/actualites/preparer-maison-avant-garde) détaille la passation, avec ou sans animaux.

## <a id="reperes"></a>Les informations essentielles à transmettre

| Sujet | Ce qu’il faut préparer |
| --- | --- |
| Accès | Clés testées, portes autorisées et modalités de restitution. |
| Logement | Équipements utilisables, consignes et gestes acceptés. |
| Animaux éventuels | Repas, sorties, réactions et suivi prescrit. |
| Contacts | Vétérinaire, contact technique et relais ayant accepté. |

Gardez les codes et informations sensibles dans un espace partagé avec les bonnes personnes, plutôt que dans une annonce publique. Indiquez les points de coupure utiles sans demander au gardien une intervention technique qui dépasse ses capacités.

Préparez un couchage et des équipements utilisables. Rangez les produits dangereux et expliquez les fenêtres, portes ou accès à surveiller selon l’animal. Un logement rangé facilite la passation mais ne garantit pas l’absence d’incident.

Conservez les habitudes connues. Si un traitement est prescrit, transmettez les consignes du vétérinaire et vérifiez que la personne sait et accepte de les suivre. Ne demandez pas qu’elle connaisse l’animal aussi bien que vous dès son arrivée.

Concertez-vous sur le temps nécessaire à la passation et le rythme des nouvelles ; il n’existe pas de durée de briefing valable pour toutes les gardes. Une rencontre est possible si vous le souhaitez tous les deux. Confirmez les conditions et prévoyez le relais plutôt que de compter sur des messages ou un remplacement automatiques.

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les deux rôles. Les dépenses convenues restent distinctes, selon les [conditions tarifaires](/tarifs).

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver la checklist actuelle avant une garde ?
Le guide de préparation de la maison rassemble les accès, consignes, contacts et conditions à convenir. Le bouton final permet de le consulter.

### Combien de temps faut-il prévoir pour la passation ?
Selon les besoins du logement et des animaux éventuels. Convenez d’un temps suffisant pour expliquer les gestes acceptés et vérifier leur compréhension, sans durée universelle imposée.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='eb952a26-cf7a-4ac4-aa7d-b50ff9f11ff8'::uuid AND slug='preparer-maison-avant-vacances';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/preparer-maison-avant-garde' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Préparer sa maison avant une garde : les premiers points à réunir'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Préparez une passation compréhensible : clés, équipements, routines et contacts. La checklist actuelle détaille les informations utiles avant le départ.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Maison avant une garde : accès, consignes et contacts'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Réunissez les accès, consignes, contacts et besoins des animaux éventuels avant le départ. Retrouvez la checklist actuelle pour préparer la maison.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une valise dans une entrée, près d’une table avec des clés, un carnet et des plantes en pot.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"checklist actuelle de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-03 20:25:06.943955+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot54_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot54_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot54_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Préparer sa maison avant une garde : les premiers points à réunir',
    excerpt='Préparez une passation compréhensible : clés, équipements, routines et contacts. La checklist actuelle détaille les informations utiles avant le départ.',
    meta_title='Maison avant une garde : accès, consignes et contacts',
    meta_description='Réunissez les accès, consignes, contacts et besoins des animaux éventuels avant le départ. Retrouvez la checklist actuelle pour préparer la maison.',
    hero_image_alt='Une valise dans une entrée, près d’une table avec des clés, un carnet et des plantes en pot.',
    internal_links='[{"text":"checklist actuelle de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='preparer-maison-avant-vacances' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Propriétaire : convenir des conditions et préparer la passation

**Préparer une garde commence par convenir de ce que chacun accepte : présence, tâches, nouvelles, frais et relais.** La [checklist actuelle de préparation de la maison](/actualites/preparer-maison-avant-garde) aide à réunir les consignes et organiser la passation, avec ou sans animaux.

## <a id="reperes"></a>Les points à clarifier avant de partir

| Sujet | Accord utile |
| --- | --- |
| Présence | Dates, nuitées et absences compatibles avec les besoins. |
| Nouvelles | Rythme des messages et situations nécessitant un appel. |
| Consignes | Tâches acceptées, routines et limites d’intervention. |
| Imprévus | Contacts, relais accepté et prise en charge des dépenses. |

Une personne logée sur place n’assure pas automatiquement une surveillance permanente. Décrivez les contraintes particulières dans l’annonce et vérifiez les capacités réelles avant confirmation. Une rencontre peut compléter l’échange si vous le souhaitez tous les deux.

Après confirmation, préparez les consignes et votre accord écrit. L’outil d’accord de la plateforme ne remplace pas une vérification des assurances ; sa signature reste facultative. Pour les animaux, transmettez la prescription éventuelle et le contact du vétérinaire, sans demander au gardien de diagnostiquer ou d’adapter un traitement.

Laissez les accès et le matériel nécessaires aux seuls gestes convenus. Présentez les routines connues et les comportements habituels, sans présumer qu’une odeur familière ou une préparation élimine tout risque d’adaptation.

Pendant la garde, respectez le rythme de nouvelles convenu. Les photos et messages ne sont pas automatiques ; précisez aussi la conduite à tenir si vous êtes injoignable. Préparez un relais ayant accepté ce rôle si la garde doit s’interrompre.

Au retour, organisez la restitution des clés et faites le point sur les dépenses. Un avis peut aider les futurs membres sans garantir une prochaine garde ou la fiabilité du profil.

La plateforme est actuellement gratuite pour les deux rôles ; le gardien est hébergé sans rémunération. Les dépenses restent distinctes, selon les [conditions tarifaires](/tarifs).

## <a id="faq"></a>Questions fréquentes

:::faq
### Où retrouver les préparatifs détaillés pour une garde ?
La checklist actuelle rassemble les accès, routines, contacts et conditions à convenir. Consultez-la pour préparer les informations utiles à votre logement.

### Le gardien envoie-t-il automatiquement des nouvelles chaque jour ?
Non. Convenez du rythme, du moyen de contact et des situations nécessitant un appel. Prévoyez aussi un relais si vous êtes injoignable ou si la garde s’interrompt.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='b57f3a0e-a94c-4105-86d5-dfdcde75c6ed'::uuid AND slug='proprietaire-preparer-garde-maison';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/preparer-maison-avant-garde' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Propriétaire : convenir des conditions et préparer la passation'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Préparez les conditions de présence, les consignes et les relais avant de partir. La checklist actuelle vous aide à organiser la passation du logement.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Préparer une garde : présence, consignes et relais'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Présence, nouvelles, routines et imprévus : préparez les conditions de votre garde et retrouvez la checklist actuelle pour organiser la passation.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chat roux endormi sur un canapé, près d’une table avec une caisse de transport, des documents et du matériel pour chat.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"checklist actuelle de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-14 13:59:17.121368+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot54_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot54_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot54_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Propriétaire : convenir des conditions et préparer la passation',
    excerpt='Préparez les conditions de présence, les consignes et les relais avant de partir. La checklist actuelle vous aide à organiser la passation du logement.',
    meta_title='Préparer une garde : présence, consignes et relais',
    meta_description='Présence, nouvelles, routines et imprévus : préparez les conditions de votre garde et retrouvez la checklist actuelle pour organiser la passation.',
    hero_image_alt='Un chat roux endormi sur un canapé, près d’une table avec une caisse de transport, des documents et du matériel pour chat.',
    internal_links='[{"text":"checklist actuelle de préparation de la maison","url":"/actualites/preparer-maison-avant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='proprietaire-preparer-garde-maison' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
