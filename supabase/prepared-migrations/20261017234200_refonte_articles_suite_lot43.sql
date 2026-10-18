-- Refonte des guides anciens-debutant-erreurs, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot43_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot43_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot43_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot43_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('a0d4e878-7d07-42bf-b44d-0071df5a608b'::uuid,'6a893d5b-dafa-43b5-a612-00a44d945f56'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Débuter comme gardien : présenter son expérience et ses limites

**Pour commencer, décrivez les situations que vous connaissez déjà et les tâches que vous pouvez assurer.** Le [guide actuel de création d’un profil de gardien](/actualites/creer-profil-gardien-attractif) détaille la présentation, la photo, les disponibilités et les échanges à préparer.

## <a id="reperes"></a>Ce qu’un premier profil doit faire comprendre

| Élément | Information utile |
| --- | --- |
| Expérience | Animaux côtoyés et tâches pratiquées, même dans un cadre familial ou amical. |
| Disponibilités | Dates, contraintes et présence que vous pouvez réellement proposer. |
| Limites | Taille ou réactions d’animaux, soins et tâches qui dépassent vos capacités. |
| Motivation | Ce que vous recherchez et comprenez des responsabilités d’une garde. |

Aimer les animaux ne suffit pas à savoir gérer toutes les situations. N’annoncez pas une capacité à administrer un traitement ou tenir plusieurs chiens si vous ne l’avez pas réellement pratiquée et acceptée pour la garde concernée. Une maison peut aussi être gardée sans animaux.

Choisissez une photo reconnaissable, sans supposer qu’un animal sur l’image garantit davantage de demandes. Un contrôle de document d’identité, lorsqu’un profil l’affiche, ne certifie ni une compétence ni la fiabilité. Décrivez honnêtement votre expérience si vous n’avez pas encore d’avis.

Avant de confirmer, échangez sur les besoins de l’annonce et posez les questions manquantes. Une rencontre est possible si vous le souhaitez tous les deux. Pour préparer la suite, le [guide de première garde](/actualites/reussir-premiere-garde-house-sitting) aide à organiser les consignes et les imprévus.

Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération, et la plateforme est actuellement gratuite selon les [conditions tarifaires](/tarifs). Déplacements, nourriture et dépenses éventuelles restent distincts. Aucun profil ne garantit une maison disponible ou une première garde acceptée.

## <a id="faq"></a>Questions fréquentes

:::faq
### Puis-je présenter une expérience acquise hors de Guardiens ?
Oui, décrivez les situations réelles, les animaux concernés et les gestes pratiqués, sans inventer de témoignage ou d’expérience sur la plateforme.

### Où lire les conseils détaillés pour commencer mon profil ?
Le guide actuel de création du profil rassemble les repères de photo, d’expérience, de disponibilité et de limites. Le lien de cette page et le bouton final permettent de le consulter.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='a0d4e878-7d07-42bf-b44d-0071df5a608b'::uuid AND slug='devenir-pet-sitter-guide-debutant';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/creer-profil-gardien-attractif' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Débuter comme gardien : présenter son expérience et ses limites'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Débuter demande de décrire ce que vous savez réellement assurer. Le guide actuel vous accompagne pour présenter votre profil et préparer les premiers échanges.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Débuter comme gardien : préparer son premier profil'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Vous débutez dans la garde de maison et d’animaux ? Présentez vos expériences réelles, vos disponibilités et vos limites, puis consultez le guide actuel.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une adulte promène deux chiens en laisse sur un chemin bordé de maisons.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de création d’un profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-09-05 06:57:45.541044+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot43_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot43_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot43_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Débuter comme gardien : présenter son expérience et ses limites',
    excerpt='Débuter demande de décrire ce que vous savez réellement assurer. Le guide actuel vous accompagne pour présenter votre profil et préparer les premiers échanges.',
    meta_title='Débuter comme gardien : préparer son premier profil',
    meta_description='Vous débutez dans la garde de maison et d’animaux ? Présentez vos expériences réelles, vos disponibilités et vos limites, puis consultez le guide actuel.',
    hero_image_alt='Une adulte promène deux chiens en laisse sur un chemin bordé de maisons.',
    internal_links='[{"text":"guide actuel de création d’un profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"guide de première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='devenir-pet-sitter-guide-debutant' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Première garde de maison : les points à vérifier avant de confirmer

**Avant une première garde, clarifiez les conditions que vous pouvez assurer et les consignes qui devront vous être transmises.** Le [guide actuel pour réussir une première garde](/actualites/reussir-premiere-garde-house-sitting) rassemble les préparatifs détaillés.

## <a id="reperes"></a>Les questions qui changent l’organisation

| Sujet | Question à poser |
| --- | --- |
| Présence | Quelles absences sont possibles et quel relais est prévu ? |
| Animaux | Quels repas, réactions, sorties et gestes sont réellement nécessaires ? |
| Logement | Quels accès, rangements et équipements seront utilisés ? |
| Imprévu | Qui joindre et quelle solution professionnelle ou d’urgence est accessible ? |

Une rencontre préalable est possible si vous le souhaitez tous les deux. Quel que soit le choix, confirmez les informations à transmettre, les accès, le matériel et les gestes nécessaires.

Transmettez les habitudes utiles sans imposer une routine valable pour tous les animaux. La météo, l’état de santé ou une difficulté peuvent demander une adaptation et un avis approprié. N’attribuez pas automatiquement un changement à du stress, et ne commencez pas un nouveau traitement ou une activité technique pendant la garde.

Préparez les contacts vétérinaires ou autres professionnels utiles selon les besoins, avec leurs informations actuelles. Le [guide des imprévus pendant une garde](/actualites/gerer-imprevu-pendant-garde) aide à prévoir les relais. Une urgence ne doit pas attendre la réponse du propriétaire.

Convenez aussi des nouvelles à envoyer, de la restitution des accès et des tâches liées au logement. Sur Guardiens, le gardien est hébergé sans rémunération ; la plateforme est actuellement gratuite selon les [conditions tarifaires](/tarifs), avec des frais éventuels distincts. Aucune garde ne garantit l’absence d’incident, un avis positif ou une recommandation.

## <a id="faq"></a>Questions fréquentes

:::faq
### Faut-il dormir dans le logement avant sa première garde ?
Ce n’est pas une étape obligatoire. Une rencontre préalable est possible si les deux personnes le souhaitent ; les conditions, les accès, la présence et les tâches doivent être précisés avant de confirmer.

### Où retrouver les conseils complets de préparation ?
Le guide actuel de première garde détaille l’échange avant confirmation, les consignes, la présence et la gestion des imprévus. Il est accessible par le lien de cette page et le bouton final.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='6a893d5b-dafa-43b5-a612-00a44d945f56'::uuid AND slug='erreurs-premiere-garde';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/reussir-premiere-garde-house-sitting' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Première garde de maison : les points à vérifier avant de confirmer'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Posez les questions qui changent l’organisation : présence, accès, gestes acceptés et contacts. Le guide actuel détaille la préparation de votre première garde.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Première garde : les points à vérifier avant de confirmer'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Présence, accès, animaux et contacts : préparez votre première garde sans routine universelle ou risque zéro promis. Retrouvez le guide actuel.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne prépare un sac près d’un chien dans un salon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel pour réussir une première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-03 20:25:06.943955+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot43_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot43_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot43_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Première garde de maison : les points à vérifier avant de confirmer',
    excerpt='Posez les questions qui changent l’organisation : présence, accès, gestes acceptés et contacts. Le guide actuel détaille la préparation de votre première garde.',
    meta_title='Première garde : les points à vérifier avant de confirmer',
    meta_description='Présence, accès, animaux et contacts : préparez votre première garde sans routine universelle ou risque zéro promis. Retrouvez le guide actuel.',
    hero_image_alt='Une personne prépare un sac près d’un chien dans un salon.',
    internal_links='[{"text":"guide actuel pour réussir une première garde","url":"/actualites/reussir-premiere-garde-house-sitting"},{"text":"guide des imprévus pendant une garde","url":"/actualites/gerer-imprevu-pendant-garde"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='erreurs-premiere-garde' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
