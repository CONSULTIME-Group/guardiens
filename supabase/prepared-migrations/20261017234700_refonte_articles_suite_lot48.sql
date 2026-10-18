-- Refonte des guides anciennes pages Caluire et Chambéry, autorisée le 17/10/2026.
-- Les URL, auteurs, dates de publication et indexabilité sont conservés.
BEGIN;
CREATE TABLE IF NOT EXISTS public._backup_articles_suite_lot48_20261017 AS SELECT * FROM public.articles WHERE false;
REVOKE ALL ON public._backup_articles_suite_lot48_20261017 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public._backup_articles_suite_lot48_20261017 TO service_role;
ALTER TABLE public._backup_articles_suite_lot48_20261017 ENABLE ROW LEVEL SECURITY;
SELECT id FROM public.articles WHERE id IN ('dec87147-f07d-4de3-9b3b-922304f05a15'::uuid,'112ffce1-6481-431b-92e3-a9d4b882c451'::uuid) ORDER BY id FOR UPDATE;

DO $guide_0$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_0_20261017$# House-sitting à Caluire-et-Cuire : les points à convenir

**Une garde à Caluire-et-Cuire se prépare à partir de votre logement et de la présence dont vous avez besoin.** Le gardien y séjourne pendant votre absence et assure les tâches acceptées, avec ou sans animaux. Retrouvez la [page de house-sitting du secteur lyonnais](/house-sitting/lyon) pour poursuivre votre recherche.

## <a id="reperes"></a>Décrire la garde avant de chercher une personne

| Point | Informations à partager |
| --- | --- |
| Présence | Dates, nuitées et temps d’absence compatible avec les besoins. |
| Accès | Adresse communiquée au bon moment, trajet, stationnement et clés. |
| Entretien | Plantes, courrier et usages des équipements autorisés. |
| Animaux éventuels | Repas, sorties, réactions et consignes de suivi. |

Un jardin ne remplace pas automatiquement les sorties d’un chien. Décrivez ses habitudes, les clôtures et les accès ; ne déduisez pas ses besoins du quartier ou de la surface de la maison.

Si vous avez une piscine, un portail ou un arrosage automatique, convenez des gestes simples attendus et du contact à appeler en cas de panne. La proximité du gardien ne lui donne pas une compétence technique ni une obligation d’intervenir sur une installation.

Préparez les promenades avec le [guide des parcs et espaces canins lyonnais](/actualites/parcs-chiens-lyon-guide-complet). Un chemin boisé ou un parc calme ne donne pas à lui seul le droit de détacher le chien. Vérifiez les règles et les conditions réelles du parcours.

Échangez sur l’expérience, les limites et les solutions en cas d’imprévu. Une rencontre est possible si vous le souhaitez tous les deux. Les avis disponibles et un document contrôlé ne garantissent pas la fiabilité ou les capacités. Un relais doit avoir accepté ce rôle : aucun remplacement sous quinze minutes n’est garanti.

La plateforme Guardiens est actuellement gratuite pour les deux rôles. Le gardien est hébergé sans rémunération ; les dépenses convenues restent distinctes, selon les [conditions tarifaires](/tarifs).

## <a id="faq"></a>Questions fréquentes

:::faq
### Où chercher une garde de maison à Caluire-et-Cuire ?
La page du secteur lyonnais permet de poursuivre la recherche. Précisez Caluire-et-Cuire, vos dates et les contraintes du logement ; une disponibilité reste à confirmer directement.

