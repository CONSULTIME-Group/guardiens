-- Refonte des guides anciens-guides-bergers, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot40_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot40_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot40_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot40_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('0f3f7b7b-3dfe-409e-80d6-0de7309c72b8'::uuid,'3ee52f4f-260e-48da-9731-a7d2f6509484'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Berger Australien : premiers repères pour préparer sa garde

**La garde d’un Berger Australien se prépare selon ses habitudes et ses réactions, avec une personne capable d’assurer les conditions convenues.** Les conseils détaillés sont réunis dans le [guide actuel de garde du Berger Australien](/actualites/berger-australien-guide-race).

## <a id="reperes"></a>Les points à transmettre avant de confirmer

| À préparer | Ce qu’il faut expliquer |
| --- | --- |
| Sorties et repos | Parcours connus, équipement, activités acceptées et possibilité de se retirer au calme. |
| Réactions | Croisements, visiteurs, autres animaux et situations difficiles déjà observées. |
| Présence | Habitudes d’absence et disponibilité réellement nécessaire. |
| Santé | Suivi connu, ordonnance éventuelle et coordonnées vétérinaires. |

Un nombre d’heures de sport ou de solitude ne convient pas automatiquement à toute la race. Ne commencez pas un entraînement ou un traitement pendant la garde sans cadre adapté ; transmettez les consignes déjà établies. Un résultat de dépistage médicamenteux connu doit être communiqué au vétérinaire, sans interprétation par le gardien.

Pour une sortie à Lyon ou ailleurs, vérifiez les règles du lieu. Un parc, un sentier ou un plateau ne permet pas de promettre une liberté totale. Les [repères sur les parcs pour chiens à Lyon](/actualites/parcs-chiens-lyon-guide-complet) complètent les conditions locales.

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite, selon les [conditions tarifaires](/tarifs). Présence, tâches et dépenses éventuelles sont à convenir ; aucun candidat ou remplacement n’est garanti.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver les conseils détaillés pour cette garde ?
Le guide actuel du Berger Australien rassemble les questions de présence, d’activités, de suivi et de transmission. Il est accessible depuis le lien de cette page et le bouton final.

### Faut-il choisir un gardien sur sa seule pratique du sport ?
Échangez sur les situations et les tâches qu’il peut réellement assurer : tenue en laisse, réactions, repos et éventuel suivi. La pratique d’un sport ne certifie pas une compétence de garde.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='0f3f7b7b-3dfe-409e-80d6-0de7309c72b8'::uuid AND slug='berger-australien-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/berger-australien-guide-race' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Berger Australien : premiers repères pour préparer sa garde'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Les besoins se préparent selon votre chien : sorties, repos, réactions et suivi connu. Retrouvez le guide actuel pour organiser sa garde.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Berger Australien : premiers repères pour sa garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez les habitudes, la présence et les consignes de votre Berger Australien, puis consultez le guide actuel de garde pour organiser les détails.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Berger Australien est couché dans l’herbe devant des hortensias.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de garde du Berger Australien","url":"/actualites/berger-australien-guide-race"},{"text":"repères sur les parcs pour chiens à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-27 05:40:04.686117+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot40_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot40_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot40_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Berger Australien : premiers repères pour préparer sa garde',
    excerpt='Les besoins se préparent selon votre chien : sorties, repos, réactions et suivi connu. Retrouvez le guide actuel pour organiser sa garde.',
    meta_title='Berger Australien : premiers repères pour sa garde',
    meta_description='Préparez les habitudes, la présence et les consignes de votre Berger Australien, puis consultez le guide actuel de garde pour organiser les détails.',
    hero_image_alt='Un Berger Australien est couché dans l’herbe devant des hortensias.',
    internal_links='[{"text":"guide actuel de garde du Berger Australien","url":"/actualites/berger-australien-guide-race"},{"text":"repères sur les parcs pour chiens à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='berger-australien-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Border Collie à Lyon : préparer les conditions de sa garde

**Pour faire garder un Border Collie à Lyon, décrivez les promenades possibles, les réactions observées et les moments de repos.** Le [guide actuel de garde du Border Collie](/actualites/border-collie-guide-race-complet) rassemble les préparatifs détaillés.

## <a id="reperes"></a>Ce qui compte avant de choisir une personne

| Situation | Ce qu’il faut convenir |
| --- | --- |
| Croisement de vélos ou de chiens | Réactions réelles, distance nécessaire et itinéraire de repli. |
| Promenade | Équipement connu, règles du lieu et capacités du gardien. |
| Jeu et repos | Activités déjà pratiquées et conditions pour se poser. |
| Absence | Présence nécessaire, limites et relais possible. |

Une poursuite ou une agitation ne s’explique pas automatiquement par un instinct de troupeau. Les difficultés importantes demandent une préparation adaptée avec le professionnel compétent ; elles ne se règlent pas en imposant davantage de course ou des exercices nouveaux pendant votre absence.

À Lyon, consultez les [règles et repères des parcs pour chiens](/actualites/parcs-chiens-lyon-guide-complet). Un lieu ne doit pas être présenté comme accessible en liberté sans vérification. La surface d’un logement ne suffit pas non plus à déterminer le programme qui convient au chien.

Le choix entre une garde à domicile et une autre organisation dépend des besoins et des conditions réellement possibles. Le house-sitting ne constitue pas une obligation par race et ne garantit pas un stress minimal.

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite, selon les [conditions tarifaires](/tarifs). Préparez les consignes et un relais ; aucune compétence spécialisée ou candidature n’est garantie.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où lire les conseils complets de garde du Border Collie ?
Le guide actuel détaille présence, sorties, repos, réactions et préparation avec le gardien. Le lien de cette page et le bouton final permettent de le consulter.

### Un jeu mental remplace-t-il une heure de promenade ?
Il n’existe pas une équivalence de minutes à appliquer pour préparer la garde. Convenez des activités connues et des sorties adaptées au chien, avec du repos.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='3ee52f4f-260e-48da-9731-a7d2f6509484'::uuid AND slug='border-collie-lyon-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/border-collie-guide-race-complet' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Border Collie à Lyon : préparer les conditions de sa garde'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Décrivez les réactions de votre Border Collie, ses parcours et ses moments de repos. Le guide actuel détaille les questions à poser avant de confirmer sa garde.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Border Collie à Lyon : préparer une garde adaptée'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Sorties, réactions et repos : préparez la garde de votre Border Collie à Lyon et retrouvez le guide actuel, avec des activités et des accès adaptés.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une adulte tient un Border Collie en laisse et harnais sur un chemin urbain.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de garde du Border Collie","url":"/actualites/border-collie-guide-race-complet"},{"text":"règles et repères des parcs pour chiens","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-09-05 06:57:45.541044+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot40_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot40_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot40_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Border Collie à Lyon : préparer les conditions de sa garde',
    excerpt='Décrivez les réactions de votre Border Collie, ses parcours et ses moments de repos. Le guide actuel détaille les questions à poser avant de confirmer sa garde.',
    meta_title='Border Collie à Lyon : préparer une garde adaptée',
    meta_description='Sorties, réactions et repos : préparez la garde de votre Border Collie à Lyon et retrouvez le guide actuel, avec des activités et des accès adaptés.',
    hero_image_alt='Une adulte tient un Border Collie en laisse et harnais sur un chemin urbain.',
    internal_links='[{"text":"guide actuel de garde du Border Collie","url":"/actualites/border-collie-guide-race-complet"},{"text":"règles et repères des parcs pour chiens","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='border-collie-lyon-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
