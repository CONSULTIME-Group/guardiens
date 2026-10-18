-- Refonte des guides anciens-lyon-parcs, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot46_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot46_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot46_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot46_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('5332601d-1924-4401-aaa7-0aa7bac46aba'::uuid,'71909b5d-b272-4b60-b9cb-8264f65033cf'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# House-sitting à Lyon : premiers repères pour préparer une garde

**Le house-sitting consiste à héberger un gardien pendant votre absence, avec des tâches convenues pour la maison et les animaux éventuels.** Le [guide actuel de garde et de pet-sitting à Lyon](/actualites/pet-sitting-lyon-guide-complet) rassemble les solutions et les questions locales.

## <a id="reperes"></a>Ce qu’il faut décrire pour votre logement

| Point | Informations utiles |
| --- | --- |
| Présence | Dates, nuitées, absences possibles et relais. |
| Logement | Accès, escaliers, équipements et usages convenus. |
| Animaux éventuels | Repas, sorties, réactions et suivi connu. |
| Entretien | Plantes, courrier et autres gestes réellement acceptés. |

Le quartier ne permet pas de déduire les besoins d’un logement ou les capacités d’un gardien. Décrivez les accès et les contraintes réels plutôt que de supposer un profil d’animal ou de propriétaire selon l’arrondissement.

Pour les promenades, consultez les [règles et repères des parcs lyonnais](/actualites/parcs-chiens-lyon-guide-complet). Un gardien proche ne connaît pas nécessairement tous les lieux et ne dispose pas d’une compétence garantie. Les avis, lorsqu’ils existent, et un document d’identité contrôlé complètent l’échange sans certifier la fiabilité.

Une rencontre est possible si vous le souhaitez tous les deux. Préparez les contacts et les consignes avant de confirmer ; une première garde courte ne garantit pas les suivantes ni l’absence d’incident.

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite, selon les [conditions tarifaires](/tarifs). Déplacements, nourriture et autres dépenses restent distincts. Une candidature, une présence permanente ou un remplacement ne sont pas garantis.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver le guide actuel de garde à Lyon ?
Le guide de Lyon détaille les solutions, les préparatifs et les questions locales. Le lien de cette page et le bouton final permettent de le consulter.

### Le gardien doit-il habiter mon quartier ?
Échangez sur sa disponibilité, ses déplacements et les conditions de la garde. La proximité peut faciliter l’organisation, mais elle ne garantit pas une compétence ni une personne disponible.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='5332601d-1924-4401-aaa7-0aa7bac46aba'::uuid AND slug='guide-house-sitting-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-lyon-guide-complet' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting à Lyon : premiers repères pour préparer une garde'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Préparez les besoins du logement et les conditions réelles de présence. Le guide actuel de Lyon détaille les solutions et les échanges avant confirmation.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting à Lyon : préparer les conditions de garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Dates, présence, accès et animaux éventuels : préparez une garde de maison à Lyon et retrouvez le guide actuel des solutions et conditions à convenir.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chat roux est couché sur un tapis dans un salon, avec une personne en arrière-plan.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de garde et de pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"règles et repères des parcs lyonnais","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-04 09:55:16.503839+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot46_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot46_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot46_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting à Lyon : premiers repères pour préparer une garde',
    excerpt='Préparez les besoins du logement et les conditions réelles de présence. Le guide actuel de Lyon détaille les solutions et les échanges avant confirmation.',
    meta_title='House-sitting à Lyon : préparer les conditions de garde',
    meta_description='Dates, présence, accès et animaux éventuels : préparez une garde de maison à Lyon et retrouvez le guide actuel des solutions et conditions à convenir.',
    hero_image_alt='Un chat roux est couché sur un tapis dans un salon, avec une personne en arrière-plan.',
    internal_links='[{"text":"guide actuel de garde et de pet-sitting à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"règles et repères des parcs lyonnais","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='guide-house-sitting-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Promener un chien à Lyon : trouver les règles des parcs et espaces canins

**Avant une promenade à Lyon, distinguez l’accès avec un chien, les zones interdites et les aires où la liberté est expressément permise.** Le [guide actuel des parcs pour chiens à Lyon](/actualites/parcs-chiens-lyon-guide-complet) rassemble les repères et les sources institutionnelles.

## <a id="reperes"></a>Les questions à vérifier pour chaque sortie

| Point | Ce qu’il faut consulter ou observer |
| --- | --- |
| Accès | Règlement du lieu, zones autorisées et fermetures temporaires. |
| Laisse | Conditions dans le parc et dans les éventuelles aires dédiées. |
| Restrictions | Règles propres aux chiens catégorisés ou à certains espaces. |
| Conditions réelles | Fréquentation, météo, croisements et trajet de repli. |

Un espace peu fréquenté, boisé ou clôturé ne constitue pas à lui seul une autorisation de détacher. Une aire collective n’est pas adaptée à tous les chiens : gardez une distance compatible avec leurs réactions et choisissez un autre parcours si nécessaire.

Le guide actuel distingue notamment les règles propres aux lieux cités et les informations d’accès à vérifier. Les panneaux et consignes temporaires restent à consulter sur place ; une date de travaux annoncée ne garantit pas la disponibilité d’un équipement.

Pour un chien gardé, convenez avec le propriétaire des parcours, du matériel, des interactions et de la durée adaptée. La proximité d’un gardien ne prouve pas qu’il connaît tous les accès ou les réactions du chien. Préparez eau, déjections à ramasser et contacts utiles, sans improviser une nouvelle activité pendant l’absence.

Si vous préparez aussi une garde, le [guide actuel de Lyon](/actualites/pet-sitting-lyon-guide-complet) aide à définir présence et conditions. Les repas, les promenades et la maison restent à organiser selon les besoins réels.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver les règles actuelles des parcs pour chiens à Lyon ?
Le guide maintenu renvoie aux sources institutionnelles et distingue les parcs des espaces de liberté. Consultez aussi les règlements et consignes temporaires du lieu avant la sortie.

### Un parc accessible aux chiens permet-il de les détacher partout ?
Non. L’accès au parc et l’autorisation de liberté sont deux points différents, avec des restrictions possibles selon les zones et les chiens. Vérifiez les règles du lieu.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='71909b5d-b272-4b60-b9cb-8264f65033cf'::uuid AND slug='guide-lieu-meilleurs-parcs-chiens-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/parcs-chiens-lyon-guide-complet' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Promener un chien à Lyon : trouver les règles des parcs et espaces canins'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Un parc qui accepte les chiens n’autorise pas forcément la liberté. Le guide actuel présente les lieux, les règlements et les points à vérifier avant la sortie.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Parcs pour chiens à Lyon : retrouver les règles utiles'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Parc accessible, laisse et aire de liberté : préparez une promenade à Lyon en vérifiant les règles du lieu. Retrouvez les repères dans le guide actuel.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une adulte promène un chien en laisse près d’un plan d’eau et d’une grande serre.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel des parcs pour chiens à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide actuel de Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-27 05:40:04.686117+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot46_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot46_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot46_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Promener un chien à Lyon : trouver les règles des parcs et espaces canins',
    excerpt='Un parc qui accepte les chiens n’autorise pas forcément la liberté. Le guide actuel présente les lieux, les règlements et les points à vérifier avant la sortie.',
    meta_title='Parcs pour chiens à Lyon : retrouver les règles utiles',
    meta_description='Parc accessible, laisse et aire de liberté : préparez une promenade à Lyon en vérifiant les règles du lieu. Retrouvez les repères dans le guide actuel.',
    hero_image_alt='Une adulte promène un chien en laisse près d’un plan d’eau et d’une grande serre.',
    internal_links='[{"text":"guide actuel des parcs pour chiens à Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"guide actuel de Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='guide-lieu-meilleurs-parcs-chiens-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