### Un gardien peut-il assurer l’entretien de tous les équipements ?
Non. Définissez les gestes acceptés et les limites. Une panne de piscine, de portail ou d’une installation peut nécessiter un professionnel ; laissez le contact et la conduite à tenir.
:::$suite_content_0_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='dec87147-f07d-4de3-9b3b-922304f05a15'::uuid AND slug='house-sitting-caluire-et-cuire';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/house-sitting/lyon' THEN
    RAISE EXCEPTION 'Guide suite 0 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting à Caluire-et-Cuire : les points à convenir'
    AND before_row.excerpt IS NOT DISTINCT FROM 'Préparez la garde selon votre logement à Caluire-et-Cuire : accès, tâches et animaux éventuels. La page du secteur lyonnais permet de poursuivre la recherche.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting à Caluire-et-Cuire : préparer une garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Définissez présence, accès et entretien pour une garde à Caluire-et-Cuire. Retrouvez la page du secteur lyonnais pour poursuivre votre recherche de gardien.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Une personne remet des clés à une autre devant une maison en pierre, près de plantes en pot et d’un chien.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page de house-sitting du secteur lyonnais","url":"/house-sitting/lyon"},{"text":"guide des parcs et espaces canins lyonnais","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-04 12:55:18.217018+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 0 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot48_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 0 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot48_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot48_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting à Caluire-et-Cuire : les points à convenir',
    excerpt='Préparez la garde selon votre logement à Caluire-et-Cuire : accès, tâches et animaux éventuels. La page du secteur lyonnais permet de poursuivre la recherche.',
    meta_title='House-sitting à Caluire-et-Cuire : préparer une garde',
    meta_description='Définissez présence, accès et entretien pour une garde à Caluire-et-Cuire. Retrouvez la page du secteur lyonnais pour poursuivre votre recherche de gardien.',
    hero_image_alt='Une personne remet des clés à une autre devant une maison en pierre, près de plantes en pot et d’un chien.',
    internal_links='[{"text":"page de house-sitting du secteur lyonnais","url":"/house-sitting/lyon"},{"text":"guide des parcs et espaces canins lyonnais","url":"/actualites/parcs-chiens-lyon-guide-complet"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-caluire-et-cuire' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 0 : % ligne au lieu de 1',affected; END IF;
END;
$guide_0$;

DO $guide_1$
DECLARE
  before_row public.articles%ROWTYPE;
  affected integer;
  new_content text := $suite_content_1_20261017$# House-sitting à Chambéry : organiser présence et accès

**Le house-sitting à Chambéry consiste à accueillir un gardien pendant votre absence, selon une présence et des tâches définies ensemble.** La garde peut concerner la maison seule ou inclure des animaux. Consultez la [page locale de house-sitting à Chambéry](/house-sitting/chambery) pour poursuivre votre recherche.

## <a id="reperes"></a>Les conditions à préciser pour votre logement

| Point | À organiser avant confirmation |
| --- | --- |
| Accès | Trajet réel, stationnement, marches et remise des clés. |
| Présence | Nuitées, absences possibles et rythme des nouvelles. |
| Animaux éventuels | Sorties habituelles, réactions, alimentation et suivi connu. |
| Imprévus | Vétérinaire, contact technique et personne relais ayant accepté. |

Un gardien du secteur ne connaît pas nécessairement votre chaudière, votre vétérinaire ou l’accès à votre logement. Expliquez les équipements et limitez les tâches aux gestes acceptés ; une intervention technique peut nécessiter un professionnel.

Si les conditions météo compliquent l’accès, convenez d’une organisation adaptée avant le départ. Une adresse proche ne garantit pas un délai d’arrivée. Les restrictions de circulation, l’état des accès et les consignes du logement doivent être vérifiés selon la situation réelle.

Pour un chien, préparez un parcours habituel et une solution plus courte. Vérifiez les règles du lieu plutôt que de supposer qu’une berge ou un parc autorise la liberté ou la baignade. Le [guide actuel de garde d’animaux en Savoie](/actualites/garde-animaux-savoie-guide) complète la préparation ; une garde n’est pas le moment d’improviser une randonnée non convenue.

Une rencontre est possible si vous le souhaitez tous les deux. Comparez l’expérience déclarée, les limites et les avis lorsqu’ils existent. Un document d’identité contrôlé ne certifie pas une compétence. Préparez un relais ; aucun remplacement automatique ou disponible sous quinze minutes n’est garanti.

Guardiens est actuellement gratuit pour les propriétaires et les gardiens. Le gardien est hébergé sans rémunération, avec des dépenses distinctes à convenir : voir les [conditions tarifaires](/tarifs).

## <a id="faq"></a>Questions fréquentes

