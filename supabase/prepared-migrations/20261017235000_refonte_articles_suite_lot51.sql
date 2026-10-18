-- Refonte des guides anciens guides Malinois et Annecy, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot51_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot51_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot51_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot51_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('f4933b1d-fbe3-49ee-8896-cf1f2141b370'::uuid,'f42aa8c2-b888-439c-85b7-c7d223438d52'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Garder un Malinois à Lyon : les conditions à préparer

**Pour garder un Malinois à Lyon, partez de ses habitudes et de ses réactions réelles plutôt que d’un programme imposé par la race.** Le [guide actuel du Malinois et de sa garde](/actualites/malinois-guide-race-complet) détaille les informations à transmettre et les limites à discuter.

## <a id="reperes"></a>Les questions à poser avant confirmation

| Point | Informations utiles |
| --- | --- |
| Routines | Sorties habituelles, activités déjà connues et temps de repos. |
| Réactions | Croisements, visiteurs, manipulations et situations à éviter. |
| Matériel | Équipement accepté, accès et gestion des portes. |
| Présence | Absences compatibles et relais en cas d’imprévu. |

Ne transformez pas une garde en programme de sport ou de dressage. Les durées universelles, les équivalences entre flair et course ou l’idée d’un chien qui doit être « invisible » à l’intérieur n’aident pas à définir une garde adaptée. Convenez des routines et des capacités nécessaires pour cet animal.

Pour les sorties, consultez les [règles des parcs et espaces canins de Lyon](/actualites/parcs-chiens-lyon-guide-complet). Un espace ouvert ou un bon rappel supposé ne donne pas le droit de détacher. Ne commencez pas une nouvelle activité de course ou une randonnée pendant l’absence sans organisation adaptée et accord préalable.

Décrivez franchement les difficultés et les antécédents. Si la situation dépasse les capacités disponibles, préparez une autre solution avec les professionnels qui suivent le chien. Un document contrôlé ou des avis ne certifient pas une compétence comportementale ; une rencontre, si vous la souhaitez tous les deux, ne constitue pas un test permettant d’écarter tout risque.

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les deux rôles. Les dépenses restent distinctes, selon les [conditions tarifaires](/tarifs). Aucune candidature adaptée ou solution de remplacement n’est garantie.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver les conseils actuels pour préparer une garde de Malinois ?
Le guide du Malinois détaille les routines, les réactions et les questions à poser au gardien. Utilisez-le pour préparer une garde adaptée à votre chien.

### Faut-il imposer un nombre d’heures de sport au gardien ?
Non. Définissez les sorties et activités adaptées à cet animal avec les personnes qui le connaissent. Une garde ne doit pas devenir un entraînement nouveau ou une mise à l’épreuve.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='f4933b1d-fbe3-49ee-8896-cf1f2141b370'::uuid AND slug='malinois-lyon-guide-race';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/malinois-guide-race-complet' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Garder un Malinois à Lyon : les conditions à préparer'
    AND before_row.excerpt IS NOT DISTINCT FROM 'La garde d’un Malinois se prépare selon ce chien : habitudes, réactions, repos et capacités réelles du gardien. Retrouvez le guide actuel pour approfondir.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Malinois à Lyon : préparer une garde adaptée au chien'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Préparez routines, réactions et sorties d’un Malinois à Lyon sans quota de sport ni compétence supposée. Retrouvez le guide actuel avant de choisir une garde.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien de type Malinois debout sur une allée pavée devant un bâtiment en briques.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel du Malinois et de sa garde","url":"/actualites/malinois-guide-race-complet"},{"text":"règles des parcs et espaces canins de Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-09-05 06:57:45.541044+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot51_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot51_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot51_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Garder un Malinois à Lyon : les conditions à préparer',
    excerpt='La garde d’un Malinois se prépare selon ce chien : habitudes, réactions, repos et capacités réelles du gardien. Retrouvez le guide actuel pour approfondir.',
    meta_title='Malinois à Lyon : préparer une garde adaptée au chien',
    meta_description='Préparez routines, réactions et sorties d’un Malinois à Lyon sans quota de sport ni compétence supposée. Retrouvez le guide actuel avant de choisir une garde.',
    hero_image_alt='Un chien de type Malinois debout sur une allée pavée devant un bâtiment en briques.',
    internal_links='[{"text":"guide actuel du Malinois et de sa garde","url":"/actualites/malinois-guide-race-complet"},{"text":"règles des parcs et espaces canins de Lyon","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='malinois-lyon-guide-race' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Pet-sitting à Annecy : préparer les besoins avant de choisir

**À Annecy, le pet-sitting peut désigner des visites, un accueil chez une autre personne ou une garde avec séjour dans votre logement.** Définissez le besoin avant de comparer les solutions. La [page locale de house-sitting à Annecy](/house-sitting/annecy) permet de poursuivre votre recherche.

## <a id="reperes"></a>Les conditions à comparer

| Point | Question à poser |
| --- | --- |
| Présence | Passages, nuitées et temps sans présence compatibles avec l’animal. |
| Accès | Trajet réel, stationnement, clés et éventuel véhicule nécessaire. |
| Routines | Repas, litière, sorties, réactions et suivi prescrit. |
| Imprévus | Vétérinaire et personne relais ayant accepté ce rôle. |

La proximité du lac et des montagnes n’implique pas que tous les chiens peuvent y courir, se baigner ou randonner. Préparez les parcours habituels et vérifiez les [règles de promenade à Annecy](/actualites/parcs-balades-chiens-annecy-guide), les consignes temporaires et les conditions réelles du lieu.

Pour un chat, décrivez les accès extérieurs autorisés, les portes à surveiller et les habitudes. Un gardien local ne connaît pas automatiquement cette organisation ni les besoins médicaux de votre animal.

Comparez les devis sur les mêmes prestations : durée des visites, nuits, déplacements, frais et annulation. Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les deux rôles. Les dépenses convenues restent distinctes, selon les [conditions tarifaires](/tarifs).

Présentez vos dates et vos contraintes assez tôt pour pouvoir échanger et préparer un relais. Il n’existe pas de délai de candidature garanti. Une rencontre est possible si vous le souhaitez tous les deux ; les avis disponibles et un document d’identité contrôlé ne certifient pas les compétences.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où poursuivre ma recherche de garde à Annecy ?
La page locale d’Annecy permet de préparer votre recherche. Décrivez les besoins de votre animal et confirmez directement présence, disponibilité et conditions avec les personnes concernées.

### Une garde à Annecy implique-t-elle des sorties en montagne ?
Non. Convenez des parcours adaptés aux habitudes et à la santé de l’animal. Une randonnée ou une baignade nécessite un accord et la vérification des règles du lieu.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='f42aa8c2-b888-439c-85b7-c7d223438d52'::uuid AND slug='pet-sitting-annecy-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/house-sitting/annecy' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Pet-sitting à Annecy : préparer les besoins avant de choisir'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Choisissez une organisation selon les besoins de l’animal et la présence proposée. La page locale d’Annecy permet de poursuivre votre recherche.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Pet-sitting à Annecy : les besoins à préciser pour la garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Visites, accueil ou séjour dans le logement : définissez les besoins de votre animal à Annecy. Retrouvez la page locale et les questions à poser avant la garde.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne marche avec un chien en laisse et un chat dans un sac de transport dorsal, près d’un lac.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page locale de house-sitting à Annecy","url":"/house-sitting/annecy"},{"text":"règles de promenade à Annecy","url":"/actualites/parcs-balades-chiens-annecy-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-07-27 17:18:49.739662+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot51_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot51_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot51_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Pet-sitting à Annecy : préparer les besoins avant de choisir',
    excerpt='Choisissez une organisation selon les besoins de l’animal et la présence proposée. La page locale d’Annecy permet de poursuivre votre recherche.',
    meta_title='Pet-sitting à Annecy : les besoins à préciser pour la garde',
    meta_description='Visites, accueil ou séjour dans le logement : définissez les besoins de votre animal à Annecy. Retrouvez la page locale et les questions à poser avant la garde.',
    hero_image_alt='Une personne marche avec un chien en laisse et un chat dans un sac de transport dorsal, près d’un lac.',
    internal_links='[{"text":"page locale de house-sitting à Annecy","url":"/house-sitting/annecy"},{"text":"règles de promenade à Annecy","url":"/actualites/parcs-balades-chiens-annecy-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-annecy-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
