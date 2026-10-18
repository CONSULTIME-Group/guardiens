-- Refonte des guides anciens-aura-golden, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot45_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot45_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot45_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot45_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('03f0bf66-bbbd-4953-b2e1-901e28677629'::uuid,'30cf1329-10bc-4d60-890b-4e7caba75672'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Faire garder sa maison en Auvergne-Rhône-Alpes : premiers repères

**Faire garder une maison demande de convenir de la présence, des accès et des tâches pendant l’absence, avec ou sans animaux.** Le [guide actuel de house-sitting en Auvergne-Rhône-Alpes](/actualites/house-sitting-auvergne-rhone-alpes) détaille cette organisation.

## <a id="reperes"></a>Ce qu’il faut prévoir pour votre logement

| Sujet | Informations à transmettre |
| --- | --- |
| Présence | Dates, absences possibles et relais joignable. |
| Accès | Clés, portes, équipements autorisés et restitution. |
| Entretien | Courrier, plantes, jardin ou autres gestes réellement convenus. |
| Imprévu | Contacts utiles, consignes et professionnels à appeler si nécessaire. |

Une maison en ville, à la campagne ou en montagne peut présenter des contraintes différentes. Décrivez celles du logement concerné : accès, équipements et entretien possible. La présence d’un particulier ne remplace pas les vérifications nécessaires avant le départ ni une intervention technique compétente.

Les [conseils de préparation avant une absence prolongée](/actualites/securiser-maison-absence-prolongee) complètent ces questions. Un gardien ne garantit pas une présence vingt-quatre heures sur vingt-quatre, la prévention d’un cambriolage ou l’absence de dégât des eaux. Les conditions d’assurance et les éventuelles clauses d’inoccupation doivent être vérifiées avec l’assureur.

Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération. La plateforme est actuellement gratuite selon les [conditions tarifaires](/tarifs), et les dépenses restent distinctes. Discutez de l’expérience, des limites et des tâches ; un contrôle de document d’identité ne certifie ni une compétence ni la fiabilité.

Une rencontre est possible si vous le souhaitez tous les deux. Confirmez l’organisation et les contacts avant le départ, sans compter sur une candidature ou un remplacement garanti.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver le guide actuel pour une garde de maison dans la région ?
Le guide de house-sitting en Auvergne-Rhône-Alpes rassemble les préparatifs et les questions à convenir. Le lien de cette page et le bouton final permettent de le consulter.

### Faut-il avoir des animaux pour faire garder sa maison ?
Non. La garde peut concerner la maison avec ou sans animaux. Décrivez les dates, la présence et les tâches nécessaires pour vérifier ce que la personne peut assurer.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='03f0bf66-bbbd-4953-b2e1-901e28677629'::uuid AND slug='gardiennage-maison-vacances-aura';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/house-sitting-auvergne-rhone-alpes' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder sa maison en Auvergne-Rhône-Alpes : premiers repères'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Décrivez la présence et les tâches nécessaires pendant votre absence. Le guide actuel de la région détaille les conditions à préparer avec un gardien.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de maison en Auvergne-Rhône-Alpes : repères'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez la garde de votre maison en Auvergne-Rhône-Alpes : présence, accès, entretien et contacts. Retrouvez le guide actuel et les conditions à convenir.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une adulte arrose des plantes dans une maison, près d’une table avec un sac et des documents.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de house-sitting en Auvergne-Rhône-Alpes","url":"/actualites/house-sitting-auvergne-rhone-alpes"},{"text":"conseils de préparation avant une absence prolongée","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-04 09:55:16.503839+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot45_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot45_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot45_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder sa maison en Auvergne-Rhône-Alpes : premiers repères',
    excerpt='Décrivez la présence et les tâches nécessaires pendant votre absence. Le guide actuel de la région détaille les conditions à préparer avec un gardien.',
    meta_title='Garde de maison en Auvergne-Rhône-Alpes : repères',
    meta_description='Préparez la garde de votre maison en Auvergne-Rhône-Alpes : présence, accès, entretien et contacts. Retrouvez le guide actuel et les conditions à convenir.',
    hero_image_alt='Une adulte arrose des plantes dans une maison, près d’une table avec un sac et des documents.',
    internal_links='[{"text":"guide actuel de house-sitting en Auvergne-Rhône-Alpes","url":"/actualites/house-sitting-auvergne-rhone-alpes"},{"text":"conseils de préparation avant une absence prolongée","url":"/actualites/securiser-maison-absence-prolongee"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='gardiennage-maison-vacances-aura' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Golden Retriever à Lyon : préparer les habitudes pour sa garde

**Pour faire garder votre Golden, décrivez ses repas, ses sorties, son repos et ses réactions réelles.** Le [guide actuel de garde du Golden Retriever](/actualites/golden-retriever-guide-race-complet) rassemble les préparatifs détaillés, notamment les baignades et la chaleur.

## <a id="reperes"></a>Les points à convenir avant la garde

| Point | Ce qu’il faut préciser |
| --- | --- |
| Présence | Habitudes d’absence, interactions et relais possible. |
| Sorties | Parcours connus, équipement et réactions avec les autres personnes ou animaux. |
| Repas et entretien | Quantités, récompenses, matériel et gestes acceptés. |
| Santé | Suivi connu, ordonnance éventuelle et contacts vétérinaires. |

La réputation de chien sociable ou nageur ne suffit pas à prévoir la réaction de votre Golden. Ne lui imposez pas des rencontres ou une activité nouvelle pendant la garde. La durée d’exercice doit être adaptée au chien concerné et aux conditions, sans équivalence de minutes ou bonheur garanti par une surface de logement.

À Lyon et alentour, vérifiez les [règles des parcs pour chiens](/actualites/parcs-chiens-lyon-guide-complet) et les conditions propres au lieu. Une baignade doit être convenue, adaptée, autorisée et surveillée ; un lac ou un point d’eau ne peut pas être recommandé comme accessible et sûr par principe.

Échangez avec le gardien sur ce qu’il peut assurer. Une rencontre préalable est possible si vous le souhaitez tous les deux. Un document d’identité contrôlé ne certifie ni une compétence ni la fiabilité ; prévoyez les consignes et un relais avant de confirmer.

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite, selon les [conditions tarifaires](/tarifs). Nourriture, déplacements et autres dépenses restent distincts, sans candidature ou remplacement garantis.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où lire les conseils détaillés de garde du Golden Retriever ?
Le guide actuel traite les habitudes, les sorties, le repos, la chaleur et les baignades à préparer. Le lien de cette page et le bouton final permettent de le consulter.

### Peut-on prévoir une baignade parce que la race aime l’eau ?
La baignade doit être adaptée au chien, convenue avec le propriétaire, autorisée sur le site et surveillée. La réputation de nageur ne suffit pas à décider pour la garde.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='30cf1329-10bc-4d60-890b-4e7caba75672'::uuid AND slug='golden-retriever-lyon-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/golden-retriever-guide-race-complet' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Golden Retriever à Lyon : préparer les habitudes pour sa garde'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Présentez les habitudes de votre Golden et les conditions de ses sorties. Le guide actuel détaille la présence, le suivi et les précautions de baignade.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Golden Retriever à Lyon : préparer sa garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Repas, sorties, repos et baignades : préparez les consignes de votre Golden à Lyon. Le guide actuel détaille les questions à convenir avec le gardien.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Golden Retriever est assis dans l’herbe devant des arbres.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de garde du Golden Retriever","url":"/actualites/golden-retriever-guide-race-complet"},{"text":"règles des parcs pour chiens","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-27 05:40:04.686117+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot45_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot45_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot45_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Golden Retriever à Lyon : préparer les habitudes pour sa garde',
    excerpt='Présentez les habitudes de votre Golden et les conditions de ses sorties. Le guide actuel détaille la présence, le suivi et les précautions de baignade.',
    meta_title='Golden Retriever à Lyon : préparer sa garde',
    meta_description='Repas, sorties, repos et baignades : préparez les consignes de votre Golden à Lyon. Le guide actuel détaille les questions à convenir avec le gardien.',
    hero_image_alt='Un Golden Retriever est assis dans l’herbe devant des arbres.',
    internal_links='[{"text":"guide actuel de garde du Golden Retriever","url":"/actualites/golden-retriever-guide-race-complet"},{"text":"règles des parcs pour chiens","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='golden-retriever-lyon-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