:::faq
### Où poursuivre ma recherche de house-sitting à Chambéry ?
La page locale de Chambéry permet de préparer la recherche. Décrivez vos dates et vos besoins, puis confirmez la disponibilité et les conditions avec les personnes concernées.

### La proximité garantit-elle une intervention rapide en cas d’imprévu ?
Non. Définissez les contacts et les relais avant de partir. La distance ne garantit pas une disponibilité ni une compétence pour régler une panne ou prendre en charge un animal.
:::$suite_content_1_20261017$;
BEGIN
  SELECT * INTO STRICT before_row FROM public.articles WHERE id='112ffce1-6481-431b-92e3-a9d4b882c451'::uuid AND slug='house-sitting-chambery';
  IF before_row.published IS NOT TRUE OR before_row.noindex IS DISTINCT FROM true
    OR before_row.canonical_url IS DISTINCT FROM 'https://guardiens.fr/house-sitting/chambery' THEN
    RAISE EXCEPTION 'Guide suite 1 : état éditorial inattendu';
  END IF;
  IF before_row.title IS NOT DISTINCT FROM 'House-sitting à Chambéry : organiser présence et accès'
    AND before_row.excerpt IS NOT DISTINCT FROM 'À Chambéry, décrivez les conditions réelles du logement et les tâches attendues. Retrouvez les questions de préparation et la page locale pour votre recherche.'
    AND before_row.meta_title IS NOT DISTINCT FROM 'House-sitting à Chambéry : organiser la garde'
    AND before_row.meta_description IS NOT DISTINCT FROM 'Pour une garde à Chambéry, préparez les accès, les horaires et les besoins du logement et des animaux éventuels. Retrouvez la page locale et les repères utiles.'
    AND before_row.hero_image_alt IS NOT DISTINCT FROM 'Deux personnes échangent des clés devant une maison en pierre et en bois, avec des bagages, un chien et deux chats.'
    AND before_row.internal_links IS NOT DISTINCT FROM '[{"text":"page locale de house-sitting à Chambéry","url":"/house-sitting/chambery"},{"text":"guide actuel de garde d’animaux en Savoie","url":"/actualites/garde-animaux-savoie-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb
    AND before_row.content=new_content THEN RETURN; END IF;
  IF before_row.updated_at IS DISTINCT FROM '2026-10-04 12:55:18.304518+00'::timestamptz THEN
    RAISE EXCEPTION 'Guide suite 1 modifié depuis la préparation';
  END IF;
  IF EXISTS (SELECT 1 FROM public._backup_articles_suite_lot48_20261017 WHERE id=before_row.id AND updated_at IS DISTINCT FROM before_row.updated_at) THEN
    RAISE EXCEPTION 'Sauvegarde du guide 1 différente';
  END IF;
  INSERT INTO public._backup_articles_suite_lot48_20261017 SELECT x.* FROM public.articles x WHERE x.id=before_row.id
    AND NOT EXISTS (SELECT 1 FROM public._backup_articles_suite_lot48_20261017 z WHERE z.id=x.id);
  UPDATE public.articles SET
    title='House-sitting à Chambéry : organiser présence et accès',
    excerpt='À Chambéry, décrivez les conditions réelles du logement et les tâches attendues. Retrouvez les questions de préparation et la page locale pour votre recherche.',
    meta_title='House-sitting à Chambéry : organiser la garde',
    meta_description='Pour une garde à Chambéry, préparez les accès, les horaires et les besoins du logement et des animaux éventuels. Retrouvez la page locale et les repères utiles.',
    hero_image_alt='Deux personnes échangent des clés devant une maison en pierre et en bois, avec des bagages, un chien et deux chats.',
    internal_links='[{"text":"page locale de house-sitting à Chambéry","url":"/house-sitting/chambery"},{"text":"guide actuel de garde d’animaux en Savoie","url":"/actualites/garde-animaux-savoie-guide"},{"text":"conditions tarifaires","url":"/tarifs"}]'::jsonb,
    content=new_content, updated_at=now()
  WHERE id=before_row.id AND slug='house-sitting-chambery' AND updated_at=before_row.updated_at;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Refonte suite 1 : % ligne au lieu de 1',affected; END IF;
END;
$guide_1$;

COMMIT;
