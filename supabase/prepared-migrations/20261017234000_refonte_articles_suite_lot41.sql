-- Refonte des guides anciens-bouledogue-profil, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot41_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot41_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot41_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot41_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('46449ca8-ad9a-40ce-98d8-50300bdcf8db'::uuid,'be648df7-e302-4f6c-9722-3afddab06946'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Bouledogue Français à Lyon : préparer sa garde

**La garde d’un Bouledogue Français se prépare avec les consignes de votre chien, notamment pour les sorties, la chaleur et un éventuel suivi respiratoire.** Retrouvez les préparatifs détaillés dans le [guide actuel de garde du Bouledogue Français](/actualites/bouledogue-francais-guide-race-complet).

## <a id="reperes"></a>Les informations à transmettre

| Point à préparer | Ce qu’il faut convenir |
| --- | --- |
| Sorties | Conditions adaptées au chien, à la météo et au lieu, avec possibilité de rentrer. |
| Logement | Eau, repos, accès et conditions d’aération ou de fraîcheur. |
| Suivi | Problèmes connus, ordonnance éventuelle et contacts vétérinaires. |
| Présence | Disponibilités réelles et relais en cas d’imprévu. |

Un horaire, une température intérieure ou une durée de promenade ne rend pas toutes les situations sûres. Une gêne respiratoire ne doit pas être banalisée comme normale par race. En cas de difficulté respiratoire ou de malaise, appelez immédiatement un vétérinaire sans attendre de joindre d’abord le propriétaire.

À Lyon, vérifiez les [règles des parcs et conditions d’accès avec un chien](/actualites/parcs-chiens-lyon-guide-complet). Un lieu ombragé ne garantit pas à lui seul une sortie adaptée. Les habitudes et les consignes vétérinaires restent à transmettre à la personne.

Le house-sitting ne garantit pas un logement climatisé, un gardien formé médicalement ou l’absence de stress. Échangez sur ce que la personne peut assurer. Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite, selon les [conditions tarifaires](/tarifs). Les dépenses restent distinctes.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver le guide détaillé de garde du Bouledogue Français ?
Le guide actuel rassemble les questions de respiration, chaleur, suivi et organisation. Il est accessible par le lien de cette page et le bouton final.

### Un gardien Guardiens est-il automatiquement formé aux difficultés respiratoires ?
Non. Échangez sur l’expérience, les capacités et les consignes nécessaires. Un document d’identité contrôlé ne certifie pas une compétence médicale ou une fiabilité.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='46449ca8-ad9a-40ce-98d8-50300bdcf8db'::uuid AND slug='bouledogue-francais-lyon-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/bouledogue-francais-guide-race-complet' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Bouledogue Français à Lyon : préparer sa garde'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Décrivez les besoins de votre chien et les consignes déjà établies. Le guide actuel détaille respiration, chaleur et organisation avec le gardien.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Bouledogue Français à Lyon : repères avant la garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez présence, sorties et suivi de votre Bouledogue Français à Lyon. Le guide actuel détaille les consignes sans température sûre ou gardien formé promis.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un Bouledogue Français est assis sur un tapis dans un salon donnant sur un balcon.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de garde du Bouledogue Français","url":"/actualites/bouledogue-francais-guide-race-complet"},{"text":"règles des parcs et conditions d’accès avec un chien","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-09-05 06:57:45.541044+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot41_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot41_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot41_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Bouledogue Français à Lyon : préparer sa garde',
    excerpt='Décrivez les besoins de votre chien et les consignes déjà établies. Le guide actuel détaille respiration, chaleur et organisation avec le gardien.',
    meta_title='Bouledogue Français à Lyon : repères avant la garde',
    meta_description='Préparez présence, sorties et suivi de votre Bouledogue Français à Lyon. Le guide actuel détaille les consignes sans température sûre ou gardien formé promis.',
    hero_image_alt='Un Bouledogue Français est assis sur un tapis dans un salon donnant sur un balcon.',
    internal_links='[{"text":"guide actuel de garde du Bouledogue Français","url":"/actualites/bouledogue-francais-guide-race-complet"},{"text":"règles des parcs et conditions d’accès avec un chien","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='bouledogue-francais-lyon-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Profil de gardien : préparer une présentation claire et honnête

**Un profil de gardien aide un propriétaire à comprendre votre expérience et ce que vous pouvez réellement assurer.** Les conseils détaillés sont réunis dans le [guide actuel pour créer un profil de gardien](/actualites/creer-profil-gardien-attractif).

## <a id="reperes"></a>Les éléments à préparer

| Élément | Information utile |
| --- | --- |
| Photo | Une image récente et reconnaissable, sans présenter l’animal ou le logement d’un tiers sans son accord. |
| Expérience | Les gardes et gestes réellement pratiqués, y compris hors de la plateforme. |
| Présence | Vos contraintes et disponibilités, sans supposer que télétravail signifie présence constante. |
| Limites | Animaux, manipulations ou tâches que vous ne pouvez pas assurer. |

Vous n’avez pas à inventer une expertise de quartier ou à promettre des soins que vous ne maîtrisez pas. Un premier message doit répondre aux besoins réels de l’annonce ; citer un parc ou ajouter un animal sur votre photo ne garantit pas davantage de contacts.

Lorsqu’un profil affiche un contrôle de document d’identité, cela ne certifie ni une compétence ni la fiabilité. Les avis, lorsqu’ils existent, complètent la présentation. Décrivez votre expérience honnêtement si vous débutez sur la plateforme, sans inventer de témoignage.

Une rencontre est possible si vous le souhaitez tous les deux. Confirmez les conditions de chaque garde, y compris la communication attendue, plutôt que de promettre les mêmes photos ou horaires à tous les propriétaires.

Sur Guardiens, le gardien est hébergé pendant la garde sans rémunération. La plateforme est actuellement gratuite pour les deux rôles, selon les [conditions tarifaires](/tarifs) ; déplacements et autres dépenses restent distincts. Un profil complet ne garantit ni candidature retenue ni logement à une date donnée.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver les conseils complets pour mon profil de gardien ?
Le guide actuel explique la présentation, la photo, l’expérience et les disponibilités à préciser. Le lien de cette page et le bouton final permettent de le consulter.

### Faut-il mettre un animal sur sa photo pour recevoir des demandes ?
Choisissez une image reconnaissable et honnête, avec les accords nécessaires si un tiers ou son animal apparaît. Aucun type de photo ne garantit un nombre de contacts ou une garde acceptée.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='be648df7-e302-4f6c-9722-3afddab06946'::uuid AND slug='conseil-gardien-creer-profil-attractif-lyon';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/creer-profil-gardien-attractif' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Profil de gardien : préparer une présentation claire et honnête'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Présentez votre expérience réelle et les conditions que vous pouvez assurer. Le guide actuel vous aide à préparer photo, disponibilité et premiers échanges.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Profil de gardien : une présentation claire et honnête'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Photo, expérience, présence et limites : préparez votre profil de gardien sans promesse de contacts. Retrouvez les conseils détaillés dans le guide actuel.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une adulte photographie une personne assise sur un canapé avec un chien et un chat.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel pour créer un profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-27 05:40:04.686117+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot41_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot41_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot41_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Profil de gardien : préparer une présentation claire et honnête',
    excerpt='Présentez votre expérience réelle et les conditions que vous pouvez assurer. Le guide actuel vous aide à préparer photo, disponibilité et premiers échanges.',
    meta_title='Profil de gardien : une présentation claire et honnête',
    meta_description='Photo, expérience, présence et limites : préparez votre profil de gardien sans promesse de contacts. Retrouvez les conseils détaillés dans le guide actuel.',
    hero_image_alt='Une adulte photographie une personne assise sur un canapé avec un chien et un chat.',
    internal_links='[{"text":"guide actuel pour créer un profil de gardien","url":"/actualites/creer-profil-gardien-attractif"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='conseil-gardien-creer-profil-attractif-lyon' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
