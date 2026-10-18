-- Refonte des guides anciennes-solutions-garde, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot44_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot44_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot44_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot44_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('87ae0e1f-f8d3-4bc9-a575-cb6d345c799e'::uuid,'82e6449c-ec8f-4af1-93ee-37d5495cc72a'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Garde à domicile ou pension : les questions pour choisir

**Comparez les conditions réelles de chaque solution avec les besoins de votre animal, plutôt qu’un classement valable pour tous.** Le [guide actuel des pensions et alternatives de garde](/actualites/pension-chien-alternatives-guide) détaille les questions à poser et les préparatifs.

## <a id="reperes"></a>Les points à vérifier dans chaque organisation

| Critère | Ce qu’il faut demander |
| --- | --- |
| Présence | Qui intervient, à quels moments et quelles absences sont possibles ? |
| Environnement | Où l’animal reste-t-il et quels contacts sont prévus avec d’autres animaux ? |
| Soins | Quels gestes sont nécessaires et qui peut réellement les assurer ? |
| Frais | Qu’est-ce qui est inclus, à fournir ou à payer séparément ? |

Rester au domicile conserve certains repères, sans garantir l’absence de stress ou de risque sanitaire. Les conditions d’une pension ou d’un accueil varient ; ne supposez pas une surveillance vétérinaire continue ou des soins possibles sans confirmation.

Une visite ponctuelle, une présence avec hébergement et un accueil chez un tiers ne répondent pas au même besoin. Si un suivi médical ou comportemental existe, préparez le choix avec le professionnel compétent et la personne ou structure concernée.

Sur Guardiens, un gardien est hébergé pendant la garde sans rémunération, selon ce qui est convenu pour la maison et les animaux éventuels. La plateforme est actuellement gratuite, selon les [conditions tarifaires](/tarifs) ; nourriture, déplacements et autres dépenses restent distincts.

Échangez sur l’expérience, les limites et les conditions. Un document d’identité contrôlé ne garantit ni une compétence ni la fiabilité. Une rencontre est possible si vous le souhaitez tous les deux ; prévoyez aussi les contacts et un relais avant le départ.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver un comparatif détaillé des solutions ?
Le guide actuel des pensions et alternatives aide à comparer les conditions et les besoins. Le lien de cette page et le bouton final permettent de le consulter.

### La garde à domicile garantit-elle moins de stress pour tous les animaux ?
Non. Elle conserve des repères du logement, mais le choix dépend de l’animal, de la présence et des soins réellement possibles. Aucune solution ne garantit l’absence de difficulté ou d’incident.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='87ae0e1f-f8d3-4bc9-a575-cb6d345c799e'::uuid AND slug='garde-a-domicile-vs-pension';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pension-chien-alternatives-guide' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garde à domicile ou pension : les questions pour choisir'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Le bon choix dépend des besoins de l’animal et des conditions proposées. Le guide actuel aide à comparer présence, environnement, soins et dépenses.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde à domicile ou pension : les questions utiles'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Présence, environnement, soins et frais : comparez les conditions réelles d’une garde à domicile ou d’une pension, puis consultez le guide actuel.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Beagle est couché sur un canapé clair, la tête posée près de sa patte.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel des pensions et alternatives de garde","url":"/actualites/pension-chien-alternatives-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-13 18:14:50.446745+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot44_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot44_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot44_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garde à domicile ou pension : les questions pour choisir',
    excerpt='Le bon choix dépend des besoins de l’animal et des conditions proposées. Le guide actuel aide à comparer présence, environnement, soins et dépenses.',
    meta_title='Garde à domicile ou pension : les questions utiles',
    meta_description='Présence, environnement, soins et frais : comparez les conditions réelles d’une garde à domicile ou d’une pension, puis consultez le guide actuel.',
    hero_image_alt='Un Beagle est couché sur un canapé clair, la tête posée près de sa patte.',
    internal_links='[{"text":"guide actuel des pensions et alternatives de garde","url":"/actualites/pension-chien-alternatives-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garde-a-domicile-vs-pension' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Faire garder son chien à Lyon : préparer le choix de la solution

**Pour faire garder votre chien à Lyon, définissez d’abord la présence, les sorties et les soins nécessaires.** Le [guide actuel de pet-sitting et de garde à Lyon](/actualites/pet-sitting-lyon-guide-complet) rassemble les solutions et les repères locaux.

## <a id="reperes"></a>Les informations à préparer

| Sujet | Ce qui permet de comparer |
| --- | --- |
| Dates et présence | Besoin de passages ou de présence dans le logement, absences acceptées. |
| Promenades | Équipement, réactions observées et parcours réellement possibles. |
| Santé | Suivi connu, ordonnance éventuelle et gestes acceptés. |
| Organisation | Accès, frais, contacts et relais si la garde change. |

Une pension, un professionnel à domicile, un proche ou un gardien hébergé ne proposent pas les mêmes conditions. Vérifiez directement ce qui est inclus et disponible, sans reprendre un prix moyen comme un devis ou une durée de préparation comme une garantie de trouver quelqu’un.

Un aboiement pendant l’absence ou une difficulté avec d’autres chiens demande une évaluation adaptée ; la présence d’un particulier ne garantit pas de résoudre la situation. Le choix doit tenir compte de ce que la personne ou la structure peut réellement assurer.

Pour les sorties à Lyon, le [guide des parcs pour chiens](/actualites/parcs-chiens-lyon-guide-complet) permet de préparer les règles des lieux. La proximité du gardien ne prouve pas une compétence ou une disponibilité. Un contrôle de document d’identité et des avis, lorsqu’ils existent, complètent l’échange sans le remplacer.

Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération. La plateforme est actuellement gratuite, selon les [conditions tarifaires](/tarifs), et les dépenses restent distinctes. Présence continue, absence de stress et remplacement ne sont pas garantis : confirmez les conditions et prévoyez un relais.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver les repères actuels pour une garde de chien à Lyon ?
Le guide actuel de Lyon détaille les solutions, les préparatifs et les questions locales. Le lien de cette page et le bouton final permettent de le lire.

### Une date de départ proche garantit-elle une réponse rapide ?
Non. Échangez sur les disponibilités réelles et préparez une solution de relais pour un besoin essentiel. Une publication ne garantit ni candidature ni remplacement.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='82e6449c-ec8f-4af1-93ee-37d5495cc72a'::uuid AND slug='garde-chien-lyon-solutions';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-lyon-guide-complet' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Faire garder son chien à Lyon : préparer le choix de la solution'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Partez des besoins de votre chien et des conditions réelles de garde. Le guide actuel de Lyon détaille les solutions et les questions à poser.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Garde de chien à Lyon : préparer le choix de la solution'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Pour faire garder votre chien à Lyon, précisez présence, sorties et soins avant de choisir une organisation. Retrouvez les repères locaux dans le guide actuel.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien est couché sur un tapis dans un salon avec de grandes fenêtres et une bibliothèque.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de pet-sitting et de garde à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"guide des parcs pour chiens","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-14 13:59:17.121368+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot44_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot44_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot44_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Faire garder son chien à Lyon : préparer le choix de la solution',
    excerpt='Partez des besoins de votre chien et des conditions réelles de garde. Le guide actuel de Lyon détaille les solutions et les questions à poser.',
    meta_title='Garde de chien à Lyon : préparer le choix de la solution',
    meta_description='Pour faire garder votre chien à Lyon, précisez présence, sorties et soins avant de choisir une organisation. Retrouvez les repères locaux dans le guide actuel.',
    hero_image_alt='Un chien est couché sur un tapis dans un salon avec de grandes fenêtres et une bibliothèque.',
    internal_links='[{"text":"guide actuel de pet-sitting et de garde à Lyon","url":"/actualites/pet-sitting-lyon-guide-complet"},{"text":"guide des parcs pour chiens","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='garde-chien-lyon-solutions' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
