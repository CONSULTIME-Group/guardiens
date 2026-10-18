-- Refonte des guides anciens guides Chambéry et Clermont-Ferrand, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot52_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot52_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot52_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot52_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('6613e922-06b6-4194-8043-f64c44c42dcf'::uuid,'26443d76-7140-4b7a-becd-5b90010c3c0c'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# Pet-sitting à Chambéry : définir la présence et les soins attendus

**Pour une garde à Chambéry, définissez d’abord les besoins de l’animal : visites, accueil chez une autre personne ou séjour dans votre logement.** La [page locale de house-sitting à Chambéry](/house-sitting/chambery) permet de poursuivre votre recherche et de préparer les conditions à convenir.

## <a id="reperes"></a>Les informations à réunir avant un échange

| Point | À transmettre |
| --- | --- |
| Routines | Repas, litière, sorties et habitudes de repos. |
| Présence | Passages, nuits et temps sans présence compatible. |
| Accès | Trajet réel, clés, marches et stationnement éventuel. |
| Suivi | Prescription éventuelle, vétérinaire et relais accepté. |

Un appartement ancien ne possède pas automatiquement un balcon sécurisé. Décrivez les fenêtres, les accès et les règles réellement applicables, surtout si un chat sort. Pour un chien, présentez les réactions aux croisements et les parcours connus.

La proximité d’un parc ou d’un lac ne garantit ni son accès avec un chien ni une autorisation de liberté ou de baignade. Vérifiez les règles du lieu et les conditions temporaires. Une sortie en montagne doit rester compatible avec les habitudes de l’animal et avoir été convenue.

Un gardien local ne connaît pas forcément votre vétérinaire ou les besoins médicaux de l’animal. Le [guide actuel de garde en Savoie](/actualites/garde-animaux-savoie-guide) complète ces préparatifs ; les compétences et disponibilités restent à vérifier directement.

Une rencontre est possible si vous le souhaitez tous les deux. Les avis disponibles et un document d’identité contrôlé ne garantissent pas les capacités. Prévoyez un relais : aucun remplacement sous quinze minutes n’est assuré.

Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les deux rôles. Les dépenses restent distinctes, selon les [conditions tarifaires](/tarifs). Pour une prestation rémunérée, comparez les devis selon la durée et le suivi proposés.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où poursuivre ma recherche de garde à Chambéry ?
La page locale de Chambéry permet de préparer la recherche. Décrivez vos dates et les besoins de votre animal, puis confirmez directement disponibilité et conditions.

### Le gardien connaît-il automatiquement les urgences vétérinaires du secteur ?
Non. Laissez les coordonnées du vétérinaire et vérifiez l’organisation des urgences avant le départ. Précisez aussi la conduite à tenir, les contacts et les frais convenus.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='6613e922-06b6-4194-8043-f64c44c42dcf'::uuid AND slug='pet-sitting-chambery-savoie';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/house-sitting/chambery' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Pet-sitting à Chambéry : définir la présence et les soins attendus'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Les besoins de l’animal, les accès et la présence proposée guident le choix. Retrouvez les premiers repères et la page locale de Chambéry.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Pet-sitting à Chambéry : préparer les besoins de garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'À Chambéry, comparez visites, accueil et séjour au domicile selon les besoins de votre animal. Retrouvez la page locale et les conditions à vérifier.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne assise avec un chien doré et un chat roux et blanc sur une terrasse fleurie, devant des montagnes.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page locale de house-sitting à Chambéry","url":"/house-sitting/chambery"},{"text":"guide actuel de garde en Savoie","url":"/actualites/garde-animaux-savoie-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-04 09:55:16.503839+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot52_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot52_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot52_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Pet-sitting à Chambéry : définir la présence et les soins attendus',
    excerpt='Les besoins de l’animal, les accès et la présence proposée guident le choix. Retrouvez les premiers repères et la page locale de Chambéry.',
    meta_title='Pet-sitting à Chambéry : préparer les besoins de garde',
    meta_description='À Chambéry, comparez visites, accueil et séjour au domicile selon les besoins de votre animal. Retrouvez la page locale et les conditions à vérifier.',
    hero_image_alt='Une personne assise avec un chien doré et un chat roux et blanc sur une terrasse fleurie, devant des montagnes.',
    internal_links='[{"text":"page locale de house-sitting à Chambéry","url":"/house-sitting/chambery"},{"text":"guide actuel de garde en Savoie","url":"/actualites/garde-animaux-savoie-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-chambery-savoie' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# Pet-sitting à Clermont-Ferrand : les questions avant une garde

**Une garde à Clermont-Ferrand se choisit selon les besoins de votre animal et la présence réellement proposée.** Le [guide actuel de pet-sitting et de garde de maison à Clermont-Ferrand](/actualites/pet-sitting-clermont-ferrand) compare les solutions et détaille les préparatifs utiles.

## <a id="reperes"></a>Décrire la situation réelle

| Point | Informations utiles |
| --- | --- |
| Animal | Routines, réactions, alimentation et suivi prescrit. |
| Présence | Passages, nuits et absences possibles. |
| Logement | Accès, escaliers, clés et équipements utilisables. |
| Imprévus | Vétérinaire, personne relais et dépenses convenues. |

Ne déduisez pas la taille du logement ou les besoins des animaux d’un quartier. Décrivez les accès et vérifiez les trajets aux horaires concernés. L’existence d’une ligne de transport ne garantit pas qu’elle convient à chaque déplacement ou à chaque animal.

Pour un chien, prévoyez les promenades habituelles et une alternative plus courte. Un parc urbain ou un site des volcans ne constitue pas à lui seul une autorisation d’accès, de liberté ou de randonnée. Vérifiez les règles du lieu et convenez du parcours ; une garde n’est pas un programme d’excursions imposé.

Comparez les devis sur les mêmes prestations : nombre et durée des visites, nuits, suivi et déplacements. Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite pour les deux rôles. Les dépenses restent distinctes, selon les [conditions tarifaires](/tarifs).

Publiez vos besoins en gardant du temps pour échanger et préparer la [passation du logement](/actualites/preparer-maison-avant-garde). Aucune période de forte demande ou délai de réponse n’est déduit sans données. Une rencontre est possible si vous le souhaitez tous les deux ; avis et document contrôlé ne certifient pas les compétences. Préparez un relais si aucune garde adaptée ne se confirme.

## <a id="faq"></a>Questions fréquentes

:::faq
### Où trouver les conseils actuels pour une garde à Clermont-Ferrand ?
Le guide de Clermont-Ferrand compare les solutions et les conditions à préparer. Consultez-le pour préciser la présence, les accès et les besoins de votre animal.

### Faut-il choisir un gardien habitué aux randonnées ?
Seulement si une sortie de ce type fait partie des besoins convenus et convient à l’animal. Préparez d’abord ses parcours habituels et les conditions réelles de la garde.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='26443d76-7140-4b7a-becd-5b90010c3c0c'::uuid AND slug='pet-sitting-clermont-ferrand-guide';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/actualites/pet-sitting-clermont-ferrand' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'Pet-sitting à Clermont-Ferrand : les questions avant une garde'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Préparez une demande adaptée à votre animal et au logement. Le guide actuel de Clermont-Ferrand permet de comparer les solutions et d’organiser la garde.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'Pet-sitting à Clermont-Ferrand : préparer votre recherche'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Décrivez présence, routines et accès pour une garde à Clermont-Ferrand. Le guide actuel compare les solutions et les préparatifs avant de choisir.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Un chien doré allongé dans l’herbe devant une maison en pierre et un paysage de reliefs.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"guide actuel de pet-sitting et de garde de maison à Clermont-Ferrand","url":"/actualites/pet-sitting-clermont-ferrand"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"passation du logement","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-08-04 11:55:09.199538+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot52_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot52_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot52_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='Pet-sitting à Clermont-Ferrand : les questions avant une garde',
    excerpt='Préparez une demande adaptée à votre animal et au logement. Le guide actuel de Clermont-Ferrand permet de comparer les solutions et d’organiser la garde.',
    meta_title='Pet-sitting à Clermont-Ferrand : préparer votre recherche',
    meta_description='Décrivez présence, routines et accès pour une garde à Clermont-Ferrand. Le guide actuel compare les solutions et les préparatifs avant de choisir.',
    hero_image_alt='Un chien doré allongé dans l’herbe devant une maison en pierre et un paysage de reliefs.',
    internal_links='[{"text":"guide actuel de pet-sitting et de garde de maison à Clermont-Ferrand","url":"/actualites/pet-sitting-clermont-ferrand"},{"text":"conditions tarifaires","url":"/tarifs"},{"text":"passation du logement","url":"/actualites/preparer-maison-avant-garde"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='pet-sitting-clermont-ferrand-guide' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
