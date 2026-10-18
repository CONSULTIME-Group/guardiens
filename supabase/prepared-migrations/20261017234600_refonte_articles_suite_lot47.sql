-- Refonte des guides anciennes pages Annecy et voyage, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot47_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot47_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot47_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot47_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('32216cbc-2167-4d1f-b854-f67a7f9665cd'::uuid,'27dbc88c-09ab-428a-9eff-ce203b0c6aa6'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# House-sitting à Annecy : préparer une garde dans votre logement

**Pour une garde de maison à Annecy, décrivez d’abord vos dates, la présence attendue et les tâches à assurer, avec ou sans animaux.** La [page consacrée au house-sitting à Annecy](/house-sitting/annecy) permet de poursuivre votre recherche ; les disponibilités restent à confirmer avec les personnes concernées.

## <a id="reperes"></a>Les informations utiles avant un échange

| Point | À préciser |
| --- | --- |
| Accès | Quartier, stationnement, étage, remise des clés et trajet réel. |
| Présence | Nuitées, absences possibles, horaires et personne relais. |
| Animaux éventuels | Routines, sorties connues, réactions et suivi prescrit. |
| Maison | Plantes, courrier et gestes d’entretien acceptés. |

Un gardien du secteur ne connaît pas forcément votre équipement, votre vétérinaire ou les réactions de votre animal. Expliquez les consignes et les limites ; une proximité géographique ne garantit ni une compétence ni une arrivée sous un délai donné.

Pour les sorties, appuyez-vous sur les [repères de promenade à Annecy](/actualites/parcs-balades-chiens-annecy-guide). L’accès au bord du lac ou à un sentier ne signifie pas que le chien peut être détaché, se baigner ou passer partout. Vérifiez les règles du lieu et convenez des parcours avant la garde.

Si le logement comporte des équipements à protéger du gel ou une installation particulière, laissez les consignes adaptées et un contact compétent. N’attendez pas du gardien une intervention technique non convenue.

Une rencontre est possible si vous le souhaitez tous les deux. Les avis, lorsqu’ils existent, et un document d’identité contrôlé complètent l’échange sans certifier les capacités. Préparez aussi un relais : aucun remplacement automatique n’est garanti.

Sur Guardiens, la plateforme est actuellement gratuite pour les deux rôles et le gardien est hébergé sans rémunération. Les dépenses convenues restent distinctes ; consultez les [conditions tarifaires](/tarifs).

## <a id="faq"></a>Questions fréquentes

:::faq
### Où poursuivre ma recherche de house-sitting à Annecy ?
La page locale d’Annecy présente les repères pour votre recherche. Décrivez vos dates et les besoins du logement, puis confirmez directement la disponibilité et les conditions avec les personnes concernées.

### Un gardien à proximité peut-il remplacer automatiquement un autre gardien ?
Non. Préparez un relais ayant accepté ce rôle et les conditions d’accès. La proximité seule ne garantit ni une disponibilité immédiate ni un remplacement.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='32216cbc-2167-4d1f-b854-f67a7f9665cd'::uuid AND slug='house-sitting-annecy';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/house-sitting/annecy' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting à Annecy : préparer une garde dans votre logement'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une garde à Annecy se prépare selon votre logement et les besoins réels. Retrouvez les points à préciser et la page locale pour poursuivre votre recherche.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting à Annecy : les conditions à préparer'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Dates, présence, accès et animaux éventuels : définissez votre besoin de garde à Annecy et retrouvez la page locale pour préparer votre recherche.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une maison en bois avec une terrasse et un ponton au bord d’un lac, face aux montagnes.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page consacrée au house-sitting à Annecy","url":"/house-sitting/annecy"},{"text":"repères de promenade à Annecy","url":"/actualites/parcs-balades-chiens-annecy-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-14 13:59:17.121368+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot47_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot47_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot47_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting à Annecy : préparer une garde dans votre logement',
    excerpt='Une garde à Annecy se prépare selon votre logement et les besoins réels. Retrouvez les points à préciser et la page locale pour poursuivre votre recherche.',
    meta_title='House-sitting à Annecy : les conditions à préparer',
    meta_description='Dates, présence, accès et animaux éventuels : définissez votre besoin de garde à Annecy et retrouvez la page locale pour préparer votre recherche.',
    hero_image_alt='Une maison en bois avec une terrasse et un ponton au bord d’un lac, face aux montagnes.',
    internal_links='[{"text":"page consacrée au house-sitting à Annecy","url":"/house-sitting/annecy"},{"text":"repères de promenade à Annecy","url":"/actualites/parcs-balades-chiens-annecy-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-annecy' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Voyager en France avec le house-sitting : les conditions à prévoir

**Le house-sitting permet de séjourner dans un logement pendant l’absence de ses occupants, en assurant les tâches convenues.** Le [guide actuel du voyage en France avec le house-sitting](/actualites/voyager-gratuitement-france-house-sitting) détaille les engagements, les dépenses et les limites à prévoir.

## <a id="reperes"></a>Choisir une garde compatible avec votre séjour

| Point | Question à poser avant de confirmer |
| --- | --- |
| Présence | Quelles nuitées et quelles absences sont compatibles avec les besoins ? |
| Déplacements | Faut-il un véhicule et quels trajets sont réellement nécessaires ? |
| Tâches | Quels soins aux animaux éventuels et quel entretien sont attendus ? |
| Budget | Qui prend en charge transport, alimentation et dépenses convenues ? |

Une maison en montagne n’implique pas les mêmes accès qu’un logement desservi par les transports. Demandez les contraintes précises du lieu ; la région ne permet pas de déduire le nombre d’animaux, les équipements ou l’autonomie requise.

Le séjour reste organisé autour de la garde. Une excursion, une journée de télétravail ou une visite à des proches doit rester compatible avec la présence et les routines acceptées. Être hébergé ne signifie pas disposer de vacances sans obligations ni d’un voyage entièrement financé.

Décrivez sincèrement votre expérience et vos limites. Une rencontre peut compléter l’échange si vous le souhaitez tous les deux. Les avis disponibles et un document contrôlé ne garantissent pas une compétence ni la réussite d’une garde.

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les propriétaires et les gardiens, selon les [conditions tarifaires](/tarifs). Les déplacements et autres dépenses restent distincts. Aucune candidature ou garde disponible n’est garantie : prévoyez une autre organisation si votre séjour dépend de dates fixes.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver les conseils actuels pour voyager avec le house-sitting ?
Le guide de voyage en France détaille le choix des gardes, les engagements et le budget. Consultez-le avant d’organiser un déplacement autour d’une garde.

### Le house-sitting rend-il tout le voyage gratuit ?
Non. L’hébergement pendant la garde se distingue des transports, de votre alimentation et des autres dépenses. Convenez des frais et des conditions de présence avant de confirmer.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='27dbc88c-09ab-428a-9eff-ce203b0c6aa6'::uuid AND slug='house-sitting-aura-guide-complet';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/voyager-gratuitement-france-house-sitting' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Voyager en France avec le house-sitting : les conditions à prévoir'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Une garde peut permettre de séjourner dans une région, avec des engagements concrets pour le logement et les animaux éventuels. Retrouvez le guide actuel.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Voyage et house-sitting en France : préparer son séjour'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Le logement pendant une garde ne couvre pas tout le voyage. Préparez présence, tâches et dépenses, puis consultez le guide actuel du house-sitting en France.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien doré allongé dans un jardin devant une maison en pierre, avec des montagnes en arrière-plan.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel du voyage en France avec le house-sitting","url":"/actualites/voyager-gratuitement-france-house-sitting"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-09 10:55:03.343366+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot47_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot47_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot47_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Voyager en France avec le house-sitting : les conditions à prévoir',
    excerpt='Une garde peut permettre de séjourner dans une région, avec des engagements concrets pour le logement et les animaux éventuels. Retrouvez le guide actuel.',
    meta_title='Voyage et house-sitting en France : préparer son séjour',
    meta_description='Le logement pendant une garde ne couvre pas tout le voyage. Préparez présence, tâches et dépenses, puis consultez le guide actuel du house-sitting en France.',
    hero_image_alt='Un chien doré allongé dans un jardin devant une maison en pierre, avec des montagnes en arrière-plan.',
    internal_links='[{"text":"guide actuel du voyage en France avec le house-sitting","url":"/actualites/voyager-gratuitement-france-house-sitting"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-aura-guide-complet' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
