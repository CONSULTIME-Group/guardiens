-- Refonte des guides anciens guides Saint-Étienne et comparatif, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot50_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot50_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot50_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot50_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('43285193-b26f-4a4a-8506-6c025b7bb26c'::uuid,'80fce89b-d6ee-4e87-a48e-c2a45e05cb6d'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# House-sitting à Saint-Étienne : préparer la garde et le séjour

**Le house-sitting à Saint-Étienne consiste à séjourner dans un logement pendant l’absence de ses occupants, avec des tâches et une présence convenues.** Le [guide actuel de garde à Saint-Étienne et dans la Loire](/actualites/pet-sitting-saint-etienne-loire) aide à comparer les solutions et préparer la recherche.

## <a id="reperes"></a>Ce qu’il faut organiser avant de confirmer

| Point | Question utile |
| --- | --- |
| Présence | Quelles nuitées et quelles absences sont compatibles avec les besoins ? |
| Logement | Quels accès, équipements et gestes d’entretien sont prévus ? |
| Animaux éventuels | Quelles routines, réactions et consignes de suivi transmettre ? |
| Relais | Qui a accepté d’aider si la garde doit être interrompue ? |

Le quartier et le type de logement ne permettent pas de déduire le nombre d’animaux ou les capacités nécessaires. Décrivez les besoins concrets plutôt qu’un profil supposé de propriétaire ou de gardien stéphanois.

Un séjour près d’espaces naturels ne vaut pas autorisation de randonnée avec l’animal gardé. Convenez des parcours, vérifiez les règles du site et adaptez la sortie aux habitudes et à la santé de l’animal. Une garde n’est pas un séjour touristique sans contraintes.

Échangez sur l’expérience et les limites avant de confirmer. Une rencontre est possible si vous le souhaitez tous les deux. Les avis, lorsqu’ils existent, et un document contrôlé ne certifient pas les compétences. Une candidature ou une garde disponible à vos dates n’est pas garantie.

Sur Guardiens, le gardien est hébergé sans rémunération ; la plateforme est actuellement gratuite pour les propriétaires et les gardiens. Les transports, l’alimentation et les dépenses convenues restent distincts, selon les [conditions tarifaires](/tarifs). Préparez aussi la [maison avant la garde](/actualites/preparer-maison-avant-garde).

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver les conseils actuels pour une garde à Saint-Étienne ?
Le guide de Saint-Étienne et de la Loire compare les solutions et détaille la préparation. Consultez-le avant de définir votre recherche ou d’accepter un séjour.

### Une garde sur Guardiens procure-t-elle un revenu ?
Le gardien est hébergé sans rémunération. La gratuité actuelle de la plateforme se distingue des dépenses de déplacement et des frais convenus pour la garde.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='43285193-b26f-4a4a-8506-6c025b7bb26c'::uuid AND slug='house-sitting-saint-etienne-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-saint-etienne-loire' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting à Saint-Étienne : préparer la garde et le séjour'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Préparez une garde à partir du logement et des besoins réels, puis consultez le guide actuel de Saint-Étienne et de la Loire pour comparer les solutions.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting à Saint-Étienne : les préparatifs utiles'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Présence, accès et besoins des animaux éventuels : préparez une garde à Saint-Étienne et retrouvez le guide actuel des solutions dans la Loire.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un jardin arboré avec un banc et une allée pavée, près d’une maison aux volets verts.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de garde à Saint-Étienne et dans la Loire","url":"/actualites/pet-sitting-saint-etienne-loire"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"maison avant la garde","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-03 20:25:06.943955+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot50_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot50_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot50_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting à Saint-Étienne : préparer la garde et le séjour',
    excerpt='Préparez une garde à partir du logement et des besoins réels, puis consultez le guide actuel de Saint-Étienne et de la Loire pour comparer les solutions.',
    meta_title='House-sitting à Saint-Étienne : les préparatifs utiles',
    meta_description='Présence, accès et besoins des animaux éventuels : préparez une garde à Saint-Étienne et retrouvez le guide actuel des solutions dans la Loire.',
    hero_image_alt='Un jardin arboré avec un banc et une allée pavée, près d’une maison aux volets verts.',
    internal_links='[{"text":"guide actuel de garde à Saint-Étienne et dans la Loire","url":"/actualites/pet-sitting-saint-etienne-loire"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"maison avant la garde","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-saint-etienne-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# House-sitting ou pension : comparer la présence et les besoins

**Le choix entre house-sitting, accueil chez un particulier et pension dépend des besoins de l’animal et de l’organisation réellement proposée.** Le [guide actuel des pensions et alternatives pour chien](/actualites/pension-chien-alternatives-guide) détaille les questions à poser avant de décider.

*La couverture est un montage illustratif ; elle ne décrit pas les conditions de tous les établissements ni une expérience réelle de membres.*

## <a id="reperes"></a>Comparer des conditions précises

| Critère | Ce qu’il faut demander |
| --- | --- |
| Lieu | Où séjourne l’animal et quels espaces utilise-t-il ? |
| Présence | Qui est présent le jour, la nuit et pendant les absences ? |
| Suivi | Qui accepte les consignes et dispose des capacités nécessaires ? |
| Budget | Que couvrent le devis ou les dépenses convenues ? |

Dans une garde à domicile, l’animal conserve son environnement mais accueille une autre personne. Cela ne garantit pas l’absence de stress. En pension ou chez un particulier, demandez comment sont organisés le repos, les contacts avec les autres animaux et les temps sans présence.

Aucune formule ne garantit une surveillance permanente. Le fait d’employer du personnel, de séjourner dans le logement ou de présenter des avis ne suffit pas : vérifiez les conditions adaptées à votre animal. Un besoin de soins important se prépare avec le vétérinaire et ne rend pas toute pension automatiquement adaptée.

Comparez les devis sur les mêmes unités et prestations plutôt qu’une moyenne de prix générale. Sur Guardiens, la plateforme est actuellement gratuite pour les deux rôles et le gardien est hébergé sans rémunération. Dépenses de l’animal, trajets et autres frais convenus restent distincts : voir les [conditions tarifaires](/tarifs).

Si vous choisissez le house-sitting, définissez aussi les tâches pour la maison, la passation et le relais. Une maison habitée ne garantit pas la prévention des sinistres, et une candidature ou un remplacement n’est pas assuré. Une rencontre est possible si vous le souhaitez tous les deux.

## <a id="faq"></a>Questions fréquentes

:::faq
### Le house-sitting est-il toujours préférable à la pension ?
Non. Comparez les besoins de l’animal, la présence, les capacités et les conditions concrètes de chaque solution. Le maintien à domicile ne garantit pas l’absence de stress.

### Comment comparer le coût de deux solutions ?
Demandez ce qui est inclus : durée, nuits, sorties, suivi, transports et frais supplémentaires. Un échange avec hébergement sans rémunération conserve des dépenses à organiser.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='80fce89b-d6ee-4e87-a48e-c2a45e05cb6d'::uuid AND slug='house-sitting-vs-pension-comparatif';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pension-chien-alternatives-guide' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting ou pension : comparer la présence et les besoins'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Le choix dépend de l’animal, de la présence et du suivi réellement proposés. Le guide actuel aide à comparer les solutions sans promesse de formule idéale.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting ou pension : les bonnes questions à comparer'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Comparez lieu, présence réelle, suivi, budget et relais avant de choisir house-sitting ou pension. Retrouvez le guide actuel pour préparer une garde adaptée.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Montage : une personne avec un chien et un chat sur un canapé, à côté d’un couloir avec des espaces vitrés pour animaux.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel des pensions et alternatives pour chien","url":"/actualites/pension-chien-alternatives-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-04 11:36:45.79077+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot50_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot50_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot50_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting ou pension : comparer la présence et les besoins',
    excerpt='Le choix dépend de l’animal, de la présence et du suivi réellement proposés. Le guide actuel aide à comparer les solutions sans promesse de formule idéale.',
    meta_title='House-sitting ou pension : les bonnes questions à comparer',
    meta_description='Comparez lieu, présence réelle, suivi, budget et relais avant de choisir house-sitting ou pension. Retrouvez le guide actuel pour préparer une garde adaptée.',
    hero_image_alt='Montage : une personne avec un chien et un chat sur un canapé, à côté d’un couloir avec des espaces vitrés pour animaux.',
    internal_links='[{"text":"guide actuel des pensions et alternatives pour chien","url":"/actualites/pension-chien-alternatives-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-vs-pension-comparatif' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
